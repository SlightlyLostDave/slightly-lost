// The atlas map style, a MapLibre style object in the site palette.
//
// THE ONE DOCUMENTED EXCEPTION to "hex values live only in app.css". A
// MapLibre style is JSON handed to WebGL and cannot read CSS custom
// properties, so the ramp values it uses are mirrored in `mapRamp` below, and
// each theme's roles are mirrored in `mapPaletteRoles`. app.css stays the
// source of truth: map-style.test.ts reads it and fails if either mirror
// drifts. Reading app.css?raw at build time, as theme-color.ts does, is not
// an option here, because it would ship the whole stylesheet in the island
// bundle and cannot run under node --test.
//
// Pure on purpose: no DOM, no env, no maplibre-gl at runtime (the import is
// type-only), so it is cheap to import and testable under node --test.

import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  StyleSpecification,
} from 'maplibre-gl'
import { atlas, type AtlasStatusSlug } from '../config/atlas.ts'
import { basemap } from '../config/basemap.ts'
import type { SiteTheme } from './theme.ts'

export type MapTheme = SiteTheme

// Mirrored from the @theme ramp in src/styles/app.css, only the steps the
// map uses.
export const mapRamp = {
  paper: '#f7f3ea',
  fog: '#efe8dc',
  linen: '#d9ccba',
  mist: '#c3b199',
  slate: '#6e5f4d',
  graphite: '#3b3129',
  ink: '#1e1813',
  'rust-deep': '#9c4520',
  'rust-glow': '#de8a5a',
  'sage-deep': '#5f6653',
  'sage-glow': '#a9b096',
} as const

export type MapRampName = keyof typeof mapRamp

// Keys are app.css role names without the --color- prefix, so the test can
// compare them to the stylesheet directly. No third palette: the map uses
// the same roles as every other surface on the site.
export type MapRole =
  'surface' | 'surface-raised' | 'text-strong' | 'text-muted' | 'hairline' | 'accent' | 'sage'

export const mapPaletteRoles = {
  dark: {
    surface: 'ink',
    'surface-raised': 'graphite',
    'text-strong': 'paper',
    'text-muted': 'mist',
    hairline: 'slate',
    accent: 'rust-glow',
    sage: 'sage-glow',
  },
  light: {
    surface: 'paper',
    'surface-raised': 'fog',
    'text-strong': 'ink',
    'text-muted': 'slate',
    hairline: 'linen',
    accent: 'rust-deep',
    sage: 'sage-deep',
  },
} as const satisfies Record<MapTheme, Record<MapRole, MapRampName>>

interface MapPalette {
  land: string
  water: string
  label: string
  halo: string
  line: string
}

function paletteFor(theme: MapTheme): MapPalette {
  const roles = mapPaletteRoles[theme]
  return {
    land: mapRamp[roles.surface],
    water: mapRamp[roles['surface-raised']],
    label: mapRamp[roles['text-muted']],
    halo: mapRamp[roles.surface],
    line: mapRamp[roles.hairline],
  }
}

// Roads are for orientation inside the two detail regions: a motorway or a
// trunk road tells you which valley you are in. Past this zoom the reader is
// looking at one place in its landscape and roads are clutter, so they stop.
export const ROADS_MAX_ZOOM = 11
const MAJOR_ROADS_MIN_ZOOM = 8
const RIVERS_MIN_ZOOM = 8

// Outside the detail regions only overzoomed overview tiles exist, so
// overview boundaries and labels carry on a little past the point where
// detail fills take over, rather than leaving the rest of the North Atlantic
// unlabelled the moment the map crosses the overview's maxzoom.
const LINE_AND_LABEL_HANDOFF_ZOOM = 7

const FONT_REGULAR = ['Noto Sans Regular']
const FONT_ITALIC = ['Noto Sans Italic']

type SymbolLayout = NonNullable<Extract<LayerSpecification, { type: 'symbol' }>['layout']>
const labelText: SymbolLayout['text-field'] = ['coalesce', ['get', 'name:en'], ['get', 'name']]

interface ZoomRange {
  minzoom?: number
  maxzoom?: number
}

function fillLayers(source: string, palette: MapPalette, zoom: ZoomRange): LayerSpecification[] {
  return [
    {
      id: `${source}-earth`,
      type: 'fill',
      source,
      'source-layer': 'earth',
      ...zoom,
      paint: { 'fill-color': palette.land },
    },
    {
      id: `${source}-water`,
      type: 'fill',
      source,
      'source-layer': 'water',
      ...zoom,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': palette.water },
    },
  ]
}

function lineLayers(source: string, palette: MapPalette, zoom: ZoomRange): LayerSpecification[] {
  return [
    {
      id: `${source}-boundaries-region`,
      type: 'line',
      source,
      'source-layer': 'boundaries',
      ...zoom,
      minzoom: Math.max(zoom.minzoom ?? 0, 3),
      filter: ['==', ['get', 'kind'], 'region'],
      paint: { 'line-color': palette.line, 'line-width': 0.6, 'line-dasharray': [3, 2] },
    },
    {
      id: `${source}-boundaries-country`,
      type: 'line',
      source,
      'source-layer': 'boundaries',
      ...zoom,
      filter: ['==', ['get', 'kind'], 'country'],
      paint: { 'line-color': palette.line, 'line-width': 1 },
    },
  ]
}

// Detail source only. Rivers and motorways at continental scale are noise.
function riverAndRoadLayers(
  source: string,
  palette: MapPalette,
  zoom: ZoomRange
): LayerSpecification[] {
  return [
    {
      id: `${source}-rivers`,
      type: 'line',
      source,
      'source-layer': 'water',
      minzoom: Math.max(zoom.minzoom ?? 0, RIVERS_MIN_ZOOM),
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'kind'], 'river']],
      paint: { 'line-color': palette.water, 'line-width': 1 },
    },
    {
      id: `${source}-roads-major`,
      type: 'line',
      source,
      'source-layer': 'roads',
      minzoom: Math.max(zoom.minzoom ?? 0, MAJOR_ROADS_MIN_ZOOM),
      maxzoom: ROADS_MAX_ZOOM,
      filter: ['all', ['==', ['get', 'kind'], 'major'], ['!=', ['get', 'is_link'], true]],
      paint: { 'line-color': palette.line, 'line-width': 0.6 },
    },
    {
      id: `${source}-roads-highway`,
      type: 'line',
      source,
      'source-layer': 'roads',
      minzoom: zoom.minzoom ?? 0,
      maxzoom: ROADS_MAX_ZOOM,
      filter: ['all', ['==', ['get', 'kind'], 'highway'], ['!=', ['get', 'is_link'], true]],
      paint: {
        'line-color': palette.line,
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 1.4],
      },
    },
  ]
}

function labelLayers(source: string, palette: MapPalette, zoom: ZoomRange): LayerSpecification[] {
  const halo = { 'text-halo-color': palette.halo, 'text-halo-width': 1.2 }
  return [
    {
      id: `${source}-labels-water`,
      type: 'symbol',
      source,
      'source-layer': 'water',
      ...zoom,
      filter: [
        'all',
        ['==', ['geometry-type'], 'Point'],
        ['in', ['get', 'kind'], ['literal', ['ocean', 'sea', 'bay', 'strait', 'lake']]],
      ],
      layout: {
        'text-field': labelText,
        'text-font': FONT_ITALIC,
        'text-size': ['match', ['get', 'kind'], ['ocean', 'sea'], 12, 10],
        'text-letter-spacing': ['match', ['get', 'kind'], ['ocean', 'sea'], 0.2, 0.05],
        'text-max-width': 8,
      },
      paint: { 'text-color': palette.label, ...halo },
    },
    {
      id: `${source}-labels-locality`,
      type: 'symbol',
      source,
      'source-layer': 'places',
      ...zoom,
      // Protomaps gives each place the earliest zoom it deserves a label at.
      filter: ['all', ['==', ['get', 'kind'], 'locality'], ['<=', ['get', 'min_zoom'], ['zoom']]],
      layout: {
        'text-field': labelText,
        'text-font': FONT_REGULAR,
        'text-size': ['match', ['get', 'kind_detail'], 'city', 12, 'town', 11, 10],
        'text-max-width': 8,
        'symbol-sort-key': ['get', 'sort_key'],
      },
      paint: { 'text-color': palette.label, ...halo },
    },
    {
      id: `${source}-labels-region`,
      type: 'symbol',
      source,
      'source-layer': 'places',
      ...zoom,
      minzoom: Math.max(zoom.minzoom ?? 0, 4),
      filter: ['==', ['get', 'kind'], 'region'],
      layout: {
        'text-field': labelText,
        'text-font': FONT_REGULAR,
        'text-size': 10,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.2,
        'text-max-width': 8,
      },
      paint: { 'text-color': palette.label, ...halo },
    },
    {
      id: `${source}-labels-country`,
      type: 'symbol',
      source,
      'source-layer': 'places',
      ...zoom,
      filter: ['==', ['get', 'kind'], 'country'],
      layout: {
        'text-field': labelText,
        'text-font': FONT_REGULAR,
        'text-size': 11,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.25,
        'text-max-width': 8,
      },
      paint: { 'text-color': palette.label, ...halo },
    },
  ]
}

export interface MapStyleOptions {
  // Absolute URL of the basemap folder. The island resolves basemap.url
  // against the page before passing it in, because PMTiles and glyph
  // requests are made from a worker with no page URL to resolve against.
  basemapUrl: string
  theme?: MapTheme
}

// Dark by default, like the site. The island reads the current theme when it
// initialises and asks for light explicitly.
export function createMapStyle({
  basemapUrl,
  theme = 'dark',
}: MapStyleOptions): StyleSpecification {
  const palette = paletteFor(theme)
  const base = basemapUrl.replace(/\/+$/, '')
  const overview = { maxzoom: LINE_AND_LABEL_HANDOFF_ZOOM }
  const detailFills = { minzoom: basemap.detailMinZoom }
  const detail = { minzoom: LINE_AND_LABEL_HANDOFF_ZOOM }

  return {
    version: 8,
    name: `Slightly Lost atlas, ${theme}`,
    glyphs: `${base}/${basemap.glyphsPath}`,
    sources: {
      overview: {
        type: 'vector',
        url: `pmtiles://${base}/${basemap.overviewFile}`,
        attribution: basemap.attribution,
      },
      detail: {
        type: 'vector',
        url: `pmtiles://${base}/${basemap.detailFile}`,
        attribution: basemap.attribution,
      },
    },
    layers: [
      // Anywhere no tile exists reads as open water rather than a hole.
      { id: 'background', type: 'background', paint: { 'background-color': palette.water } },
      // Overview fills draw at every zoom, overzoomed past their maxzoom, so
      // land outside the detail regions never disappears; detail paints over
      // them inside its boxes.
      ...fillLayers('overview', palette, {}),
      ...fillLayers('detail', palette, detailFills),
      ...lineLayers('overview', palette, overview),
      ...lineLayers('detail', palette, detail),
      ...riverAndRoadLayers('detail', palette, detailFills),
      ...labelLayers('overview', palette, overview),
      ...labelLayers('detail', palette, detail),
    ],
  }
}

// The atlas layers, drawn above the basemap from one GeoJSON source. The
// island adds the source and these layers to createMapStyle()'s output via
// createAtlasMapStyle(), so a theme change is one setStyle() call that diffs
// paint values and keeps the data, the camera, and the selection.

export const ATLAS_SOURCE_ID = 'atlas'
export const ATLAS_SELECTION_LAYER_ID = 'atlas-selection'
export const ATLAS_MARKER_LAYER_ID = 'atlas-markers'
export const ATLAS_CLUSTER_LAYER_ID = 'atlas-clusters'

// Image ids the layers ask for. The island draws them on demand when the map
// reports them missing (src/lib/map-marker-images.ts). The marker image is
// keyed by kind so that giving a kind its own glyph later is a change to the
// image drawing alone, never to the layer.
export const ATLAS_MARKER_IMAGE_PREFIX = 'atlas-marker-'
export const ATLAS_RING_IMAGE = 'atlas-ring'
export const ATLAS_CLUSTER_IMAGE = 'atlas-cluster'

// Marker images are drawn 10px across at icon-size 1. Primary reads as 12px
// and secondary as 6px, the two weights on the homepage teaser plate.
const PRIMARY_MARKER_SIZE = 1.2
const SECONDARY_MARKER_SIZE = 0.6

// The two visual weights come from the one legend in src/config/atlas.ts:
// a status the legend marks primary (an entry with a written dispatch) draws
// in the accent, and every other status draws in sage at the smaller size.
export const primaryMarkerStatuses: readonly AtlasStatusSlug[] = atlas.legend
  .filter((item) => item.marker === 'primary')
  .map((item) => item.status)

function byMarkerWeight<Value extends number | string>(
  primary: Value,
  secondary: Value
): ExpressionSpecification | Value {
  if (primaryMarkerStatuses.length === 0) return secondary
  return ['match', ['get', 'status'], [...primaryMarkerStatuses], primary, secondary]
}

const isCluster: ExpressionSpecification = ['has', 'point_count']
const isPlace: ExpressionSpecification = ['!', isCluster]

export interface AtlasLayerOptions {
  theme?: MapTheme
  // The slug of the entry whose panel is open. The selection ring draws
  // nothing when this is absent.
  selectedSlug?: string
}

export function createAtlasLayers({
  theme = 'dark',
  selectedSlug,
}: AtlasLayerOptions = {}): LayerSpecification[] {
  const roles = mapPaletteRoles[theme]
  const color = (role: MapRole) => mapRamp[roles[role]]

  return [
    {
      id: ATLAS_SELECTION_LAYER_ID,
      type: 'symbol',
      source: ATLAS_SOURCE_ID,
      filter: ['all', isPlace, ['==', ['get', 'slug'], selectedSlug ?? '']],
      layout: {
        'icon-image': ATLAS_RING_IMAGE,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: { 'icon-color': color('accent') },
    },
    {
      // The single marker layer. Clustering only ever changes which features
      // reach it, never the layer itself.
      id: ATLAS_MARKER_LAYER_ID,
      type: 'symbol',
      source: ATLAS_SOURCE_ID,
      filter: isPlace,
      layout: {
        'icon-image': ['concat', ATLAS_MARKER_IMAGE_PREFIX, ['get', 'kind']],
        'icon-size': byMarkerWeight(PRIMARY_MARKER_SIZE, SECONDARY_MARKER_SIZE),
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        // Primary markers draw above secondary ones where they overlap.
        'symbol-sort-key': byMarkerWeight(1, 0),
      },
      paint: {
        'icon-color': byMarkerWeight(color('accent'), color('sage')),
        'icon-halo-color': color('surface'),
        'icon-halo-width': 1,
      },
    },
    {
      // Matches nothing until the source is clustered, above
      // atlas.mapClusterThreshold features.
      id: ATLAS_CLUSTER_LAYER_ID,
      type: 'symbol',
      source: ATLAS_SOURCE_ID,
      filter: isCluster,
      layout: {
        'icon-image': ATLAS_CLUSTER_IMAGE,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': FONT_REGULAR,
        'text-size': 11,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'icon-color': color('surface-raised'),
        'icon-halo-color': color('hairline'),
        'icon-halo-width': 1,
        'text-color': color('text-strong'),
      },
    },
  ]
}

export interface AtlasMapStyleOptions extends MapStyleOptions, AtlasLayerOptions {
  atlasSource: GeoJSONSourceSpecification
}

// The basemap with the atlas source and layers on top: the whole style the
// island hands to MapLibre, at construction and on every theme change.
export function createAtlasMapStyle({
  basemapUrl,
  theme,
  selectedSlug,
  atlasSource,
}: AtlasMapStyleOptions): StyleSpecification {
  const base = createMapStyle({ basemapUrl, theme })
  return {
    ...base,
    sources: { ...base.sources, [ATLAS_SOURCE_ID]: atlasSource },
    layers: [...base.layers, ...createAtlasLayers({ theme, selectedSlug })],
  }
}
