import { describe, expect, it } from 'vitest'
import { ceilingHeight, construction, elevations, floorIds, house, lightWells, makeFloor, roofPanels, roomArea, wallSolids } from './model'
import { referenceAreas } from './providerPlan'
import { kitchenModules } from './kitchenStorage'
import { boundaryDistance, partner, polygonArea, siteArea, siteBoundary, siteParcels } from './context'
import { winderCore, winderSteps, stairWalkingLine } from './winderStair'
import { createRoomLighting, lightingCircuits } from './lighting'
import { createIndirectLighting } from './indirectLighting'

describe('Anbieterentwurf', () => {
  it('removes pantry storage and keeps the cellar divider clear of both door openings', () => {
    expect(makeFloor('EG').furniture.filter(item => item.id.startsWith('pantry-'))).toEqual([])
    const floor = makeFloor('KG'), divider = floor.walls.find(wall => wall.id === 'east-divider')!
    expect(divider.x).toBe(3.625)
    for (const id of ['bath-south', 'store-north']) {
      const wall = floor.walls.find(wall => wall.id === id)!, door = wall.openings[0]
      expect(divider.x - wall.x - door.start - door.width).toBeCloseTo(.165)
    }
    expect(floor.rooms.find(room => room.id === 'hall')!.parts[0].width).toBeCloseTo(divider.x - house.west)
    expect(floor.rooms.find(room => room.id === 'child-north')!.parts[0].x).toBeCloseTo(divider.x + divider.width)
  })
  it('places the cellar window 1.35 m from the south corner and centers larger light wells', () => {
    const floor = makeFloor('KG')
    for (const [index, wallId] of ['east', 'north'].entries()) {
      const wall = floor.walls.find(wall => wall.id === wallId)!, window = wall.openings[0], well = lightWells[index]
      expect(window).toMatchObject({ width: .9, height: .75 })
      if (wall.axis === 'z') {
        expect(house.depth - window.start - window.width).toBeCloseTo(1.35)
        expect(well.z + well.depth / 2).toBeCloseTo(wall.z + window.start + window.width / 2)
        expect(well).toMatchObject({ width: .5, depth: 1.3 })
      } else {
        expect(well.x + well.width / 2).toBeCloseTo(wall.x + window.start + window.width / 2)
        expect(well).toMatchObject({ width: 1.3, depth: .5 })
      }
    }
  })
  it('uses the offered envelope and section levels', () => {
    expect(house.width).toBe(6.9)
    expect(house.depth).toBe(10.5)
    expect(elevations.KG).toBeCloseTo(-2.45)
    expect(elevations.OG).toBeCloseTo(2.97)
    expect(elevations.DG).toBeCloseTo(5.94)
    expect(construction.clearHeight).toBe(2.77)
    expect(Math.max(...roofPanels().map(part => part.z + part.depth))).toBeCloseTo(10.75)
  })
  it('reconstructs all reference rooms without furnishing the west shell', () => {
    for (const id of floorIds) {
      const floor = makeFloor(id)
      if (referenceAreas[id]) for (const roomId of Object.keys(referenceAreas[id]!)) expect(floor.rooms.some(room => room.id === roomId), `${id}/${roomId}`).toBe(true)
      for (const room of floor.rooms) expect(roomArea(room, id).floor).toBeGreaterThan(0)
      expect(makeFloor(id, 'west').furniture).toEqual([])
      expect(makeFloor(id, 'west').rooms).toEqual([])
    }
  })
  it('keeps furniture and kitchen modules inside the new shell', () => {
    for (const id of floorIds) for (const furniture of makeFloor(id).furniture) {
      expect(furniture.x, furniture.id).toBeGreaterThanOrEqual(house.west - .001)
      expect(furniture.z, furniture.id).toBeGreaterThanOrEqual(house.north - .001)
      expect(furniture.x + furniture.width, furniture.id).toBeLessThanOrEqual(house.east + .001)
      expect(furniture.z + furniture.depth, furniture.id).toBeLessThanOrEqual(house.south + .001)
      for (const module of kitchenModules(furniture)) {
        expect(module.x + module.width).toBeLessThanOrEqual(furniture.x + furniture.width + .001)
        expect(module.z + module.depth).toBeLessThanOrEqual(furniture.z + furniture.depth + .001)
      }
    }
  })
  it('places the guest bath northwest, entrance northeast and keeps the diagonal passage open', () => {
    const floor = makeFloor('EG'), bathroom = floor.walls.find(wall => wall.id === 'wc-east')!
    expect(bathroom.x).toBe(2.15)
    expect(bathroom.z + bathroom.openings[0].start).toBeCloseTo(.9)
    const entranceWall = floor.walls.find(wall => wall.id === 'east')!
    const entrance = entranceWall.openings.find(opening => opening.id === 'entrance')!
    const sidelight = entranceWall.openings.find(opening => opening.id === 'entrance-fixed')!
    expect(entrance).toMatchObject({ start: .72, width: 1.1, height: 2.52, frame: .03, swing: 'reverse' })
    expect(entrance.hinge).toBeUndefined()
    expect(sidelight).toMatchObject({ start: .37, width: .35, height: 2.52, sill: 0, kind: 'window' })
    expect(sidelight.start + sidelight.width).toBeCloseTo(entrance.start)
    expect(floor.walls.find(wall => wall.id === 'north')!.openings.some(opening => opening.id === 'wc-window')).toBe(true)
    const passage = floor.walls.find(wall => wall.id === 'living-diagonal')!
    expect(passage.footprint).toHaveLength(4)
    expect(wallSolids(passage, floor.height)).toEqual([])
    expect(floor.furniture.find(item => item.id === 'dining')).toMatchObject({ x: 5.2, z: 7.75, width: .9, depth: 1.8 })
  })
  it('gives the upper hall one metre clear width and fully separates the south rooms', () => {
    const floor = makeFloor('OG')
    expect(floor.rooms.find(room => room.id === 'hall')!.parts[0].width).toBeCloseTo(1.125)
    const divider = floor.walls.find(wall => wall.id === 'east-divider')!
    expect(divider.z + divider.depth).toBeCloseTo(8.35)
    const southWall = wallSolids(divider, floor.height).find(solid => solid.bottom === 0 && solid.z <= 8 && solid.z + solid.depth >= 8)!
    expect(southWall.z + southWall.depth).toBeCloseTo(8.35)
  })
  it('arranges the EG shower southwest and concealed WC and basin against the north service wall', () => {
    const floor = makeFloor('EG'), service = floor.walls.find(wall => wall.id === 'wc-installation-north')!
    const shower = floor.furniture.find(item => item.id === 'guest-shower')!, toilet = floor.furniture.find(item => item.id === 'guest-wc')!, sink = floor.furniture.find(item => item.id === 'guest-sink')!
    expect(service).toMatchObject({ depth: .08, height: 1.2 })
    expect(toilet.x + toilet.width).toBeLessThan(sink.x)
    expect(toilet.z + toilet.depth).toBeLessThan(shower.z)
    for (const fixture of [toilet, sink]) {
      expect(fixture.angle).toBe(0)
      expect(fixture.z - service.z - service.depth).toBeCloseTo(.01)
    }
    for (const fixture of [shower, toilet, sink]) expect(fixture.concealedFittings).toBe(true)
    const bath = floor.rooms.find(room => room.id === 'wc')!
    for (const part of bath.parts) for (const wall of floor.walls.filter(wall => wall.id.startsWith('wc-installation-'))) {
      const overlap = Math.min(part.x + part.width, wall.x + wall.width) - Math.max(part.x, wall.x) > .001 && Math.min(part.z + part.depth, wall.z + wall.depth) - Math.max(part.z, wall.z) > .001
      expect(overlap).toBe(false)
    }
  })
  it('weights actual attic contours without inventing a reference plan', () => {
    expect(referenceAreas.DG).toBeUndefined()
    for (const room of makeFloor('DG').rooms) {
      const actual = roomArea(room, 'DG')
      expect(actual.living).toBeGreaterThan(0)
      expect(actual.living).toBeLessThanOrEqual(actual.floor * .97 + 1e-6)
    }
  })
  it('aligns the attic bedroom entrance with the stair end and turns the bed south', () => {
    const floor = makeFloor('DG')
    expect(floor.walls.find(wall => wall.id === 'parents-entry-south')!.z).toBe(floor.walls.find(wall => wall.id === 'stair-south')!.z)
    expect(floor.walls.some(wall => wall.id === 'hall-southwest')).toBe(false)
    expect(floor.furniture.find(item => item.id === 'parents-bed')).toMatchObject({ width: 1.8, depth: 2, angle: Math.PI })
    for (const id of ['office-desk-return', 'office-south-storage', 'parents-north-storage']) expect(floor.furniture.some(item => item.id === id)).toBe(true)
  })
  it('keeps furnishings clear of wall solids and the attic ceiling', () => {
    for (const id of floorIds) {
      const floor = makeFloor(id)
      for (const furniture of floor.furniture) {
        const bottom = furniture.bottom ?? 0
        if (id === 'DG') expect(bottom + furniture.height, furniture.id).toBeLessThanOrEqual(Math.min(ceilingHeight(furniture.z), ceilingHeight(furniture.z + furniture.depth)) + .001)
        for (const wall of floor.walls) for (const solid of wallSolids(wall, floor.height)) {
          const overlaps = Math.min(furniture.x + furniture.width, solid.x + solid.width) - Math.max(furniture.x, solid.x) > .001
            && Math.min(furniture.z + furniture.depth, solid.z + solid.depth) - Math.max(furniture.z, solid.z) > .001
            && Math.min(bottom + furniture.height, solid.bottom + solid.height) - Math.max(bottom, solid.bottom) > .001
          expect(overlaps, `${id}: ${furniture.id} / ${wall.id}`).toBe(false)
        }
      }
    }
  })
  it('preserves the parcel and its equal split while applying the offered stagger', () => {
    expect(siteBoundary).toEqual([[-10.056098883413, -1.667802356868], [10.250012281990, -4.480603334238], [13.648101413502, 20.791970540504], [-14.323750719705, 23.472546642384]])
    expect(siteArea).toBeCloseTo(607.2641)
    expect(polygonArea(siteParcels.east)).toBeCloseTo(polygonArea(siteParcels.west))
    expect(partner).toEqual({ x: -6.9, z: .9, width: 6.9, depth: 10.5 })
    for (const corner of [[0, 0], [6.9, 0], [6.9, 10.5], [0, 10.5], [-6.9, .9], [-6.9, 11.4]] as [number, number][]) {
      for (let side = 0; side < 4; side++) expect(boundaryDistance(corner, side)).toBeGreaterThan(0)
    }
    expect(boundaryDistance([-6.9, .9], 0)).toBeCloseTo(2.976563811)
  })
  it('ascends from the south to the north on the actual stair treads', () => {
    const line = stairWalkingLine(2.97), steps = winderSteps(2.97)
    expect(line[0][2]).toBeCloseTo(winderCore.end - winderCore.runWidth / 2)
    expect(line.at(-1)![2]).toBeCloseTo(winderCore.z + winderCore.runWidth / 2)
    expect(line[0][1]).toBe(0)
    expect(line.at(-1)![1]).toBe(2.97)
    expect(Math.min(...steps[0].footprint.map(point => point[1]))).toBeCloseTo(winderCore.end - winderCore.runWidth)
    expect(Math.min(...steps.at(-1)!.footprint.map(point => point[1]))).toBeCloseTo(winderCore.z)
  })
  it('uses smaller attic doors and an east-side storage entrance', () => {
    const floor = makeFloor('DG')
    expect(floor.walls.find(wall => wall.id === 'parents-entry-south')!.openings[0].width).toBe(.86)
    expect(floor.walls.find(wall => wall.id === 'parents-entry-south')!.openings[0].height).toBe(2.11)
    expect(floor.walls.find(wall => wall.id === 'office-west')!.openings[0].height).toBe(2.11)
    expect(floor.walls.find(wall => wall.id === 'store-north')!.openings).toEqual([])
    expect(floor.walls.find(wall => wall.id === 'store-east')!.openings[0]).toMatchObject({ id: 'store', width: .73, swing: 'reverse' })
    expect(floor.walls.find(wall => wall.id === 'store-east')!.openings[0].height).toBe(1.6)
  })
  it('has no interior fixtures, circuits or artificial bounce light', () => {
    expect(lightingCircuits).toEqual([])
    const lights = createRoomLighting(floorIds, [])
    lights.update({ 'KG-bath': true }, 'KG')
    expect(lights.group.children).toEqual([])
    const indirect = createIndirectLighting(['KG'], [])
    indirect.update({ 'KG-bath': true }, 'KG')
    expect(indirect.uniforms.bounceStrength.value.every(value => value === 0)).toBe(true)
  })
  it('preserves upper door hinges and an unobstructed kitchen entrance', () => {
    for (const [id, wallId, doorId] of [['DG', 'office-west', 'attic-office'], ['OG', 'east-divider', 'child-north']] as const) {
      expect(makeFloor(id).walls.find(wall => wall.id === wallId)!.openings.find(open => open.id === doorId)!.hinge).toBe('end')
    }
    const floor = makeFloor('EG')
    for (const id of ['fridge', 'kitchen-tall', 'kitchen-tall-storage-1']) {
      const cabinet = floor.furniture.find(item => item.id === id)!
      expect(cabinet.x - winderCore.x - winderCore.width).toBeGreaterThanOrEqual(.975 - .001)
      expect(cabinet.angle).toBe(0)
    }
  })
  it('keeps revised EG room contours disjoint and clear of walls and the stair opening', () => {
    const floor = makeFloor('EG')
    const overlap = (first: { x: number; z: number; width: number; depth: number }, second: typeof first) => Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x) > .001 && Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z) > .001
    const parts = floor.rooms.flatMap(room => room.parts.map(part => ({ ...part, room: room.id })))
    for (const [index, part] of parts.entries()) {
      expect(part.width).toBeGreaterThan(0)
      expect(part.depth).toBeGreaterThan(0)
      expect(overlap(part, winderCore), part.room).toBe(false)
      for (const other of parts.slice(index + 1).filter(other => !other.footprint && !part.footprint)) expect(overlap(part, other), `${part.room}/${other.room}`).toBe(false)
      for (const wall of floor.walls.filter(wall => !wall.footprint && !part.footprint)) expect(overlap(part, wall), `${part.room}/${wall.id}`).toBe(false)
    }
  })
  it('models substantial cross walls, bathroom service walls and the requested furniture sizes', () => {
    for (const id of ['EG', 'OG', 'DG'] as const) for (const wallId of ['stair-north', 'stair-south']) expect(makeFloor(id).walls.find(wall => wall.id === wallId)!.depth).toBe(.2)
    const bath = makeFloor('OG')
    expect(bath.walls.find(wall => wall.id === 'bath-installation-north')).toMatchObject({ depth: .08, height: 1.2 })
    expect(wallSolids(bath.walls.find(wall => wall.id === 'bath-installation-north')!, bath.height)[0].height).toBe(1.2)
    for (const id of ['bath-wc', 'bath-sink']) expect(bath.furniture.find(item => item.id === id)!.angle).toBe(0)
    expect(makeFloor('EG').furniture.find(item => item.id === 'dining')).toMatchObject({ width: .9, depth: 1.8, z: 7.75 })
    const attic = makeFloor('DG'), cabinet = attic.furniture.find(item => item.id === 'dressing-low')!
    expect(cabinet.z + cabinet.depth).toBeCloseTo(attic.walls.find(wall => wall.id === 'store-north')!.z)
    expect(attic.walls.find(wall => wall.id === 'store-east')!.openings[0].height).toBe(1.6)
  })
})