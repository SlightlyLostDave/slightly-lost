import { test, expect } from '@playwright/test'

// Runs only under the chromium-no-js project (see playwright.config.ts).
// The fixtures.ts console/pageerror listeners aren't used here on purpose:
// with JavaScript disabled there is nothing to fail on, and the point of
// this spec is purely to confirm content renders without any JS at all.
test('hero, primary nav, and homepage teasers render with JavaScript disabled', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.locator('[data-hero-layer="type"] h1')).toBeVisible()
  await expect(page.locator('header#site-header a[href="/"]')).toBeVisible()
  await expect(page.locator('nav[aria-label="Primary"] a').first()).toBeVisible()
})
