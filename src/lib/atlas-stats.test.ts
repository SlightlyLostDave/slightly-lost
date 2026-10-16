import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { AtlasLocationPolicySlug, AtlasStatusSlug } from '../config/atlas.ts'
import { countAtlasEntries, getAtlasStats } from './atlas-stats.ts'

function entry(status: AtlasStatusSlug, locationPolicy: AtlasLocationPolicySlug = 'exact') {
  return { data: { status, locationPolicy } }
}

describe('countAtlasEntries', () => {
  test('counts nothing in an empty atlas', () => {
    assert.deepEqual(countAtlasEntries([]), { entries: 0, visited: 0, withheld: 0 })
  })

  test('counts documented entries as visited', () => {
    const counts = countAtlasEntries([
      entry('visited'),
      entry('documented'),
      entry('researched'),
      entry('unconfirmed'),
    ])
    assert.equal(counts.entries, 4)
    assert.equal(counts.visited, 2)
  })

  test('counts withheld by location policy, whatever the status', () => {
    const counts = countAtlasEntries([
      entry('visited', 'withheld'),
      entry('researched', 'withheld'),
      entry('documented', 'fuzzed'),
    ])
    assert.equal(counts.withheld, 2)
  })
})

describe('getAtlasStats', () => {
  const fiveEntries = Array.from({ length: 5 }, () => entry('visited'))

  test('has no statistics for an empty atlas, even with no threshold', () => {
    assert.equal(getAtlasStats([], 0), undefined)
  })

  test('has no statistics below the threshold', () => {
    assert.equal(getAtlasStats(fiveEntries, 6), undefined)
  })

  test('has statistics from the threshold up', () => {
    assert.deepEqual(getAtlasStats(fiveEntries, 5), { entries: 5, visited: 5, withheld: 0 })
  })
})
