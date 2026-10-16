import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { findCoordinates } from './coordinate-text.ts'
import { formatCoordinates } from './location-policy.ts'

describe('findCoordinates', () => {
  test('reads a decimal pair with hemisphere letters, with and without a degree sign', () => {
    for (const written of ['46.6667 N, 81.1111 W', '46.6667°N 81.1111°W', '46.6667° N / 81.1111° W']) {
      const [found, ...rest] = findCoordinates(`Coordinates ${written}`)
      assert.equal(rest.length, 0, written)
      assert.equal(found.lat, 46.6667, written)
      assert.equal(found.lng, -81.1111, written)
      assert.equal(found.precise, true, written)
    }
  })

  test('treats two decimals as the fuzzed precision, not finer', () => {
    const [found] = findCoordinates('46.67 N, 81.11 W')
    assert.equal(found.lat, 46.67)
    assert.equal(found.lng, -81.11)
    assert.equal(found.precise, false)
  })

  test('reads a signed bare decimal pair', () => {
    const [found] = findCoordinates('46.666666, -81.111111')
    assert.equal(found.lat, 46.666666)
    assert.equal(found.lng, -81.111111)
    assert.equal(found.precise, true)

    const [spaced] = findCoordinates('44.4444 -78.7778')
    assert.equal(spaced.lat, 44.4444)
    assert.equal(spaced.lng, -78.7778)
  })

  test('reads degrees, minutes, and seconds', () => {
    const [found] = findCoordinates(`46°40'0"N 81°6'40"W`)
    assert.ok(Math.abs((found.lat ?? 0) - 46.666_667) < 1e-5)
    assert.ok(Math.abs((found.lng ?? 0) + 81.111_111) < 1e-5)
    assert.equal(found.precise, true)

    const [primes] = findCoordinates('46°40′0″S 81°6′40″E')
    assert.ok((primes.lat ?? 0) < 0)
    assert.ok((primes.lng ?? 0) > 0)
  })

  test('counts whole minutes as coarser than the fuzzed precision', () => {
    const [found] = findCoordinates(`46°40'N 81°7'W`)
    assert.equal(found.precise, false)
  })

  test('reports a lone component as coordinate-shaped without a pair', () => {
    const found = findCoordinates('Latitude 46.6667 N')
    assert.equal(found.length, 1)
    assert.equal(found[0].lat, undefined)
    assert.equal(found[0].precise, true)
  })

  test('ignores the other values a field data strip carries', () => {
    for (const value of [
      'Elevation 318 m',
      'Walked in 2.4 km',
      'First visited 2025.09.28',
      '1,840 photographs',
      'Water 12.5 C, air 13.25 C',
      'Location policy Fuzzed',
      'Grid 12 N',
      'Depth 11 m',
    ]) {
      assert.deepEqual(findCoordinates(value), [], value)
    }
  })

  test('reads back what formatCoordinates writes', () => {
    const exact = findCoordinates(formatCoordinates({ lat: 53.3507, lng: -4.2623 }, 'exact'))
    assert.equal(exact.length, 1)
    assert.equal(exact[0].lat, 53.3507)
    assert.equal(exact[0].lng, -4.2623)
    assert.equal(exact[0].precise, true)

    const fuzzed = findCoordinates(formatCoordinates({ lat: -46.666_666, lng: 81.111_111 }, 'fuzzed'))
    assert.equal(fuzzed.length, 1)
    assert.equal(fuzzed[0].lat, -46.67)
    assert.equal(fuzzed[0].lng, 81.11)
    assert.equal(fuzzed[0].precise, false)

    assert.deepEqual(findCoordinates(formatCoordinates({ lat: 46.8, lng: -81.4 }, 'withheld')), [])
  })
})
