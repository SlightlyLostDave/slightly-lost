import { test, expect } from './fixtures'

test('the mines pillar page shows the series callout for its seeded series', async ({ page }) => {
  await page.goto('/field-notes/mines')

  await expect(page.getByText('Series in this pillar')).toBeVisible()
})
