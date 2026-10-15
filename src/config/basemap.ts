// The atlas basemap: two PMTiles extracts of the Protomaps planet plus the
// glyphs their labels need, all in one folder so that moving it is a change
// to PUBLIC_BASEMAP_URL and nothing else. How the files were cut, and how to
// cut them again, is in docs/basemap.md.

export interface BasemapCredit {
  label: string
  href: string
  copyright: boolean
}

export interface Basemap {
  url: string
  overviewFile: string
  detailFile: string
  glyphsPath: string
  overviewMaxZoom: number
  detailMinZoom: number
  detailMaxZoom: number
  overviewBounds: readonly [west: number, south: number, east: number, north: number]
  // Shown beside the map by AtlasMap.astro, in the site's own type rather
  // than MapLibre's control.
  credits: readonly BasemapCredit[]
  // The same credits as HTML, for the style's source attribution.
  attribution: string
}

const credits = [
  { label: 'Protomaps', href: 'https://protomaps.com', copyright: false },
  { label: 'OpenStreetMap', href: 'https://openstreetmap.org/copyright', copyright: true },
] as const satisfies readonly BasemapCredit[]

export const basemap = {
  // A folder, not a file. Defaults to public/basemap; Phase 4 may point it at
  // a bucket that serves range requests and CORS for the site origin.
  // Optional chaining because node --test imports this module through
  // map-style.ts, and import.meta.env only exists under Vite.
  url: import.meta.env?.PUBLIC_BASEMAP_URL || '/basemap',
  overviewFile: 'overview.pmtiles',
  detailFile: 'detail.pmtiles',
  glyphsPath: 'fonts/{fontstack}/{range}.pbf',
  // Must match the extract commands in docs/basemap.md.
  overviewMaxZoom: 6,
  detailMinZoom: 6,
  detailMaxZoom: 10,
  // The overview extract's bbox. Nothing exists outside it, so the island
  // holds panning to it, widened only as far as its opening view needs to
  // fit every plotted entry (see AtlasMap.client.ts).
  overviewBounds: [-95, 35, 10, 62],
  credits,
  attribution: credits
    .map(
      (credit) => `${credit.copyright ? '&copy; ' : ''}<a href="${credit.href}">${credit.label}</a>`
    )
    .join(' '),
} as const satisfies Basemap
