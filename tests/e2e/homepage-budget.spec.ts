import { test, expect } from './fixtures'
import { measureJsBytes } from './helpers'

const HOMEPAGE_JS_BUDGET_BYTES = 45 * 1024

test('stays within the homepage JS budget (GSAP + ScrollTrigger included)', async ({ page }) => {
  const totalBytes = await measureJsBytes(page, '/')

  expect(totalBytes).toBeLessThan(HOMEPAGE_JS_BUDGET_BYTES)
})
