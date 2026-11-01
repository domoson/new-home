import { describe, expect, it } from 'vitest'
import { house, makeFloor, roofHeight, roomArea, wallSolids } from './model'
import { windowFrame, windowJoint, windowMullionStart, windowPanels } from './windowLayout'
import { raffstores } from './raffstore'
import { roomDaylight } from './roomDaylight'

const onGrid = (value: number) => expect(value / .3).toBeCloseTo(Math.round(value / .3), 6)

describe('Fassadenfenster', () => {
  it('widens the kitchen window 30 cm south and moves its opening leaf to the north', () => {
    for (const side of ['east', 'west'] as const) {
      const ground = makeFloor('EG', side)
      const east = ground.walls.find(wall => wall.id === 'east')!
      const kitchen = east.openings.find(opening => opening.id === 'kitchen-east-window')!
      expect(east.z + kitchen.start).toBeCloseTo(3.3 + .3)
      expect(east.z + kitchen.start + kitchen.width).toBeCloseTo(5.4 + .3)
      expect(kitchen).toMatchObject({ width: 2.1, sill: 1.5, height: 1, windowLayout: { columns: 2, ventilationWidth: .6, ventilationSide: 'start' } })
      expect(kitchen.sill).toBeCloseTo(1.625 - .125)
      expect(kitchen.height).toBeCloseTo(.875 + .125)
      expect(kitchen.sill + kitchen.height).toBeCloseTo(2.5)
      expect(windowPanels(kitchen).filter(panel => !panel.fixed)).toHaveLength(1)
      expect(windowPanels(kitchen).filter(panel => panel.fixed)).toHaveLength(1)
      const leaf = windowPanels(kitchen).find(panel => !panel.fixed)!
      const fixed = windowPanels(kitchen).find(panel => panel.fixed)!
      expect(leaf).toMatchObject({ column: 0, hinge: 'start' })
      expect(east.z + kitchen.start + leaf.start).toBeCloseTo(3.65)
      expect(leaf.start + leaf.width).toBeLessThan(fixed.start)
      expect(fixed.width).toBeCloseTo(1.42)
    }
  })
  it('keeps the north child east window shifted and places the EG bathroom window 30 cm from the west inner wall', () => {
    for (const side of ['east', 'west'] as const) {
      const upper = makeFloor('OG', side), ground = makeFloor('EG', side)
      const east = upper.walls.find(wall => wall.id === 'east')!
      const child = east.openings.find(opening => opening.id === 'east-north')!
      expect(east.z + child.start).toBeCloseTo(3.6)
      expect(child).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1, lowerFixed: .9 } })
      const north = ground.walls.find(wall => wall.id === 'north')!
      const bath = north.openings.find(opening => opening.id === 'wc-window')!
      expect(bath).toMatchObject({ start: .3, width: .6, sill: 1.5, height: 1, windowLayout: { columns: 1 } })
      expect(north.x + bath.start - house.west).toBeCloseTo(.3)
      expect(north.x + bath.start).toBeCloseTo(.6)
      expect(north.x + bath.start + bath.width).toBeCloseTo(1.2)
      expect(bath.sill + bath.height).toBe(2.5)
      expect(windowPanels(bath).filter(panel => !panel.fixed)).toHaveLength(1)
      expect(windowPanels(bath).some(panel => panel.fixed)).toBe(false)
    }
  })
  it('centers child desks below the normal windows and keeps the north bed south of the floor-length window', () => {
    const floor = makeFloor('OG')
    for (const [deskId, chairId, wallId, windowId, angle] of [['desk-north', 'desk-chair-north', 'north', 'child-north-window', 0], ['desk-south', 'desk-chair-south', 'south', 'south-east', Math.PI]] as const) {
      const desk = floor.furniture.find(item => item.id === deskId)!, chair = floor.furniture.find(item => item.id === chairId)!
      const wall = floor.walls.find(wall => wall.id === wallId)!, opening = wall.openings.find(opening => opening.id === windowId)!
      expect(desk).toMatchObject({ width: 1.4, depth: .6, angle })
      expect(desk.x + desk.width / 2).toBeCloseTo(wall.x + opening.start + opening.width / 2)
      expect(chair.x + chair.width / 2).toBeCloseTo(desk.x + desk.width / 2)
      expect(chair.angle ?? 0).toBe(angle === 0 ? Math.PI : 0)
      expect(wallId === 'north' ? desk.z - house.north : house.south - desk.z - desk.depth).toBeCloseTo(.05)
      expect(opening.sill - desk.height).toBeCloseTo(.4)
    }
    const bed = floor.furniture.find(item => item.id === 'bed-north')!
    const window = floor.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'east-north')!
    expect(bed.z).toBeGreaterThan(window.start + window.width + .5)
    expect(house.east - bed.x - bed.width).toBeCloseTo(.05)
    expect(floor.walls.find(wall => wall.id === 'children-divider')!.z - bed.z - bed.depth).toBeCloseTo(.05)
  })
  it('aligns EG and OG window heads at 250 cm while preserving shifted window sizes and child sills', () => {
    for (const side of ['east', 'west'] as const) for (const floorId of ['EG', 'OG', 'DG'] as const) {
      const floor = makeFloor(floorId, side)
      for (const opening of floor.walls.filter(wall => ['north', 'east', 'south'].includes(wall.id)).flatMap(wall => wall.openings)) {
        const entry = opening.id.startsWith('entrance')
        const band = floorId === 'EG' && ['wc-window', 'hall-window-fixed'].includes(opening.id)
        const child = floorId === 'OG' && ['child-north-window', 'south-east'].includes(opening.id)
        const living = floorId === 'EG' && ['kitchen-east-window', 'living-corner-fixed', 'garden-west-fixed', 'terrace', 'garden-fixed'].includes(opening.id)
        expect(opening.sill + opening.height, `${side}/${floorId}/${opening.id}`).toBeCloseTo(entry ? 2.25 : 2.5)
        if (band) expect(opening).toMatchObject(opening.id === 'wc-window' ? { width: .6, sill: 1.5, height: 1 } : { sill: 2, height: .5 })
        if (child) expect(opening).toMatchObject({ sill: 1.15, height: 1.35 })
        if (['kitchen-east-window', 'bath-window'].includes(opening.id)) expect(opening).toMatchObject({ sill: 1.5, height: 1 })
        if (living && opening.id !== 'kitchen-east-window') expect(opening).toMatchObject({ sill: 0, height: 2.5 })
        if (floorId === 'OG' && ['east-north', 'south-west'].includes(opening.id)) expect(opening).toMatchObject({ sill: 0, height: 2.5 })
        if (opening.windowLayout?.lowerFixed) expect(opening.windowLayout.lowerFixed).toBe(.9)
      }
    }
  })
  it('raises both DG windows to 250 cm and moves them 30 cm inward to clear the roof and blind boxes', () => {
    for (const side of ['east', 'west'] as const) {
      const floor = makeFloor('DG', side)
      const wall = floor.walls.find(wall => wall.id === 'east')!
      expect(wall.openings).toHaveLength(2)
      for (const opening of wall.openings) {
        expect(opening).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1, lowerFixed: .9 } })
        const start = wall.z + opening.start
        expect(start).toBeCloseTo(opening.id === 'gable-office' ? 3.6 : house.depth - 3.6 - opening.width)
        const blind = raffstores(floor).find(blind => blind.id === `DG-${opening.id}`)!
        expect(blind.box.bottom).toBe(2.5)
        expect(floor.height - blind.box.bottom - blind.box.height).toBeCloseTo(.03)
        for (const south of [blind.box.z, blind.box.z + blind.box.depth]) expect(roofHeight(south) - blind.box.bottom - blind.box.height).toBeGreaterThan(.05)
        const oldOuterEdge = opening.id === 'gable-office' ? start - .3 : start + opening.width + .3
        expect(roofHeight(oldOuterEdge)).toBeLessThan(blind.box.bottom + blind.box.height)
      }
    }
  })
  it('excludes the removed side terrace door from living room daylight', () => {
    expect(roomDaylight('EG').find(room => room.id === 'EG-living')!.glazing).toBeCloseTo(14.8 + .3)
  })
  it('keeps both south floor-length windows aligned with fixed EG glazing and unchanged terrace access', () => {
    for (const side of ['east', 'west'] as const) {
      for (const floorId of ['EG', 'OG'] as const) {
        const south = makeFloor(floorId, side).walls.find(wall => wall.id === 'south')!
        const opening = south.openings.find(opening => opening.id === (floorId === 'EG' ? 'garden-west-fixed' : 'south-west'))!
        expect(south.x + opening.start).toBeCloseTo(1.5 - .3)
        expect(south.x + opening.start + opening.width).toBeCloseTo(2.4)
        expect(opening).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1 } })
        expect(opening.windowLayout?.lowerFixed).toBe(floorId === 'EG' ? undefined : .9)
        expect(windowPanels(opening).filter(panel => !panel.fixed)).toHaveLength(floorId === 'EG' ? 0 : 1)
        if (floorId === 'EG') {
          expect(south.openings.find(opening => opening.id === 'terrace')).toMatchObject({ width: 1.25, height: 2.5 })
          expect(south.openings.find(opening => opening.id === 'terrace')!.start).toBeCloseTo(house.east - house.west - 2.5 - .3)
        } else {
          expect(south.openings.find(opening => opening.id === 'south-east')).toMatchObject({ width: 1.8, sill: 1.15, height: 1.35 })
          expect(south.openings.find(opening => opening.id === 'south-east')!.start).toBeCloseTo(house.east - house.west - .3 - 1.8)
        }
      }
    }
  })
  it('matches the revised floor-length windows and clears the roof including blind boxes', () => {
    for (const side of ['east', 'west'] as const) {
      for (const [floorId, wallId, openingId] of [['EG', 'south', 'garden-west-fixed'], ['OG', 'south', 'south-west'], ['OG', 'east', 'east-north'], ['DG', 'east', 'gable-office'], ['DG', 'east', 'gable-parents']] as const) {
        const floor = makeFloor(floorId, side)
        const wall = floor.walls.find(wall => wall.id === wallId)!
        const opening = wall.openings.find(opening => opening.id === openingId)!
        expect(opening).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1 } })
        expect(opening.windowLayout?.lowerFixed).toBe(floorId === 'EG' ? undefined : .9)
        const panels = windowPanels(opening)
        expect(panels).toHaveLength(floorId === 'EG' ? 1 : 2)
        expect(panels.filter(panel => !panel.fixed)).toHaveLength(floorId === 'EG' ? 0 : 1)
        if (floorId !== 'EG') expect(panels.find(panel => !panel.fixed)!.bottom).toBeCloseTo(.93)
        if (wallId === 'south') {
          expect(wall.x + opening.start).toBeCloseTo(1.5 - .3)
          expect(wall.x + opening.start + opening.width).toBeCloseTo(2.4)
        }
        else if (floorId === 'OG') {
          expect(wall.openings).toHaveLength(1)
          const above = makeFloor('DG', side).walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'gable-office')!
          expect(above.start).toBeCloseTo(opening.start)
          expect(above.start + above.width).toBeCloseTo(opening.start + opening.width)
        } else {
          const start = wall.z + opening.start
          expect(openingId === 'gable-office' ? start : house.depth - start - opening.width).toBeCloseTo(3.6)
          const blind = raffstores(floor).find(blind => blind.id === `${floorId}-${openingId}`)!
          for (const south of [blind.box.z, blind.box.z + blind.box.depth]) expect(roofHeight(south) - blind.box.bottom - blind.box.height).toBeGreaterThan(.05)
        }
      }
      const ground = makeFloor('EG', side), upper = makeFloor('OG', side)
      const kitchen = ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'kitchen-east-window')!
      expect(kitchen).toMatchObject({ width: 2.1, sill: 1.5, height: 1 })
      expect(ground.walls.find(wall => wall.id === 'east')!.z + kitchen.start).toBeCloseTo(3.6)
      const bath = upper.walls.find(wall => wall.id === 'north')!.openings[0]
      expect(bath).toMatchObject({ start: .9, width: 1.8, sill: 1.5, height: 1 })
      expect(ground.walls.find(wall => wall.id === 'north')!.openings[0].start - bath.start).toBeCloseTo(-.6)
      const eastWall = ground.walls.find(wall => wall.id === 'east')!
      expect(eastWall.openings.some(opening => opening.id === 'garden-door-east')).toBe(false)
      const solids = wallSolids(eastWall, ground.height)
      for (const south of [6.1, 6.7, 7.3]) for (const height of [.1, 1.2, 2.5]) expect(solids.some(solid => solid.z <= south && solid.z + solid.depth >= south && solid.bottom <= height && solid.bottom + solid.height >= height)).toBe(true)
    }
  })
  it('uses modular opening heights except for extended child windows with matching glazed door heads', () => {
    for (const side of ['east', 'west'] as const) for (const floorId of ['KG', 'EG', 'OG', 'DG'] as const) {
      const floor = makeFloor(floorId, side)
      for (const opening of floor.walls.flatMap(wall => wall.openings).filter(opening => opening.kind === 'window' || ['entrance', 'terrace'].includes(opening.id))) {
        if (floorId === 'OG' && ['child-north-window', 'south-east'].includes(opening.id)) expect(opening.height).toBe(1.35)
        else expect(opening.height / .125, `${side} ${floorId} ${opening.id}`).toBeCloseTo(Math.round(opening.height / .125), 6)
        expect(opening.sill + opening.height).toBeLessThan(floor.height)
      }
      if (floorId === 'EG') {
        const openings = floor.walls.flatMap(wall => wall.openings)
        const height = (id: string) => openings.find(opening => opening.id === id)!.height
        expect(height('entrance')).toBe(height('entrance-fixed'))
        for (const id of ['garden-west-fixed', 'garden-fixed', 'living-corner-fixed']) expect(height(id)).toBe(height('terrace'))
      }
    }
  })
  it('keeps the aligned east openings clear of furniture', () => {
    for (const floorId of ['EG', 'OG', 'DG'] as const) {
      const floor = makeFloor(floorId)
      const eastWall = floor.walls.find(wall => wall.id === 'east')!
      const windows = eastWall.openings.filter(opening => opening.kind === 'window' && !opening.id.includes('fixed'))
      expect(eastWall.z + windows[0].start).toBeCloseTo(3.6)
      if (floorId === 'DG') expect(eastWall.z + windows[1].start).toBeCloseTo(5.7)
      expect(windows.map(opening => opening.width)).toEqual(floorId === 'EG' ? [2.1] : floorId === 'DG' ? [1.2, 1.2] : [1.2])
      if (floorId === 'DG') expect(2 * eastWall.z + windows[0].start + windows[1].start + windows[0].width).toBeCloseTo(house.depth)
      for (const opening of windows) {
        expect(opening.sill + opening.height).toBeCloseTo(2.5)
        if (floorId !== 'EG') expect(opening).toMatchObject({ sill: 0, height: 2.5, windowLayout: { lowerFixed: .9 } })
        expect(opening.windowLayout?.ventilationWidth).toBe(floorId === 'EG' ? .6 : undefined)
        const panels = windowPanels(opening).filter(panel => !panel.fixed)
        expect(panels).toHaveLength(1)
        for (const panel of panels) for (const furniture of floor.furniture.filter(item => item.x + item.width > eastWall.x + eastWall.width / 2 - panel.width && item.z < opening.start + panel.start + panel.width && item.z + item.depth > opening.start + panel.start)) {
          expect((furniture.bottom ?? 0) + furniture.height, `${floorId} ${furniture.id}`).toBeLessThan(opening.sill + panel.bottom)
        }
      }
    }
  })
  it('divides wide windows into a 60 cm opening field and the remaining fixed field', () => {
    for (const floorId of ['EG', 'OG', 'DG'] as const) for (const wall of makeFloor(floorId).walls) {
      for (const opening of wall.openings.filter(opening => opening.kind === 'window' && [1.5, 1.8, 2.1].includes(opening.width) && !opening.id.includes('fixed'))) {
        expect(opening.windowLayout?.ventilationWidth).toBe(.6)
        const divider = windowMullionStart(opening) + windowJoint / 2
        const openingWidth = opening.windowLayout?.ventilationSide === 'start' ? divider : opening.width - divider
        expect(openingWidth).toBeCloseTo(.6)
        expect(opening.width - openingWidth).toBeCloseTo(opening.width - .6)
        expect(windowPanels(opening).filter(panel => !panel.fixed)).toHaveLength(1)
      }
    }
  })
  it('keeps the kitchen north opening leaf above the counter and aligns its north edge with the attic', () => {
    const ground = makeFloor('EG')
    const eastWall = ground.walls.find(wall => wall.id === 'east')!
    const openings = eastWall.openings
    const kitchen = openings.find(opening => opening.id === 'kitchen-east-window')!
    expect(openings.some(opening => opening.id === 'garden-door-east')).toBe(false)
    expect(kitchen).toMatchObject({ width: 2.1, sill: 1.5, height: 1, windowLayout: { ventilationSide: 'start' } })
    expect(eastWall.z + kitchen.start + kitchen.width).toBeCloseTo(5.7)
    const sink = ground.furniture.find(item => item.id === 'kitchen-sink')!
    const fixed = windowPanels(kitchen).find(panel => panel.fixed)!
    const leaf = windowPanels(kitchen).find(panel => !panel.fixed)!
    expect(leaf.start + leaf.width).toBeLessThan(fixed.start)
    expect((sink.bottom ?? 0) + sink.height).toBeLessThan(kitchen.sill + leaf.bottom)
    expect(eastWall.z + kitchen.start + fixed.start + fixed.width).toBeGreaterThan(sink.z + sink.depth)
    const upper = makeFloor('OG').walls.find(wall => wall.id === 'east')!.openings[0]
    expect(upper.start - kitchen.start).toBeCloseTo(0)
    const attic = makeFloor('DG').walls.find(wall => wall.id === 'east')!.openings[0]
    expect(attic.start - kitchen.start).toBeCloseTo(0)
    expect(kitchen.sill + kitchen.height).toBeCloseTo(2.5)
    expect(ground.furniture.find(item => item.id === 'peninsula')).toMatchObject({ x: 3.95, z: 4.96, width: 2.65, depth: 1 })
  })

  it('moves the attic office window and partition south with coherent room areas and cabinet clearance', () => {
    const attic = makeFloor('DG')
    const eastWall = attic.walls.find(wall => wall.id === 'east')!
    const window = eastWall.openings.find(opening => opening.id === 'gable-office')!
    const partition = attic.walls.find(wall => wall.id === 'office-entry')!
    expect(eastWall.z + window.start).toBeCloseTo(3.6)
    expect(partition.z).toBeCloseTo(4.8 + .3)
    expect(partition.z - eastWall.z - window.start - window.width).toBeCloseTo(.3)
    const office = attic.rooms.find(room => room.id === 'office')!
    const bedroom = attic.rooms.find(room => room.id === 'bedroom')!
    expect(office.parts[1].z + office.parts[1].depth).toBeCloseTo(partition.z)
    expect(bedroom.parts[0].z).toBeCloseTo(partition.z + partition.depth)
    expect(roomArea(office, 'DG').floor).toBeCloseTo(14.529 + .915)
    expect(roomArea(bedroom, 'DG').floor).toBeCloseTo(22.23875)
    const cabinet = attic.furniture.find(item => item.id === 'office-south-storage')!
    expect(cabinet.width).toBe(1.2)
    expect(cabinet.z).toBeCloseTo(4.62)
    expect(house.east - cabinet.x - cabinet.width).toBeGreaterThan(window.width / 2)
    const bedroomCabinet = attic.furniture.find(item => item.id === 'parents-north-storage')!
    expect(bedroomCabinet.z + bedroomCabinet.depth).toBeLessThan(attic.walls.find(wall => wall.id === 'hall-north')!.z)
    expect(bedroomCabinet.front).toBe('north')
  })
  it('uses a 30 cm module for window widths, positions and clear spacing', () => {
    for (const floorId of ['EG', 'OG', 'DG'] as const) {
      for (const wall of makeFloor(floorId).walls.filter(wall => ['north', 'east', 'south'].includes(wall.id))) {
        const windows = wall.openings.filter(opening => opening.kind === 'window' && opening.id !== 'entrance-fixed')
        for (const opening of windows) {
          if (!['garden-fixed', 'east-north', 'wc-window'].includes(opening.id)) onGrid(opening.start)
          if (!['garden-fixed', 'wc-window'].includes(opening.id)) onGrid(opening.width)
          if (!['garden-west-fixed', 'garden-fixed', 'living-corner-fixed', 'kitchen-east-window', 'bath-window', 'child-north-window', 'south-east', 'wc-window', 'hall-window-fixed'].includes(opening.id)) {
            onGrid(opening.sill)
          }
          expect(opening.start + opening.width).toBeLessThanOrEqual(wall.axis === 'x' ? wall.width : wall.depth)
        }
        for (const [index, opening] of windows.entries()) {
          if (index && !['garden-fixed', 'play-window'].includes(opening.id)) onGrid(opening.start - windows[index - 1].start - windows[index - 1].width)
        }
      }
    }
  })

  it('aligns the south glazing and keeps related window types at the same height', () => {
    const ground = makeFloor('EG'), upper = makeFloor('OG')
    const southGround = ground.walls.find(wall => wall.id === 'south')!.openings
    const southUpper = upper.walls.find(wall => wall.id === 'south')!.openings
    const upperWindows = upper.walls.flatMap(wall => wall.openings).filter(opening => ['child-north-window', 'south-east'].includes(opening.id))
    expect(upperWindows).toHaveLength(2)
    for (const window of upperWindows) {
      expect(window.width).toBeCloseTo(1.8)
      expect(window.sill).toBeCloseTo(1.15)
      expect(window.height).toBeCloseTo(1.35)
      expect(window.sill - upper.furniture.find(item => item.id === (window.id === 'south-east' ? 'desk-south' : 'desk-north'))!.height).toBeCloseTo(.4)
      expect(window.sill + window.height).toBeCloseTo(2.5)
      expect(window.windowLayout?.lowerFixed).toBeUndefined()
    }
    expect(southGround.find(opening => opening.id === 'garden-west-fixed')).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1 } })
    expect(southUpper.find(opening => opening.id === 'south-west')).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { lowerFixed: .9 } })
    const terrace = southGround.find(opening => opening.id === 'terrace')!
    const fixed = southGround.find(opening => opening.id === 'garden-fixed')!
    expect(terrace).toMatchObject({ sill: 0, height: 2.5 })
    expect(fixed).toMatchObject({ sill: 0, height: 2.5 })
    for (const side of ['east', 'west'] as const) {
      const south = makeFloor('EG', side).walls.find(wall => wall.id === 'south')!
      const window = south.openings.find(opening => opening.id === 'garden-west-fixed')!
      const panel = windowPanels(window)[0]
      expect(panel.fixed).toBe(true)
      expect(panel.bottom + panel.height).toBeCloseTo(window.height - windowFrame)
      const center = south.x + window.start + window.width / 2
      const lintel = wallSolids(south, ground.height).filter(solid => solid.x < center && solid.x + solid.width > center && solid.bottom >= window.height)
      expect(lintel.length).toBeGreaterThan(0)
    }
    const upperWindow = southUpper.find(opening => opening.id === 'south-east')!
    expect(upper.walls.find(wall => wall.id === 'east')!.openings.some(opening => opening.id === 'east-south')).toBe(false)
    expect(upperWindow).toMatchObject({ width: 1.8, sill: 1.15, height: 1.35 })
    expect(terrace.width).toBeCloseTo(1.25)
    expect(fixed.width).toBeCloseTo(1.55)
    expect(upperWindow.start - terrace.start).toBeCloseTo(.7)
    expect(fixed.start + fixed.width - upperWindow.start - upperWindow.width).toBeCloseTo(.3)
    expect(southUpper.find(opening => opening.id === 'south-west')!.sill).toBe(southGround.find(opening => opening.id === 'garden-west-fixed')!.sill)
    expect(southGround.find(opening => opening.id === 'garden-west-fixed')!.height).toBe(southUpper.find(opening => opening.id === 'south-west')!.height)
    const wardrobe = upper.furniture.find(item => item.id === 'wardrobe-south')!
    expect(wardrobe.z + wardrobe.depth).toBeLessThan(upper.walls.find(wall => wall.id === 'south')!.z - .9)
    const groundNorth = ground.walls.find(wall => wall.id === 'north')!.openings
    const upperNorth = upper.walls.find(wall => wall.id === 'north')!.openings
    expect(groundNorth.find(opening => opening.id === 'wc-window')).toMatchObject({ start: .3, width: .6, sill: 1.5, height: 1 })
    const hallWindow = groundNorth.find(opening => opening.id === 'hall-window-fixed')!
    expect(hallWindow).toMatchObject({ start: 3.6, width: 1.8, sill: 2, height: .5 })
    const upperHallAxis = upper.walls.find(wall => wall.id === 'north')!.openings.find(opening => opening.id === 'child-north-window')!
    expect(hallWindow.start).toBeCloseTo(upperHallAxis.start - .6)
    expect(hallWindow.start + hallWindow.width).toBeCloseTo(upperHallAxis.start + upperHallAxis.width - .6)
    expect(house.west + hallWindow.start).toBeCloseTo(3.9)
    expect(house.west + hallWindow.start + hallWindow.width).toBeCloseTo(5.7)
    expect(upperHallAxis.windowLayout).toEqual(upperWindow.windowLayout)
    expect(windowPanels(hallWindow)).toHaveLength(1)
    expect(windowPanels(hallWindow)[0].fixed).toBe(true)
    const bathWindow = groundNorth.find(opening => opening.id === 'wc-window')!
    expect(bathWindow.windowLayout).toEqual({ columns: 1 })
    expect(windowPanels(bathWindow)).toHaveLength(1)
    expect(windowPanels(bathWindow)[0].fixed).toBe(false)
    expect(hallWindow.sill - bathWindow.sill).toBeCloseTo(.5)
    expect(hallWindow.sill + hallWindow.height).toBeCloseTo(bathWindow.sill + bathWindow.height)
    const kitchenWindow = ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'kitchen-east-window')!
    const childWindow = upper.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'east-north')!
    expect(childWindow).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { lowerFixed: .9 } })
    expect(upper.walls.find(wall => wall.id === 'east')!.z + childWindow.start).toBeCloseTo(3.6)
    expect(kitchenWindow).toMatchObject({ width: 2.1, sill: 1.5, height: 1 })
    expect(ground.walls.find(wall => wall.id === 'east')!.z + kitchenWindow.start).toBeCloseTo(3.6)
    const corner = ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'living-corner-fixed')!
    expect(corner).toMatchObject({ start: 9.3, width: 1.2, sill: 0, height: 2.5, cornerGlazing: true })
    expect(ground.walls.find(wall => wall.id === 'east')!.depth - corner.start - corner.width).toBeCloseTo(0)
    expect(house.south - corner.start).toBeCloseTo(.9)
    expect(fixed.cornerGlazing).toBe(true)
    const cornerSolids = ground.walls.filter(wall => ['east', 'south'].includes(wall.id)).flatMap(wall => wallSolids(wall, ground.height))
    expect(cornerSolids.some(solid => solid.bottom < terrace.height && solid.x + solid.width > house.east - .01 && solid.z + solid.depth > house.south - .01)).toBe(false)
    expect(upper.walls.find(wall => wall.id === 'east')!.openings.some(opening => opening.id === 'play-window')).toBe(false)
    expect(childWindow.start + childWindow.width).toBeLessThan(upper.walls.find(wall => wall.id === 'children-divider')!.z)
    expect(upperNorth.find(opening => opening.id === 'bath-window')).toMatchObject({ start: .9, width: 1.8, sill: 1.5, height: 1, windowLayout: { columns: 2 } })
    for (const opening of [...groundNorth, ...upperNorth]) {
      const panels = windowPanels(opening)
      if (opening.id === 'wc-window' || opening.id === 'hall-window-fixed') continue
      expect(panels.find(panel => !panel.fixed)!.start, opening.id).toBeGreaterThan(panels.find(panel => panel.fixed)!.start)
    }
    expect(upperNorth.some(opening => opening.id === 'bath-tub-window')).toBe(false)
    expect(upper.walls.find(wall => wall.id === 'north')!.x + upperNorth[0].start + upperNorth[0].width).toBeLessThan(3.45)
    for (const id of ['gable-office', 'gable-parents']) {
      const window = makeFloor('DG').walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === id)!
      expect(window).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1, lowerFixed: .9 } })
      const eastWall = makeFloor('DG').walls.find(wall => wall.id === 'east')!
      expect(eastWall.z + window.start).toBeCloseTo(id === 'gable-office' ? 3.6 : 5.7)
      expect(window.sill + window.height).toBeCloseTo(2.5)
      const panels = windowPanels(window)
      const fixed = panels.filter(panel => panel.fixed)
      const operable = panels.filter(panel => !panel.fixed)
      expect(fixed).toHaveLength(1)
      expect(operable).toHaveLength(1)
      for (const panel of fixed) {
        expect(panel.bottom).toBe(windowFrame)
        expect(panel.bottom + panel.height).toBeCloseTo(.9 - windowJoint / 2)
      }
      for (const panel of operable) {
        expect(panel.bottom).toBeCloseTo(.9 + windowJoint / 2)
        expect(panel.bottom + panel.height).toBeCloseTo(2.5 - windowFrame)
      }
      expect(window.width * window.height).toBeCloseTo(1.2 * 2.5)
      expect(window.sill + window.height).toBeLessThan(roofHeight(eastWall.z + window.start))
      expect(window.sill + window.height).toBeLessThan(roofHeight(eastWall.z + window.start + window.width))
    }
    expect(ground.walls.find(wall => wall.id === 'south')!.width - (southGround.at(-1)!.start + southGround.at(-1)!.width)).toBeCloseTo(0)
  })
})