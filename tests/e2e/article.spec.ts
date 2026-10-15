import { test, expect } from './fixtures'
import { measureJsBytes } from './helpers'

const ARTICLE_PATH = '/field-notes/underwater/sonar-return-bridge'
// CLAUDE.md: the article route may load the shared GSAP chunk (the reading
// progress bar) plus at most 5kb of its own JS on top of it.
const ARTICLE_JS_BUDGET_BYTES = 5 * 1024
const SHARED_GSAP_CHUNK = /\/_astro\/motion\.[^/]+\.js$/

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
  const bytes = await measureJsBytes(page, ARTICLE_PATH)

  const ownBytes = bytes.files
    .filter((file) => !SHARED_GSAP_CHUNK.test(new URL(file.url).pathname))
    .reduce((total, file) => total + file.brotli, 0)
  console.log(`article JS beyond the GSAP chunk: brotli-11 ${ownBytes}`)

  expect(ownBytes).toBeLessThan(ARTICLE_JS_BUDGET_BYTES)
})
