import type { CollectionEntry } from 'astro:content'
import type { PostCardData } from '@/components/cards/PostCard.astro'

export function toPostCardData(entry: CollectionEntry<'posts'>): PostCardData {
  return { ...entry.data, image: entry.data.hero, imageAlt: entry.data.hero.alt }
}
