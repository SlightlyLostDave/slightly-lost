import { test, expect } from './fixtures'

// The atlas has its own feed, kept out of the main one, and is in the
// sitemap. See the atlas section of docs/slightly-lost-architecture.md.

async function catalogueSlugs(page: import('@playwright/test').Page): Promise<string[]> {
  await page.goto('/atlas')
  const hrefs = await page
    .locator('[data-atlas-catalogue] li[data-atlas-kind] a[href^="/atlas/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
  return [...new Set(hrefs)].sort()
}

test('the atlas feed announces every catalogued entry once', async ({ page, request }) => {
  const response = await request.get('/rss/atlas.xml')
  expect(response.ok()).toBe(true)
  const feed = await response.text()

  const feedSlugs = [...feed.matchAll(/<item>.*?<link>[^<]*?(\/atlas\/[^<]+)<\/link>/gs)]
    .map((match) => match[1])
    .sort()
  expect(feedSlugs).toEqual(await catalogueSlugs(page))
})

test('the main feed carries posts only, no atlas entries', async ({ request }) => {
  const feed = await (await request.get('/rss.xml')).text()
  expect(feed).not.toMatch(/<item>.*?<link>[^<]*\/atlas\/[^<]*<\/link>/s)
})

test('the sitemap lists the atlas index and every catalogued entry', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text()
  const locations = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map(
    (match) => match[1]
  )

  expect(locations).toContain('/atlas')
  for (const slug of await catalogueSlugs(page)) expect(locations).toContain(slug)
  expect(locations.filter((location) => /\.(xml|geojson)$/.test(location))).toEqual([])
})
