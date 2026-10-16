import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { ATLAS_PATH, mapRoot, waitForMap } from './atlas-map'

// The kind filter on the atlas index. It filters the server-rendered
// catalogue in place and tells the map island, which follows.

function rows(page: Page) {
  return page.locator('[data-atlas-catalogue] li')
}

function pill(page: Page, filter: string) {
  return page.locator(`[data-atlas-filter-option="${filter}"]`)
}

test('a kind pill filters the catalogue and the map together, and All restores both', async ({
  page,
}) => {
  await page.goto(ATLAS_PATH)
  const total = await rows(page).count()
  const mines = page.locator('[data-atlas-catalogue] li[data-atlas-kind="mine"]')
  const mineCount = await mines.count()
  expect(mineCount).toBeGreaterThan(0)
  expect(mineCount).toBeLessThan(total)

  await expect(pill(page, 'all')).toHaveAttribute('aria-pressed', 'true')
  await pill(page, 'mine').click()

  await expect(pill(page, 'mine')).toHaveAttribute('aria-pressed', 'true')
  await expect(pill(page, 'all')).toHaveAttribute('aria-pressed', 'false')
  await expect(rows(page).filter({ visible: true })).toHaveCount(mineCount)
  for (let index = 0; index < mineCount; index++) await expect(mines.nth(index)).toBeVisible()
  await expect(page.locator('[data-atlas-count]')).toHaveText(`Showing ${mineCount} of ${total}`)
  await expect(page).toHaveURL(/\?kind=mine$/)

  // The island reads the filter the page is already in when it mounts.
  await waitForMap(page)
  await expect(mapRoot(page)).toHaveAttribute('data-map-filter', 'mine')

  await pill(page, 'all').click()
  await expect(rows(page).filter({ visible: true })).toHaveCount(total)
  await expect(page.locator('[data-atlas-count]')).toHaveText(`Showing ${total} of ${total}`)
  await expect(page).toHaveURL(/\/atlas$/)
  await expect(mapRoot(page)).toHaveAttribute('data-map-filter', 'all')
})

test('a ?kind= link arrives filtered, and an unknown kind shows everything', async ({ page }) => {
  await page.goto(`${ATLAS_PATH}?kind=wreck`)
  const wrecks = page.locator('[data-atlas-catalogue] li[data-atlas-kind="wreck"]')
  await expect(pill(page, 'wreck')).toHaveAttribute('aria-pressed', 'true')
  await expect(rows(page).filter({ visible: true })).toHaveCount(await wrecks.count())

  await page.goto(`${ATLAS_PATH}?kind=volcano`)
  await expect(pill(page, 'all')).toHaveAttribute('aria-pressed', 'true')
  await expect(rows(page).filter({ visible: true })).toHaveCount(await rows(page).count())
})

test('a filter that matches nothing shows the empty state, which leads back to everything', async ({
  page,
}) => {
  await page.goto(ATLAS_PATH)
  const total = await rows(page).count()
  const empty = page.locator('[data-atlas-empty]')
  await expect(empty).toBeHidden()

  // Seeded content has an entry of every kind, so stand in for an empty kind
  // by taking one kind's rows out of the catalogue.
  await page.locator('[data-atlas-catalogue] li[data-atlas-kind="wreck"]').evaluateAll((items) => {
    for (const item of items) item.remove()
  })
  await pill(page, 'wreck').click()

  await expect(empty).toBeVisible()
  await expect(empty).toContainText('Nothing is filed under Wrecks yet.')
  await expect(rows(page).filter({ visible: true })).toHaveCount(0)

  await empty.getByRole('button').click()
  await expect(empty).toBeHidden()
  await expect(pill(page, 'all')).toHaveAttribute('aria-pressed', 'true')
  await expect(pill(page, 'all')).toBeFocused()
  await expect(rows(page).filter({ visible: true })).toHaveCount(await rows(page).count())
  expect(await rows(page).count()).toBeLessThan(total)
})
