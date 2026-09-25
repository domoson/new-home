import { expect, test } from 'vitest'
import { boundaryDistance } from './context'
import { aerialTreeAnchors, aerialTreePoint, contextVegetation, frontGardenBeds, frontGardenCrowns } from './contextVegetation'
import { mapPoint } from './neighborhoodLayout'

test('tree aerial registration follows the three existing building anchors', () => {
  for (const anchor of aerialTreeAnchors) {
    const actual = aerialTreePoint(anchor.image), expected = mapPoint(anchor.map)
    expect(actual[0]).toBeCloseTo(expected[0], 8)
    expect(actual[1]).toBeCloseTo(expected[1], 8)
  }
})

test('observed crowns form western, northern and southern groups outside our plot', () => {
  expect(contextVegetation).toHaveLength(63)
  expect(contextVegetation.filter(crown => [0, 1, 2, 3].every(side => boundaryDistance(crown.center, side) >= 0)).map(crown => crown.id)).toEqual([])
  for (const crown of contextVegetation) {
    expect(crown.eastRadius, crown.id).toBeGreaterThan(.6)
    expect(crown.eastRadius, crown.id).toBeLessThan(7)
    expect(crown.southRadius, crown.id).toBeGreaterThan(.6)
    expect(crown.southRadius, crown.id).toBeLessThan(7)
  }
  expect(contextVegetation.filter(crown => crown.id.startsWith('west-'))).toHaveLength(12)
  expect(contextVegetation.filter(crown => crown.id.startsWith('north-belt'))).toHaveLength(7)
  expect(contextVegetation.filter(crown => crown.id.startsWith('south-')).length).toBeGreaterThan(12)
})

test('photo front gardens replace coarse crowns with layered planting outside our plot', () => {
  expect(frontGardenCrowns).toHaveLength(20)
  expect(frontGardenCrowns.filter(crown => crown.low).length).toBe(18)
  expect(frontGardenCrowns.filter(crown => crown.tone === 'copper')).toHaveLength(4)
  expect(new Set(contextVegetation.map(crown => crown.id)).size).toBe(contextVegetation.length)
  expect(contextVegetation.some(crown => crown.id === 'east-8-front-1' || crown.id === 'south-9-front')).toBe(false)
  for (const bed of frontGardenBeds) for (const point of bed.points) {
    expect([0, 1, 2, 3].every(side => boundaryDistance(point, side) >= 0), bed.id).toBe(false)
  }
})