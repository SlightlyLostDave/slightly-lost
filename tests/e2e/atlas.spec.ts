import { statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { test, expect } from './fixtures'
import { measureJsBytes } from './helpers'
import {
  ATLAS_PATH,
  FIT_MAX_ZOOM,
  closestPair,
  mapCanvas,
  mapRoot,
  openingViewOffset,
  serveOnlyEntries,
  waitForMap,
} from './atlas-map'

// Architecture section 10: the atlas route's whole JS, island included,
// gzipped. Measured as gzip here rather than the brotli the other budgets
// use, because that is how this one is written.
const ATLAS_JS_BUDGET_BYTES = 300 * 1024

test('the atlas route stays within its JS budget with the map loaded', async ({ page }) => {
  const bytes = await measureJsBytes(page, ATLAS_PATH, waitForMap)
  console.log(`atlas JS: gzip-9 ${bytes.gzip}, brotli-11 ${bytes.brotli}, raw ${bytes.raw}`)

  expect(bytes.files.some((file) => file.url.includes('AtlasMap.client'))).toBe(true)
  expect(bytes.gzip).toBeLessThan(ATLAS_JS_BUDGET_BYTES)
})

for (const path of [
  '/',
  '/field-notes/mines',
  '/field-notes/mines/centre-hill-headframe',
  '/atlas/centre-hill-headframe',
  '/404',
]) {
  test(`${path} ships no MapLibre`, async ({ page }) => {
    const scripts: Promise<string>[] = []
    page.on('response', (response) => {
      if ((response.headers()['content-type'] ?? '').includes('javascript')) {
        scripts.push(response.text())
      }
    })
    await page.goto(path, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForLoadState('networkidle')

    for (const body of await Promise.all(scripts)) expect(body).not.toContain('maplibre')
    expect(await page.locator('[data-atlas-map]').count()).toBe(0)
  })
}

// The point of PMTiles: the map reads the byte ranges it draws, never a whole
// file. A 200 here means the host ignored Range. This proves the client side
// against astro preview; whether the production host honours Range is a
// separate check, see docs/basemap.md.
test('the basemap is read in byte ranges, across load, pan, and a theme change', async ({
  page,
}) => {
  const reads: { file: string; range?: string; status: number; bytes: number }[] = []
  page.on('response', (response) => {
    const { pathname } = new URL(response.url())
    if (!pathname.endsWith('.pmtiles')) return
    reads.push({
      file: basename(pathname),
      range: response.request().headers().range,
      status: response.status(),
      bytes: Number(response.headers()['content-length']),
    })
  })

  // One plotted entry, so the opening view is at FIT_MAX_ZOOM and draws from
  // the detail file as well as the overview.
  const [place] = await closestPair(page)
  await serveOnlyEntries(page, [place.properties.slug])
  await page.goto(ATLAS_PATH)
  await waitForMap(page)
  await page.waitForLoadState('networkidle')
  await mapCanvas(page).focus()
  for (let step = 0; step < 6; step++) await page.keyboard.press('ArrowRight')
  await page.waitForLoadState('networkidle')
  await page.locator('#theme-toggle').click()
  await page.waitForLoadState('networkidle')

  for (const file of ['overview.pmtiles', 'detail.pmtiles']) {
    const fileReads = reads.filter((read) => read.file === file)
    expect(fileReads.length, `${file} was never read`).toBeGreaterThan(0)
    for (const read of fileReads) {
      expect(read.range, `${file} was requested without a Range header`).toMatch(/^bytes=/)
      expect(read.status, `${file} was answered whole`).toBe(206)
    }
    const fetched = fileReads.reduce((total, read) => total + read.bytes, 0)
    expect(fetched).toBeLessThan(statSync(join('public', 'basemap', file)).size / 4)
  }
})

test('the map restyles when the theme toggles, without reloading', async ({ page }) => {
  await page.goto(ATLAS_PATH)
  await waitForMap(page)
  await expect(mapRoot(page)).toHaveAttribute('data-map-theme', 'dark')
  await page.evaluate(() => Reflect.set(window, 'atlasThemeProbe', true))
  // Let the basemap tiles settle so the before image is the finished map.
  await page.waitForLoadState('networkidle')
  const darkMap = await mapCanvas(page).screenshot()

  await page.locator('#theme-toggle').click()

  await expect(mapRoot(page)).toHaveAttribute('data-map-theme', 'light')
  await expect.poll(async () => (await mapCanvas(page).screenshot()).equals(darkMap)).toBe(false)
  expect(await page.evaluate(() => Reflect.get(window, 'atlasThemeProbe'))).toBe(true)
})

test('keyboard reaches the map, zooms, selects a place, and leaves', async ({ page }) => {
  const [place] = await closestPair(page)
  // One plotted entry, so the opening view is centred on it, under the reticle.
  await serveOnlyEntries(page, [place.properties.slug])
  await page.goto(ATLAS_PATH)
  await waitForMap(page)

  const canvas = mapCanvas(page)
  const status = page.locator('[data-atlas-map-status]')
  const zoomIn = page.locator('[data-atlas-zoom="in"]')
  const zoomOut = page.locator('[data-atlas-zoom="out"]')
  const panelHeading = page.locator('[data-atlas-panel] h2')

  // Reach: the skip link, then the map itself.
  await page.locator('[data-atlas-map] a[href="#atlas-list"]').focus()
  await page.keyboard.press('Tab')
  await expect(canvas).toBeFocused()
  await expect(canvas).toHaveAttribute('aria-describedby', 'atlas-map-description')
  await expect(status).toHaveText(new RegExp(`Nearest place: ${place.properties.name}`))

  // Zoom: MapLibre's own key handler on the canvas, then the real buttons.
  await expect(zoomIn).toHaveAttribute('aria-disabled', 'false')
  await page.keyboard.press('Equal')
  await expect(zoomIn).toHaveAttribute('aria-disabled', 'true')
  await zoomOut.focus()
  await page.keyboard.press('Enter')
  await expect(zoomIn).toHaveAttribute('aria-disabled', 'false')

  // Select: Enter on the canvas opens the place under the reticle.
  await canvas.focus()
  await expect(status).toHaveText(new RegExp(`Nearest place: ${place.properties.name}`))
  await page.keyboard.press('Enter')
  await expect(panelHeading).toHaveText(place.properties.name)
  await expect(panelHeading).toBeFocused()

  // Leave: Escape closes the panel back to the map, Escape again leaves for
  // the list, and Tab is never held either.
  await page.keyboard.press('Escape')
  await expect(canvas).toBeFocused()
  await expect(panelHeading).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('#atlas-list')).toBeFocused()

  await canvas.focus()
  await page.keyboard.press('Tab')
  await expect(canvas).not.toBeFocused()
})

test('selecting a place with the pointer eases the camera to it', async ({ page }) => {
  const [place, neighbour] = await closestPair(page)
  await serveOnlyEntries(page, [place.properties.slug, neighbour.properties.slug])
  await page.goto(ATLAS_PATH)
  await waitForMap(page)
  await page.waitForLoadState('networkidle')

  const box = await mapCanvas(page).boundingBox()
  if (!box) throw new Error('the map canvas has no box')
  const offset = openingViewOffset(
    place.geometry.coordinates,
    neighbour.geometry.coordinates,
    FIT_MAX_ZOOM
  )
  await page.mouse.click(box.x + box.width / 2 + offset.x, box.y + box.height / 2 + offset.y)

  await expect(mapRoot(page)).toHaveAttribute('data-map-moving', '')
  await expect(page.locator('[data-atlas-panel] h2')).toHaveText(place.properties.name)
  await expect(mapRoot(page)).not.toHaveAttribute('data-map-moving')
})
