import { describe, expect, it } from 'vitest'
import { area, construction, facadeGrid, floorIds, floorSlabs, house, houseEnvelope, makeFloor, stairOpeningParts, wallSolids } from './model'
import { boundaryDistance, partnerEnvelope, siteHouseEnvelope } from './context'

describe('Aussenfenster im Steinraster', () => {
  it('haelt mit 20 cm Suedverschiebung mindestens 3 m zur Nordgrenze ein', () => {
    for (const bounds of [siteHouseEnvelope(), partnerEnvelope()]) {
      for (const east of [bounds.x, bounds.x + bounds.width]) expect(boundaryDistance([east, bounds.z], 0)).toBeGreaterThanOrEqual(3)
    }
    expect(siteHouseEnvelope().z).toBeCloseTo(.1)
    expect(partnerEnvelope().z).toBeCloseTo(1)
  })
  it('schliesst Decken und die offene Glasecke an die neue Aussenhuelle an', () => {
    const envelope = houseEnvelope()
    for (const id of floorIds) expect(area(floorSlabs(id)) + (id === 'KG' ? 0 : area(stairOpeningParts))).toBeCloseTo(envelope.width * envelope.depth)
    const east = makeFloor('EG').walls.find(wall => wall.id === 'east')!
    expect(wallSolids(east, 2.77).some(solid => solid.bottom < 2.125 && solid.z + solid.depth > house.depth && solid.z >= 9.3)).toBe(false)
  })
  it('verstaerkt nur nach aussen und behaelt Innenraum und Oeffnungsraster bei', () => {
    expect(construction.exteriorWall).toBe(.4)
    expect(facadeGrid).toBe(.3)
    expect(construction.partyWall).toBe(.4)
    expect(houseEnvelope().width).toBeCloseTo(7.1)
    expect(houseEnvelope().depth).toBeCloseTo(10.7)
    const revised = floorIds.map(id => makeFloor(id))
    construction.exteriorWall = .3
    construction.partyWall = .3
    const previous = floorIds.map(id => makeFloor(id))
    construction.exteriorWall = .4
    construction.partyWall = .4
    for (const [index, floor] of revised.entries()) {
      expect(floor.rooms).toEqual(previous[index].rooms)
      expect(floor.furniture).toEqual(previous[index].furniture)
      for (const wall of floor.walls) {
        const original = previous[index].walls.find(candidate => candidate.id === wall.id)!
        if (!['west', 'east', 'north', 'south'].includes(wall.id)) {
          expect(wall).toEqual(original)
          continue
        }
        expect(wall.axis === 'x' ? wall.depth : wall.width).toBeCloseTo(.4)
        for (const opening of wall.openings) {
          const oldOpening = original.openings.find(candidate => candidate.id === opening.id)!
          expect({ ...opening, start: 0 }).toEqual({ ...oldOpening, start: 0 })
          expect(opening.start + (wall.axis === 'x' ? wall.x : wall.z)).toBeCloseTo(oldOpening.start + (wall.axis === 'x' ? original.x : original.z), 10)
        }
      }
    }
  })
})