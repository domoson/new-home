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

test('compact storage and a 120 cm shower niche share the unchanged stair distributor', () => {
  const floor = makeFloor('OG'), children = floor.rooms.filter(room => room.id.startsWith('child-'))
  for (const child of children) {
    expect(child.parts.every(part => part.width >= .1)).toBe(true)
    expect(area(child.parts)).toBeGreaterThan(11.0)
  }
  const southwest = children.find(room => room.id === 'child-south')!
  expect(southwest.parts).toHaveLength(2)
  expect(southwest.parts[0].width).toBeCloseTo(3.96)
  expect(Math.abs(area(children[0].parts) - area(children[1].parts))).toBeLessThan(3)
  for (const child of children) expect(area(child.parts)).toBeGreaterThan(15)
  const bath = floor.rooms.find(room => room.id === 'bath')!
  expect(bath.parts[0].z).toBe(house.north)
  expect(bath.parts[0].width / bath.parts[0].depth).toBeGreaterThan(1.1)
  expect(area(bath.parts)).toBeCloseTo(9.9136)
  const storage = floor.rooms.find(room => room.id === 'store')!
  expect(storage.parts[0].depth).toBeCloseTo(1.1)
  expect(area(storage.parts)).toBeCloseTo(2.31)
  expect(floor.furniture.find(item => item.id === 'bath-shower')).toMatchObject({ width: 1.2, depth: 1.2 })
  expect(floor.rooms.some(room => room.id === 'multifunction')).toBe(false)
  expect(floor.walls.find(wall => wall.id === 'bath-south')!.openings.some(opening => opening.id === 'bath')).toBe(true)
  expect(area(floor.rooms.find(room => room.id === 'hall')!.parts)).toBeCloseTo(3.633)
  expect(floor.rooms.find(room => room.id === 'hall')!.parts).toHaveLength(1)
  const parents = roomArea(makeFloor('DG').rooms.find(room => room.id === 'bedroom')!, 'DG')
  expect(parents.floor).toBeGreaterThan(18)
  expect(parents.living).toBeGreaterThan(15.5)
})

test('OG has no unassigned gaps and each window belongs entirely to one room with a two-window limit', () => {
  const floor = makeFloor('OG')
  const contains = (part: Rect, east: number, south: number) => east >= part.x - 1e-8 && east <= part.x + part.width + 1e-8 && south >= part.z - 1e-8 && south <= part.z + part.depth + 1e-8
  const eyeGuardStrip = { x: stair.x + stair.width, z: stair.z + stair.runWidth, width: .16, depth: stair.depth - 2 * stair.runWidth }
  const surfaces = [...floor.rooms.flatMap(room => room.parts), ...floor.walls, ...stairOpeningParts, eyeGuardStrip]
  for (let east = house.west + .013; east < house.east; east += .05) for (let south = house.north + .017; south < house.south; south += .05) {
    expect(surfaces.some(part => contains(part, east, south)), `gap ${east},${south}`).toBe(true)
  }
  const counts = new Map<string, number>()
  for (const wall of floor.walls) for (const opening of wall.openings.filter(opening => opening.kind === 'window')) {
    const owners = floor.rooms.filter(room => [0, .5, 1].every(fraction => {
      const east = wall.axis === 'x' ? wall.x + opening.start + opening.width * fraction : house.east - .01
      const south = wall.axis === 'z' ? wall.z + opening.start + opening.width * fraction : wall.id === 'north' ? house.north + .01 : house.south - .01
      return room.parts.some(part => contains(part, east, south))
    }))
    expect(owners, opening.id).toHaveLength(1)
    counts.set(owners[0].id, (counts.get(owners[0].id) ?? 0) + 1)
  }
  expect(Object.fromEntries(counts)).toEqual({ bath: 1, 'child-north': 2, 'child-south': 2 })
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