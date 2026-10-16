import { Protocol } from 'pmtiles'
import type {
  GeoJSONSource,
  GeoJSONSourceSpecification,
  LngLatBoundsLike,
  MapGeoJSONFeature,
  Map as MapLibreMap,
} from 'maplibre-gl'
import { LngLatBounds, Map, addProtocol, loadMapLibreStyles } from './maplibre'
import { createAtlasPanel } from './AtlasPanel.client'
import { allAtlasKinds, atlas, type AtlasKindSlug } from '@/config/atlas'
import { basemap } from '@/config/basemap'
import type { ATLAS_FILTER_CHANGE_EVENT, AtlasFilter } from '@/lib/atlas-filter'
import { markerImageFor } from '@/lib/map-marker-images'
import {
  ATLAS_CLUSTER_LAYER_ID,
  ATLAS_MARKER_LAYER_ID,
  ATLAS_SOURCE_ID,
  createAtlasMapStyle,
} from '@/lib/map-style'
import { REDUCED_MOTION_QUERY } from '@/lib/motion/media'
import type { SiteTheme, THEME_CHANGE_EVENT } from '@/lib/theme'

// The atlas map island, imported by AtlasMap.script.ts once the map is
// about to scroll into view. Reads /atlas.geojson, whose coordinates are
// already final under the location policy, and never sees anything else.

interface AtlasFeatureProperties {
  slug: string
  name: string
  kind: AtlasKindSlug
}

interface AtlasFeatureCollection {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [lng: number, lat: number] }
    properties: AtlasFeatureProperties
  }[]
}

// Markers are drawn at most 12px across, so a keyboard user has to bring one
// within this distance of the reticle for Enter to reach it.
const NEAREST_RADIUS_PX = 24
const POINTER_RADIUS_PX = 12

// Above this a cluster still contains points that sit on top of each other,
// so clustering stops one zoom short of the deepest the map allows.
const CLUSTER_RADIUS_PX = 40

const CAMERA_DURATION_MS = 400
const FIT_PADDING_PX = 48
// The opening view never zooms in further than this, even for one entry.
const FIT_MAX_ZOOM = 9

let pmtilesRegistered = false

// Type-checked against the constant without importing it; see src/lib/theme.ts.
const themeChangeEvent: typeof THEME_CHANGE_EVENT = 'themechange'
// The same, for the kind filter; see src/lib/atlas-filter.ts.
const filterChangeEvent: typeof ATLAS_FILTER_CHANGE_EVENT = 'atlasfilterchange'

function currentTheme(): SiteTheme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

// The filter the page was in when the island mounted. AtlasFilters.script.ts
// may have applied one, from a ?kind= link or a click, before the map was
// scrolled near enough to load.
function currentFilter(root: HTMLElement): AtlasFilter {
  const filter = root.closest<HTMLElement>('[data-atlas-index]')?.dataset.atlasFilter
  return allAtlasKinds.find((kind) => kind.slug === filter)?.slug ?? 'all'
}

function filterCollection(
  collection: AtlasFeatureCollection,
  filter: AtlasFilter
): AtlasFeatureCollection {
  if (filter === 'all') return collection
  return {
    ...collection,
    features: collection.features.filter((feature) => feature.properties.kind === filter),
  }
}

function boundsOf(collection: AtlasFeatureCollection): LngLatBoundsLike | undefined {
  if (collection.features.length === 0) return undefined
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const feature of collection.features) {
    const [lng, lat] = feature.geometry.coordinates
    west = Math.min(west, lng)
    east = Math.max(east, lng)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  return [west, south, east, north]
}

function showUnavailable(root: HTMLElement) {
  const message = document.createElement('p')
  message.className = 'text-body text-text-muted'
  message.textContent = atlas.map.unavailable
  root.replaceChildren(message)
}

export async function mount(root: HTMLElement): Promise<void> {
  const container = root.querySelector<HTMLElement>('[data-atlas-map-canvas]')
  const status = root.querySelector<HTMLElement>('[data-atlas-map-status]')
  const zoomIn = root.querySelector<HTMLButtonElement>('[data-atlas-zoom="in"]')
  const zoomOut = root.querySelector<HTMLButtonElement>('[data-atlas-zoom="out"]')
  if (!container || !status || !zoomIn || !zoomOut) {
    throw new Error('AtlasMap: AtlasMap.astro markup is missing a map element')
  }

  // The same query the GSAP runtime reads, checked at every camera move so a
  // change to the preference applies without a reload.
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
  const basemapUrl = new URL(basemap.url, window.location.href).href
  let theme: SiteTheme = currentTheme()
  let filter: AtlasFilter = currentFilter(root)
  let selectedSlug: string | undefined

  let map: MapLibreMap
  let allFeatures: AtlasFeatureCollection
  let atlasSource: GeoJSONSourceSpecification
  // A diffed setStyle keeps the source, the camera, and the images, and
  // changes only the paint and filter values that differ.
  let restyle: () => void
  try {
    const [response] = await Promise.all([fetch(atlas.geojsonPath), loadMapLibreStyles()])
    if (!response.ok) throw new Error(`${atlas.geojsonPath} returned ${response.status}`)
    allFeatures = (await response.json()) as AtlasFeatureCollection
    const collection = filterCollection(allFeatures, filter)

    if (!pmtilesRegistered) {
      addProtocol('pmtiles', new Protocol().tile)
      pmtilesRegistered = true
    }

    atlasSource = {
      type: 'geojson',
      data: collection,
      // Decided on every entry, not the filtered set, so changing the filter
      // never turns clustering on or off underneath the reader.
      cluster: allFeatures.features.length > atlas.mapClusterThreshold,
      clusterRadius: CLUSTER_RADIUS_PX,
      clusterMaxZoom: basemap.detailMaxZoom - 1,
      promoteId: 'slug',
    }
    const composeStyle = () => createAtlasMapStyle({ basemapUrl, theme, selectedSlug, atlasSource })

    const overviewBounds: LngLatBoundsLike = [...basemap.overviewBounds]
    map = new Map({
      container,
      style: composeStyle(),
      bounds: boundsOf(collection) ?? overviewBounds,
      fitBoundsOptions: { padding: FIT_PADDING_PX, maxZoom: FIT_MAX_ZOOM },
      maxZoom: basemap.detailMaxZoom,
      // AtlasMap.astro credits the basemap in the site's own type.
      attributionControl: false,
      // Gesture inertia. Camera moves below read the same query themselves.
      reduceMotion: reducedMotion.matches,
      // A drawn plate, not a globe: north stays up.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    // The overview extract is a narrow band of latitude, too narrow to fit
    // places on both sides of the Atlantic in one view, so panning is held
    // to the extract and the opening view together. Beyond the extract the
    // style's background already reads as open sea.
    // Built from every entry, so a filter applied before mount cannot hold
    // the reader out of places a later filter brings back.
    const allBounds = boundsOf(allFeatures)
    map.setMaxBounds(
      LngLatBounds.convert(overviewBounds)
        .extend(map.getBounds())
        .extend(allBounds ?? overviewBounds)
    )

    restyle = () => map.setStyle(composeStyle(), { diff: true })
  } catch (error) {
    console.error('AtlasMap: the map could not start', error)
    showUnavailable(root)
    return
  }

  root.dataset.mapTheme = theme
  root.dataset.mapFilter = filter

  // MapLibre's canvas is the element that takes focus, so it carries the
  // same name and description as the region around it. The negative offset
  // keeps the site's focus ring inside the bordered map unit, which clips.
  const canvas = map.getCanvas()
  canvas.setAttribute('aria-label', atlas.map.label)
  canvas.setAttribute('aria-describedby', 'atlas-map-description')
  canvas.classList.add('-outline-offset-2')

  map.on('styleimagemissing', ({ id }) => {
    const marker = markerImageFor(id)
    if (marker && !map.hasImage(id)) map.addImage(id, marker.image, marker.options)
  })

  // Present only while the camera moves. Under reduced motion every move is
  // a jump, so it is set and cleared in the same task and never seen; the
  // e2e suite reads it to prove exactly that.
  map.on('movestart', () => {
    root.dataset.mapMoving = ''
  })
  map.on('moveend', () => {
    delete root.dataset.mapMoving
  })

  function moveCamera(target: { center: [number, number]; zoom?: number }) {
    if (reducedMotion.matches) map.jumpTo(target)
    else map.easeTo({ ...target, duration: CAMERA_DURATION_MS })
  }

  const panel = createAtlasPanel(root, {
    onEscape: () => {
      deselect()
      canvas.focus()
    },
  })

  function select(slug: string, center: [number, number]) {
    selectedSlug = slug
    restyle()
    const heading = panel.show(slug)
    moveCamera({ center })
    heading?.focus({ preventScroll: true })
  }

  function deselect() {
    if (selectedSlug === undefined && !panel.isOpen()) return
    selectedSlug = undefined
    restyle()
    panel.close()
  }

  async function expandCluster(feature: MapGeoJSONFeature, center: [number, number]) {
    const clusterId = feature.properties.cluster_id as number
    const source = map.getSource<GeoJSONSource>(ATLAS_SOURCE_ID)
    if (!source) return
    const zoom = await source.getClusterExpansionZoom(clusterId)
    moveCamera({ center, zoom })
  }

  function activate(feature: MapGeoJSONFeature) {
    if (feature.geometry.type !== 'Point') return
    const [lng = 0, lat = 0] = feature.geometry.coordinates
    const center: [number, number] = [lng, lat]
    if (feature.properties.cluster) void expandCluster(feature, center)
    else select(String(feature.properties.slug), center)
  }

  const interactiveLayers = [ATLAS_MARKER_LAYER_ID, ATLAS_CLUSTER_LAYER_ID]

  // The marker or cluster nearest to a point on the canvas, within radius.
  function nearestFeatureTo(x: number, y: number, radius: number): MapGeoJSONFeature | undefined {
    const candidates = map.queryRenderedFeatures(
      [
        [x - radius, y - radius],
        [x + radius, y + radius],
      ],
      { layers: interactiveLayers }
    )
    let nearest: MapGeoJSONFeature | undefined
    let nearestDistance = Infinity
    for (const candidate of candidates) {
      if (candidate.geometry.type !== 'Point') continue
      const [lng = 0, lat = 0] = candidate.geometry.coordinates
      const point = map.project([lng, lat])
      const distance = Math.hypot(point.x - x, point.y - y)
      if (distance <= radius && distance < nearestDistance) {
        nearest = candidate
        nearestDistance = distance
      }
    }
    return nearest
  }

  // Pointer selection, forgiving by POINTER_RADIUS_PX because a secondary
  // marker is drawn only 6px across.
  map.on('click', (event) => {
    const feature = nearestFeatureTo(event.point.x, event.point.y, POINTER_RADIUS_PX)
    if (feature) activate(feature)
  })
  map.on('mousemove', (event) => {
    const feature = nearestFeatureTo(event.point.x, event.point.y, POINTER_RADIUS_PX)
    canvas.style.cursor = feature ? 'pointer' : ''
  })

  // Keyboard selection. Arrow keys pan and plus and minus zoom through
  // MapLibre's own handler; the reticle marks the centre, and Enter opens
  // whatever marker or cluster is nearest to it.
  function nearestFeature(): MapGeoJSONFeature | undefined {
    return nearestFeatureTo(canvas.clientWidth / 2, canvas.clientHeight / 2, NEAREST_RADIUS_PX)
  }

  function announceNearest() {
    if (document.activeElement !== canvas || !status) return
    const feature = nearestFeature()
    if (!feature) status.textContent = atlas.map.noNearbyPlace
    else if (feature.properties.cluster) {
      status.textContent = atlas.map.nearestCluster.replace(
        '{count}',
        String(feature.properties.point_count)
      )
    } else {
      status.textContent = atlas.map.nearestPlace.replace('{name}', String(feature.properties.name))
    }
  }

  canvas.addEventListener('focus', announceNearest)
  map.on('moveend', announceNearest)
  map.on('idle', announceNearest)

  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const feature = nearestFeature()
      if (!feature) return
      event.preventDefault()
      activate(feature)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      // Escape closes an open panel first, then leaves the map for the list.
      // Tab is never intercepted, so the map is not a keyboard trap either way.
      if (panel.isOpen()) deselect()
      else document.getElementById('atlas-list')?.focus()
    }
  })

  // aria-disabled rather than disabled, so a button that reaches the zoom
  // limit while focused keeps focus instead of dropping it to the body.
  function syncZoomButtons() {
    const zoom = map.getZoom()
    zoomIn?.setAttribute('aria-disabled', String(zoom >= map.getMaxZoom()))
    zoomOut?.setAttribute('aria-disabled', String(zoom <= map.getMinZoom()))
  }
  zoomIn.addEventListener('click', () => {
    if (zoomIn.getAttribute('aria-disabled') !== 'true')
      map.zoomIn({ animate: !reducedMotion.matches })
  })
  zoomOut.addEventListener('click', () => {
    if (zoomOut.getAttribute('aria-disabled') !== 'true')
      map.zoomOut({ animate: !reducedMotion.matches })
  })
  map.on('zoomend', syncZoomButtons)
  syncZoomButtons()

  document.addEventListener(themeChangeEvent, (event) => {
    theme = event.detail.theme
    restyle()
    root.dataset.mapTheme = theme
  })

  // The list and the map filter together. Only the source data changes; the
  // layers, the camera limits, and the clustering decision stay as they were.
  document.addEventListener(filterChangeEvent, (event) => {
    filter = event.detail.filter
    const collection = filterCollection(allFeatures, filter)
    // Kept on the source spec as well, so a later theme restyle, which
    // diffs against it, does not bring the hidden markers back.
    atlasSource.data = collection
    map.getSource<GeoJSONSource>(ATLAS_SOURCE_ID)?.setData(collection)

    if (
      selectedSlug !== undefined &&
      !collection.features.some((feature) => feature.properties.slug === selectedSlug)
    ) {
      deselect()
    }

    const bounds = boundsOf(collection)
    if (bounds) {
      map.fitBounds(bounds, {
        padding: FIT_PADDING_PX,
        maxZoom: FIT_MAX_ZOOM,
        animate: !reducedMotion.matches,
        duration: CAMERA_DURATION_MS,
      })
    }
    root.dataset.mapFilter = filter
  })
}
