import type { CollectionEntry } from 'astro:content'

export function getFeaturedPost(
  pillarPosts: CollectionEntry<'posts'>[]
): CollectionEntry<'posts'> | undefined {
  return pillarPosts.find((post) => post.data.featured) ?? pillarPosts[0]
}

export interface PillarSeries {
  series: CollectionEntry<'series'>
  episodes: CollectionEntry<'posts'>[]
}

export function getPillarSeries(
  pillarPosts: CollectionEntry<'posts'>[],
  allSeries: CollectionEntry<'series'>[]
): PillarSeries | undefined {
  const seriesId = pillarPosts.find((post) => post.data.series)?.data.series?.id
  if (!seriesId) return undefined

  const series = allSeries.find((entry) => entry.id === seriesId)
  if (!series) return undefined

  const episodes = pillarPosts
    .filter((post) => post.data.series?.id === seriesId)
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0))

  return { series, episodes }
}
