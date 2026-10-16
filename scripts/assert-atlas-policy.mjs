// Independent verification that the built site honours the atlas location
// policy, rather than trusting that the loader applied it. Chained after
// assert-no-draft-leak.mjs in package.json. It reads the built output in
// dist/, not the source, and checks it against the policy manifest the
// Strapi loader writes into Astro's cache directory (names and policies only,
// never coordinates; see writeAtlasPolicyManifest in src/loaders/strapi.ts).
//
// Unlike the draft check this never skips for preview builds: the location
// policy holds in every build.
//
// It also reads every post's field data strip, because a coordinate typed by
// hand into a post's fieldData is one the location policy never saw. On a
// post linked to an atlas entry the coordinate row comes from the entry (see
// getPostFieldData in src/lib/atlas.ts), and FieldDataStrip.astro marks each
// row with where it came from so this script can tell the two apart.

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findCoordinates } from '../src/lib/coordinate-text.ts'

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

// The whole element whose opening tag starts at openTagStart, found by
// counting same-named tags. The Astro compiler emits well-formed markup, so
// depth counting is enough without a parser.
function extractElement(html, openTagStart) {
  const tagName = /^<([a-zA-Z][\w-]*)/.exec(html.slice(openTagStart))?.[1]
  if (!tagName) return ''
  const tags = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'g')
  tags.lastIndex = openTagStart
  let depth = 0
  for (const match of html.matchAll(tags)) {
    if (match.index < openTagStart) continue
    depth += match[1] === '/' ? -1 : 1
    if (depth === 0) return html.slice(openTagStart, match.index + match[0].length)
  }
  return html.slice(openTagStart)
}

function textContent(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const FIELD_DATA_STRIP = /<[a-zA-Z][\w-]*\b[^>]*\bdata-field-data(?![\w-])[^>]*>/g
const FIELD_DATA_ROW = /<[a-zA-Z][\w-]*\b[^>]*\bdata-field-data-source="([^"]*)"[^>]*>/g
const LINKED_ENTRY_ATTRIBUTE = /\bdata-atlas-entry="([^"]*)"/
// Half of a fuzzed coordinate's last decimal place: any position that rounds
// to a fuzzed entry's published one is within this of it on both axes.
const FUZZED_CELL_HALF_WIDTH = 0.005 + 1e-9

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
// Each fuzzed entry's published position, for matching a typed coordinate
// against it. GeoJSON writes longitude first.
const fuzzedPositions = []

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
  if (entry.locationPolicy === 'fuzzed') {
    fuzzedPositions.push({ entry, lng: coordinates[0], lat: coordinates[1] })
  }
}

const isWithinFuzzedCell = (found, position) =>
  Math.abs(found.lat - position.lat) <= FUZZED_CELL_HALF_WIDTH &&
  Math.abs(found.lng - position.lng) <= FUZZED_CELL_HALF_WIDTH

const warnings = []
let fieldDataStripCount = 0
let fieldDataRowCount = 0

// Three checks on every field data strip in the build:
//
// 1. A post linked to a fuzzed or withheld entry carries no typed coordinate
//    at all, even one matching the published rounding. Its coordinate row
//    comes from the entry. A typed one on an exact entry is only redundant.
// 2. No typed coordinate on any post, linked or not, is more precise than
//    two decimals and inside a fuzzed entry's published cell, which is what
//    typing a fuzzed place's real position looks like. A withheld place
//    cannot be matched this way, because nothing in the build or the
//    manifest knows where it is; the name adjacency scan below covers it.
// 3. The row taken from the entry is what the policy allows: no coordinate
//    for a withheld or unlocated entry, and exactly the published two-decimal
//    position for a fuzzed one.
function checkFieldDataStrips(file, content) {
  for (const stripMatch of content.matchAll(FIELD_DATA_STRIP)) {
    fieldDataStripCount += 1
    const strip = extractElement(content, stripMatch.index)
    const linkedSlug = LINKED_ENTRY_ATTRIBUTE.exec(stripMatch[0])?.[1]
    const linkedEntry = linkedSlug === undefined ? undefined : manifestBySlug.get(linkedSlug)
    if (linkedSlug !== undefined && !linkedEntry) {
      offenders.push(`${file}: field data links atlas entry "${linkedSlug}", which the build did not load`)
      continue
    }

    for (const rowMatch of strip.matchAll(FIELD_DATA_ROW)) {
      fieldDataRowCount += 1
      const source = rowMatch[1]
      const rowText = textContent(extractElement(strip, rowMatch.index))
      const foundCoordinates = findCoordinates(rowText)

      if (source === 'atlas') {
        if (!linkedEntry) {
          offenders.push(`${file}: a field data row claims to come from an atlas entry, but none is linked`)
          continue
        }
        if (linkedEntry.locationPolicy === 'exact') continue
        if (linkedEntry.locationPolicy === 'withheld' || !linkedEntry.hasLocation) {
          for (const found of foundCoordinates) {
            offenders.push(
              `${file}: the coordinate row for ${describe(linkedEntry)} shows "${found.text}", but the entry publishes no location`
            )
          }
          continue
        }
        const published = fuzzedPositions.find((position) => position.entry.slug === linkedEntry.slug)
        const [found, ...extra] = foundCoordinates
        // A draft entry, linked in a preview build, has no feature to compare
        // with, so only its precision can be checked.
        if (!published) {
          for (const draftFound of foundCoordinates.filter((candidate) => candidate.precise)) {
            offenders.push(
              `${file}: the coordinate row for ${describe(linkedEntry)} shows "${draftFound.text}", more precise than the policy allows`
            )
          }
          continue
        }
        const matchesPublished =
          found?.lat !== undefined &&
          !found.precise &&
          extra.length === 0 &&
          Math.abs(found.lat - published.lat) < 1e-9 &&
          Math.abs(found.lng - published.lng) < 1e-9
        if (!matchesPublished) {
          offenders.push(
            `${file}: the coordinate row for ${describe(linkedEntry)} reads "${rowText}", not the entry's published position`
          )
        }
        continue
      }

      if (source !== 'post') {
        offenders.push(`${file}: a field data row has an unknown source "${source}"`)
        continue
      }

      for (const found of foundCoordinates) {
        if (linkedEntry && linkedEntry.locationPolicy !== 'exact') {
          offenders.push(
            `${file}: hand-entered coordinate "${found.text}" in the field data of a post linked to ${describe(linkedEntry)}; ` +
              'the coordinate row comes from the entry, so remove it from the post in Strapi'
          )
          continue
        }
        if (linkedEntry) {
          warnings.push(
            `${file}: hand-entered coordinate "${found.text}" duplicates the row taken from ${describe(linkedEntry)}`
          )
        }
        if (found.lat === undefined || !found.precise) continue
        for (const position of fuzzedPositions) {
          if (isWithinFuzzedCell(found, position)) {
            offenders.push(
              `${file}: hand-entered coordinate "${found.text}" in a post's field data is more precise than ` +
                `${describe(position.entry)} publishes and falls inside its fuzzed position`
            )
          }
        }
      }
    }
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

  if (file.endsWith('.html')) checkFieldDataStrips(file, content)

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
    `scanned ${scannedFileCount} files and ${fieldDataRowCount} field data rows in ${fieldDataStripCount} strips.`
)

for (const warning of warnings) console.warn(`assert-atlas-policy: warning: ${warning}`)

if (offenders.length > 0) {
  console.error('assert-atlas-policy: the build breaks the atlas location policy:')
  for (const offender of offenders) console.error(`  ${offender}`)
  process.exit(1)
}

console.log(
  'assert-atlas-policy: no precise coordinates found for a fuzzed or withheld entry, and no hand-entered coordinates for one in post field data.'
)
