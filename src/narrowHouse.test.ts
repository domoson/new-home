import { expect, test } from 'vitest'
import { area, floorIds, floorSlabs, house, makeFloor, roofHeight, roofPanels, roofWindows, roomArea, stair, stairOpeningParts, stairRecess, wallSolids } from './model'
import type { Rect } from './model'

const overlap = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

test('7 x 10 m envelope preserves walls, stair width and roof overhangs', () => {
  expect(house.width * house.depth).toBe(70)
  expect(house.width - house.east).toBeCloseTo(.38)
  expect(house.west).toBe(.4)
  expect(house.east - house.west).toBeCloseTo(6.22)
  for (const id of floorIds) expect(area(floorSlabs(id)) + (id === 'KG' ? 0 : area(stairOpeningParts))).toBeCloseTo(70)
  expect([stair.width, stair.depth, stair.runWidth]).toEqual([2.1, 2.2, .9])
  expect(stair.end - stair.z).toBeCloseTo(stair.depth)
  expect(area(roofPanels()) + area(roofWindows)).toBeCloseTo(7.35 * 10.5)
})

for (const id of floorIds) test(`${id}: rooms and furniture fit the new envelope and remain clear of walls`, () => {
  const floor = makeFloor(id), solids = floor.walls.flatMap(wall => wallSolids(wall, floor.height))
  for (const [index, room] of floor.rooms.entries()) for (const part of room.parts) {
    expect(part.x).toBeGreaterThanOrEqual(house.west - 1e-8)
    expect(part.x + part.width).toBeLessThanOrEqual(house.east + 1e-8)
    expect(part.width * part.depth).toBeGreaterThan(0)
    for (const other of floor.rooms.slice(index + 1)) for (const bounds of other.parts) expect(overlap(part, bounds), `${room.id}/${other.id}`).toBeLessThan(1e-8)
    for (const solid of solids.filter(solid => solid.bottom === 0)) expect(overlap(part, solid), `${room.id}/${solid.id}`).toBeLessThan(1e-8)
  }
  for (const item of floor.furniture) {
    expect(item.x + item.width, item.id).toBeLessThanOrEqual(house.east + 1e-8)
    for (const solid of solids.filter(solid => solid.bottom < (item.bottom ?? 0) + item.height)) expect(overlap(item, solid), `${item.id}/${solid.id}`).toBeLessThan(1e-8)
    if (id === 'DG') expect(Math.min(roofHeight(item.z), roofHeight(item.z + item.depth)), item.id).toBeGreaterThan((item.bottom ?? 0) + item.height)
  }
  for (const wall of floor.walls) for (const opening of wall.openings) {
    expect(opening.start, opening.id).toBeGreaterThanOrEqual(0)
    expect(opening.start + opening.width, opening.id).toBeLessThanOrEqual((wall.axis === 'x' ? wall.width : wall.depth) + 1e-8)
  }
})

test('compact children, a north bathroom and open reading share a distributor', () => {
  const floor = makeFloor('OG'), children = floor.rooms.filter(room => room.id.startsWith('child-'))
  for (const child of children) {
    expect(child.parts.every(part => part.width >= .1)).toBe(true)
    expect(area(child.parts)).toBeGreaterThan(11.0)
  }
  const southwest = children.find(room => room.id === 'child-south')!
  expect(southwest.parts).toHaveLength(1)
  expect(southwest.parts[0].width).toBeCloseTo(house.east - house.west)
  const bath = floor.rooms.find(room => room.id === 'bath')!
  expect(bath.parts[0].z).toBe(house.north)
  expect(bath.parts[0].width / bath.parts[0].depth).toBeGreaterThan(1.1)
  expect(area(bath.parts)).toBeCloseTo(7.68)
  const reading = floor.rooms.find(room => room.id === 'multifunction')!
  expect(area(reading.parts)).toBeCloseTo(3.3756)
  expect(reading.parts[0].width / reading.parts[0].depth).toBeGreaterThan(2.4)
  expect(floor.walls.find(wall => wall.id === 'east')!.openings.some(opening => opening.id === 'east-reading')).toBe(true)
  expect(floor.walls.find(wall => wall.id === 'bath-south')!.openings.some(opening => opening.id === 'bath')).toBe(true)
  expect(area(floor.rooms.find(room => room.id === 'hall')!.parts)).toBeCloseTo(2.31)
  expect(floor.rooms.find(room => room.id === 'hall')!.parts).toHaveLength(1)
  const parents = roomArea(makeFloor('DG').rooms.find(room => room.id === 'bedroom')!, 'DG')
  expect(parents.floor).toBeGreaterThan(18)
  expect(parents.living).toBeGreaterThan(15.5)
})

test('former recess is an open stair eye without walls, cupboards or upper floor infill', () => {
  for (const id of floorIds) {
    const floor = makeFloor(id)
    expect(floor.walls.some(wall => wall.id.startsWith('stair-recess'))).toBe(false)
    expect(floor.furniture.some(item => item.id === 'stair-cabinet')).toBe(false)
    expect(floorSlabs(id).reduce((sum, slab) => sum + overlap(stairRecess, slab), 0)).toBeCloseTo(id === 'KG' ? area([stairRecess]) : 0)
  }
  expect(area(makeFloor('EG').rooms.find(room => room.id === 'living')!.parts)).toBeGreaterThan(35.745425 + .6)
})