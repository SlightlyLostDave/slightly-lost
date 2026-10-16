import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { Coordinates } from './location-policy.ts'
import {
  distanceInKilometres,
  fuzzedUncertaintyKm,
  getNearestEntries,
  projectToPlate,
} from './geo.ts'

const origin: Coordinates = { lat: 50.27, lng: -5.05 }

function entry(id: string, location: Coordinates) {
  return { id, data: { location } }
}

describe('distanceInKilometres', () => {
  test('is zero for the same point', () => {
    assert.equal(distanceInKilometres(origin, origin), 0)
  })

  test('a hundredth of a degree of latitude is about 1.11 km', () => {
    const distance = distanceInKilometres(origin, { lat: origin.lat + 0.01, lng: origin.lng })
    assert.ok(Math.abs(distance - 1.112) < 0.01, `got ${distance}`)
  })

  test('is symmetric', () => {
    const other = { lat: 50.31, lng: -4.98 }
    assert.equal(distanceInKilometres(origin, other), distanceInKilometres(other, origin))
  })
})

describe('getNearestEntries', () => {
  const self = entry('self', origin)
  const far = entry('far', { lat: 50.4, lng: -5.05 })
  const near = entry('near', { lat: 50.28, lng: -5.05 })
  const middle = entry('middle', { lat: 50.3, lng: -5.05 })

  test('sorts nearest first and excludes the origin', () => {
    const nearest = getNearestEntries(self, [far, self, near, middle])
    assert.deepEqual(
      nearest.map((item) => item.entry.id),
      ['near', 'middle', 'far']
    )
  })

  test('caps the count', () => {
    assert.equal(getNearestEntries(self, [far, near, middle], 2).length, 2)
  })

  test('returns nothing when the origin is the only candidate', () => {
    assert.deepEqual(getNearestEntries(self, [self]), [])
  })
})

describe('projectToPlate', () => {
  test('puts the origin at the centre', () => {
    assert.deepEqual(projectToPlate(origin, origin, 10, 400), { x: 200, y: 200 })
  })

  test('puts north up and east right, in whole units', () => {
    const northEast = projectToPlate(origin, { lat: 50.29, lng: -5.02 }, 10, 400)
    assert.ok(northEast.x > 200 && northEast.y < 200)
    assert.ok(Number.isInteger(northEast.x) && Number.isInteger(northEast.y))
  })

  test('never writes negative zero', () => {
    const point = projectToPlate(origin, { lat: origin.lat, lng: origin.lng - 0.0001 }, 10, 400)
    assert.ok(!Object.is(point.y, -0))
  })
})

describe('fuzzedUncertaintyKm', () => {
  test('is a little under a kilometre in temperate latitudes', () => {
    const uncertainty = fuzzedUncertaintyKm(origin)
    assert.ok(uncertainty > 0.6 && uncertainty < 0.8, `got ${uncertainty}`)
  })
})
