import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export interface JsFileBytes {
  url: string
  brotli: number
  gzip: number
  raw: number
}

export interface JsBytes {
  brotli: number
  gzip: number
  raw: number
  files: JsFileBytes[]
}

// Sums the compressed size of every JS resource loaded while navigating to
// `path`. The budget in CLAUDE.md is measured as brotli at quality 11, what a
// static host serving precompressed assets puts on the wire. Compressing the
// response bodies here, rather than reading the transfer size, keeps the
// number deterministic: astro preview's own compression (or lack of it) has
// nothing to do with what production serves. Gzip is returned alongside for
// information only.
//
// `afterLoad` runs once the page is idle, for routes whose heaviest script
// only loads on interaction or scroll (the atlas map island); anything it
// causes to load is counted too.
export async function measureJsBytes(
  page: Page,
  path: string,
  afterLoad?: (page: Page) => Promise<void>
): Promise<JsBytes> {
  const responses: Promise<{ url: string; body: Buffer }>[] = []

  page.on('response', (response) => {
    const contentType = response.headers()['content-type'] ?? ''
    if (!contentType.includes('javascript')) return
    // A blob: script is built in the page from bytes already counted, such as
    // MapLibre's worker, which ships inside the main MapLibre chunk. It never
    // crosses the wire, so counting it would count those bytes twice.
    if (response.url().startsWith('blob:')) return
    responses.push(response.body().then((body) => ({ url: response.url(), body })))
  })

  await page.goto(path, { waitUntil: 'networkidle' })
  if (afterLoad) {
    await afterLoad(page)
    await page.waitForLoadState('networkidle')
  }

  const files = (await Promise.all(responses)).map(({ url, body }) => ({
    url,
    raw: body.length,
    gzip: gzipSync(body, { level: 9 }).length,
    brotli: brotliCompressSync(body, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  }))

  const sum = (key: 'brotli' | 'gzip' | 'raw') =>
    files.reduce((total, file) => total + file[key], 0)

  return { brotli: sum('brotli'), gzip: sum('gzip'), raw: sum('raw'), files }
}

// The homepage atlas teaser shows whatever the build counted, so this checks
// that the numbers are final rather than what they are: every statistic that
// renders already reads its count-up target (a script that never ran, or one
// that respected reduced motion, must not leave a zero), and the plate marks
// exactly the places the published GeoJSON plots. Below the threshold in
// src/config/homepage.ts there are no statistics, and the loop checks none.
export async function expectAtlasTeaserIsFinal(page: Page, request: APIRequestContext) {
  for (const stat of await page.locator('[data-count-to]').all()) {
    const finalValue = await stat.getAttribute('data-count-to')
    expect(finalValue).toMatch(/^\d+$/)
    await expect(stat).toHaveText(finalValue ?? '')
  }

  const geojson = (await (await request.get('/atlas.geojson')).json()) as { features: unknown[] }
  await expect(page.locator('[data-atlas-plate-marker]')).toHaveCount(geojson.features.length)
}
