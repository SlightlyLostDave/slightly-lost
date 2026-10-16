import { test, expect } from './fixtures'

const LINKED_POST_PATH = '/field-notes/mines/centre-hill-headframe'
const UNLINKED_POST_PATH = '/field-notes/underwater/sonar-return-bridge'
const ENTRY_PATH = '/atlas/centre-hill-headframe'
// The seeded entry is fuzzed, so the post shows its rounded position.
const PUBLISHED_COORDINATES = '46.67°N 81.11°W'

test('a post and its atlas entry link to each other and the round trip lands where it started', async ({
  page,
}) => {
  await page.goto(LINKED_POST_PATH)

  const block = page.locator('[data-post-atlas-entry]')
  await expect(block).toBeVisible()
  await expect(block).toContainText('Mine')
  await expect(block).toContainText('Documented')
  await expect(block).toContainText(PUBLISHED_COORDINATES)

  await block.getByRole('link', { name: 'Centre Hill headframe' }).click()
  await expect(page).toHaveURL(new RegExp(`${ENTRY_PATH}/?$`))

  const dispatches = page.getByRole('heading', { name: 'Related dispatches' }).locator('..')
  await dispatches.getByRole('link').first().click()
  await expect(page).toHaveURL(new RegExp(`${LINKED_POST_PATH}/?$`))
})

test('the coordinate row on a linked post comes from the entry, once', async ({ page }) => {
  await page.goto(LINKED_POST_PATH)

  const rows = page.locator('[data-field-data] [data-field-data-source]')
  await expect(rows.filter({ hasText: 'Coordinates' })).toHaveCount(1)
  const atlasRow = page.locator('[data-field-data-source="atlas"]')
  await expect(atlasRow).toHaveCount(1)
  await expect(atlasRow).toContainText(PUBLISHED_COORDINATES)
})

test('the inline atlas reference links its entry by kind and name', async ({ page }) => {
  await page.goto(LINKED_POST_PATH)

  const chip = page.locator('[data-atlas-reference]')
  await expect(chip).toHaveCount(1)
  await expect(chip).toHaveAttribute('href', '/atlas/haul-road-powder-magazine')
  await expect(chip).toContainText('Structure')
  await expect(chip).toContainText('The powder magazine on the haul road')
})

test('the inline atlas reference does not widen the page on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(LINKED_POST_PATH)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('a post with no atlas entry has no atlas block, chip, or derived row', async ({ page }) => {
  await page.goto(UNLINKED_POST_PATH)

  await expect(page.locator('[data-post-atlas-entry]')).toHaveCount(0)
  await expect(page.locator('[data-atlas-reference]')).toHaveCount(0)
  await expect(page.locator('[data-field-data-source="atlas"]')).toHaveCount(0)
  await expect(page.locator('[data-field-data]')).not.toHaveAttribute('data-atlas-entry')
})
