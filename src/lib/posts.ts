import { getCollection, type CollectionEntry } from 'astro:content'
import type { PostCardData } from '@/components/cards/PostCard.astro'

export function toPostCardData(entry: CollectionEntry<'posts'>): PostCardData {
  return { ...entry.data, image: entry.data.hero, imageAlt: entry.data.hero.alt }
}

export type PublishedPost = CollectionEntry<'posts'> & {
  data: { status: 'published'; publishedAt: Date }
}

export function isPublished(entry: CollectionEntry<'posts'>): entry is PublishedPost {
  return entry.data.status === 'published'
}

// The single choke point every feed, listing, and archive page should use.
// A draft is reachable only at its own article URL, generated separately
// from an unfiltered getCollection('posts') call in that route alone.
export async function getPublishedPosts(): Promise<PublishedPost[]> {
  const posts = await getCollection('posts')
  return posts.filter(isPublished)
}
