// Finds coordinates written as text, for scripts/assert-atlas-policy.mjs to
// look for in places the location policy never saw, such as a field data
// row typed by hand into a post. It decides nothing about publication; that
// is src/lib/location-policy.ts. Plain TypeScript with no path aliases, so
// the build script can import it under Node as well as Astro.

export interface FoundCoordinate {
  // As written, for the error message.
  text: string
  // Signed decimal degrees, present only when the text is a full pair.
  lat?: number
  lng?: number
  // Finer than two decimal places, the precision a fuzzed entry publishes.
  // A minute of arc is coarser than that and a second is far finer.
  precise: boolean
}

const FUZZED_DECIMALS = 2

// One component with a hemisphere letter: 46.6667 N, 46.67°N, 46°40'0"N.
// A degree sign, a decimal point, or a minute mark is required, so a bare
// "12 N" in a label is not mistaken for a latitude.
const HEMISPHERE_COMPONENT =
  /(?<![\w.])(\d{1,3}(?:\.(\d+))?)\s*(°)?\s*(?:(\d{1,2})(?:\.(\d+))?\s*['′]\s*(?:(\d{1,2}(?:\.\d+)?)\s*["″])?\s*)?([NSEW])(?![A-Za-z])/g

// A signed pair with no hemisphere letters: 46.666666, -81.111111. Two
// decimals at least on each side, which is what separates a position from a
// pair of measurements.
const BARE_PAIR = /(?<![\w.-])(-?\d{1,3}\.(\d{2,}))(?:\s*,\s*|\s+)(-?\d{1,3}\.(\d{2,}))(?![\d.])/g

// What may sit between a latitude and the longitude that completes it.
const PAIR_SEPARATOR = /^\s*[,/;]?\s*$/

interface Component {
  start: number
  end: number
  text: string
  axis: 'lat' | 'lng'
  value: number
  precise: boolean
}

function readHemisphereComponents(text: string): Component[] {
  return [...text.matchAll(HEMISPHERE_COMPONENT)].flatMap((match) => {
    const [written, degrees, degreeDecimals, degreeSign, minutes, minuteDecimals, seconds, hemisphere] =
      match
    if (!degrees || !hemisphere) return []
    if (!degreeDecimals && !degreeSign && minutes === undefined) return []

    const minuteValue = minutes === undefined ? 0 : Number(`${minutes}.${minuteDecimals ?? '0'}`)
    const secondValue = seconds === undefined ? 0 : Number(seconds)
    const magnitude = Number(degrees) + minuteValue / 60 + secondValue / 3600
    const axis = hemisphere === 'N' || hemisphere === 'S' ? 'lat' : 'lng'
    const limit = axis === 'lat' ? 90 : 180
    if (magnitude > limit) return []

    const precise =
      (degreeDecimals?.length ?? 0) > FUZZED_DECIMALS ||
      minuteDecimals !== undefined ||
      seconds !== undefined

    return [
      {
        start: match.index,
        end: match.index + written.length,
        text: written,
        axis,
        value: hemisphere === 'S' || hemisphere === 'W' ? -magnitude : magnitude,
        precise,
      },
    ]
  })
}

export function findCoordinates(text: string): FoundCoordinate[] {
  const found: FoundCoordinate[] = []
  const components = readHemisphereComponents(text)
  const claimed: [number, number][] = []

  for (let index = 0; index < components.length; index++) {
    const current = components[index]
    const next = components[index + 1]
    const pairsWithNext =
      next !== undefined &&
      current.axis === 'lat' &&
      next.axis === 'lng' &&
      PAIR_SEPARATOR.test(text.slice(current.end, next.start))

    if (pairsWithNext) {
      found.push({
        text: text.slice(current.start, next.end),
        lat: current.value,
        lng: next.value,
        precise: current.precise || next.precise,
      })
      claimed.push([current.start, next.end])
      index += 1
    } else {
      found.push({ text: current.text, precise: current.precise })
      claimed.push([current.start, current.end])
    }
  }

  for (const match of text.matchAll(BARE_PAIR)) {
    const [written, latText, latDecimals, lngText, lngDecimals] = match
    const start = match.index
    const end = start + written.length
    if (claimed.some(([claimedStart, claimedEnd]) => start < claimedEnd && end > claimedStart)) {
      continue
    }
    const lat = Number(latText)
    const lng = Number(lngText)
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    found.push({
      text: written,
      lat,
      lng,
      precise: latDecimals.length > FUZZED_DECIMALS || lngDecimals.length > FUZZED_DECIMALS,
    })
  }

  return found
}
