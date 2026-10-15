import { test, expect } from './fixtures'

// Runs only under the chromium-reduced-motion project (see playwright.config.ts).
// The project's `reducedMotion: 'reduce' context option doesn't reliably
// emulate the media query in headless Chromium here, so this is set
// explicitly before navigation as well.
test('the hero stays static and fully visible under prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const midLayer = page.locator('[data-hero-layer="mid"]')
  const typeLayer = page.locator('[data-hero-layer="type"]')

  const initialTransform = await midLayer.evaluate((el) => getComputedStyle(el).transform)

  await page.evaluate(() => window.scrollTo(0, 1000))
  await page.waitForTimeout(1500)

  const scrolledTransform = await midLayer.evaluate((el) => getComputedStyle(el).transform)

  expect(scrolledTransform).toBe(initialTransform)
  await expect(typeLayer).toBeVisible()
  await expect(typeLayer.locator('h1')).toBeVisible()
})
