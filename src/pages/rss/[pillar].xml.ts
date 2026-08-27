import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { site } from '@/config'
import { allPillars, type Pillar } from '@/config/pillars'
import { toFeedItem } from '@/lib/feed'
import { getPublishedPosts, type PublishedPost } from '@/lib/posts'

export async function getStaticPaths() {
  const posts = await getPublishedPosts()

  return allPillars.map((pillar) => {
    const pillarPosts = posts
      .filter((post) => post.data.pillar === pillar.slug)
      .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())

    return { params: { pillar: pillar.slug }, props: { pillar, posts: pillarPosts } }
  })
}

interface Props {
  pillar: Pillar
  posts: PublishedPost[]
}

export async function GET(context: APIContext) {
  if (!context.site) throw new Error('rss/[pillar].xml: astro.config.mjs must set `site`')

  const { pillar, posts } = context.props as Props

  return rss({
    title: `${site.name}: ${pillar.name}`,
    description: pillar.description,
    site: context.site,
    trailingSlash: false,
    items: posts.map(toFeedItem),
  })
}
