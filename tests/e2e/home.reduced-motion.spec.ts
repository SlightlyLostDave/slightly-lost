import { test, expect } from './fixtures'
import { expectAtlasTeaserIsFinal } from './helpers'

// Runs only under the chromium-reduced-motion project (see playwright.config.ts).
// The project's `reducedMotion: 'reduce' context option doesn't reliably
// emulate the media query in headless Chromium here, so this is set
// explicitly before navigation as well.
test('the hero stays static and fully visible under prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const midLayer = page.locator('[data-hero-layer="mid"]')
  const typeLayer = page.locator('[data-hero-layer="type"]')

  // toBeVisible() ignores occlusion, so also confirm nothing paints over the
  // headline: the topmost element at its centre must belong to the hero.
  const headlineIsTopmost = await typeLayer.locator('h1').evaluate((headline) => {
    const box = headline.getBoundingClientRect()
    const topmost = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return Boolean(topmost?.closest('[data-hero]'))
  })
  expect(headlineIsTopmost).toBe(true)

  const initialTransform = await midLayer.evaluate((el) => getComputedStyle(el).transform)

  await page.evaluate(() => window.scrollTo(0, 1000))
  await page.waitForTimeout(1500)

  const scrolledTransform = await midLayer.evaluate((el) => getComputedStyle(el).transform)

  expect(scrolledTransform).toBe(initialTransform)
  await expect(typeLayer).toBeVisible()
  await expect(typeLayer.locator('h1')).toBeVisible()
})

test('animated sections rest in their final state under reduced motion', async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)

  await expectAtlasTeaserIsFinal(page, request)
  const hidden = await page.locator('[data-anim], [data-anim] > *').evaluateAll((elements) =>
    elements.filter((el) => Number(getComputedStyle(el).opacity) < 1).length
  )
  expect(hidden).toBe(0)
})
