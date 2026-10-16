import { getCollection, type CollectionEntry } from 'astro:content'
import { allAtlasKinds, atlas, type AtlasKind } from '@/config/atlas'
import { formatCoordinates, type Coordinates } from '@/lib/location-policy'
import type { PublishedPost } from '@/lib/posts'

export type PublishedAtlasEntry = CollectionEntry<'atlasEntries'> & {
  data: { publishedAt: Date }
}

// An entry whose policy left it a location. The location is already final:
// rounded if fuzzed, and never present at all if withheld.
export type LocatedAtlasEntry<Entry extends CollectionEntry<'atlasEntries'>> = Entry & {
  data: { location: Coordinates }
}

export interface AtlasKindGroup<Entry extends CollectionEntry<'atlasEntries'>> {
  kind: AtlasKind
  entries: Entry[]
}

// `status` on an atlas entry is how well the place is known, not whether it
// is published, so publication is read from publishedAt.
export function isPublishedAtlasEntry(
  entry: CollectionEntry<'atlasEntries'>
): entry is PublishedAtlasEntry {
  return entry.data.publishedAt !== null
}

// The single choke point every atlas listing, feed, and map should use.
// A draft is reachable only at its own entry URL, generated separately from
// an unfiltered getCollection('atlasEntries') call in that route alone.
export async function getPublishedAtlasEntries(): Promise<PublishedAtlasEntry[]> {
  const atlasEntries = await getCollection('atlasEntries')
  return atlasEntries.filter(isPublishedAtlasEntry)
}

// Groups in the display order from src/config/atlas.ts, leaving out any kind
// with no entries.
export function groupAtlasEntriesByKind<Entry extends CollectionEntry<'atlasEntries'>>(
  atlasEntries: Entry[]
): AtlasKindGroup<Entry>[] {
  return allAtlasKinds
    .map((kind) => ({
      kind,
      entries: atlasEntries.filter((entry) => entry.data.kind === kind.slug),
    }))
    .filter((group) => group.entries.length > 0)
}

// The entries that can be plotted. Withheld entries never qualify, and an
// exact or fuzzed entry with no recorded coordinates does not either.
export function getLocatedAtlasEntries<Entry extends CollectionEntry<'atlasEntries'>>(
  atlasEntries: Entry[]
): LocatedAtlasEntry<Entry>[] {
  return atlasEntries.filter(
    (entry): entry is LocatedAtlasEntry<Entry> => entry.data.location !== undefined
  )
}

// getPostAtlasEntry and getAtlasEntryDispatches are the two directions of one
// relation, and both read the same field, post.data.atlasEntry. Nothing on
// the entry side stores the posts, so the article's atlas block and the
// entry's related dispatches cannot disagree about which posts belong to
// which entry.

// The entry a post is about, from whichever entries the build loaded. A
// production build loads published entries only; the caller narrows with
// isPublishedAtlasEntry before linking to it.
export function getPostAtlasEntry<Entry extends CollectionEntry<'atlasEntries'>>(
  post: CollectionEntry<'posts'>,
  atlasEntries: readonly Entry[]
): Entry | undefined {
  const atlasEntryId = post.data.atlasEntry?.id
  if (atlasEntryId === undefined) return undefined
  return atlasEntries.find((entry) => entry.id === atlasEntryId)
}

// The published posts written about an entry, oldest first, so the sequence
// of visits reads in order on the entry page.
export function getAtlasEntryDispatches(
  entry: CollectionEntry<'atlasEntries'>,
  publishedPosts: readonly PublishedPost[]
): PublishedPost[] {
  return publishedPosts
    .filter((post) => post.data.atlasEntry?.id === entry.id)
    .sort((a, b) => a.data.publishedAt.getTime() - b.data.publishedAt.getTime())
}

export interface FieldDataRow {
  label: string
  value: string
  unit?: string
  accent?: boolean
  // 'atlas' rows are derived from the linked entry; 'post' rows were typed
  // into the post. FieldDataStrip writes this into the markup so
  // scripts/assert-atlas-policy.mjs can tell the two apart in the build.
  source: 'post' | 'atlas'
}

// A post's field data strip. When the post is about an atlas entry, the
// coordinate row is the entry's location, which the loader has already put
// through the location policy, formatted the same way AtlasCard formats it.
// A coordinate typed into the post never saw the policy, so it is never used
// here, and the build fails if one appears on a post linked to a fuzzed or
// withheld entry.
export function getPostFieldData(
  fieldData: CollectionEntry<'posts'>['data']['fieldData'],
  atlasEntry: CollectionEntry<'atlasEntries'> | undefined
): FieldDataRow[] {
  const authoredRows = fieldData.map((row): FieldDataRow => ({ ...row, source: 'post' }))
  if (!atlasEntry) return authoredRows
  return [
    {
      label: atlas.post.coordinatesLabel,
      value: formatCoordinates(atlasEntry.data.location, atlasEntry.data.locationPolicy),
      source: 'atlas',
    },
    ...authoredRows,
  ]
}

// The atlas design writes dates year first, 2019.04.11.
export function formatAtlasDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '.')
}
