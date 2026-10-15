// The images the atlas layers draw with, generated rather than shipped as a
// sprite. Each one is a signed distance field (SDF): MapLibre tints an SDF
// with the layer's icon-color and can draw a halo around it, so one image
// serves both themes and both marker weights, and no colour lives here.
//
// Pure on purpose, like map-style.ts: no DOM and no maplibre-gl, so it is
// testable under node --test. The island hands the result to map.addImage()
// from its styleimagemissing listener.

import { ATLAS_CLUSTER_IMAGE, ATLAS_MARKER_IMAGE_PREFIX, ATLAS_RING_IMAGE } from './map-style.ts'

export interface SdfImage {
  width: number
  height: number
  data: Uint8Array
}

export interface MarkerImage {
  image: SdfImage
  options: { pixelRatio: number; sdf: true }
}

// Drawn at twice CSS resolution so markers stay crisp on high-density screens.
const PIXEL_RATIO = 2

// MapLibre's SDF convention: alpha 0.75 sits on the shape's edge, and alpha
// falls by 1/8 for every texel outside it (rises inside). The spread is the
// room left around the shape for that falloff and for a halo.
const SDF_EDGE = 0.75
const SDF_SPREAD_TEXELS = 8

// Sizes in CSS pixels at icon-size 1. map-style.ts scales the marker dot.
const MARKER_RADIUS = 5
const RING_RADIUS = 17
const RING_THICKNESS = 1
const CLUSTER_RADIUS = 17

// distanceFromEdge is in texels, negative inside the shape.
function drawSdf(radiusTexels: number, distanceFromEdge: (distance: number) => number): SdfImage {
  const size = Math.ceil((radiusTexels + SDF_SPREAD_TEXELS) * 2)
  const centre = size / 2
  const data = new Uint8Array(size * size * 4)

  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const distanceFromCentre = Math.hypot(column + 0.5 - centre, row + 0.5 - centre)
      const signedDistance = distanceFromEdge(distanceFromCentre)
      const alpha = Math.min(1, Math.max(0, SDF_EDGE - signedDistance / SDF_SPREAD_TEXELS))
      const offset = (row * size + column) * 4
      data[offset] = 255
      data[offset + 1] = 255
      data[offset + 2] = 255
      data[offset + 3] = Math.round(alpha * 255)
    }
  }

  return { width: size, height: size, data }
}

function disc(radius: number): SdfImage {
  const radiusTexels = radius * PIXEL_RATIO
  return drawSdf(radiusTexels, (distance) => distance - radiusTexels)
}

function ring(radius: number, thickness: number): SdfImage {
  const radiusTexels = radius * PIXEL_RATIO
  const halfThicknessTexels = (thickness * PIXEL_RATIO) / 2
  return drawSdf(
    radiusTexels + halfThicknessTexels,
    (distance) => Math.abs(distance - radiusTexels) - halfThicknessTexels
  )
}

// The image for an id the map reports missing, or undefined if the id is not
// one of ours. Every kind shares the dot today.
export function markerImageFor(id: string): MarkerImage | undefined {
  const options = { pixelRatio: PIXEL_RATIO, sdf: true } as const
  if (id.startsWith(ATLAS_MARKER_IMAGE_PREFIX)) return { image: disc(MARKER_RADIUS), options }
  if (id === ATLAS_RING_IMAGE) return { image: ring(RING_RADIUS, RING_THICKNESS), options }
  if (id === ATLAS_CLUSTER_IMAGE) return { image: disc(CLUSTER_RADIUS), options }
  return undefined
}
