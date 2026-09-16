import { expect, test } from 'vitest'
import { area, floorIds, floorSlabs, house, makeFloor, stair, stairOpeningParts, stairRecess } from './model'

test('Square stair has an open eye without former cupboard walls or floor infill', () => {
  expect((stair.z + stair.end) / 2).toBeCloseTo(house.depth / 2 - .8)
  expect([stair.width, stair.depth]).toEqual([2.1, 2.2])
  expect(area(stairOpeningParts)).toBeCloseTo(4.62)
  for (const id of floorIds) {
    const floor = makeFloor(id)
    expect(floor.walls.some(wall => wall.id.startsWith('stair-recess'))).toBe(false)
    expect(floor.furniture.some(item => item.id === 'stair-cabinet')).toBe(false)
    if (id === 'KG') continue
    expect(area(floorSlabs(id)) + area(stairOpeningParts)).toBeCloseTo(70)
    const center = [stairRecess.x + stairRecess.width / 2, stairRecess.z + stairRecess.depth / 2]
    expect(floorSlabs(id).some(slab => center[0] > slab.x && center[0] < slab.x + slab.width && center[1] > slab.z && center[1] < slab.z + slab.depth)).toBe(false)
  }
})