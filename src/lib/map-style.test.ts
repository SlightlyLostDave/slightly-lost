import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { basemap } from '../config/basemap.ts'
import type { GeoJSONSourceSpecification, LayerSpecification } from 'maplibre-gl'
import { atlas } from '../config/atlas.ts'
import { markerImageFor } from './map-marker-images.ts'
import {
  ATLAS_CLUSTER_IMAGE,
  ATLAS_CLUSTER_LAYER_ID,
  ATLAS_MARKER_LAYER_ID,
  ATLAS_RING_IMAGE,
  ATLAS_SELECTION_LAYER_ID,
  ATLAS_SOURCE_ID,
  createAtlasLayers,
  createAtlasMapStyle,
  createMapStyle,
  mapPaletteRoles,
  mapRamp,
  ROADS_MAX_ZOOM,
  type MapRole,
  type MapTheme,
} from './map-style.ts'

// map-style.ts is the one documented place outside app.css that holds hex
// values. These tests are what keep that a mirror rather than a fork.

const appCss = readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8')
const publicBasemap = new URL('../../public/basemap/', import.meta.url)

// The body of the first rule whose selector starts with `opener`. None of the
// blocks read here contain nested braces.
function cssBlock(opener: string): string {
  const start = appCss.indexOf(opener)
  assert.notEqual(start, -1, `app.css: ${opener} not found`)
  const end = appCss.indexOf('}', start)
  return appCss.slice(start, end)
}

function rampHex(name: string): string | undefined {
  return new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(appCss)?.[1]
}

function roleRampName(block: string, role: MapRole): string | undefined {
  return new RegExp(`--color-${role}:\\s*var\\(\\s*--color-([a-z-]+)\\s*\\)`).exec(block)?.[1]
}

const roleBlocks: Record<MapTheme, string[]> = {
  dark: [cssBlock('@theme {'), cssBlock("[data-theme='dark'] {")],
  light: [cssBlock("[data-theme='light'] {")],
}

describe('map style mirrors app.css', () => {
  test('every ramp value matches the stylesheet', () => {
    for (const [name, hex] of Object.entries(mapRamp)) {
      assert.equal(hex.toLowerCase(), rampHex(name)?.toLowerCase(), `--color-${name}`)
    }
  })

  for (const theme of ['dark', 'light'] as const) {
    test(`${theme} roles resolve to the same ramp steps as the stylesheet`, () => {
      for (const block of roleBlocks[theme]) {
        for (const [role, rampName] of Object.entries(mapPaletteRoles[theme])) {
          assert.equal(rampName, roleRampName(block, role as MapRole), `${theme} --color-${role}`)
        }
      }
    })
  }
})

describe('createMapStyle', () => {
  const basemapUrl = 'https://example.test/basemap/'

  test('is dark unless asked for light', () => {
    const background = (theme?: MapTheme) =>
      createMapStyle({ basemapUrl, theme }).layers.find((layer) => layer.type === 'background')
    assert.deepEqual(background()?.paint, { 'background-color': mapRamp.graphite })
    assert.deepEqual(background('light')?.paint, { 'background-color': mapRamp.fog })
  })

  test('points both sources and the glyphs at the basemap folder', () => {
    const style = createMapStyle({ basemapUrl })
    assert.deepEqual(
      Object.values(style.sources).map((source) => 'url' in source && source.url),
      [
        `pmtiles://https://example.test/basemap/${basemap.overviewFile}`,
        `pmtiles://https://example.test/basemap/${basemap.detailFile}`,
      ]
    )
    assert.equal(style.glyphs, `https://example.test/basemap/${basemap.glyphsPath}`)
  })

  test('draws no POIs, buildings, land use, or transit', () => {
    const excluded = new Set(['pois', 'buildings', 'landuse', 'landcover', 'transit'])
    for (const layer of createMapStyle({ basemapUrl }).layers) {
      if ('source-layer' in layer) assert.ok(!excluded.has(layer['source-layer'] ?? ''), layer.id)
    }
  })

  test('stops drawing roads at ROADS_MAX_ZOOM', () => {
    const roadLayers = createMapStyle({ basemapUrl }).layers.filter(
      (layer) => 'source-layer' in layer && layer['source-layer'] === 'roads'
    )
    assert.ok(roadLayers.length > 0)
    for (const layer of roadLayers) assert.ok((layer.maxzoom ?? Infinity) <= ROADS_MAX_ZOOM)
  })

  test('only uses files that exist in public/basemap', () => {
    assert.ok(existsSync(new URL(basemap.overviewFile, publicBasemap)), basemap.overviewFile)
    assert.ok(existsSync(new URL(basemap.detailFile, publicBasemap)), basemap.detailFile)
    for (const layer of createMapStyle({ basemapUrl }).layers) {
      if (layer.type !== 'symbol') continue
      const fontStack = layer.layout?.['text-font']
      assert.ok(Array.isArray(fontStack), layer.id)
      for (const font of fontStack) {
        assert.ok(
          existsSync(new URL(`fonts/${font}/0-255.pbf`, publicBasemap)),
          `${layer.id}: ${font}`
        )
      }
    }
  })
})

// Evaluates the small subset of style expressions the atlas layers use
// against one feature's properties, so the tests can ask "would this feature
// draw, and in what colour" without a WebGL context.
type Properties = Record<string, string | number>

function evaluate(expression: unknown, properties: Properties): unknown {
  if (!Array.isArray(expression)) return expression
  const [operator, ...args] = expression as [string, ...unknown[]]
  switch (operator) {
    case 'get':
      return properties[args[0] as string]
    case 'has':
      return (args[0] as string) in properties
    case '!':
      return !evaluate(args[0], properties)
    case 'all':
      return args.every((arg) => Boolean(evaluate(arg, properties)))
    case '==':
      return evaluate(args[0], properties) === evaluate(args[1], properties)
    case 'concat':
      return args.map((arg) => String(evaluate(arg, properties))).join('')
    case 'match': {
      const input = evaluate(args[0], properties)
      for (let index = 1; index < args.length - 1; index += 2) {
        const labels = args[index]
        const matched = Array.isArray(labels) ? labels.includes(input) : labels === input
        if (matched) return evaluate(args[index + 1], properties)
      }
      return evaluate(args[args.length - 1], properties)
    }
    default:
      throw new Error(`test evaluator does not handle ${operator}`)
  }
}

function layerById(layers: LayerSpecification[], id: string) {
  const layer = layers.find((candidate) => candidate.id === id)
  assert.ok(layer && layer.type === 'symbol', id)
  return layer
}

const place = (properties: Partial<Properties> = {}): Properties => ({
  slug: 'centre-hill',
  name: 'Centre Hill No. 2',
  kind: 'mine',
  status: 'visited',
  href: '/atlas/centre-hill',
  ...properties,
})
const cluster: Properties = { cluster: 1, point_count: 12, point_count_abbreviated: '12' }

describe('createAtlasLayers', () => {
  test('markers draw places and never clusters, clusters only clusters', () => {
    const layers = createAtlasLayers()
    const markers = layerById(layers, ATLAS_MARKER_LAYER_ID)
    const clusters = layerById(layers, ATLAS_CLUSTER_LAYER_ID)
    assert.equal(evaluate(markers.filter, place()), true)
    assert.equal(evaluate(markers.filter, cluster), false)
    assert.equal(evaluate(clusters.filter, place()), false)
    assert.equal(evaluate(clusters.filter, cluster), true)
  })

  test('the marker image is chosen by kind', () => {
    const markers = layerById(createAtlasLayers(), ATLAS_MARKER_LAYER_ID)
    assert.equal(
      evaluate(markers.layout?.['icon-image'], place({ kind: 'wreck' })),
      'atlas-marker-wreck'
    )
  })

  for (const theme of ['dark', 'light'] as const) {
    test(`${theme}: legend primaries read as the accent, everything else as sage`, () => {
      const markers = layerById(createAtlasLayers({ theme }), ATLAS_MARKER_LAYER_ID)
      const roles = mapPaletteRoles[theme]
      for (const item of atlas.legend) {
        const expected = item.marker === 'primary' ? mapRamp[roles.accent] : mapRamp[roles.sage]
        assert.equal(
          evaluate(markers.paint?.['icon-color'], place({ status: item.status })),
          expected
        )
      }
      for (const status of ['researched', 'unconfirmed']) {
        assert.equal(
          evaluate(markers.paint?.['icon-color'], place({ status })),
          mapRamp[roles.sage]
        )
      }
    })
  }

  test('the selection ring draws only the selected place', () => {
    const unselected = layerById(createAtlasLayers(), ATLAS_SELECTION_LAYER_ID)
    assert.equal(evaluate(unselected.filter, place()), false)

    const selected = layerById(
      createAtlasLayers({ selectedSlug: 'centre-hill' }),
      ATLAS_SELECTION_LAYER_ID
    )
    assert.equal(evaluate(selected.filter, place()), true)
    assert.equal(evaluate(selected.filter, place({ slug: 'the-ardmore' })), false)
    assert.equal(evaluate(selected.filter, cluster), false)
  })

  test('every atlas image id the layers can ask for is drawable', () => {
    for (const kind of ['mine', 'wreck', 'settlement', 'structure', 'folklore', 'natural']) {
      assert.ok(markerImageFor(`atlas-marker-${kind}`), kind)
    }
    assert.ok(markerImageFor(ATLAS_RING_IMAGE))
    assert.ok(markerImageFor(ATLAS_CLUSTER_IMAGE))
    assert.equal(markerImageFor('something-else'), undefined)
  })

  test('the atlas label font exists in public/basemap', () => {
    const clusters = layerById(createAtlasLayers(), ATLAS_CLUSTER_LAYER_ID)
    const fontStack = clusters.layout?.['text-font']
    assert.ok(Array.isArray(fontStack))
    for (const font of fontStack) {
      assert.ok(existsSync(new URL(`fonts/${font}/0-255.pbf`, publicBasemap)), font)
    }
  })
})

describe('createAtlasMapStyle', () => {
  const atlasSource: GeoJSONSourceSpecification = { type: 'geojson', data: '/atlas.geojson' }

  test('draws the atlas above the whole basemap, from its own source', () => {
    const style = createAtlasMapStyle({ basemapUrl: 'https://example.test/basemap', atlasSource })
    assert.deepEqual(style.sources[ATLAS_SOURCE_ID], atlasSource)
    const firstAtlasLayer = style.layers.findIndex((layer) => layer.id.startsWith('atlas-'))
    assert.ok(firstAtlasLayer > 0)
    for (const layer of style.layers.slice(firstAtlasLayer)) {
      assert.ok('source' in layer && layer.source === ATLAS_SOURCE_ID, layer.id)
    }
  })
})

describe('markerImageFor', () => {
  test('draws an SDF whose edge sits at alpha 0.75', () => {
    const marker = markerImageFor('atlas-marker-mine')
    assert.ok(marker)
    const { width, height, data } = marker.image
    assert.equal(data.length, width * height * 4)
    const alphaAt = (column: number, row: number) => data[(row * width + column) * 4 + 3] ?? 0
    const centre = Math.floor(width / 2)
    assert.equal(alphaAt(centre, centre), 255)
    assert.equal(alphaAt(0, 0), 0)
    assert.equal(marker.options.sdf, true)
  })
})
