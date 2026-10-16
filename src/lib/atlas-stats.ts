// The homepage atlas statistics, counted from the published entries the build
// actually loaded. Pure, so node --test can load it; the caller passes the
// result of getPublishedAtlasEntries().
import type { AtlasLocationPolicySlug, AtlasStatusSlug } from '../config/atlas.ts'

export interface CountableAtlasEntry {
  data: { status: AtlasStatusSlug; locationPolicy: AtlasLocationPolicySlug }
}

export interface AtlasCounts {
  entries: number
  visited: number
  withheld: number
}

// Documented means visited and written up, so it is a kind of visited, and
// counting `visited` alone would undercount the places I have stood.
const statusesCountedAsVisited: readonly AtlasStatusSlug[] = ['visited', 'documented']

export function countAtlasEntries(atlasEntries: readonly CountableAtlasEntry[]): AtlasCounts {
  return {
    entries: atlasEntries.length,
    visited: atlasEntries.filter((entry) => statusesCountedAsVisited.includes(entry.data.status))
      .length,
    // By policy, not status: a withheld place can be visited or not.
    withheld: atlasEntries.filter((entry) => entry.data.locationPolicy === 'withheld').length,
  }
}

// A handful of entries under a heading that promises a catalogue reads as an
// overclaim, so below the threshold there are no numbers at all rather than
// small ones.
export function getAtlasStats(
  atlasEntries: readonly CountableAtlasEntry[],
  minimumEntries: number
): AtlasCounts | undefined {
  if (atlasEntries.length === 0 || atlasEntries.length < minimumEntries) return undefined
  return countAtlasEntries(atlasEntries)
}
