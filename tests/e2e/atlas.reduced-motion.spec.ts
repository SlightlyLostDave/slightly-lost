import { test, expect } from './fixtures'
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

// Runs only under the chromium-reduced-motion project (see playwright.config.ts),
// with the media query also emulated explicitly, as home.reduced-motion does.
// The counterpart in atlas.spec.ts shows the same click easing without it.

test('with reduced motion the camera jumps to a selection instead of easing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const [place, neighbour] = await closestPair(page)
  await serveOnlyEntries(page, [place.properties.slug, neighbour.properties.slug])
  await page.goto(ATLAS_PATH)
  await waitForMap(page)
  await page.waitForLoadState('networkidle')

  // Records every frame the camera reports moving, from inside the page.
  await mapRoot(page).evaluate((root) => {
    const observer = new MutationObserver(() => {
      if (root.hasAttribute('data-map-moving')) {
        requestAnimationFrame(() => {
          if (root.hasAttribute('data-map-moving')) root.dataset.sawEasing = ''
        })
      }
    })
    observer.observe(root, { attributes: true, attributeFilter: ['data-map-moving'] })
  })

  const box = await mapCanvas(page).boundingBox()
  if (!box) throw new Error('the map canvas has no box')
  const offset = openingViewOffset(
    place.geometry.coordinates,
    neighbour.geometry.coordinates,
    FIT_MAX_ZOOM
  )
  await page.mouse.click(box.x + box.width / 2 + offset.x, box.y + box.height / 2 + offset.y)

  await expect(page.locator('[data-atlas-panel] h2')).toHaveText(place.properties.name)
  await page.waitForTimeout(600)
  await expect(mapRoot(page)).not.toHaveAttribute('data-map-moving')
  await expect(mapRoot(page)).not.toHaveAttribute('data-saw-easing')
})
