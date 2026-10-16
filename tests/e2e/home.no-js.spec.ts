import { test, expect } from '@playwright/test'
import { expectAtlasTeaserIsFinal } from './helpers'

// Runs only under the chromium-no-js project (see playwright.config.ts).
// The fixtures.ts console/pageerror listeners aren't used here on purpose:
// with JavaScript disabled there is nothing to fail on, and the point of
// this spec is purely to confirm content renders without any JS at all.
test('hero, primary nav, and homepage teasers render with JavaScript disabled', async ({
  page,
  request,
}) => {
  await page.goto('/')

  await expect(page.locator('[data-hero-layer="type"] h1')).toBeVisible()
  await expect(page.locator('header#site-header a[href="/"]')).toBeVisible()
  await expect(page.locator('nav[aria-label="Primary"] a').first()).toBeVisible()
  await expectAtlasTeaserIsFinal(page, request)
})

test('the transparent header scrolls away instead of floating without JavaScript', async ({
  page,
}) => {
  await page.goto('/')
  const position = await page
    .locator('header#site-header')
    .evaluate((header) => getComputedStyle(header).position)
  expect(position).toBe('absolute')
})
