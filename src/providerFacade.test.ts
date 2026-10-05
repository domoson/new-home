import { describe, expect, it } from 'vitest'
import { house, makeFloor, roofHeight, wallSolids } from './model'
import { facadeFormats, goldenMinor, windowHead } from './providerPlan'
import { windowFrame, windowJoint, windowMullionStart, windowPanels } from './windowLayout'
import { raffstores } from './raffstore'
import { roomDaylight } from './roomDaylight'

const phi = (1 + Math.sqrt(5)) / 2
const sides = ['east', 'west'] as const
const wallOf = (floorId: 'EG' | 'OG' | 'DG', wallId: string, side: 'east' | 'west' = 'east') => makeFloor(floorId, side).walls.find(wall => wall.id === wallId)!

describe('Fassadenfenster im Goldenen Schnitt', () => {
  it('derives the formats from a continuous 250 cm head line and the golden ratio', () => {
    expect(windowHead).toBe(2.5)
    expect(goldenMinor(2.5)).toBe(.95)
    expect(goldenMinor(1.8)).toBe(.69)
    expect(facadeFormats.tall).toEqual({ width: 1.2, height: 2.5, lowerFixed: .95 })
    expect(facadeFormats.band.width / facadeFormats.band.height).toBeCloseTo(phi, 1)
    expect(facadeFormats.slot.height / facadeFormats.slot.width).toBeCloseTo(phi ** 3, 0)
    expect(facadeFormats.tall.lowerFixed / (facadeFormats.tall.height - facadeFormats.tall.lowerFixed)).toBeCloseTo(1 / phi, 1)
    expect(facadeFormats.child).toEqual({ width: 1.8, height: 1.5 })
    expect(windowHead - facadeFormats.child.height).toBe(1)
    expect(facadeFormats.kitchen).toEqual({ width: 2.4, height: 1.125 })
    expect(facadeFormats.clerestory).toEqual({ width: 1.8, height: .5 })
    expect(facadeFormats.slidingLeaf).toBe(1.2)
  })
  it('keeps every facade window head at 250 cm except the lower entrance', () => {
    for (const side of sides) for (const floorId of ['EG', 'OG', 'DG'] as const) {
      const floor = makeFloor(floorId, side)
      for (const opening of floor.walls.filter(wall => ['north', 'east', 'south'].includes(wall.id)).flatMap(wall => wall.openings)) {
        expect(opening.sill + opening.height, `${side}/${floorId}/${opening.id}`).toBeCloseTo(opening.id.startsWith('entrance') ? 2.25 : windowHead)
        expect(opening.sill + opening.height).toBeLessThan(floor.height)
        expect(opening.height / .125, `${side} ${floorId} ${opening.id}`).toBeCloseTo(Math.round(opening.height / .125), 6)
      }
    }
  })
  it('stacks two tall windows on the DG gable symmetric to the ridge and keeps only the north one in the OG', () => {
    for (const side of sides) {
      const wall = wallOf('DG', 'east', side)
      const [north, south] = ['gable-office', 'gable-parents'].map(id => wall.openings.find(opening => opening.id === id)!)
      expect(wall.openings).toHaveLength(2)
      for (const opening of [north, south]) {
        expect(opening).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1, lowerFixed: .95 } })
        const panels = windowPanels(opening)
        const fixed = panels.find(panel => panel.fixed)!, leaf = panels.find(panel => !panel.fixed)!
        expect(panels).toHaveLength(2)
        expect(fixed.bottom + fixed.height).toBeCloseTo(.95 - windowJoint / 2)
        expect(leaf.bottom).toBeCloseTo(.95 + windowJoint / 2)
        expect(leaf.bottom + leaf.height).toBeCloseTo(2.5 - windowFrame)
      }
      expect(wall.z + north.start).toBeCloseTo(3.75)
      expect(wall.z + south.start).toBeCloseTo(5.55)
      expect(south.start - north.start - north.width).toBeCloseTo(.6)
      expect(wall.z * 2 + north.start + south.start + south.width).toBeCloseTo(house.depth)
      for (const opening of [north, south]) {
        const blind = raffstores(makeFloor('DG', side)).find(blind => blind.id === `DG-${opening.id}`)!
        expect(blind.box.bottom).toBe(2.5)
        for (const z of [blind.box.z, blind.box.z + blind.box.depth]) expect(roofHeight(z) - blind.box.bottom - blind.box.height).toBeGreaterThan(.05)
      }
      const upper = wallOf('OG', 'east', side)
      expect(upper.openings).toHaveLength(1)
      expect(upper.openings[0]).toMatchObject({ id: 'east-north', width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1, lowerFixed: .95 } })
      expect(upper.openings[0].start).toBeCloseTo(north.start)
    }
  })
  it('keeps the gable windows clear of the OG children divider and the DG partition', () => {
    const upper = makeFloor('OG'), attic = makeFloor('DG')
    const eastUpper = upper.walls.find(wall => wall.id === 'east')!, eastAttic = attic.walls.find(wall => wall.id === 'east')!
    const divider = upper.walls.find(wall => wall.id === 'children-divider')!
    const north = eastUpper.openings.find(opening => opening.id === 'east-north')!
    expect(divider.z - eastUpper.z - north.start - north.width).toBeGreaterThan(1)
    expect(eastUpper.z + north.start).toBeGreaterThan(upper.walls.find(wall => wall.id === 'bath-south')!.z + .3)
    const partition = attic.walls.find(wall => wall.id === 'office-entry')!
    const parents = eastAttic.openings.find(opening => opening.id === 'gable-parents')!
    expect(eastAttic.z + parents.start - partition.z - partition.depth).toBeGreaterThanOrEqual(.3)
    const office = eastAttic.openings.find(opening => opening.id === 'gable-office')!
    expect(partition.z - eastAttic.z - office.start - office.width).toBeGreaterThanOrEqual(.1)
  })
  it('places the kitchen band on the gable north axis above the counter with its leaf at the south end', () => {
    for (const side of sides) {
      const ground = makeFloor('EG', side)
      const east = ground.walls.find(wall => wall.id === 'east')!
      const kitchen = east.openings.find(opening => opening.id === 'kitchen-east-window')!
      const upper = wallOf('OG', 'east', side)
      expect(east.z + kitchen.start).toBeCloseTo(upper.z + upper.openings[0].start)
      expect(east.z + kitchen.start + kitchen.width).toBeCloseTo(6.15)
      expect(kitchen).toMatchObject({ width: 2.4, sill: 1.375, height: 1.125, windowLayout: { columns: 2, ventilationWidth: goldenMinor(2.4), ventilationSide: 'end' } })
      expect(goldenMinor(2.4)).toBe(.92)
      const panels = windowPanels(kitchen)
      const leaf = panels.find(panel => !panel.fixed)!, fixed = panels.find(panel => panel.fixed)!
      expect(panels).toHaveLength(2)
      expect(leaf).toMatchObject({ column: 1, hinge: 'end' })
      expect(fixed.start + fixed.width).toBeLessThan(leaf.start)
      for (const item of ground.furniture.filter(item => item.x + item.width > house.east - .7 && item.z < east.z + kitchen.start + kitchen.width && item.z + item.depth > east.z + kitchen.start)) {
        expect((item.bottom ?? 0) + item.height, item.id).toBeLessThan(kitchen.sill)
      }
    }
  })
  it('divides every band window at the golden ratio with one operable leaf', () => {
    for (const floorId of ['EG', 'OG'] as const) for (const wall of makeFloor(floorId).walls) {
      for (const opening of wall.openings.filter(opening => opening.kind === 'window' && opening.windowLayout?.columns === 2)) {
        const ventilation = opening.windowLayout!.ventilationWidth!
        expect(ventilation).toBe(goldenMinor(opening.width))
        expect(ventilation / (opening.width - ventilation)).toBeCloseTo(1 / phi, 1)
        const divider = windowMullionStart(opening) + windowJoint / 2
        expect(opening.windowLayout?.ventilationSide === 'start' ? divider : opening.width - divider).toBeCloseTo(ventilation)
        expect(windowPanels(opening).filter(panel => !panel.fixed)).toHaveLength(1)
        expect(opening.sill + opening.height).toBe(windowHead)
        expect(opening).toMatchObject(opening.id.startsWith('child') || opening.id === 'south-east' ? { sill: 1, height: 1.5 } : { sill: 1.375, height: 1.125 })
      }
    }
  })
  it('splits the south facade at the golden ratio into a slot wall, a 240 slider and a corner fixed light', () => {
    for (const side of sides) {
      const ground = makeFloor('EG', side)
      const south = ground.walls.find(wall => wall.id === 'south')!
      const slot = south.openings.find(opening => opening.id === 'garden-west-fixed')!
      const terrace = south.openings.find(opening => opening.id === 'terrace')!
      const fixed = south.openings.find(opening => opening.id === 'garden-fixed')!
      const corner = south.openings.find(opening => opening.id === 'garden-corner-fixed')!
      expect(slot).toMatchObject({ width: .6, sill: 0, height: 2.5, windowLayout: { columns: 1 } })
      expect(south.x + slot.start).toBeCloseTo(1.2)
      expect(terrace).toMatchObject({ width: 1.2, sill: 0, height: 2.5 })
      expect(south.x + terrace.start).toBeCloseTo(2.7)
      expect(fixed).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1 } })
      expect(fixed.cornerGlazing).toBeUndefined()
      expect(fixed.start).toBeCloseTo(terrace.start + terrace.width)
      expect(corner).toMatchObject({ sill: 0, height: 2.5, cornerGlazing: true, windowLayout: { columns: 1 } })
      expect(corner.width).toBeCloseTo(1.5)
      expect(corner.start).toBeCloseTo(fixed.start + fixed.width)
      expect(south.width - corner.start - corner.width).toBeCloseTo(0)
      expect((terrace.width + fixed.width) / corner.width).toBeCloseTo(phi, 1)
      const outer = house.east - house.west + .7
      expect(outer / (outer - 2.7)).toBeCloseTo(phi, 1)
      expect((outer - 2.7) / 2.7).toBeCloseTo(phi, 1)
      expect(windowPanels(slot)).toHaveLength(1)
      expect(windowPanels(slot)[0].fixed).toBe(true)
      const eastWall = ground.walls.find(wall => wall.id === 'east')!
      const living = eastWall.openings.find(opening => opening.id === 'living-corner-fixed')!
      expect(living).toMatchObject({ width: 1.2, sill: 0, height: 2.5, cornerGlazing: true })
      expect(eastWall.z + living.start).toBeCloseTo(9.3)
      expect(eastWall.z + living.start + living.width).toBeGreaterThanOrEqual(house.depth - 1e-9)
      const cornerSolids = ground.walls.filter(wall => ['east', 'south'].includes(wall.id)).flatMap(wall => wallSolids(wall, ground.height))
      expect(cornerSolids.some(solid => solid.bottom < terrace.height && solid.x + solid.width > house.east - .01 && solid.z + solid.depth > house.south - .01)).toBe(false)
      const center = south.x + slot.start + slot.width / 2
      expect(wallSolids(south, ground.height).some(solid => solid.x < center && solid.x + solid.width > center && solid.bottom >= slot.height)).toBe(true)
    }
  })
  it('places the OG south windows on the slot axis and the east axis with a 100 cm child sill', () => {
    for (const side of sides) {
      const south = wallOf('OG', 'south', side), ground = wallOf('EG', 'south', side)
      const tall = south.openings.find(opening => opening.id === 'south-west')!
      const band = south.openings.find(opening => opening.id === 'south-east')!
      expect(tall).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1, lowerFixed: .95 } })
      expect(tall.start).toBeCloseTo(ground.openings.find(opening => opening.id === 'garden-west-fixed')!.start)
      expect(band).toMatchObject({ width: 1.8, sill: 1, height: 1.5, windowLayout: { columns: 2, ventilationWidth: .69 } })
      expect(south.width - band.start - band.width).toBeCloseTo(.3)
      expect(band.start).toBeCloseTo(wallOf('OG', 'north', side).openings.find(opening => opening.id === 'child-north-window')!.start)
    }
  })
  it('stacks two north axes with the WC slot and a flat clerestory below the OG bath band and child window', () => {
    for (const side of sides) {
      const ground = wallOf('EG', 'north', side), upper = wallOf('OG', 'north', side)
      const wc = ground.openings.find(opening => opening.id === 'wc-window')!
      const hall = ground.openings.find(opening => opening.id === 'hall-window-fixed')!
      const bath = upper.openings.find(opening => opening.id === 'bath-window')!
      const child = upper.openings.find(opening => opening.id === 'child-north-window')!
      expect(wc).toMatchObject({ start: .3, width: .6, sill: 1.5, height: 1, windowLayout: { columns: 1 } })
      expect(hall).toMatchObject({ start: 4.2, width: 1.8, sill: 2, height: .5, windowLayout: { columns: 1 } })
      expect(bath).toMatchObject({ start: .3, width: 1.8, sill: 1.375, height: 1.125, windowLayout: { columns: 2, ventilationWidth: .69 } })
      expect(child).toMatchObject({ start: 4.2, width: 1.8, sill: 1, height: 1.5, windowLayout: { columns: 2, ventilationWidth: .69 } })
      expect(child.sill).toBeCloseTo(facadeFormats.tall.lowerFixed + .05)
      expect(house.west + hall.start).toBeCloseTo(4.5)
      expect(house.west + hall.start + hall.width).toBeCloseTo(6.3)
      expect(wc.start).toBe(bath.start)
      expect(hall.start).toBe(child.start)
      expect(windowPanels(hall)).toHaveLength(1)
      expect(windowPanels(hall)[0].fixed).toBe(true)
      expect(windowPanels(wc)).toHaveLength(1)
      expect(windowPanels(wc)[0].fixed).toBe(false)
      expect(upper.x + bath.start + bath.width).toBeLessThan(3.45)
    }
  })
  it('keeps the child desks centred under the band windows and the north bed clear of the tall window', () => {
    const floor = makeFloor('OG')
    for (const [deskId, chairId, wallId, windowId, angle] of [['desk-north', 'desk-chair-north', 'north', 'child-north-window', 0], ['desk-south', 'desk-chair-south', 'south', 'south-east', Math.PI]] as const) {
      const desk = floor.furniture.find(item => item.id === deskId)!, chair = floor.furniture.find(item => item.id === chairId)!
      const wall = floor.walls.find(wall => wall.id === wallId)!, opening = wall.openings.find(opening => opening.id === windowId)!
      expect(desk).toMatchObject({ width: 1.4, depth: .6, angle })
      expect(desk.x + desk.width / 2).toBeCloseTo(wall.x + opening.start + opening.width / 2)
      expect(chair.x + chair.width / 2).toBeCloseTo(desk.x + desk.width / 2)
      expect(opening.sill).toBeGreaterThan(desk.height + .2)
    }
    const bed = floor.furniture.find(item => item.id === 'bed-north')!
    const east = floor.walls.find(wall => wall.id === 'east')!
    const window = east.openings.find(opening => opening.id === 'east-north')!
    expect(bed.z).toBeGreaterThan(east.z + window.start + window.width + .1)
    const eastSouth = east.openings.find(opening => opening.id === 'east-south')
    expect(eastSouth).toBeUndefined()
  })
  it('keeps operable leaves above furniture along the east wall', () => {
    for (const floorId of ['EG', 'OG', 'DG'] as const) {
      const floor = makeFloor(floorId)
      const eastWall = floor.walls.find(wall => wall.id === 'east')!
      for (const opening of eastWall.openings.filter(opening => opening.kind === 'window' && !opening.id.includes('fixed'))) {
        const panels = windowPanels(opening).filter(panel => !panel.fixed)
        expect(panels).toHaveLength(1)
        for (const panel of panels) for (const furniture of floor.furniture.filter(item => item.x + item.width > eastWall.x + eastWall.width / 2 - panel.width && item.z < eastWall.z + opening.start + panel.start + panel.width && item.z + item.depth > eastWall.z + opening.start + panel.start)) {
          expect((furniture.bottom ?? 0) + furniture.height, `${floorId} ${furniture.id}`).toBeLessThan(opening.sill + panel.bottom)
        }
      }
    }
  })
  it('keeps window widths on the 30 cm module and inside their walls', () => {
    const onGrid = (value: number, label: string) => expect(value / .3, label).toBeCloseTo(Math.round(value / .3), 6)
    for (const floorId of ['EG', 'OG', 'DG'] as const) {
      for (const wall of makeFloor(floorId).walls.filter(wall => ['north', 'east', 'south'].includes(wall.id))) {
        for (const opening of wall.openings.filter(opening => opening.kind === 'window' && !['entrance-fixed', 'garden-fixed'].includes(opening.id))) {
          onGrid(opening.width, `${floorId} ${wall.id} ${opening.id} width`)
          expect(opening.start + opening.width).toBeLessThanOrEqual((wall.axis === 'x' ? wall.width : wall.depth) + 1e-9)
        }
      }
    }
  })
  it('lights the living area through the south and east glazing', () => {
    const living = roomDaylight('EG').find(room => room.id === 'EG-living')!
    expect(living.glazing).toBeGreaterThan(14)
    for (const room of roomDaylight('OG').filter(room => room.id.startsWith('OG-child'))) expect(room.glazing, room.id).toBeGreaterThan(3)
  })
})
