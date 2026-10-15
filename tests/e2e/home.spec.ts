import { test, expect } from './fixtures'

test.describe('theme toggle', () => {
  test('flips aria-pressed, the theme attribute, and persists across reload', async ({
    page,
  }) => {
    await page.goto('/')

    const toggle = page.locator('#theme-toggle')
    const html = page.locator('html')

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(html).not.toHaveAttribute('data-theme', 'light')

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(html).toHaveAttribute('data-theme', 'light')

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('opens, traps focus, and closes on Escape and on the close button', async ({ page }) => {
    await page.goto('/')

    const trigger = page.locator('[data-mobile-menu-trigger]')
    const panel = page.locator('#mobile-menu')
    const closeBtn = page.locator('[data-mobile-menu-close]')

    await expect(panel).not.toHaveAttribute('data-state', 'open')
    await trigger.click()

    await expect(panel).toHaveAttribute('data-state', 'open')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(closeBtn).toBeFocused()

    const focusable = panel.locator(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const focusableCount = await focusable.count()

    for (let i = 0; i < focusableCount; i++) {
      await page.keyboard.press('Tab')
    }
    await expect(focusable.first()).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(panel).not.toHaveAttribute('data-state', 'open')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await trigger.click()
    await expect(panel).toHaveAttribute('data-state', 'open')
    await closeBtn.click()
    await expect(panel).not.toHaveAttribute('data-state', 'open')
  })
})

test.describe('hero parallax', () => {
  test('the mid layer transform changes as the hero stage scrolls', async ({ page }) => {
    await page.goto('/')

    const midLayer = page.locator('[data-hero-layer="mid"]')

    const initialTransform = await midLayer.evaluate((el) => getComputedStyle(el).transform)

    // GSAP's scrub:1 lags real scroll position by up to a second before the
    // tween catches up, so this needs a real settle wait, not a short one.
    await page.evaluate(() => window.scrollTo(0, 1000))
    await page.waitForTimeout(1500)

    const scrolledTransform = await midLayer.evaluate((el) => getComputedStyle(el).transform)

    expect(scrolledTransform).not.toBe(initialTransform)
  })
})
