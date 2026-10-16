import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { atlas, site } from '@/config'
import { toAtlasFeedItem } from '@/lib/feed'
import { getPublishedAtlasEntries } from '@/lib/atlas'

// A static route, so it takes precedence over rss/[pillar].xml.ts, which only
// ever generates the six pillar slugs.
export async function GET(context: APIContext) {
  if (!context.site) throw new Error('rss/atlas.xml: astro.config.mjs must set `site`')

  const atlasEntries = [...(await getPublishedAtlasEntries())].sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
  )

  return rss({
    title: `${site.name}: ${atlas.label}`,
    description: atlas.feed.description,
    site: context.site,
    trailingSlash: false,
    items: atlasEntries.map(toAtlasFeedItem),
  })
}
