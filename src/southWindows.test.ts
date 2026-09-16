import { expect, test } from 'vitest'
import { house, makeFloor, wallSolids } from './model'
import { roomDaylight } from './roomDaylight'

test('east ground floor groups full-height glazing at the southeast corner', () => {
  const floor = makeFloor('EG')
  const south = floor.walls.find(wall => wall.id === 'south')!
  const east = floor.walls.find(wall => wall.id === 'east')!
  const garden = south.openings.find(opening => opening.id === 'garden-fixed')!
  const sliding = south.openings.find(opening => opening.id === 'terrace')!
  const fixed = south.openings.find(opening => opening.id === 'terrace-fixed')!
  const corner = east.openings.find(opening => opening.id === 'corner-fixed')!
  expect(south.x + garden.start).toBeCloseTo(2.6)
  expect(garden.width).toBe(1.05)
  expect(sliding.start - garden.start - garden.width).toBeGreaterThan(.5)
  expect(sliding.width).toBe(1.2)
  expect(sliding.start + sliding.width).toBeCloseTo(fixed.start)
  expect(fixed.width).toBe(sliding.width)
  expect(south.x + fixed.start + fixed.width).toBeCloseTo(house.east)
  expect(corner.width).toBe(.7)
  expect(corner.start + corner.width).toBeCloseTo(house.south)
  for (const opening of [garden, sliding, fixed, corner]) {
    expect(opening.sill).toBe(0)
    expect(opening.height).toBe(2.35)
  }
  const bench = floor.furniture.find(item => item.id === 'dining-bench')!
  expect(bench.z + bench.depth).toBeLessThan(corner.start - .025)
  const cornerPost = wallSolids(east, floor.height).find(solid => solid.z >= house.south - .001 && solid.bottom === 0)!
  expect(cornerPost).toBeDefined()
  expect(cornerPost.depth).toBeCloseTo(.38)
})

test('west house retains its original glazing and other floors stay identical', () => {
  const west = makeFloor('EG', 'west')
  const south = west.walls.find(wall => wall.id === 'south')!
  expect(south.openings.map(opening => [opening.id, south.x + opening.start, opening.width])).toEqual([
    ['garden-fixed', .7, 2], ['terrace', 3.2, 1.5], ['terrace-fixed', 4.7, 1.5],
  ])
  expect(west.walls.flatMap(wall => wall.openings).some(opening => opening.id === 'corner-fixed')).toBe(false)
  for (const floorId of ['KG', 'OG', 'DG'] as const) expect(makeFloor(floorId, 'east')).toEqual(makeFloor(floorId, 'west'))
})

test('daylight uses the glazing of each house independently', () => {
  const east = roomDaylight('EG', 'east').find(room => room.id === 'EG-living')!
  const west = roomDaylight('EG', 'west').find(room => room.id === 'EG-living')!
  expect(east.glazing).toBeCloseTo((1.05 + 2.4 + .7) * 2.35 + (1.05 + .6) * .9)
  expect(west.glazing).toBeCloseTo(2 * 2.25 + 3 * 2.35 + (1.05 + .6) * .9)
  expect(east.center.x).toBeGreaterThan(west.center.x)
})