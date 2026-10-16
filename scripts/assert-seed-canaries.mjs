// The seeded build's leak check, run by .github/actions/seeded-build after
// `npm run build`. assert-atlas-policy.mjs never knows where a fuzzed or
// withheld place really is, so it can only look for precision next to a
// name. This script does know, for the seeded content only: the seed's
// invented coordinates are in cms/scripts/synthetic-locations.ts, and it
// fails if any of them reaches the build output or a content store at three
// or more decimals, or if a withheld one appears in any form at all.
//
// Not chained into `npm run build`, because a build against any other Strapi
// has different content and these values mean nothing there.

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  SYNTHETIC_LOCATIONS,
  WITHHELD_SYNTHETIC_LOCATIONS,
} from '../cms/scripts/synthetic-locations.ts'

const SCANNED_DIRS = ['dist', join('node_modules', '.astro'), '.astro']
// A fuzzed place publishes two decimals by design, so three is the first
// precision that is a leak.
const LEAK_DECIMALS = [3, 4, 5, 6]

async function collectFiles(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? collectFiles(path) : [path]
    })
  )
  return files.flat()
}

// Every way a value could be written at a given precision: truncated, as a
// careless slice would, and rounded, as toFixed would.
function writtenForms(value, decimals) {
  const magnitude = Math.abs(value)
  const factor = 10 ** decimals
  return [(Math.trunc(magnitude * factor) / factor).toFixed(decimals), magnitude.toFixed(decimals)]
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const canaries = []
for (const [key, location] of Object.entries(SYNTHETIC_LOCATIONS)) {
  const withheld = WITHHELD_SYNTHETIC_LOCATIONS.includes(key)
  for (const value of [location.lat, location.lng]) {
    const forms = new Set(LEAK_DECIMALS.flatMap((decimals) => writtenForms(value, decimals)))
    for (const form of forms) {
      canaries.push({ key, form, pattern: new RegExp(`(?<![\\d.])${escapeRegExp(form)}`, 'g') })
    }
    if (withheld) {
      const published = Math.abs(value).toFixed(2)
      canaries.push({
        key,
        form: published,
        pattern: new RegExp(`(?<![\\d.])${escapeRegExp(published)}(?!\\d)`, 'g'),
      })
    }
  }
}

const offenders = []
let scannedFileCount = 0

for (const dir of SCANNED_DIRS) {
  for (const file of await collectFiles(dir)) {
    const buffer = await readFile(file)
    // Images, fonts, glyphs, and tiles; no coordinate in them is a decimal string.
    if (buffer.includes(0)) continue
    scannedFileCount += 1
    const content = buffer.toString('utf-8')
    for (const canary of canaries) {
      for (const match of content.matchAll(canary.pattern)) {
        const context = content.slice(Math.max(0, match.index - 40), match.index + 40)
        offenders.push(`${file}: ${canary.form} from the seeded ${canary.key}, in "${context}"`)
      }
    }
  }
}

console.log(
  `assert-seed-canaries: looked for ${canaries.length} forms of ${Object.keys(SYNTHETIC_LOCATIONS).length} ` +
    `seeded locations in ${scannedFileCount} files.`
)

if (offenders.length > 0) {
  console.error(
    'assert-seed-canaries: a seeded coordinate the location policy should have removed is in the build:'
  )
  for (const offender of offenders) console.error(`  ${offender}`)
  process.exit(1)
}

console.log('assert-seed-canaries: no seeded fuzzed or withheld coordinate found.')
