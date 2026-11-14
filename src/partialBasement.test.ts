import { describe, expect, it } from 'vitest'
import { area, basement, basementEastSetback, basementEnvelope, construction, elevations, floorSlabs, frostSkirtDepth, frostSkirts, furnitureVolumes, houseEnvelope, lightWellBars, lightWells, makeFloor, roomArea, stair, wallSolids } from './model'
import { boundaryDistance, siteBasementEnvelope, siteHouseEnvelope } from './context'
import { neighbor8GaragePoint, neighbor8 } from './neighbor8'
import { siteLightWells, splashStripParts } from './splashStrip'
import { planObjects } from './measure'
import { createScalePeople } from './scalePeople'

describe('Teilunterkellerung West', () => {
  it('retracts the basement by 1.80 m from the east facade and keeps > 5.5 m to neighbor 8 boundary garage', () => {
    const cellar = basementEnvelope(), full = houseEnvelope()
    expect(basementEastSetback).toBe(1.8)
    expect(basement.east).toBeCloseTo(4.8)
    expect(cellar.x).toBeCloseTo(full.x)
    expect(cellar.z).toBeCloseTo(full.z)
    expect(cellar.depth).toBeCloseTo(full.depth)
    expect(cellar.width).toBeCloseTo(5.248)
    expect(full.x + full.width - (cellar.x + cellar.width)).toBeCloseTo(1.8)

    const siteCellar = siteBasementEnvelope('east'), siteFull = siteHouseEnvelope()
    for (const fraction of [0, .25, .5, .75, 1]) {
      const z = siteCellar.z + siteCellar.depth * fraction
      const cellarClearance = boundaryDistance([siteCellar.x + siteCellar.width, z], 1)
      const fullClearance = boundaryDistance([siteFull.x + siteFull.width, z], 1)
      expect(cellarClearance).toBeGreaterThan(5.55)
      expect(cellarClearance - fullClearance).toBeGreaterThan(1.75)
    }

    const garageNorthWest = neighbor8GaragePoint(0, neighbor8.garage.z)
    const garageSouthWest = neighbor8GaragePoint(0, neighbor8.garage.z + neighbor8.garage.depth)
    expect(garageNorthWest[1]).toBeLessThan(siteCellar.z)
    expect(garageSouthWest[1]).toBeGreaterThan(siteCellar.z + siteCellar.depth - .5)
  })

  it('reduces net cellar area to 42.75 m² across two rooms plus stair hall without overlaps', () => {
    const floor = makeFloor('KG')
    expect(floor.rooms.map(room => room.id)).toEqual(['bath', 'hall', 'child-south'])
    const areas = floor.rooms.map(room => roomArea(room, 'KG'))
    expect(areas[0]).toEqual({ floor: 13.5, living: 0 })
    expect(areas[1]).toEqual({ floor: 9, living: 0 })
    expect(areas[2].floor).toBeCloseTo(20.25)
    expect(areas[2].living).toBe(0)
    expect(areas.reduce((sum, item) => sum + item.floor, 0)).toBeCloseTo(42.75)

    const parts = floor.rooms.flatMap(room => room.parts)
    for (const [index, part] of parts.entries()) {
      expect(part.x).toBeGreaterThanOrEqual(basement.west - 1e-8)
      expect(part.x + part.width).toBeLessThanOrEqual(basement.east + 1e-8)
      for (const other of parts.slice(index + 1)) {
        const overlapX = Math.min(part.x + part.width, other.x + other.width) - Math.max(part.x, other.x)
        const overlapZ = Math.min(part.z + part.depth, other.z + other.depth) - Math.max(part.z, other.z)
        expect(Math.min(overlapX, overlapZ)).toBeLessThan(1e-8)
      }
      for (const wall of floor.walls) for (const solid of wallSolids(wall, floor.height)) {
        const overlapX = Math.min(part.x + part.width, solid.x + solid.width) - Math.max(part.x, solid.x)
        const overlapZ = Math.min(part.z + part.depth, solid.z + solid.depth) - Math.max(part.z, solid.z)
        expect(Math.min(overlapX, overlapZ), `${wall.id}`).toBeLessThan(1e-8)
      }
    }
  })

  it('aligns cellar slab, uncellared frost skirts, doors, furniture, light wells, and scale figures', () => {
    const cellar = basementEnvelope(), floor = makeFloor('KG')
    expect(floorSlabs('KG')).toEqual([cellar])
    expect(area(floorSlabs('EG')) + stair.width * stair.depth).toBeCloseTo(houseEnvelope().width * houseEnvelope().depth)

    const skirts = frostSkirts()
    expect(skirts).toHaveLength(3)
    expect(frostSkirtDepth).toBe(.8)
    for (const skirt of skirts) {
      expect(skirt.x).toBeGreaterThanOrEqual(cellar.x + cellar.width - 1e-8)
      expect(skirt.x + skirt.width).toBeLessThanOrEqual(houseEnvelope().x + houseEnvelope().width + 1e-8)
    }

    expect(lightWells).toHaveLength(2)
    expect(siteLightWells).toHaveLength(4)
    expect(floor.walls.find(wall => wall.id === 'east')!.openings).toEqual([])
    for (const well of lightWells) {
      expect(lightWellBars(well)).toHaveLength(4)
      expect(well.x + well.width).toBeLessThan(basement.east)
    }
    for (const well of siteLightWells) for (const strip of splashStripParts) {
      const overlapX = Math.min(strip.x + strip.width, well.x + well.width) - Math.max(strip.x, well.x)
      const overlapZ = Math.min(strip.z + strip.depth, well.z + well.depth) - Math.max(strip.z, well.z)
      expect(Math.min(overlapX, overlapZ)).toBeLessThan(1e-8)
    }

    for (const [index, item] of floor.furniture.entries()) {
      expect(item.x).toBeGreaterThanOrEqual(basement.west)
      expect(item.x + item.width).toBeLessThanOrEqual(basement.east)
      expect(item.z).toBeGreaterThanOrEqual(basement.north)
      expect(item.z + item.depth).toBeLessThanOrEqual(basement.south)
      for (const other of floor.furniture.slice(index + 1)) {
        const overlapX = Math.min(item.x + item.width, other.x + other.width) - Math.max(item.x, other.x)
        const overlapZ = Math.min(item.z + item.depth, other.z + other.depth) - Math.max(item.z, other.z)
        expect(Math.min(overlapX, overlapZ), `${item.id}/${other.id}`).toBeLessThan(1e-8)
      }
      for (const volume of furnitureVolumes(item)) expect(volume.bottom + volume.height).toBeLessThanOrEqual(floor.height)
    }

    const objects = planObjects(floor, true)
    expect(objects.some(object => object.label === 'Nicht unterkellert (Bodenplatte EG)')).toBe(true)
    expect(elevations.KG).toBeCloseTo(-(construction.basementClearHeight + construction.basementCeiling))

    const people = createScalePeople(['KG'], true)
    expect(people.group.children).toHaveLength(4)
    people.dispose()
  })
})
