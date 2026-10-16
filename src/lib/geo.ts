// Build-time geometry for the atlas entry page. Every coordinate passed in
// here has already been through applyLocationPolicy in the loader, so a
// distance or a plate position can only ever be as precise as the policy
// allows. Never call this with anything read from Strapi directly.
import type { Coordinates } from './location-policy.ts'

const EARTH_RADIUS_KM = 6371.0088

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

// Haversine great-circle distance.
export function distanceInKilometres(from: Coordinates, to: Coordinates): number {
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const halfChord =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(halfChord)))
}

export interface NearbyEntry<Entry> {
  entry: Entry
  distanceKm: number
}

// Every candidate sorted nearest first, excluding the origin entry itself.
export function getNearestEntries<Entry extends { id: string; data: { location: Coordinates } }>(
  origin: { id: string; data: { location: Coordinates } },
  candidates: readonly Entry[],
  count = Infinity
): NearbyEntry<Entry>[] {
  return candidates
    .filter((candidate) => candidate.id !== origin.id)
    .map((candidate) => ({
      entry: candidate,
      distanceKm: distanceInKilometres(origin.data.location, candidate.data.location),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count)
}

export interface PlatePoint {
  x: number
  y: number
}

// A local equirectangular projection centred on the origin, accurate enough
// across the few kilometres a map plate covers. Output is whole SVG units on
// purpose: scripts/assert-atlas-policy.mjs treats any number with four or more
// decimals near an entry name as a leaked coordinate, and a whole pixel offset
// cannot be mistaken for one.
export function projectToPlate(
  origin: Coordinates,
  point: Coordinates,
  plateWidthKm: number,
  plateSize: number
): PlatePoint {
  const unitsPerKm = plateSize / plateWidthKm
  const eastKm = toRadians(point.lng - origin.lng) * EARTH_RADIUS_KM * Math.cos(toRadians(origin.lat))
  const northKm = toRadians(point.lat - origin.lat) * EARTH_RADIUS_KM
  return {
    x: Math.round(plateSize / 2 + eastKm * unitsPerKm) + 0,
    y: Math.round(plateSize / 2 - northKm * unitsPerKm) + 0,
  }
}

// How far a fuzzed coordinate can sit from the place it stands for: half a
// hundredth of a degree on each axis, measured at the entry's own latitude.
export function fuzzedUncertaintyKm(location: Coordinates): number {
  return distanceInKilometres(location, { lat: location.lat + 0.005, lng: location.lng + 0.005 })
}
