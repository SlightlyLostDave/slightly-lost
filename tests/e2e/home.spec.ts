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

test.describe('keyboard', () => {
  test('the skip link is the first stop, is visible, and moves focus to main', async ({
    page,
  }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeInViewport()

    await page.keyboard.press('Enter')
    await expect(page.locator('main#main-content')).toBeFocused()
  })
})

test.describe('header over the hero', () => {
  test('is a dark island while transparent and solid once the interstitial reaches it', async ({
    page,
  }) => {
    await page.goto('/')
    const header = page.locator('header#site-header')
    await expect(header).toHaveAttribute('data-theme', 'dark')

    const interstitialTop = await page
      .locator('[data-hero] + section')
      .evaluate((section) => section.getBoundingClientRect().top + window.scrollY)
    await page.evaluate((y) => window.scrollTo(0, y), interstitialTop)
    await expect(header).toHaveAttribute('data-header-state', 'solid')
    await expect(header).not.toHaveAttribute('data-theme', 'dark')
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
