// Some of these places will hurt a stranger who finds them and some belong to
// people who asked not to be found, so this is the only code allowed to decide
// how precisely a recorded coordinate is published, and it is applied once, in
// the loader. Do not relax it, add an override, or move the rounding to render
// time; if a page seems to need more precision than this allows, the page is wrong.
import { atlasLocationPolicyBySlug, type AtlasLocationPolicySlug } from '../config/atlas.ts'

export interface Coordinates {
  lat: number
  lng: number
}

// Dividing a whole number by 100 is correctly rounded, so the result is the
// double nearest to k/100 and serialises with at most two decimals. Multiplying
// by 0.01 does not have that property. Rounds half away from zero so both
// hemispheres behave the same, and adds 0 to turn -0 into 0.
function roundToHundredths(value: number): number {
  return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100 + 0
}

export function applyLocationPolicy(
  location: Coordinates | undefined,
  policy: AtlasLocationPolicySlug
): Coordinates | undefined {
  switch (policy) {
    case 'withheld':
      return undefined
    case 'exact':
      return location === undefined ? undefined : { lat: location.lat, lng: location.lng }
    case 'fuzzed':
      return location === undefined
        ? undefined
        : { lat: roundToHundredths(location.lat), lng: roundToHundredths(location.lng) }
    default: {
      // Fails closed: an unknown policy throws rather than publishing anything.
      const unhandledPolicy: never = policy
      throw new Error(`Unknown location policy: ${String(unhandledPolicy)}`)
    }
  }
}

const displayDecimalsByPolicy = {
  exact: 4,
  fuzzed: 2,
} as const

export function formatCoordinates(
  location: Coordinates | undefined,
  policy: AtlasLocationPolicySlug
): string {
  const published = applyLocationPolicy(location, policy)
  if (published === undefined || policy === 'withheld') {
    return atlasLocationPolicyBySlug.withheld.name
  }
  const decimals = displayDecimalsByPolicy[policy]
  const latitude = `${Math.abs(published.lat).toFixed(decimals)}°${published.lat < 0 ? 'S' : 'N'}`
  const longitude = `${Math.abs(published.lng).toFixed(decimals)}°${published.lng < 0 ? 'W' : 'E'}`
  return `${latitude} ${longitude}`
}
