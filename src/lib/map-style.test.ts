import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { basemap } from '../config/basemap.ts'
import {
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
