import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { site } from '@/config'
import { toFeedItem } from '@/lib/feed'
import { getPublishedAtlasEntries } from '@/lib/atlas'
import { getPublishedPosts } from '@/lib/posts'

export async function GET(context: APIContext) {
  if (!context.site) throw new Error('rss.xml: astro.config.mjs must set `site`')

  const posts = await getPublishedPosts()
  const sorted = [...posts].sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
  )

  const atlasEntries = new Map(
    (await getPublishedAtlasEntries()).map((entry) => [entry.id, entry] as const)
  )

  return rss({
    title: site.name,
    description: site.description,
    site: context.site,
    trailingSlash: false,
    items: sorted.map((post) => toFeedItem(post, atlasEntries)),
  })
}
