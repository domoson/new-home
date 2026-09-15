import { expect, it } from 'vitest'
import { construction, elevations, floorIds, house, makeFloor, ridgeElevations, roofHeight, roofInnerElevation, roofOuterElevation, roofVerticalThickness, slabThickness, storeyRise } from './model'

it('schliesst die Geschosspakete ohne verlorene lichte Hoehe', () => {
  for (const id of floorIds) expect(elevations[id]).toBeCloseTo({ KG: -2.74, EG: 0, OG: 3, DG: 6 }[id])
  for (const id of floorIds.slice(0, -1)) {
    const next = floorIds[floorIds.indexOf(id) + 1]
    expect(elevations[next] - slabThickness(next) - elevations[id]).toBeCloseTo(makeFloor(id).height)
    expect(storeyRise(id)).toBeCloseTo(elevations[next] - elevations[id])
  }
})

it('leitet Dachkoten aus Innenknie, Wandstaerke und Normaldicke ab', () => {
  expect(roofHeight(house.north)).toBeCloseTo(.5)
  expect(roofHeight(house.south)).toBeCloseTo(.5)
  expect(roofVerticalThickness).toBeCloseTo(.427271)
  expect(roofInnerElevation(0)).toBeCloseTo(6.233921)
  expect(roofOuterElevation(0)).toBeCloseTo(6.661192)
  expect(ridgeElevations.inside).toBeCloseTo(9.734959)
  expect(ridgeElevations.outside).toBeCloseTo(10.23223)
  expect(ridgeElevations.outside - construction.terrain).toBeCloseTo(10.43223)
})

it('behaelt die Aussenmasse bei und zieht die freien Wandinnenkanten ein', () => {
  for (const id of floorIds) {
    const floor = makeFloor(id)
    for (const wall of floor.walls.filter(wall => ['north', 'south', 'east'].includes(wall.id))) {
      expect(wall.axis === 'x' ? wall.depth : wall.width).toBeCloseTo(.38)
      expect(wall.x + wall.width).toBeLessThanOrEqual(house.width)
      expect(wall.z + wall.depth).toBeLessThanOrEqual(house.depth)
    }
    for (const part of floor.rooms.flatMap(room => room.parts)) {
      expect(part.z).toBeGreaterThanOrEqual(house.north)
      expect(part.x + part.width).toBeLessThanOrEqual(house.east + 1e-6)
      expect(part.z + part.depth).toBeLessThanOrEqual(house.south + 1e-6)
    }
  }
})