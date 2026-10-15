import { test, expect } from './fixtures'

const PILLAR_SLUGS = ['underwater', 'mines']

for (const slug of PILLAR_SLUGS) {
  test.describe(`pillar page: ${slug}`, () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('has no horizontal overflow on mobile', async ({ page }) => {
      await page.goto(`/field-notes/${slug}`)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )

      expect(overflow).toBeLessThanOrEqual(0)
    })

    test('the header switches from transparent to solid on scroll', async ({ page }) => {
      await page.goto(`/field-notes/${slug}`)

      const header = page.locator('#site-header')
      await expect(header).toHaveAttribute('data-header-state', 'transparent')

      await page.mouse.wheel(0, 1200)
      await page.waitForTimeout(300)

      await expect(header).toHaveAttribute('data-header-state', 'solid')
    })
  })
}
