import { test, expect } from './fixtures'
import { measureJsBytes } from './helpers'

const ARTICLE_PATH = '/field-notes/underwater/sonar-return-bridge'
const ARTICLE_JS_BUDGET_BYTES = 5 * 1024

test('the reading progress bar fills as the article body scrolls', async ({ page }) => {
  await page.goto(ARTICLE_PATH)

  const fill = page.locator('.progress__fill')

  const readScaleX = async () => {
    const transform = await fill.evaluate((el) => getComputedStyle(el).transform)
    if (transform === 'none') return 0
    // matrix(a, b, c, d, tx, ty) - scaleX is the first value.
    const match = transform.match(/matrix\(([^,]+),/)
    return match ? parseFloat(match[1]) : 0
  }

  const initialScale = await readScaleX()

  await page.locator('[data-article-body]').scrollIntoViewIfNeeded()
  await page.mouse.wheel(0, 4000)
  await page.waitForTimeout(300)

  const scrolledScale = await readScaleX()

  expect(scrolledScale).toBeGreaterThan(initialScale)
})

test('stays within the article JS budget', async ({ page }) => {
  const totalBytes = await measureJsBytes(page, ARTICLE_PATH)

  expect(totalBytes).toBeLessThan(ARTICLE_JS_BUDGET_BYTES)
})
