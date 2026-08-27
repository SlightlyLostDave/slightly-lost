import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getCollection } from 'astro:content'
import { site } from '@/config'
import { toFeedItem } from '@/lib/feed'

export async function GET(context: APIContext) {
  if (!context.site) throw new Error('rss.xml: astro.config.mjs must set `site`')

  const posts = await getCollection('posts')
  const sorted = [...posts].sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())

  return rss({
    title: site.name,
    description: site.description,
    site: context.site,
    trailingSlash: false,
    items: sorted.map(toFeedItem),
  })
}
