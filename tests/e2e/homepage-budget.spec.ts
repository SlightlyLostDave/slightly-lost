import { test, expect } from './fixtures'
import { measureJsBytes } from './helpers'

const HOMEPAGE_JS_BUDGET_BYTES = 45 * 1024

test('stays within the homepage JS budget (GSAP + ScrollTrigger included)', async ({ page }) => {
  const bytes = await measureJsBytes(page, '/')
  console.log(`homepage JS: brotli-11 ${bytes.brotli}, gzip-9 ${bytes.gzip}, raw ${bytes.raw}`)

  expect(bytes.brotli).toBeLessThan(HOMEPAGE_JS_BUDGET_BYTES)
})
