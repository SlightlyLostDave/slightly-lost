import { getCollection, type CollectionEntry } from 'astro:content'
import { allAtlasKinds, type AtlasKind } from '@/config/atlas'
import type { Coordinates } from '@/lib/location-policy'

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
