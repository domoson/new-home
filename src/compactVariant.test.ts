import { describe, expect, it } from 'vitest'
import { area, atticCeiling, ceilingHeight, construction, elevations, floorIds, floorSlabs, house, makeFloor, ridgeElevations, roomArea, stair, wallSolids } from './model'
import { contains } from './measure'
import { kitchenModules } from './kitchenStorage'
import { sectionSpan } from './section'

describe('Variante 6,90 x 10,50 m', () => {
  it('rekonstruiert die Räume und die neue Küche mit genau fünf Hochschränken', () => {
    const ground = makeFloor('EG'), upper = makeFloor('OG')
    expect(ground.rooms.map(room => room.id)).toEqual(['wc', 'entry', 'hall', 'living'])
    expect(upper.rooms.map(room => room.id).sort()).toEqual(['bath', 'child-north', 'child-south', 'hall', 'playroom', 'store'])
    expect(ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'entrance')!.start).toBe(.6)
    expect(ground.walls.some(wall => wall.id === 'living-diagonal')).toBe(false)
    const tall = ground.furniture.filter(item => item.id === 'fridge' || item.id.startsWith('kitchen-tall'))
    expect(tall).toHaveLength(5)
    for (const [index, item] of tall.entries()) expect(item).toMatchObject({ x: 3.45 + index * .63, z: 2.5, width: .63, depth: .6, height: ground.height, angle: 0 })
    expect(ground.furniture.some(item => item.id === 'kitchen-upper')).toBe(false)
    for (const item of ground.furniture.filter(item => item.kind === 'counter')) expect(item.height).toBe(.92)
    const expectedAreas: Record<string, Record<string, number>> = {
      KG: { bath: 18.9, 'child-north': 5.7, 'child-south': 28.35, hall: 6.65 },
      EG: { wc: 4.13325, entry: 6.6675, hall: 5.209375, living: 40.07625 },
      OG: { bath: 9.105, 'child-north': 16.335, playroom: 7.26, 'child-south': 15.9075, hall: 3.796875, store: 2.09 },
      DG: { office: 14.529, hall: 2.2, store: 6.14, bedroom: 19.7072523585 },
    }
    for (const id of floorIds) for (const room of makeFloor(id).rooms) expect(roomArea(room, id).floor, `${id}/${room.id}`).toBeCloseTo(expectedAreas[id][room.id])
  })

  it('hält alle Raumkonturen disjunkt, innerhalb der Hülle und außerhalb von Wänden', () => {
    for (const id of floorIds) {
      const floor = makeFloor(id), parts = floor.rooms.flatMap(room => room.parts.map(part => ({ ...part, room: room.id })))
      for (const part of parts) {
        expect(part.width, `${id}/${part.room}`).toBeGreaterThan(0)
        expect(part.depth, `${id}/${part.room}`).toBeGreaterThan(0)
        expect(part.x).toBeGreaterThanOrEqual(house.west)
        expect(part.z).toBeGreaterThanOrEqual(house.north)
        expect(part.x + part.width).toBeLessThanOrEqual(house.east + 1e-6)
        expect(part.z + part.depth).toBeLessThanOrEqual(house.south + 1e-6)
      }
      for (let east = house.west + .031; east < house.east; east += .061) for (let south = house.north + .029; south < house.south; south += .059) {
        const point = { x: east, z: south }, owners = parts.filter(part => contains(part, point))
        expect(owners.length, `${id}/${east}/${south}`).toBeLessThanOrEqual(1)
        if (owners.length) {
          expect(floor.walls.some(wall => contains(wall, point)), `${id}/${owners[0].room}/${east}/${south}`).toBe(false)
          if (id !== 'KG') expect(contains(stair, point), `${id}/${owners[0].room}`).toBe(false)
        }
      }
    }
  })

  it('passt Möbel und Küchenmodule ein und hält die Dachschrägen frei', () => {
    for (const id of floorIds) for (const item of makeFloor(id).furniture) {
      expect(item.x, item.id).toBeGreaterThanOrEqual(house.west)
      expect(item.z, item.id).toBeGreaterThanOrEqual(house.north)
      expect(item.x + item.width, item.id).toBeLessThanOrEqual(house.east + 1e-6)
      expect(item.z + item.depth, item.id).toBeLessThanOrEqual(house.south + 1e-6)
      if (id === 'DG') expect(item.height + (item.bottom ?? 0), item.id).toBeLessThanOrEqual(Math.min(ceilingHeight(item.z), ceilingHeight(item.z + item.depth)))
      for (const module of kitchenModules(item)) {
        expect(module.width).toBeGreaterThan(0)
        expect(module.depth).toBeGreaterThan(0)
        expect(module.x).toBeGreaterThanOrEqual(item.x)
        expect(module.z).toBeGreaterThanOrEqual(item.z)
        expect(module.x + module.width).toBeLessThanOrEqual(item.x + item.width + 1e-6)
        expect(module.z + module.depth).toBeLessThanOrEqual(item.z + item.depth + 1e-6)
      }
    }
  })
  it('verwendet die echte schräge Kontur für Flächen, Wände und Schnitte', () => {
    const part = { x: 2, z: 4, width: 1, depth: 2, footprint: [[2, 6], [3, 4], [3, 6]] as [number, number][] }
    expect(area([part])).toBe(1)
    const solid = wallSolids({ ...part, id: 'diagonal', axis: 'z', openings: [] }, 2.77)[0]
    expect(solid.footprint).toEqual(part.footprint)
    expect(sectionSpan(solid, 'NS', 2.5)).toEqual([5, 6])
  })
  it('ändert Grundfläche und Treppenlage ohne die Geschosshöhen zu verändern', () => {
    expect([house.width, house.depth]).toEqual([6.9, 10.5])
    expect(house.width * house.depth).toBeCloseTo(72.45)
    expect([stair.z, stair.end, stair.width, stair.depth]).toEqual([3.5, 5.5, 1.9, 2])
    expect(elevations).toEqual({ KG: -2.45, EG: 0, OG: 2.97, DG: 5.94 })
    expect([construction.clearHeight, construction.basementClearHeight, atticCeiling.height]).toEqual([2.77, 2.25, 2.77])
    expect([house.pitch, house.knee]).toEqual([35, .5])
    expect(ridgeElevations.outside).toBeCloseTo(10.269013)
    expect(ridgeElevations.outside - construction.terrain).toBeCloseTo(10.469013)
    for (const id of floorIds.filter(id => id !== 'KG')) {
      expect(floorSlabs(id).reduce((sum, part) => sum + part.width * part.depth, 0)).toBeCloseTo(6.9 * 10.5 - 1.9 * 2)
    }
  })

  it('trennt Diele und Flur und führt die Hebeschiebeanlage bei unverändertem Sofa bis zur Ecke', () => {
    const ground = makeFloor('EG')
    expect(ground.rooms.find(room => room.id === 'entry')).toMatchObject({ name: 'Diele' })
    expect(ground.rooms.find(room => room.id === 'hall')).toMatchObject({ name: 'Flur' })
    const extension = ground.walls.find(wall => wall.id === 'stair-south-extension')!
    expect(extension.footprint).toBeUndefined()
    expect(extension).toMatchObject({ x: stair.x + stair.width, z: stair.end, depth: .2 })
    expect(extension.x + extension.width).toBeCloseTo(2.65)
    const south = ground.walls.find(wall => wall.id === 'south')!, terrace = south.openings.find(opening => opening.id === 'terrace')!, fixed = south.openings.find(opening => opening.id === 'garden-fixed')!
    expect(terrace.width + fixed.width).toBeCloseTo(2.8)
    expect(fixed.start + fixed.width).toBeCloseTo(house.east - house.west)
    const sofa = ground.furniture.find(item => item.id === 'sofa')!, chaise = ground.furniture.find(item => item.id === 'sofa-chaise')!
    expect(house.south - sofa.z - sofa.depth).toBeCloseTo(.2)
    expect(sofa.z - chaise.z - chaise.depth).toBeCloseTo(0)
  })
})