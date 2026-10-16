import { test, expect } from '@playwright/test'

// Runs only under the chromium-no-js project (see playwright.config.ts). The
// catalogue is the atlas; the map and the filters are enhancements that do
// not exist here.
test('every entry is listed and the map and filters are not displayed without JavaScript', async ({
  page,
}) => {
  const response = await page.request.get('/atlas.geojson')
  const { features } = (await response.json()) as {
    features: { properties: { name: string } }[]
  }

  await page.goto('/atlas')

  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('[data-atlas-map]')).toBeHidden()
  await expect(page.locator('[data-atlas-filters]')).toBeHidden()
  await expect(page.locator('[data-atlas-empty]')).toBeHidden()

  const rows = page.locator('[data-atlas-catalogue] li')
  const listedNames = page.locator('[data-atlas-catalogue] h3 a')
  for (const feature of features) {
    await expect(listedNames.filter({ hasText: feature.properties.name })).toHaveCount(1)
  }
  // Withheld entries have no feature but are still listed, and say why
  // their coordinate is missing where the coordinate would be.
  const rowCount = await rows.count()
  expect(rowCount).toBeGreaterThan(features.length)
  for (let index = 0; index < rowCount; index++) await expect(rows.nth(index)).toBeVisible()
  await expect(rows.filter({ hasText: 'Withheld' })).toHaveCount(rowCount - features.length)

  // A filter link degrades to the whole catalogue.
  await page.goto('/atlas?kind=wreck')
  await expect(rows).toHaveCount(rowCount)
  for (let index = 0; index < rowCount; index++) await expect(rows.nth(index)).toBeVisible()
})

// An entry page is server-rendered throughout, so without JavaScript it is
// the whole page: name, specification with its coordinate row, safety
// notices, and whatever location section the policy allows. Nothing on it is
// left hidden for a script to reveal.
test('every entry page renders in full without JavaScript', async ({ page }) => {
  await page.goto('/atlas')
  const hrefs = await page
    .locator('[data-atlas-catalogue] h3 a')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
  expect(hrefs.length).toBeGreaterThan(0)

  for (const href of hrefs) {
    const response = await page.goto(href)
    expect(response?.status(), href).toBe(200)
    await expect(page.locator('main h1'), href).toBeVisible()
    const specification = page.locator('section', { hasText: 'Specification' }).first()
    await expect(specification, href).toBeVisible()
    await expect(specification, href).toContainText('Coordinates')
    for (const notice of await page.locator('aside[aria-label="Before you go"]').all()) {
      await expect(notice, href).toBeVisible()
    }
    await expect(page.locator('[data-atlas-map]'), href).toHaveCount(0)
    expect(await page.locator('main [hidden]').count(), href).toBe(0)
  }
})
