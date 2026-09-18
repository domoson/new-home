import { describe, expect, it } from 'vitest'
import { ceilingHeight, construction, elevations, floorIds, house, lightWells, makeFloor, roofPanels, roomArea, wallSolids } from './model'
import { offeredAreas } from './providerPlan'
import { kitchenModules } from './kitchenStorage'
import { boundaryDistance, partner, polygonArea, siteArea, siteBoundary, siteParcels } from './context'
import { winderCore, winderSteps, stairWalkingLine } from './winderStair'
import { createRoomLighting, lightingCircuits } from './lighting'
import { createIndirectLighting } from './indirectLighting'

describe('Anbieterentwurf', () => {
  it('keeps pantry shelving shallow and the cellar divider clear of both door openings', () => {
    const pantry = makeFloor('EG').furniture.filter(item => item.id.startsWith('pantry-shelf'))
    expect(pantry).toHaveLength(2)
    expect(pantry.find(item => item.id === 'pantry-shelf-north')).toMatchObject({ width: 1.9, depth: .3 })
    expect(pantry.find(item => item.id === 'pantry-shelf')).toMatchObject({ width: .32, angle: Math.PI })
    const floor = makeFloor('KG'), divider = floor.walls.find(wall => wall.id === 'east-divider')!
    expect(divider.x).toBe(3.625)
    for (const id of ['bath-south', 'store-north']) {
      const wall = floor.walls.find(wall => wall.id === id)!, door = wall.openings[0]
      expect(divider.x - wall.x - door.start - door.width).toBeCloseTo(.125)
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
    expect(house.width).toBe(6.6)
    expect(house.depth).toBe(11.4)
    expect(elevations.KG).toBeCloseTo(-2.45)
    expect(elevations.OG).toBeCloseTo(2.97)
    expect(elevations.DG).toBeCloseTo(5.94)
    expect(construction.clearHeight).toBe(2.77)
    expect(Math.max(...roofPanels().map(part => part.z + part.depth))).toBeCloseTo(11.65)
  })
  it('reconstructs all offered rooms and keeps floor totals within five percent', () => {
    for (const id of floorIds) {
      const floor = makeFloor(id)
      expect(floor.rooms.map(room => room.id).sort()).toEqual(Object.keys(offeredAreas[id]).sort())
      const actual = floor.rooms.reduce((sum, room) => sum + roomArea(room, id).floor, 0)
      const target = Object.values(offeredAreas[id]).reduce((sum, values) => sum + values[0], 0)
      for (const room of floor.rooms) {
        const corridorAdjustment = id === 'OG' && room.id.startsWith('child-') ? .15 * room.parts[0].depth : 0
        const serviceAdjustment = id === 'EG' && room.id === 'wc' ? floor.walls.filter(wall => wall.id.startsWith('wc-installation-')).reduce((sum, wall) => sum + wall.width * wall.depth, 0) : 0
        expect(Math.abs(roomArea(room, id).floor - (offeredAreas[id][room.id][0] - corridorAdjustment - serviceAdjustment)), `${id} ${room.id}`).toBeLessThan(.7)
      }
      expect(Math.abs(actual - target) / target).toBeLessThan(.05)
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
  it('uses the revised entrance niche, pantry door and wall-side dining group', () => {
    const floor = makeFloor('EG')
    const bathroom = floor.walls.find(wall => wall.id === 'wc-south')!
    expect(bathroom.z).toBe(floor.walls.find(wall => wall.id === 'kitchen-south')!.z)
    expect(bathroom.x + bathroom.openings[0].start).toBeCloseTo(3.975)
    expect(floor.walls.find(wall => wall.id === 'wc-niche-return')).toBeDefined()
    expect(floor.furniture.find(item => item.id === 'hall-niche-storage')).toBeDefined()
    const pantry = floor.walls.find(wall => wall.id === 'kitchen-east')!.openings[0]
    expect(pantry.width).toBe(.73)
    expect(pantry.start).toBeGreaterThan(.48)
    expect(floor.walls.find(wall => wall.id === 'east')!.openings[0]).toMatchObject({ hinge: 'end', swing: 'reverse' })
    expect(floor.furniture.find(item => item.id === 'dining')!.x - house.west).toBeCloseTo(.05)
  })
  it('gives the upper hall one metre clear width and fully separates the south rooms', () => {
    const floor = makeFloor('OG')
    expect(floor.rooms.find(room => room.id === 'hall')!.parts[0].width).toBeCloseTo(1)
    const divider = floor.walls.find(wall => wall.id === 'east-divider')!
    expect(divider.z + divider.depth).toBe(house.south)
    const southWall = wallSolids(divider, floor.height).find(solid => solid.bottom === 0 && solid.z <= 8 && solid.z + solid.depth >= 8)!
    expect(southWall.z + southWall.depth).toBeCloseTo(house.south)
  })
  it('arranges the EG shower northwest and concealed WC and basin against the east service wall', () => {
    const floor = makeFloor('EG'), service = floor.walls.find(wall => wall.id === 'wc-installation-east')!
    const shower = floor.furniture.find(item => item.id === 'guest-shower')!, toilet = floor.furniture.find(item => item.id === 'guest-wc')!, sink = floor.furniture.find(item => item.id === 'guest-sink')!
    expect(service).toMatchObject({ width: .2, height: 1.2 })
    expect(floor.walls.find(wall => wall.id === 'wc-installation-shower')).toMatchObject({ width: .96, depth: .1, height: 2.2 })
    expect(shower.x + shower.width).toBeLessThan(toilet.x)
    expect(toilet.z + toilet.depth).toBeLessThan(sink.z)
    for (const fixture of [toilet, sink]) {
      expect(fixture.angle).toBe(Math.PI / 2)
      expect(fixture.x + fixture.width).toBeCloseTo(service.x)
    }
    for (const fixture of [shower, toilet, sink]) expect(fixture.concealedFittings).toBe(true)
    const bath = floor.rooms.find(room => room.id === 'wc')!
    for (const part of bath.parts) for (const wall of floor.walls.filter(wall => wall.id.startsWith('wc-installation-'))) {
      const overlap = Math.min(part.x + part.width, wall.x + wall.width) - Math.max(part.x, wall.x) > .001 && Math.min(part.z + part.depth, wall.z + wall.depth) - Math.max(part.z, wall.z) > .001
      expect(overlap).toBe(false)
    }
  })
  it('matches the attic height-weighted areas without substituting offered labels', () => {
    for (const room of makeFloor('DG').rooms) {
      const entranceAdjustment = room.id === 'hall' ? .425 * 1.1 * .97 : 0
      expect(Math.abs(roomArea(room, 'DG').living - (offeredAreas.DG[room.id][1] - entranceAdjustment)), room.id).toBeLessThan(.5)
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
    expect(partner).toEqual({ x: -6.6, z: .9, width: 6.6, depth: 11.4 })
    for (const corner of [[0, 0], [6.6, 0], [6.6, 11.4], [0, 11.4], [-6.6, .9], [-6.6, 12.3]] as [number, number][]) {
      for (let side = 0; side < 4; side++) expect(boundaryDistance(corner, side)).toBeGreaterThan(3)
    }
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
    expect(floor.walls.find(wall => wall.id === 'parents-entry-south')!.openings[0].width).toBe(.85)
    expect(floor.walls.find(wall => wall.id === 'store-north')!.openings).toEqual([])
    expect(floor.walls.find(wall => wall.id === 'store-east')!.openings[0]).toMatchObject({ id: 'store', width: .73, swing: 'reverse' })
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
  it('mirrors the requested door hinges and leaves space for the eastern kitchen units', () => {
    for (const [id, wallId, doorId] of [['DG', 'office-west', 'attic-office'], ['OG', 'east-divider', 'child-north'], ['EG', 'kitchen-east', 'pantry'], ['EG', 'kitchen-south', 'kitchen-door']] as const) {
      expect(makeFloor(id).walls.find(wall => wall.id === wallId)!.openings.find(open => open.id === doorId)!.hinge).toBe('end')
    }
    const floor = makeFloor('EG'), wall = floor.walls.find(wall => wall.id === 'kitchen-south')!, door = wall.openings[0]
    expect(wall.x + door.start).toBeCloseTo(2.275)
    for (const id of ['fridge', 'kitchen-tall', 'kitchen-east-storage']) {
      const cabinet = floor.furniture.find(item => item.id === id)!
      expect(cabinet.x).toBeGreaterThan(wall.x + door.start + door.width)
      expect(cabinet.angle).toBe(-Math.PI)
    }
  })
  it('models substantial cross walls, bathroom service walls and the requested furniture sizes', () => {
    for (const id of ['EG', 'OG', 'DG'] as const) for (const wallId of ['stair-north', 'stair-south']) expect(makeFloor(id).walls.find(wall => wall.id === wallId)!.depth).toBe(.2)
    const bath = makeFloor('OG')
    expect(bath.walls.find(wall => wall.id === 'bath-installation-east')).toMatchObject({ width: .2, height: 1.2 })
    expect(bath.walls.find(wall => wall.id === 'bath-installation-west')).toMatchObject({ width: .12, height: 1.05 })
    expect(wallSolids(bath.walls.find(wall => wall.id === 'bath-installation-east')!, bath.height)[0].height).toBe(1.2)
    for (const id of ['bath-wc', 'bath-sink']) expect(bath.furniture.find(item => item.id === id)!.angle).toBe(Math.PI / 2)
    expect(makeFloor('EG').furniture.find(item => item.id === 'dining')).toMatchObject({ width: 2, depth: 1, z: 7.85 })
    const attic = makeFloor('DG'), cabinet = attic.furniture.find(item => item.id === 'dressing-low')!
    expect(cabinet.z + cabinet.depth).toBeCloseTo(attic.walls.find(wall => wall.id === 'store-north')!.z)
    expect(attic.walls.find(wall => wall.id === 'store-east')!.openings[0].height).toBe(1.6)
  })
})