import { describe, expect, it } from 'vitest'
import { ceilingHeight, construction, elevations, floorIds, house, lightWells, makeFloor, roofPanels, roomArea, wallSolids } from './model'
import { referenceAreas } from './providerPlan'
import { kitchenModules } from './kitchenStorage'
import { boundaryDistance, partner, polygonArea, siteArea, siteBoundary, siteParcels } from './context'
import { winderCore, winderSteps, stairWalkingLine } from './winderStair'
import { createRoomLighting, lightingCircuits } from './lighting'
import { createIndirectLighting } from './indirectLighting'

describe('Anbieterentwurf', () => {
  it('places the EG television against the stair wall without moving the sideboard', () => {
    const floor = makeFloor('EG')
    const wall = floor.walls.find(wall => wall.id === 'stair-south')!
    const television = floor.furniture.find(item => item.id === 'tv')!
    expect(television.z).toBeCloseTo(wall.z + wall.depth)
    expect(television).toMatchObject({ x: .77, width: 1.3, depth: .08, height: 1.45 })
    expect(television.x + television.width).toBeLessThan(wall.x + wall.width)
    expect(floor.furniture.find(item => item.id === 'sideboard')!.z).toBeCloseTo(wall.z + wall.depth + .2)
  })
  it('enlarges the EG corner sofa and removes the west bookshelf without overlapping nearby furniture', () => {
    const floor = makeFloor('EG')
    const sofa = floor.furniture.find(item => item.id === 'sofa')!
    const returnSeat = floor.furniture.find(item => item.id === 'sofa-chaise')!
    expect(floor.furniture.some(item => item.id === 'bookshelf')).toBe(false)
    expect(sofa).toMatchObject({ x: .4, z: 9.05, width: 2.8, depth: .95, angle: Math.PI })
    expect(returnSeat).toMatchObject({ kind: 'sofa', x: .4, z: 7.2, width: .95, depth: 1.85, angle: -Math.PI / 2 })
    expect(returnSeat.z + returnSeat.depth).toBeCloseTo(sofa.z)
    expect(sofa.z + sofa.depth - returnSeat.z).toBeCloseTo(2.8)
    expect(house.south - sofa.z - sofa.depth).toBeCloseTo(.2)
    expect(floor.furniture.find(item => item.id === 'coffee')).toMatchObject({ x: 1.5, z: 8.05, width: .9, depth: .9, height: .35, shape: 'round', color: '#ffffff' })
    expect(floor.furniture.some(item => item.id === 'lounge-chair')).toBe(false)
    for (const seat of [sofa, returnSeat]) for (const other of floor.furniture.filter(item => item !== seat)) {
      const overlap = Math.min(seat.x + seat.width, other.x + other.width) - Math.max(seat.x, other.x) > .001
        && Math.min(seat.z + seat.depth, other.z + other.depth) - Math.max(seat.z, other.z) > .001
      expect(overlap, `${seat.id}/${other.id}`).toBe(false)
    }
  })
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
  it('places the cellar window 1.20 m from the south corner and centers larger light wells', () => {
    const floor = makeFloor('KG')
    for (const [index, wallId] of ['east', 'north'].entries()) {
      const wall = floor.walls.find(wall => wall.id === wallId)!, window = wall.openings[0], well = lightWells[index]
      expect(window).toMatchObject({ width: .9, height: .75 })
      if (wall.axis === 'z') {
        expect(house.depth - window.start - window.width).toBeCloseTo(1.2)
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
  it('places the guest bath northwest and keeps the kitchen transition open without diagonal walls', () => {
    const floor = makeFloor('EG'), bathroom = floor.walls.find(wall => wall.id === 'wc-east')!
    expect(bathroom.x).toBe(2.15)
    expect(bathroom.z + bathroom.openings[0].start).toBeCloseTo(.9)
    const entranceWall = floor.walls.find(wall => wall.id === 'east')!
    const entrance = entranceWall.openings.find(opening => opening.id === 'entrance')!
    const sidelight = entranceWall.openings.find(opening => opening.id === 'entrance-fixed')!
    expect(entrance).toMatchObject({ start: .6, width: 1.1, height: 2.52, frame: .03, swing: 'reverse' })
    expect(entrance.hinge).toBeUndefined()
    expect(sidelight).toMatchObject({ start: .3, width: .3, height: 2.52, sill: 0, kind: 'window' })
    expect(sidelight.start + sidelight.width).toBeCloseTo(entrance.start)
    expect(floor.walls.find(wall => wall.id === 'north')!.openings.some(opening => opening.id === 'wc-window')).toBe(true)
    expect(floor.walls.some(wall => wall.id === 'living-diagonal')).toBe(false)
    expect(floor.walls.every(wall => !wall.footprint)).toBe(true)
    expect(floor.rooms.every(room => room.parts.every(part => !part.footprint))).toBe(true)
    const extension = floor.walls.find(wall => wall.id === 'stair-south-extension')!
    expect(extension.x).toBeCloseTo(winderCore.x + winderCore.width)
    expect(extension.x + extension.width).toBeCloseTo(2.65)
    expect(extension.depth).toBe(.2)
    expect(floor.rooms.find(room => room.id === 'hall')!.parts.every(part => part.z + part.depth <= 4.3)).toBe(true)
    expect(roomArea(floor.rooms.find(room => room.id === 'hall')!, 'EG').floor).toBeCloseTo(5.569375)
    expect(roomArea(floor.rooms.find(room => room.id === 'living')!, 'EG').floor).toBeCloseTo(40.18425)
    expect(floor.walls.some(wall => wall.id === 'kitchen-west')).toBe(false)
    expect(floor.furniture.find(item => item.id === 'dining')).toMatchObject({ x: 5.2, z: 7.4, width: .9, depth: 1.8 })
  })
  it('gives the upper hall one metre clear width and connects the stepped north child room', () => {
    const floor = makeFloor('OG')
    expect(floor.rooms.find(room => room.id === 'hall')!.parts[0].width).toBeCloseTo(1.2)
    const divider = floor.walls.find(wall => wall.id === 'east-divider')!
    expect(divider.z).toBeCloseTo(winderCore.z)
    expect(divider.z + divider.depth).toBeCloseTo(7.121891892)
    expect(divider.openings.map(opening => opening.id)).toEqual(['child-north'])
    const child = floor.rooms.find(room => room.id === 'child-north')!
    expect(child.parts).toHaveLength(2)
    expect(child.parts[0].x).toBeGreaterThan(child.parts[1].x)
    expect(child.parts[0].z + child.parts[0].depth).toBeCloseTo(child.parts[1].z)
    expect(child.parts[1].width).toBeCloseTo(2.95)
    expect(roomArea(child, 'OG').floor).toBeCloseTo(18.604581081)
  })
  it('replaces the playroom with two larger child rooms and a full-width south room', () => {
    const floor = makeFloor('OG')
    const bedroom = floor.rooms.find(room => room.id === 'child-south')!
    expect(bedroom.parts).toHaveLength(1)
    const corner = bedroom.parts[0]
    expect(corner.x).toBeCloseTo(house.west)
    expect(corner.width).toBeCloseTo(6.3)
    expect(corner.z).toBeCloseTo(7.246891892)
    expect(corner.depth).toBeCloseTo(2.953108108)
    expect(roomArea(bedroom, 'OG').floor).toBeCloseTo(roomArea(floor.rooms.find(room => room.id === 'child-north')!, 'OG').floor, 10)
    expect(corner.z + corner.depth).toBeCloseTo(house.south)
    expect(roomArea(bedroom, 'OG').floor).toBeGreaterThan(17.9)
    expect(floor.rooms.some(room => room.id === 'playroom')).toBe(false)
    expect(floor.walls.some(wall => wall.id === 'playroom-south')).toBe(false)
    expect(floor.furniture.some(item => item.id.startsWith('play-'))).toBe(false)
    const split = floor.walls.find(wall => wall.id === 'children-divider')!
    const eastWindow = floor.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'play-window')!
    expect(split.z).toBeGreaterThan(eastWindow.start + eastWindow.width)
    expect(roomArea(floor.rooms.find(room => room.id === 'store')!, 'OG').floor).toBeCloseTo(2.701594595)
    expect(roomArea(floor.rooms.find(room => room.id === 'store')!, 'OG').floor).toBeGreaterThanOrEqual(2.5)
    const storageWall = floor.walls.find(wall => wall.id === 'store-south')!
    expect(storageWall.depth).toBe(.125)
    const bedroomWall = floor.walls.find(wall => wall.id === 'bedroom-north')!
    expect(storageWall.z + storageWall.depth).toBeCloseTo(bedroomWall.z + bedroomWall.depth)
    expect(floor.furniture.find(item => item.id === 'wardrobe-south')!.z).toBeCloseTo(corner.z)
  })
  it('keeps revised OG room contours disjoint and clear of solid walls and stairs', () => {
    const floor = makeFloor('OG')
    const overlap = (first: { x: number; z: number; width: number; depth: number }, second: typeof first) => Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x) > .001 && Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z) > .001
    const parts = floor.rooms.flatMap(room => room.parts.map(part => ({ ...part, room: room.id })))
    for (const [index, part] of parts.entries()) {
      expect(part.width).toBeGreaterThan(0)
      expect(part.depth).toBeGreaterThan(0)
      expect(overlap(part, winderCore), part.room).toBe(false)
      for (const other of parts.slice(index + 1)) expect(overlap(part, other), `${part.room}/${other.room}`).toBe(false)
      for (const wall of floor.walls) for (const solid of wallSolids(wall, floor.height)) expect(overlap(part, solid), `${part.room}/${wall.id}`).toBe(false)
    }
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
  it('combines the attic office with an accessible full-size guest bed', () => {
    const floor = makeFloor('DG'), bed = floor.furniture.find(item => item.id === 'guest-bed')!
    const parents = floor.furniture.find(item => item.id === 'parents-bed')!
    expect(bed).toMatchObject({ width: parents.width, depth: parents.depth, height: parents.height, angle: 0 })
    expect(floor.rooms.find(room => room.id === 'office')).toMatchObject({ name: 'Schlafen / Ankleide', spawn: [4.9, 4.2] })
    expect(floor.rooms.find(room => room.id === 'bedroom')!.name).toBe('Büro / Gäste')
    expect(floor.furniture.find(item => item.id === 'office-desk')).toMatchObject({ z: 7.1, angle: Math.PI })
    expect(floor.furniture.find(item => item.id === 'office-chair')).toMatchObject({ z: 6.35, angle: 0 })
    expect(floor.furniture.find(item => item.id === 'parents-north-storage')).toMatchObject({ x: .35, z: 2.8, width: 2.65, front: 'north' })
    expect(floor.furniture.find(item => item.id === 'parents-low')).toMatchObject({ x: .35, z: 1.78 })
    expect(house.east - bed.x - bed.width).toBeCloseTo(.6)
    const wall = floor.walls.find(wall => wall.id === 'office-west')!
    expect(bed.x - wall.x - wall.width).toBeGreaterThanOrEqual(.65 - 1e-6)
    const storage = floor.furniture.find(item => item.id === 'office-south-storage')!
    expect(storage.z - bed.z - bed.depth).toBeGreaterThanOrEqual(.85)
    for (const other of floor.furniture.filter(item => item !== bed)) {
      const overlap = Math.min(bed.x + bed.width, other.x + other.width) - Math.max(bed.x, other.x) > .001
        && Math.min(bed.z + bed.depth, other.z + other.depth) - Math.max(bed.z, other.z) > .001
      expect(overlap, other.id).toBe(false)
    }
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
  it('aligns the southern attic knee wall behind the bed across the full width', () => {
    const floor = makeFloor('DG')
    expect(floor.walls.find(wall => wall.id === 'parents-entry-south')!.openings[0].width).toBe(.86)
    expect(floor.walls.find(wall => wall.id === 'parents-entry-south')!.openings[0].height).toBe(2.11)
    expect(floor.walls.find(wall => wall.id === 'office-west')!.openings[0].height).toBe(2.11)
    expect(floor.rooms.map(room => room.id)).toEqual(['office', 'hall', 'bedroom'])
    expect(floor.furniture.some(item => item.id === 'store-shelf')).toBe(false)
    expect(floor.walls.flatMap(wall => wall.openings).some(opening => opening.id === 'store')).toBe(false)
    const wall = floor.walls.find(wall => wall.id === 'knee-south')!
    expect(wall).toMatchObject({ x: house.west, z: 9, openings: [] })
    expect(wall.width).toBeCloseTo(house.east - house.west)
    expect(floor.walls.some(wall => ['knee-south-west', 'knee-south-return', 'store-north', 'store-east'].includes(wall.id))).toBe(false)
    const bedroom = floor.rooms.find(room => room.id === 'bedroom')!
    expect(bedroom.parts).toHaveLength(2)
    expect(bedroom.parts[1]).toMatchObject({ x: house.west, width: house.east - house.west })
    expect(bedroom.parts[1].z + bedroom.parts[1].depth).toBeCloseTo(wall.z)
    expect(bedroom.parts.some(part => part.x < 1.5 && part.x + part.width > 1.5 && part.z < 8.2 && part.z + part.depth > 8.2)).toBe(true)
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
    const near = (actual: Record<string, unknown>, expected: Record<string, number>) => { for (const [key, value] of Object.entries(expected)) expect(actual[key], key).toBeCloseTo(value) }
    const bathWall = (id: string) => bath.walls.find(wall => wall.id === id)!, fixture = (id: string) => bath.furniture.find(item => item.id === id)!
    near(bathWall('bath-installation'), { x: .3, z: 1.7, width: 1.24, depth: .15 })
    near(bathWall('bath-screen'), { x: 1.54, z: 1.05, width: .15, depth: 1.35 })
    for (const id of ['bath-installation', 'bath-screen']) {
      expect(bathWall(id).height).toBeCloseTo(2.42)
      expect(bath.height - bathWall(id).height!).toBeCloseTo(.35)
      expect(Math.max(...wallSolids(bathWall(id), bath.height).map(solid => solid.bottom + solid.height))).toBeCloseTo(2.42)
    }
    expect(bath.walls.some(wall => wall.id === 'bath-installation-north')).toBe(false)
    expect(fixture('bath-wc')).toMatchObject({ angle: Math.PI, concealedFittings: true })
    near(fixture('bath-wc'), { x: .67, z: 1.04, width: .5, depth: .65 })
    expect(fixture('bath-shower')).toMatchObject({ angle: 0, concealedFittings: true })
    near(fixture('bath-shower'), { x: .32, z: 1.87, width: 1.2, depth: 1.41 })
    expect(fixture('bath-sink')).toMatchObject({ angle: -Math.PI / 2, concealedFittings: true })
    near(fixture('bath-sink'), { x: 1.79, z: 1.425, width: .4, depth: .6 })
    expect(bath.furniture.filter(item => item.id.startsWith('bath-sink'))).toHaveLength(1)
    near(fixture('bath-mirror-cabinet'), { x: 1.69, z: 1.125, width: .16, depth: 1.2, bottom: 1.15, height: .7 })
    expect(fixture('bath-vanity').front).toBe('east')
    near(fixture('bath-vanity'), { x: 1.69, z: 1.05, width: .5, depth: 1.35 })
    expect(fixture('bath-sink').z - fixture('bath-vanity').z).toBeCloseTo(.375)
    expect(fixture('bath-vanity').z + fixture('bath-vanity').depth - fixture('bath-sink').z - fixture('bath-sink').depth).toBeCloseTo(.375)
    expect(fixture('bath-sink').x - fixture('bath-vanity').x).toBeCloseTo(.1)
    expect(bathWall('bath-screen').z - house.north).toBeCloseTo(.75)
    expect(bathWall('stair-north').z - bathWall('bath-screen').z - bathWall('bath-screen').depth).toBeCloseTo(.9)
    const showerDoor = bathWall('bath-shower-door')
    expect(showerDoor.height).toBe(2.1)
    expect(showerDoor.openings[0]).toMatchObject({ id: 'shower', height: 2.1, glazed: true, hinge: 'end' })
    expect(showerDoor.openings[0].width - 2 * showerDoor.openings[0].frame!).toBeGreaterThan(.8)
    expect(wallSolids(showerDoor, bath.height)).toEqual([])
    expect(fixture('bath-tub').x - fixture('bath-vanity').x - fixture('bath-vanity').width).toBeCloseTo(1.01)
    expect(roomArea(bath.rooms.find(room => room.id === 'bath')!, 'OG').floor).toBeCloseTo(10.7115)
    near(fixture('bath-tub'), { x: 3.2, z: .35, width: .8, depth: 1.8 })
    expect(makeFloor('EG').furniture.find(item => item.id === 'dining')).toMatchObject({ width: .9, depth: 1.8, z: 7.4 })
    const attic = makeFloor('DG'), cabinet = attic.furniture.find(item => item.id === 'dressing-low')!
    expect(cabinet.z + cabinet.depth).toBeCloseTo(attic.walls.find(wall => wall.id === 'knee-south')!.z)
    expect(cabinet.height).toBe(1.2)
  })
})