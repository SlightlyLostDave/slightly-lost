// Independent verification that a production build never ships draft
// content or the draft banner, rather than trusting that the loader's
// fetch-gating logic alone is enough. Chained after `astro build` in
// package.json. Every draft page unconditionally renders DraftBanner.astro
// (see src/pages/field-notes/[pillar]/[slug].astro), so a single check for
// its stable marker also proves no draft page slipped into the output.

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const MARKER = 'data-draft-banner'
const DIST_DIR = 'dist'

if (process.env.STRAPI_PREVIEW === 'true') {
  console.log('assert-no-draft-leak: STRAPI_PREVIEW=true, this is a preview build, skipping.')
  process.exit(0)
}

async function collectHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return collectHtmlFiles(path)
      return entry.name.endsWith('.html') ? [path] : []
    })
  )
  return files.flat()
}

const htmlFiles = await collectHtmlFiles(DIST_DIR)
const offenders = []

for (const file of htmlFiles) {
  const content = await readFile(file, 'utf-8')
  if (content.includes(MARKER)) offenders.push(file)
}

if (offenders.length > 0) {
  console.error('assert-no-draft-leak: draft content leaked into a production build:')
  for (const file of offenders) console.error(`  ${file}`)
  process.exit(1)
}

console.log(
  `assert-no-draft-leak: checked ${htmlFiles.length} files, no draft banner markup found.`
)
