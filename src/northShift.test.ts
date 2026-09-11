import { expect, test } from 'vitest'
import { area, floorIds, floorSlabs, house, interiorWallThickness, makeFloor, roofHeight, roofWindows, roomArea, stair, stairOpeningParts, wallSolids } from './model'
import type { Rect } from './model'

const overlap = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

test('North-shifted floors keep rooms, furniture and stair openings clear', () => {
  for (const id of floorIds) {
    const floor = makeFloor(id)
    const walls = floor.walls.flatMap(wall => wallSolids(wall, floor.height))
    for (const room of floor.rooms) for (const part of room.parts) {
      expect(part.width).toBeGreaterThan(0)
      expect(part.depth).toBeGreaterThan(0)
      for (const opening of stairOpeningParts) expect(overlap(part, opening), `${id}/${room.id}/stair`).toBeLessThan(1e-6)
      for (const solid of walls.filter(solid => solid.bottom === 0)) expect(overlap(part, solid), `${id}/${room.id}/${solid.id}`).toBeLessThan(1e-6)
    }
    for (const [index, room] of floor.rooms.entries()) for (const other of floor.rooms.slice(index + 1)) for (const part of room.parts) for (const otherPart of other.parts) expect(overlap(part, otherPart), `${id}/${room.id}/${other.id}`).toBeLessThan(1e-6)
    for (const item of floor.furniture) {
      for (const opening of stairOpeningParts) expect(overlap(item, opening), `${id}/${item.id}/stair`).toBeLessThan(1e-6)
      for (const solid of walls.filter(solid => solid.bottom < item.height)) expect(overlap(item, solid), `${id}/${item.id}/${solid.id}`).toBeLessThan(1e-6)
      const covered = floor.rooms.flatMap(room => room.parts).reduce((sum, part) => sum + overlap(item, part), 0)
      expect(covered, `${id}/${item.id}/inside`).toBeCloseTo(item.width * item.depth)
      if (id === 'DG') expect(Math.min(roofHeight(item.z), roofHeight(item.z + item.depth)), item.id).toBeGreaterThan(item.height)
    }
    for (const wall of floor.walls) for (const opening of wall.openings) {
      expect(opening.start, `${id}/${opening.id}`).toBeGreaterThanOrEqual(0)
      expect(opening.start + opening.width, `${id}/${opening.id}`).toBeLessThanOrEqual((wall.axis === 'x' ? wall.width : wall.depth) + 1e-6)
    }
    if (id !== 'KG') expect(area(floorSlabs(id)) + area(stairOpeningParts)).toBeCloseTo(70)
  }
})

test('Requested room proportions, sofa shift and two centered roof windows', () => {
  const eg = makeFloor('EG'), kg = makeFloor('KG'), og = makeFloor('OG'), dg = makeFloor('DG')
  const size = (floor: typeof eg, id: string) => roomArea(floor.rooms.find(room => room.id === id)!, floor.id).floor
  expect(size(eg, 'wc')).toBeLessThan(4.3)
  expect(eg.walls.find(wall => wall.id === 'wc-east')!.x).toBeCloseTo(stair.x + stair.width)
  const kitchenEntry = eg.walls.find(wall => wall.id === 'hall-south')!
  expect(kitchenEntry.openings[0]).toMatchObject({ start: 0, width: 1.8, height: eg.height, kind: 'passage' })
  expect(wallSolids(kitchenEntry, eg.height).every(solid => solid.x >= kitchenEntry.x + 1.8 - 1e-6)).toBe(true)
  expect(size(dg, 'hall')).toBeCloseTo(2.6558)
  expect(size(dg, 'office')).toBeCloseTo(13.995173)
  expect(dg.walls.find(wall => wall.id === 'stair-east')!.openings).toHaveLength(0)
  expect(size(eg, 'living')).toBeGreaterThan(38)
  expect(eg.furniture.find(item => item.id === 'sofa')!.z).toBeCloseTo(6.64 - .35)
  expect(eg.furniture.find(item => item.id === 'kitchen')!.depth).toBeCloseTo(1.45)
  expect(kg.rooms.find(room => room.id === 'bath')!.parts[0].width).toBeCloseTo(house.east - house.west)
  expect(kg.rooms.find(room => room.id === 'child-north')!.parts).toHaveLength(1)
  expect(size(kg, 'bath')).toBeGreaterThan(size(kg, 'child-north'))
  expect(size(og, 'bath')).toBeGreaterThanOrEqual(9)
  expect(size(og, 'bath')).toBeLessThanOrEqual(10)
  for (const id of ['child-north', 'child-south']) {
    expect(size(og, id)).toBeGreaterThanOrEqual(14)
    expect(size(og, id)).toBeLessThan(16.5)
    const main = og.rooms.find(room => room.id === id)!.parts.reduce((largest, part) => part.width * part.depth > largest.width * largest.depth ? part : largest)
    expect(Math.max(main.width, main.depth) / Math.min(main.width, main.depth)).toBeLessThan(1.6)
  }
  expect(size(og, 'multifunction')).toBeLessThan(4)
  expect(og.walls.flatMap(wall => wall.openings).some(opening => opening.id === 'multifunction')).toBe(false)
  const divider = dg.walls.find(wall => wall.id === 'office-entry')!
  expect(divider.z + interiorWallThickness / 2).toBeCloseTo(house.depth / 2)
  expect(roofWindows).toHaveLength(2)
  for (const window of roofWindows) expect(window.x + window.width / 2).toBeCloseTo(house.width / 2)
  expect(stair.z).toBeCloseTo(2.45)
})

test('Room door swing samples and furniture footprints stay clear', () => {
  for (const id of floorIds) {
    const floor = makeFloor(id)
    for (const [index, item] of floor.furniture.entries()) for (const other of floor.furniture.slice(index + 1)) {
      if (['tv', 'hob', 'espresso'].includes(item.kind) || ['tv', 'hob', 'espresso'].includes(other.kind) || [item.id, other.id].includes('kitchen-sink')) continue
      expect(overlap(item, other), `${id}/${item.id}/${other.id}`).toBeLessThan(1e-6)
    }
    for (const wall of floor.walls) for (const opening of wall.openings.filter(opening => opening.kind === 'door' && opening.id !== 'terrace')) {
      const reverse = opening.hinge === 'end'
      const pivotX = wall.x + (wall.axis === 'x' ? opening.start + (reverse ? opening.width : 0) : wall.width / 2)
      const pivotZ = wall.z + (wall.axis === 'z' ? opening.start + (reverse ? opening.width : 0) : wall.depth / 2)
      const closed = (wall.axis === 'x' ? 0 : -Math.PI / 2) + (reverse ? Math.PI : 0)
      const direction = (['store-north', 'parents-entry-south'].includes(wall.id) ? -1 : 1) * (reverse ? -1 : 1) * (opening.swing === 'reverse' ? -1 : 1)
      for (let pose = 0; pose <= 20; pose++) {
        const angle = closed + direction * Math.PI / 2 * pose / 20
        for (let sample = 0; sample <= 50; sample++) {
          const east = pivotX + Math.cos(angle) * opening.width * sample / 50
          const south = pivotZ - Math.sin(angle) * opening.width * sample / 50
          for (const item of floor.furniture) {
            const hits = east > item.x - .018 && east < item.x + item.width + .018 && south > item.z - .018 && south < item.z + item.depth + .018
            expect(hits, `${id}/${opening.id}/${item.id}/pose${pose}`).toBe(false)
          }
        }
      }
    }
  }
})

test('EG stair doors, fitted cupboards and OG bathroom entrance stay usable', () => {
  const eg = makeFloor('EG'), og = makeFloor('OG')
  for (const wallId of ['stair-east', 'stair-east-south']) {
    expect(eg.walls.find(wall => wall.id === wallId)!.openings[0]).toMatchObject({ kind: 'door', width: 1, height: 2.4 })
  }
  for (const floor of [eg, og]) {
    const cupboard = floor.furniture.find(item => item.id === 'stair-cabinet')!
    expect(cupboard.width).toBeCloseTo(.68)
    expect(cupboard.depth).toBeCloseTo(.86)
    expect(cupboard.x + cupboard.width).toBeCloseTo(stair.x + stair.width + interiorWallThickness)
    expect(cupboard.height).toBe(2.4)
  }
  expect(og.furniture.find(item => item.id === 'bath-tub')).toMatchObject({ x: .45, z: .43, width: .8, depth: 1.8 })
  const entryWall = og.walls.find(wall => wall.openings.some(opening => opening.id === 'bath'))!
  expect(entryWall.id).toBe('east-divider')
  const entry = entryWall.openings.find(opening => opening.id === 'bath')!
  expect(entry.width).toBe(.9)
  const entrance = { x: 3.6, z: 2.45, width: .9, depth: .9 }
  const studyAccess = { x: 4.95, z: 2.4, width: .6, depth: 3.4 }
  for (const item of og.furniture) {
    expect(overlap(entrance, item), `Badeingang/${item.id}`).toBeLessThan(1e-6)
    expect(overlap(studyAccess, item), `Schreibtischweg/${item.id}`).toBeLessThan(1e-6)
  }
  expect(og.furniture.find(item => item.id === 'wardrobe-north')).toMatchObject({ z: 6.08, width: 1.8, depth: .6 })
})