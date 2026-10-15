import { expect, type Locator, type Page } from '@playwright/test'

// Shared by the atlas specs, which run under different Playwright projects.

export const ATLAS_PATH = '/atlas'

export function mapRoot(page: Page): Locator {
  return page.locator('[data-atlas-map]')
}

export function mapCanvas(page: Page): Locator {
  return page.locator('[data-atlas-map] canvas')
}

// Scrolls the map into view, which is what loads the island, and waits until
// it has mounted and drawn its first frame.
export async function waitForMap(page: Page): Promise<void> {
  await mapRoot(page).scrollIntoViewIfNeeded()
  await expect(mapRoot(page)).toHaveAttribute('data-map-theme', /^(dark|light)$/)
  await expect(mapCanvas(page)).toBeVisible()
}

export interface AtlasFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: { slug: string; name: string }
}

export async function fetchAtlasFeatures(page: Page): Promise<AtlasFeature[]> {
  const response = await page.request.get('/atlas.geojson')
  const collection = (await response.json()) as { features: AtlasFeature[] }
  return collection.features
}

// Serves /atlas.geojson with only the named entries, so a test controls
// where the opening view lands. The panel cards on the page are untouched,
// and the slugs must be real ones for selection to find a card.
export async function serveOnlyEntries(page: Page, slugs: readonly string[]): Promise<void> {
  await page.route('**/atlas.geojson', async (route) => {
    const response = await route.fetch()
    const collection = (await response.json()) as { features: AtlasFeature[] }
    const features = collection.features.filter((feature) =>
      slugs.includes(feature.properties.slug)
    )
    await route.fulfill({ response, json: { ...collection, features } })
  })
}

// Must match FIT_MAX_ZOOM in AtlasMap.client.ts.
export const FIT_MAX_ZOOM = 9

// The two plotted entries closest to each other, which the opening view
// fits at FIT_MAX_ZOOM. Chosen from the data rather than named, so the test
// survives a reseed.
export async function closestPair(page: Page): Promise<[AtlasFeature, AtlasFeature]> {
  const features = await fetchAtlasFeatures(page)
  let pair: [AtlasFeature, AtlasFeature] | undefined
  let pairDistance = Infinity
  for (const [index, first] of features.entries()) {
    for (const second of features.slice(index + 1)) {
      const [firstLng, firstLat] = first.geometry.coordinates
      const [secondLng, secondLat] = second.geometry.coordinates
      const distance = Math.hypot(firstLng - secondLng, firstLat - secondLat)
      if (distance < pairDistance) {
        pair = [first, second]
        pairDistance = distance
      }
    }
  }
  if (!pair) throw new Error('the atlas needs at least two plotted entries for this test')
  // Close enough that fitting them is capped at FIT_MAX_ZOOM on any desktop map.
  expect(pairDistance).toBeLessThan(1)
  return pair
}

// Web Mercator in MapLibre's 512px world, so a test can say where on the
// canvas an entry is drawn without a handle on the map.
const TILE_SIZE = 512

function project([lng, lat]: [number, number], zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom
  const sinLatitude = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * worldSize,
  }
}

// Where an entry sits on the canvas in the opening view, for two entries
// close enough that fitting them is capped at AtlasMap.client.ts's
// FIT_MAX_ZOOM, so the view is their projected midpoint at that zoom.
export function openingViewOffset(
  target: [number, number],
  other: [number, number],
  fitMaxZoom: number
): { x: number; y: number } {
  const targetPoint = project(target, fitMaxZoom)
  const otherPoint = project(other, fitMaxZoom)
  const centre = { x: (targetPoint.x + otherPoint.x) / 2, y: (targetPoint.y + otherPoint.y) / 2 }
  return { x: targetPoint.x - centre.x, y: targetPoint.y - centre.y }
}
