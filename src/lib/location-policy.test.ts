import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { allAtlasLocationPolicies, atlasLocationPolicyBySlug } from '../config/atlas.ts'
import { applyLocationPolicy, formatCoordinates, type Coordinates } from './location-policy.ts'

const recorded: Coordinates = { lat: 50.274_913, lng: -5.051_288 }

// At most two decimals, no float noise, no exponent notation.
const twoDecimalsAtMost = /^-?\d+(\.\d{1,2})?$/

// Deterministic so a failing input can be reproduced from the seed.
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function generatedLocations(count: number): Coordinates[] {
  const random = mulberry32(20261015)
  const edgeValues = [
    0,
    0.005,
    -0.005,
    0.004999,
    -0.004999,
    0.015,
    -0.015,
    1.005,
    -1.005,
    50.275,
    -50.275,
    89.999,
    -89.999,
    179.995,
    -179.995,
    0.1 + 0.2,
    1e-9,
    -1e-9,
  ]
  const locations = edgeValues.map((value) => ({ lat: value, lng: value }))
  for (let index = 0; index < count; index++) {
    locations.push({ lat: random() * 180 - 90, lng: random() * 360 - 180 })
  }
  return locations
}

function assertFuzzedCoordinate(output: number, input: number): void {
  const context = `input ${input} produced ${output}`
  assert.match(String(output), twoDecimalsAtMost, context)
  assert.match(JSON.stringify(output), twoDecimalsAtMost, context)
  assert.ok(Math.abs(output - input) <= 0.005 + 1e-9, `not rounded to nearest: ${context}`)
  assert.ok(!Object.is(output, -0), `negative zero: ${context}`)
}

describe('applyLocationPolicy: exact', () => {
  test('returns the input unchanged, including a negative longitude', () => {
    assert.deepEqual(applyLocationPolicy(recorded, 'exact'), recorded)
    assert.deepEqual(applyLocationPolicy({ lat: -33.865_143, lng: -151.2099 }, 'exact'), {
      lat: -33.865_143,
      lng: -151.2099,
    })
  })
})

describe('applyLocationPolicy: fuzzed', () => {
  test('rounds down and up correctly at the boundary', () => {
    assert.deepEqual(applyLocationPolicy({ lat: 50.274, lng: -5.054 }, 'fuzzed'), {
      lat: 50.27,
      lng: -5.05,
    })
    assert.deepEqual(applyLocationPolicy({ lat: 50.276, lng: -5.056 }, 'fuzzed'), {
      lat: 50.28,
      lng: -5.06,
    })
    assert.deepEqual(applyLocationPolicy({ lat: 50.2749, lng: -5.0551 }, 'fuzzed'), {
      lat: 50.27,
      lng: -5.06,
    })
  })

  test('never leaves more than two decimal places, across generated inputs', () => {
    for (const input of generatedLocations(10_000)) {
      const output = applyLocationPolicy(input, 'fuzzed')
      assert.ok(output !== undefined, `fuzzed dropped ${JSON.stringify(input)}`)
      assertFuzzedCoordinate(output.lat, input.lat)
      assertFuzzedCoordinate(output.lng, input.lng)
      assert.deepEqual(applyLocationPolicy(output, 'fuzzed'), output, 'fuzzing is not idempotent')
    }
  })

  test('does not add precision to an already coarse input', () => {
    const output = applyLocationPolicy({ lat: 50.2, lng: -5 }, 'fuzzed')
    assert.deepEqual(output, { lat: 50.2, lng: -5 })
    assert.equal(JSON.stringify(output), '{"lat":50.2,"lng":-5}')
    assert.deepEqual(applyLocationPolicy({ lat: 50.27, lng: -5.05 }, 'fuzzed'), {
      lat: 50.27,
      lng: -5.05,
    })
  })
})

describe('applyLocationPolicy: withheld', () => {
  test('returns undefined even when given valid coordinates', () => {
    assert.strictEqual(applyLocationPolicy(recorded, 'withheld'), undefined)
  })

  test('returns undefined when given undefined', () => {
    assert.strictEqual(applyLocationPolicy(undefined, 'withheld'), undefined)
  })
})

describe('applyLocationPolicy: undefined input', () => {
  for (const policy of allAtlasLocationPolicies) {
    test(`returns undefined under ${policy.slug}`, () => {
      assert.strictEqual(applyLocationPolicy(undefined, policy.slug), undefined)
    })
  }
})

describe('formatCoordinates', () => {
  test('returns the withheld label rather than any number when the policy is withheld', () => {
    const display = formatCoordinates(recorded, 'withheld')
    assert.equal(display, atlasLocationPolicyBySlug.withheld.name)
    assert.doesNotMatch(display, /\d/)
  })

  test('returns the withheld label when there is no location', () => {
    assert.equal(formatCoordinates(undefined, 'exact'), atlasLocationPolicyBySlug.withheld.name)
  })

  test('formats fuzzed coordinates to two places, even from raw input', () => {
    assert.equal(formatCoordinates(recorded, 'fuzzed'), '50.27°N 5.05°W')
  })

  test('formats exact coordinates to four places with hemispheres', () => {
    assert.equal(
      formatCoordinates({ lat: -33.865_143, lng: 151.2099 }, 'exact'),
      '33.8651°S 151.2099°E'
    )
  })
})
