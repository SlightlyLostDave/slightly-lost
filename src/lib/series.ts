import type { CollectionEntry } from 'astro:content'

export type SeriesSlot =
  | { order: number; kind: 'published'; post: CollectionEntry<'posts'> }
  | { order: number; kind: 'unpublished' }

export interface SeriesSlots {
  series: CollectionEntry<'series'>
  slots: SeriesSlot[]
}

export function getSeriesSlots(
  series: CollectionEntry<'series'>,
  allPosts: CollectionEntry<'posts'>[]
): SeriesSlots {
  const episodes = allPosts.filter((post) => post.data.series?.id === series.id)
  const maxOrder = episodes.reduce((max, post) => Math.max(max, post.data.seriesOrder ?? 0), 0)

  const slots: SeriesSlot[] = []
  for (let order = 1; order <= maxOrder; order++) {
    const post = episodes.find((entry) => entry.data.seriesOrder === order)
    slots.push(post ? { order, kind: 'published', post } : { order, kind: 'unpublished' })
  }

  return { series, slots }
}

export interface SeriesPosition {
  series: CollectionEntry<'series'>
  position: number
  totalSlots: number
  previous?: CollectionEntry<'posts'>
  next?: CollectionEntry<'posts'>
}

export function getSeriesPosition(
  post: CollectionEntry<'posts'>,
  allPosts: CollectionEntry<'posts'>[],
  allSeries: CollectionEntry<'series'>[]
): SeriesPosition | undefined {
  if (!post.data.series || post.data.seriesOrder == null) return undefined

  const series = allSeries.find((entry) => entry.id === post.data.series?.id)
  if (!series) return undefined

  const { slots } = getSeriesSlots(series, allPosts)
  const position = post.data.seriesOrder
  const previousSlot = slots.find((slot) => slot.order === position - 1)
  const nextSlot = slots.find((slot) => slot.order === position + 1)

  return {
    series,
    position,
    totalSlots: slots.length,
    previous: previousSlot?.kind === 'published' ? previousSlot.post : undefined,
    next: nextSlot?.kind === 'published' ? nextSlot.post : undefined,
  }
}
