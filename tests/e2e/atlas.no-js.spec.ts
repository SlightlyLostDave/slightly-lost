import { test, expect } from '@playwright/test'

// Runs only under the chromium-no-js project (see playwright.config.ts). The
// list is the atlas; the map is an enhancement that does not exist here.
test('every plotted entry is listed and the map unit is not displayed without JavaScript', async ({
  page,
}) => {
  const response = await page.request.get('/atlas.geojson')
  const { features } = (await response.json()) as {
    features: { properties: { name: string } }[]
  }

  await page.goto('/atlas')

  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('[data-atlas-map]')).toBeHidden()

  const listedNames = page.locator('#atlas-list + ul li a')
  for (const feature of features) {
    await expect(listedNames.filter({ hasText: feature.properties.name })).toHaveCount(1)
  }
  // Withheld entries have no feature but are still listed.
  expect(await listedNames.count()).toBeGreaterThan(features.length)
})
