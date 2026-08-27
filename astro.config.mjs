// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import { pillarByEnum } from './src/config/pillars.ts'

// astro.config.mjs runs directly under Node, before Vite's env pipeline is
// live, so import.meta.env (what the loader and everything else use) isn't
// populated yet. loadEnv reads the same .env files Vite would. STRAPI_URL is
// already required by the loader (src/loaders/strapi.ts throws if unset);
// trusting the same value here means there is exactly one place per
// environment that decides which Strapi host is allowed, instead of a
// second hardcoded dev/prod pair that can drift out of sync.
const { STRAPI_URL, STRAPI_TOKEN, STRAPI_PREVIEW } = loadEnv(
  process.env.NODE_ENV ?? 'production',
  process.cwd(),
  ''
)

if (!STRAPI_URL) {
  throw new Error(
    'astro.config.mjs: STRAPI_URL is not set, needed to allow Strapi media in the image pipeline'
  )
}

const strapiHostname = new URL(STRAPI_URL).hostname

// A draft's article page must still be statically generated so its preview
// URL works, which means it's in Astro's final route list that the sitemap
// integration's `filter` below walks. That filter only ever sees a URL, not
// collection data, so getPublishedPosts() (which the loader and every page
// already use) can't keep a draft out of the sitemap: this is the one place
// that needs its own lookup, because it's the one place operating on the
// emitted URL list rather than on parsed content collection data. Only runs
// in preview builds; a production build never queries drafts, so this is a
// no-op with no network call.
async function fetchDraftHrefs() {
  if (STRAPI_PREVIEW !== 'true') return new Set()

  const hrefs = new Set()
  let page = 1
  let pageCount

  do {
    const query = new URLSearchParams({
      status: 'draft',
      'fields[0]': 'slug',
      'fields[1]': 'pillar',
      'pagination[page]': String(page),
      'pagination[pageSize]': '100',
    })
    const response = await fetch(`${STRAPI_URL}/api/posts?${query}`, {
      headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {},
    })
    if (!response.ok) {
      throw new Error(
        `astro.config.mjs: could not fetch draft posts to exclude from the sitemap (${response.status})`
      )
    }

    /** @type {{ data: { slug: string; pillar: string; publishedAt: string | null }[]; meta: { pagination: { pageCount: number } } }} */
    const body = await response.json()
    for (const post of body.data) {
      if (!post.publishedAt)
        hrefs.add(`/field-notes/${pillarByEnum[post.pillar].slug}/${post.slug}`)
    }
    pageCount = body.meta.pagination.pageCount
    page += 1
  } while (page <= pageCount)

  return hrefs
}

const draftHrefs = await fetchDraftHrefs()

/** @param {string} page */
function isExcludedFromSitemap(page) {
  const path = new URL(page).pathname
  return path === '/404' || path === '/404/' || draftHrefs.has(path)
}

/** @type {import('@astrojs/sitemap').SitemapOptions['serialize']} */
function classifySitemapEntry(item) {
  const path = new URL(item.url).pathname
  const segments = path.split('/').filter(Boolean)

  if (path === '/') {
    return { ...item, changefreq: 'weekly', priority: 1.0 }
  }

  // Pagination overflow pages (/field-notes/2, /field-notes/mines/3,
  // /tags/some-tag/2) share their trailing-segment shape with post detail
  // pages (/field-notes/{pillar}/{slug}), so this check must run before any
  // shape-based classification below. A post slug that is itself a bare
  // number would misfire this rule; no post on this site is ever named that.
  if (/^\d+$/.test(segments[segments.length - 1])) {
    return { ...item, changefreq: 'monthly', priority: 0.3 }
  }

  if (segments.length === 1 && ['field-notes', 'series', 'tags'].includes(segments[0])) {
    return { ...item, changefreq: 'weekly', priority: 0.8 }
  }

  if (segments.length === 2 && segments[0] === 'field-notes') {
    return { ...item, changefreq: 'weekly', priority: 0.8 }
  }

  if (segments.length === 3 && segments[0] === 'field-notes') {
    return { ...item, changefreq: 'monthly', priority: 0.6 }
  }

  if (segments.length === 2 && segments[0] === 'tags') {
    return { ...item, changefreq: 'weekly', priority: 0.5 }
  }

  if (segments.length === 2 && segments[0] === 'series') {
    return { ...item, changefreq: 'monthly', priority: 0.6 }
  }

  return { ...item, changefreq: 'monthly', priority: 0.5 }
}

// https://astro.build/config
export default defineConfig({
  site: 'https://slightlylost.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) => !isExcludedFromSitemap(page),
      serialize: classifySitemapEntry,
    }),
  ],
  image: {
    domains: [strapiHostname],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      subsets: ['latin'],
      // A weight range (space-separated) fetches the single variable file
      // covering that whole axis, instead of a separate static file per
      // discrete weight. 300-500 covers every weight the design system uses.
      weights: ['300 500'],
      styles: ['normal', 'italic'],
      fallbacks: ['serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Inter Tight',
      cssVariable: '--font-inter-tight',
      subsets: ['latin'],
      weights: ['400 600'],
      // Default styles include italic; the design system never uses it here.
      styles: ['normal'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-ibm-plex-mono',
      subsets: ['latin'],
      // No variable axis published on Fontsource for this family, so load the
      // two static weights the design system actually uses rather than the
      // full static weight range.
      weights: ['400', '500'],
      // Default styles include italic; the design system never uses it here.
      styles: ['normal'],
      fallbacks: ['monospace'],
    },
  ],
})
