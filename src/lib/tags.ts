import type { CollectionEntry } from 'astro:content'

export function getPostsByTag(
  tag: CollectionEntry<'tags'>,
  allPosts: CollectionEntry<'posts'>[]
): CollectionEntry<'posts'>[] {
  return allPosts.filter((post) => post.data.tags.some((ref) => ref.id === tag.id))
}
