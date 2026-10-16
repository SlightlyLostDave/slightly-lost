import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { Coordinates } from './location-policy.ts'
import {
  distanceInKilometres,
  fitToPlate,
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

describe('fitToPlate', () => {
  const PLATE_WIDTH = 620
  const PLATE_HEIGHT = 440
  const MARGIN = 24
  // Fuzzed-style positions in North Wales and the Sudbury Basin, the two
  // regions the atlas actually covers.
  const locations: Coordinates[] = [
    { lat: 53.14, lng: -4.01 },
    { lat: 53.35, lng: -4.24 },
    { lat: 46.49, lng: -80.99 },
    { lat: 46.6, lng: -81.2 },
  ]

  test('draws nothing for no locations', () => {
    assert.deepEqual(fitToPlate([], PLATE_WIDTH, PLATE_HEIGHT, MARGIN), [])
  })

  test('puts a single location at the centre', () => {
    assert.deepEqual(fitToPlate([origin], PLATE_WIDTH, PLATE_HEIGHT, MARGIN), [{ x: 310, y: 220 }])
  })

  test('puts repeated identical locations at the centre', () => {
    const points = fitToPlate([origin, origin], PLATE_WIDTH, PLATE_HEIGHT, MARGIN)
    assert.deepEqual(points, [
      { x: 310, y: 220 },
      { x: 310, y: 220 },
    ])
  })

  test('keeps every point in whole units inside the margin', () => {
    for (const point of fitToPlate(locations, PLATE_WIDTH, PLATE_HEIGHT, MARGIN)) {
      assert.ok(Number.isInteger(point.x) && Number.isInteger(point.y), JSON.stringify(point))
      assert.ok(!Object.is(point.x, -0) && !Object.is(point.y, -0))
      assert.ok(point.x >= MARGIN && point.x <= PLATE_WIDTH - MARGIN, `x ${point.x}`)
      assert.ok(point.y >= MARGIN && point.y <= PLATE_HEIGHT - MARGIN, `y ${point.y}`)
    }
  })

  test('fills the longer side and puts east right and north up', () => {
    const [wales, anglesey, sudbury, westOfSudbury] = fitToPlate(
      locations,
      PLATE_WIDTH,
      PLATE_HEIGHT,
      MARGIN
    )
    assert.equal(Math.max(anglesey.x, wales.x), PLATE_WIDTH - MARGIN)
    assert.equal(westOfSudbury.x, MARGIN)
    assert.ok(wales.x > sudbury.x)
    assert.ok(anglesey.y < wales.y)
  })

  test('scales both axes alike, so a square stays square', () => {
    const square: Coordinates[] = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
    ]
    const [southWest, northEast] = fitToPlate(square, PLATE_WIDTH, PLATE_HEIGHT, MARGIN)
    assert.equal(northEast.x - southWest.x, southWest.y - northEast.y)
  })
})

describe('fuzzedUncertaintyKm', () => {
  test('is a little under a kilometre in temperate latitudes', () => {
    const uncertainty = fuzzedUncertaintyKm(origin)
    assert.ok(uncertainty > 0.6 && uncertainty < 0.8, `got ${uncertainty}`)
  })
})
