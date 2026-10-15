// Independent verification that the built site honours the atlas location
// policy, rather than trusting that the loader applied it. Chained after
// assert-no-draft-leak.mjs in package.json. It reads the built output in
// dist/, not the source, and checks it against the policy manifest the
// Strapi loader writes into Astro's cache directory (names and policies only,
// never coordinates; see writeAtlasPolicyManifest in src/loaders/strapi.ts).
//
// Unlike the draft check this never skips for preview builds: the location
// policy holds in every build.

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIST_DIR = 'dist'
const GEOJSON_PATH = join(DIST_DIR, 'atlas.geojson')
// Astro's default cacheDir, which astro.config.mjs does not override. The
// filename matches ATLAS_POLICY_MANIFEST_FILENAME in src/loaders/strapi.ts.
const MANIFEST_PATH = join('node_modules', '.astro', 'atlas-policy-manifest.json')

const ALLOWED_PROPERTIES = new Set(['slug', 'name', 'kind', 'status', 'href'])
const FUZZED_MAX_DECIMALS = 2
// How far either side of an entry's name a precise coordinate counts as
// adjacent. Wide enough to span a meta tag, a JSON-LD block, or a list item.
const ADJACENCY_WINDOW = 500
// Four or more decimal places is about eleven metres or better. The
// lookbehind stops a match starting partway through a longer number.
const PRECISE_COORDINATE = /(?<![\d.])\d{1,3}\.\d{4,}/g

function fail(message) {
  console.error(`assert-atlas-policy: ${message}`)
  process.exit(1)
}

async function readJson(path, description) {
  let text
  try {
    text = await readFile(path, 'utf-8')
  } catch {
    fail(`${path} not found; ${description}`)
  }
  try {
    return { text, json: JSON.parse(text) }
  } catch (error) {
    fail(`${path} is not valid JSON: ${error.message}`)
  }
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? collectFiles(path) : [path]
    })
  )
  return files.flat()
}

function decimalPlaces(value) {
  const written = String(value)
  if (/e/i.test(written)) return Infinity
  const point = written.indexOf('.')
  return point === -1 ? 0 : written.length - point - 1
}

// The forms a name can take once it has been through HTML or JSON escaping.
function nameVariants(name) {
  const htmlEscaped = name
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
  return new Set([
    name,
    htmlEscaped,
    htmlEscaped.replaceAll("'", '&#39;'),
    htmlEscaped.replaceAll("'", '&#x27;'),
    name.replaceAll('"', '\\"'),
  ])
}

function describe(entry) {
  return `"${entry.name}" (${entry.slug}, ${entry.locationPolicy})`
}

const { json: manifest } = await readJson(
  MANIFEST_PATH,
  'the Strapi loader writes it on every build, so the atlas collection did not load'
)
const { text: geojsonText, json: geojson } = await readJson(
  GEOJSON_PATH,
  'src/pages/atlas.geojson.ts should have produced it'
)

if (!Array.isArray(manifest)) fail(`${MANIFEST_PATH} is not an array`)
if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
  fail(`${GEOJSON_PATH} is not a FeatureCollection`)
}

const manifestBySlug = new Map(manifest.map((entry) => [entry.slug, entry]))
const publishedEntries = manifest.filter((entry) => entry.published)
const features = geojson.features
const offenders = []
const seenSlugs = new Set()
// Exact coordinates are public by policy and formatCoordinates prints them to
// four decimals, so one sitting beside a fuzzed entry's name on a list page
// is not a leak.
const exactCoordinateValues = []

for (const feature of features) {
  const slug = feature.properties?.slug
  const entry = manifestBySlug.get(slug)
  const label = entry ? describe(entry) : `feature "${slug}"`

  if (!entry || !entry.published) {
    offenders.push(`${label} is not a published atlas entry but has a feature`)
    continue
  }
  if (seenSlugs.has(slug)) offenders.push(`${label} has more than one feature`)
  seenSlugs.add(slug)

  const extraProperties = Object.keys(feature.properties).filter(
    (key) => !ALLOWED_PROPERTIES.has(key)
  )
  if (extraProperties.length > 0) {
    offenders.push(`${label} carries properties the map does not need: ${extraProperties.join(', ')}`)
  }

  const coordinates = feature.geometry?.coordinates
  if (
    feature.geometry?.type !== 'Point' ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every(Number.isFinite)
  ) {
    offenders.push(`${label} does not have a two-number Point geometry`)
    continue
  }

  if (entry.locationPolicy === 'withheld') {
    offenders.push(`${label} is withheld but has a feature at ${coordinates.join(', ')}`)
  }
  if (
    entry.locationPolicy === 'fuzzed' &&
    coordinates.some((value) => decimalPlaces(value) > FUZZED_MAX_DECIMALS)
  ) {
    offenders.push(
      `${label} is fuzzed but its feature has more than ${FUZZED_MAX_DECIMALS} decimal places: ${coordinates.join(', ')}`
    )
  }
  if (entry.locationPolicy === 'exact') {
    exactCoordinateValues.push(...coordinates.map(Math.abs))
  }
}

const withheldEntries = publishedEntries.filter((entry) => entry.locationPolicy === 'withheld')
const unlocatedEntries = publishedEntries.filter(
  (entry) => entry.locationPolicy !== 'withheld' && !entry.hasLocation
)
const expectedFeatureCount = publishedEntries.filter(
  (entry) => entry.locationPolicy !== 'withheld' && entry.hasLocation
).length

if (features.length !== expectedFeatureCount) {
  offenders.push(
    `${GEOJSON_PATH} has ${features.length} features, expected ${expectedFeatureCount} ` +
      '(published, not withheld, with a recorded location)'
  )
}

// The paranoid check: a precise coordinate next to the name of an entry that
// must not have one, anywhere in the build. This is what catches a leak
// through a meta tag, a JSON-LD block, a data attribute, or hand-written alt
// text. Drafts are included, since preview builds render them.
const sensitiveEntries = manifest.filter((entry) => entry.locationPolicy !== 'exact')
const isPublicExactValue = (value) =>
  exactCoordinateValues.some((exactValue) => Math.abs(exactValue - value) < 1e-9)

const distFiles = await collectFiles(DIST_DIR)
let scannedFileCount = 0

for (const file of distFiles) {
  const buffer = await readFile(file)
  // Images and fonts; no coordinate in them is a decimal string.
  if (buffer.includes(0)) continue
  scannedFileCount += 1
  const content = buffer.toString('utf-8')

  const preciseCoordinates = [...content.matchAll(PRECISE_COORDINATE)].filter(
    (match) => !isPublicExactValue(Number(match[0]))
  )
  if (preciseCoordinates.length === 0) continue

  for (const entry of sensitiveEntries) {
    const reported = new Set()
    for (const variant of nameVariants(entry.name)) {
      let nameIndex = content.indexOf(variant)
      while (nameIndex !== -1) {
        const windowStart = nameIndex - ADJACENCY_WINDOW
        const windowEnd = nameIndex + variant.length + ADJACENCY_WINDOW
        for (const match of preciseCoordinates) {
          const matchEnd = match.index + match[0].length
          if (matchEnd >= windowStart && match.index <= windowEnd && !reported.has(match[0])) {
            reported.add(match[0])
            offenders.push(
              `${file}: ${describe(entry)} is within ${ADJACENCY_WINDOW} characters of the coordinate ${match[0]}`
            )
          }
        }
        nameIndex = content.indexOf(variant, nameIndex + 1)
      }
    }
  }
}

console.log(
  `assert-atlas-policy: wrote ${features.length} features to ${GEOJSON_PATH} ` +
    `(${Buffer.byteLength(geojsonText)} bytes); ${withheldEntries.length} entries withheld, ` +
    `${unlocatedEntries.length} not plotted because no location is recorded; ` +
    `scanned ${scannedFileCount} files.`
)

if (offenders.length > 0) {
  console.error('assert-atlas-policy: the build breaks the atlas location policy:')
  for (const offender of offenders) console.error(`  ${offender}`)
  process.exit(1)
}

console.log('assert-atlas-policy: no precise coordinates found for a fuzzed or withheld entry.')
