import type { AtlasKindSlug } from '@/config/atlas'

// The kind filter on the atlas index, as client code sees it. 'all' shows
// every entry; anything else is a kind slug.
export type AtlasFilter = AtlasKindSlug | 'all'

// Dispatched on document by AtlasFilters.script.ts after every change, so
// the map island can follow the list without either importing the other.
// Like THEME_CHANGE_EVENT in src/lib/theme.ts, client code imports this
// module for types only and spells the name as a literal typed
// `typeof ATLAS_FILTER_CHANGE_EVENT`, so it never becomes a shared chunk.
export const ATLAS_FILTER_CHANGE_EVENT = 'atlasfilterchange'

export interface AtlasFilterChangeDetail {
  filter: AtlasFilter
}

// Fills {name} placeholders in the catalogue copy from src/config/atlas.ts,
// at build time in AtlasCatalogue.astro and again in the filter script from
// the template carried in a data attribute. An unknown placeholder is left
// as written, so a typo shows up on the page instead of vanishing.
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] ?? placeholder)
}

declare global {
  interface DocumentEventMap {
    [ATLAS_FILTER_CHANGE_EVENT]: CustomEvent<AtlasFilterChangeDetail>
  }
}
