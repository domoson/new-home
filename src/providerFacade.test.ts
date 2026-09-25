import { describe, expect, it } from 'vitest'
import { house, makeFloor, roofHeight, roomArea, wallSolids } from './model'
import { windowFrame, windowJoint, windowMullionStart, windowPanels } from './windowLayout'

const onGrid = (value: number) => expect(value / .3).toBeCloseTo(Math.round(value / .3), 6)

describe('Fassadenfenster', () => {
  it('keeps the aligned east openings clear of furniture', () => {
    for (const floorId of ['EG', 'OG', 'DG'] as const) {
      const floor = makeFloor(floorId)
      const windows = floor.walls.find(wall => wall.id === 'east')!.openings.filter(opening => opening.kind === 'window' && !opening.id.includes('fixed'))
      expect(windows.map(opening => opening.start)).toEqual(floorId === 'EG' ? [3.3] : [3.3, 5.7])
      expect(windows.map(opening => opening.width)).toEqual(floorId === 'EG' ? [2.1] : [1.5, 1.5])
      if (floorId !== 'EG') expect(windows[0].start + windows[1].start + windows[0].width).toBeCloseTo(house.depth)
      for (const opening of windows) {
        expect(opening.sill + opening.height).toBeCloseTo(floorId === 'DG' ? 2.1 : 2.4)
        if (floorId === 'OG') expect(opening).toMatchObject({ sill: .9, height: 1.5 })
        if (floorId === 'DG') expect(opening).toMatchObject({ sill: 0, height: 2.1, windowLayout: { lowerFixed: .9 } })
        expect(opening.windowLayout?.ventilationWidth).toBe(.6)
        const panels = windowPanels(opening).filter(panel => !panel.fixed)
        expect(panels).toHaveLength(1)
        for (const panel of panels) for (const furniture of floor.furniture.filter(item => item.x + item.width > house.east - panel.width && item.z < opening.start + panel.start + panel.width && item.z + item.depth > opening.start + panel.start)) {
          expect((furniture.bottom ?? 0) + furniture.height, `${floorId} ${furniture.id}`).toBeLessThan(opening.sill + panel.bottom)
        }
      }
    }
  })
  it('divides 150 and 180 cm windows into 60 cm opening and 90 or 120 cm fixed fields', () => {
    for (const floorId of ['EG', 'OG', 'DG'] as const) for (const wall of makeFloor(floorId).walls) {
      for (const opening of wall.openings.filter(opening => opening.kind === 'window' && [1.5, 1.8].includes(opening.width) && !opening.id.includes('fixed'))) {
        expect(opening.windowLayout?.ventilationWidth).toBe(.6)
        const divider = windowMullionStart(opening) + windowJoint / 2
        const openingWidth = opening.windowLayout?.ventilationSide === 'start' ? divider : opening.width - divider
        expect(openingWidth).toBeCloseTo(.6)
        expect(opening.width - openingWidth).toBeCloseTo(opening.width === 1.5 ? .9 : 1.2)
        expect(windowPanels(opening).filter(panel => !panel.fixed)).toHaveLength(1)
      }
    }
  })
  it('places the compact kitchen fixed pane over the sink with aligned upper north edges', () => {
    const ground = makeFloor('EG')
    const openings = ground.walls.find(wall => wall.id === 'east')!.openings
    const kitchen = openings.find(opening => opening.id === 'kitchen-east-window')!
    expect(openings.some(opening => opening.id === 'living-east')).toBe(false)
    expect(kitchen).toMatchObject({ start: 3.3, width: 2.1, sill: 1.65, height: .75 })
    expect(kitchen.start + kitchen.width).toBeCloseTo(5.4)
    const sink = ground.furniture.find(item => item.id === 'kitchen-sink')!
    const center = kitchen.start + kitchen.width / 2
    expect(Math.abs(center - sink.z - sink.depth / 2)).toBeLessThan(.251)
    const fixed = windowPanels(kitchen).find(panel => panel.fixed)!
    expect(kitchen.start + fixed.start).toBeLessThan(sink.z)
    expect(kitchen.start + fixed.start + fixed.width).toBeGreaterThan(sink.z + sink.depth)
    const upper = makeFloor('OG').walls.find(wall => wall.id === 'east')!.openings[0]
    expect(kitchen.start).toBeCloseTo(upper.start)
    expect(kitchen.start + kitchen.width - upper.start - upper.width).toBeCloseTo(.6)
    const attic = makeFloor('DG').walls.find(wall => wall.id === 'east')!.openings[0]
    expect(attic.start).toBeCloseTo(kitchen.start)
    expect(kitchen.sill + kitchen.height).toBeCloseTo(2.4)
    expect(ground.furniture.find(item => item.id === 'peninsula')).toMatchObject({ x: 4.2, z: 5.5, width: 2.4, depth: 1 })
  })

  it('moves the attic office window and partition south with coherent room areas and cabinet clearance', () => {
    const attic = makeFloor('DG')
    const window = attic.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'gable-office')!
    const partition = attic.walls.find(wall => wall.id === 'office-entry')!
    expect(window.start).toBeCloseTo(3.3)
    expect(partition.z).toBeCloseTo(4.8 + .3)
    expect(partition.z - window.start - window.width).toBeCloseTo(.3)
    const office = attic.rooms.find(room => room.id === 'office')!
    const bedroom = attic.rooms.find(room => room.id === 'bedroom')!
    expect(office.parts[1].z + office.parts[1].depth).toBeCloseTo(partition.z)
    expect(bedroom.parts[0].z).toBeCloseTo(partition.z + partition.depth)
    expect(roomArea(office, 'DG').floor).toBeCloseTo(14.529 + .915)
    expect(roomArea(bedroom, 'DG').floor).toBeCloseTo(19.707252 - .915)
    const cabinet = attic.furniture.find(item => item.id === 'office-south-storage')!
    expect(cabinet.width).toBe(1.2)
    expect(cabinet.z).toBeCloseTo(4.62)
    expect(house.east - cabinet.x - cabinet.width).toBeGreaterThan(window.width / 2)
    const bedroomCabinet = attic.furniture.find(item => item.id === 'parents-north-storage')!
    expect(bedroomCabinet.z - partition.z - partition.depth).toBeCloseTo(.03)
  })
  it('uses a 30 cm module for window widths, positions and clear spacing', () => {
    for (const floorId of ['EG', 'OG', 'DG'] as const) {
      for (const wall of makeFloor(floorId).walls.filter(wall => ['north', 'east', 'south'].includes(wall.id))) {
        const windows = wall.openings.filter(opening => opening.kind === 'window' && opening.id !== 'entrance-fixed')
        for (const opening of windows) {
          if (opening.id !== 'garden-fixed') onGrid(opening.start)
          if (opening.id !== 'garden-fixed') onGrid(opening.width)
          if (!['garden-west', 'garden-fixed', 'living-corner-fixed', 'kitchen-east-window'].includes(opening.id)) {
            onGrid(opening.sill)
            onGrid(opening.height)
          }
          expect(opening.start + opening.width).toBeLessThanOrEqual(wall.axis === 'x' ? wall.width : wall.depth)
        }
        for (const [index, opening] of windows.entries()) {
          if (index && opening.id !== 'garden-fixed') onGrid(opening.start - windows[index - 1].start - windows[index - 1].width)
        }
      }
    }
  })

  it('aligns the south glazing and keeps related window types at the same height', () => {
    const ground = makeFloor('EG'), upper = makeFloor('OG')
    const southGround = ground.walls.find(wall => wall.id === 'south')!.openings
    const southUpper = upper.walls.find(wall => wall.id === 'south')!.openings
    const upperWindows = upper.walls.flatMap(wall => wall.openings).filter(opening => opening.kind === 'window' && opening.height === 1.5)
    expect(upperWindows).toHaveLength(5)
    for (const window of upperWindows) {
      expect(window.sill).toBeCloseTo(.9)
      expect(window.sill + window.height).toBeCloseTo(2.4)
      expect(window.windowLayout?.lowerFixed).toBeUndefined()
    }
    expect(southGround.find(opening => opening.id === 'garden-west')).toMatchObject({ start: .6, width: 1.8, sill: 0, height: 2.52, windowLayout: { lowerFixed: .9 } })
    expect(southUpper.find(opening => opening.id === 'south-west')).toMatchObject({ start: .6, width: 1.8, sill: .9, height: 1.5 })
    const terrace = southGround.find(opening => opening.id === 'terrace')!
    for (const side of ['east', 'west'] as const) {
      const south = makeFloor('EG', side).walls.find(wall => wall.id === 'south')!
      const window = south.openings.find(opening => opening.id === 'garden-west')!
      expect(window.height).toBe(terrace.height)
      expect(window.sill + window.height).toBe(terrace.sill + terrace.height)
      const panel = windowPanels(window).find(panel => !panel.fixed)!
      expect(panel.bottom + panel.height).toBeCloseTo(terrace.height - windowFrame)
      const center = south.x + window.start + window.width / 2
      const lintel = wallSolids(south, ground.height).filter(solid => solid.x < center && solid.x + solid.width > center && solid.bottom >= window.height)
      expect(lintel.length).toBeGreaterThan(0)
    }
    const fixed = southGround.find(opening => opening.id === 'garden-fixed')!
    const upperWindow = southUpper.find(opening => opening.id === 'south-east')!
    expect(upper.walls.find(wall => wall.id === 'east')!.openings.some(opening => opening.id === 'east-south')).toBe(false)
    expect(upperWindow).toMatchObject({ width: 1.8, sill: .9, height: 1.5 })
    expect(terrace.width).toBeCloseTo(1.25)
    expect(fixed.width).toBeCloseTo(1.55)
    expect(upperWindow.start - terrace.start).toBeCloseTo(.7)
    expect(fixed.start + fixed.width - upperWindow.start - upperWindow.width).toBeCloseTo(.3)
    expect(southUpper.find(opening => opening.id === 'south-west')!.sill).toBe(upperWindow.sill)
    expect(southUpper.find(opening => opening.id === 'south-west')!.height).toBe(upperWindow.height)
    const wardrobe = upper.furniture.find(item => item.id === 'wardrobe-south')!
    expect(wardrobe.z + wardrobe.depth).toBeLessThan(upper.walls.find(wall => wall.id === 'south')!.z - .9)
    const groundNorth = ground.walls.find(wall => wall.id === 'north')!.openings
    const upperNorth = upper.walls.find(wall => wall.id === 'north')!.openings
    expect(groundNorth.find(opening => opening.id === 'wc-window')).toMatchObject({ start: .3, width: 1.5, sill: 1.8, height: .6 })
    const hallWindow = groundNorth.find(opening => opening.id === 'hall-window')!
    expect(hallWindow).toMatchObject({ start: 4.2, width: 1.5, sill: 1.8, height: .6 })
    const coats = ground.furniture.find(item => item.id === 'entry-coats')!
    const upperHallAxis = upper.walls.find(wall => wall.id === 'north')!.openings.find(opening => opening.id === 'child-north-window')!
    expect(hallWindow.start).toBeCloseTo(upperHallAxis.start)
    expect(hallWindow.start + hallWindow.width).toBeCloseTo(upperHallAxis.start + upperHallAxis.width)
    expect(hallWindow.sill - coats.bottom! - coats.height).toBeCloseTo(.12)
    const bathWindow = groundNorth.find(opening => opening.id === 'wc-window')!
    expect(bathWindow.windowLayout).toEqual(hallWindow.windowLayout)
    expect(windowPanels(bathWindow).map(panel => ({ start: panel.start, width: panel.width, fixed: panel.fixed }))).toEqual(windowPanels(hallWindow).map(panel => ({ start: panel.start, width: panel.width, fixed: panel.fixed })))
    expect(hallWindow.sill).toBe(bathWindow.sill)
    expect(hallWindow.sill + hallWindow.height).toBeCloseTo(bathWindow.sill + bathWindow.height)
    const hallLeaf = windowPanels(hallWindow).find(panel => !panel.fixed)!
    for (const furniture of ground.furniture.filter(item => item.z < house.north + hallLeaf.width && item.x < house.west + hallWindow.start + hallLeaf.start + hallLeaf.width && item.x + item.width > house.west + hallWindow.start + hallLeaf.start)) {
      expect((furniture.bottom ?? 0) + furniture.height, furniture.id).toBeLessThan(hallWindow.sill + hallLeaf.bottom)
    }
    const kitchenWindow = ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'kitchen-east-window')!
    const childWindow = upper.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'east-north')!
    expect(childWindow).toMatchObject({ start: 3.3, width: 1.5, sill: upperWindow.sill, height: upperWindow.height })
    expect(childWindow.windowLayout?.lowerFixed).toBeUndefined()
    expect(kitchenWindow).toMatchObject({ start: 3.3, width: 2.1 })
    const corner = ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'living-corner-fixed')!
    expect(corner).toMatchObject({ start: 9.3, width: 1.2, sill: 0, height: terrace.height, cornerGlazing: true })
    expect(ground.walls.find(wall => wall.id === 'east')!.depth - corner.start - corner.width).toBeCloseTo(0)
    expect(house.south - corner.start).toBeCloseTo(.9)
    expect(fixed.cornerGlazing).toBe(true)
    const cornerSolids = ground.walls.filter(wall => ['east', 'south'].includes(wall.id)).flatMap(wall => wallSolids(wall, ground.height))
    expect(cornerSolids.some(solid => solid.bottom < terrace.height && solid.x + solid.width > house.east - .01 && solid.z + solid.depth > house.south - .01)).toBe(false)
    const playWindow = upper.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'play-window')!
    expect(playWindow).toMatchObject({ start: 5.7, width: 1.5, sill: upperWindow.sill, height: upperWindow.height })
    expect(playWindow.windowLayout?.lowerFixed).toBeUndefined()
    expect(playWindow.width * playWindow.height).toBeCloseTo(2.25)
    expect(playWindow.start).toBeGreaterThan(upper.walls.find(wall => wall.id === 'children-divider')!.z + .125)
    expect(playWindow.start + playWindow.width).toBeLessThan(upper.walls.find(wall => wall.id === 'playroom-south')!.z)
    expect(childWindow.start + childWindow.width).toBeLessThan(upper.furniture.find(item => item.id === 'wardrobe-north')!.z)
    expect(upperNorth.find(opening => opening.id === 'bath-window')).toMatchObject({ start: .3, width: 2.4, sill: 1.5, height: .9, windowLayout: { columns: 2 } })
    expect(upperNorth.some(opening => opening.id === 'bath-tub-window')).toBe(false)
    expect(upper.walls.find(wall => wall.id === 'north')!.x + upperNorth[0].start + upperNorth[0].width).toBeLessThan(3.45)
    for (const id of ['gable-office', 'gable-parents']) {
      const window = makeFloor('DG').walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === id)!
      expect(window).toMatchObject({ width: 1.5, sill: 0, height: 2.1, windowLayout: { columns: 2, ventilationWidth: .6, lowerFixed: .9 } })
      expect(window.start).toBeCloseTo(id === 'gable-office' ? 3.3 : 5.7)
      expect(window.sill + window.height).toBeCloseTo(2.1)
      const panels = windowPanels(window)
      const fixed = panels.filter(panel => panel.fixed)
      const operable = panels.filter(panel => !panel.fixed)
      expect(fixed).toHaveLength(2)
      expect(operable).toHaveLength(1)
      for (const panel of fixed) {
        expect(panel.bottom).toBe(windowFrame)
        expect(panel.bottom + panel.height).toBeCloseTo(panel.column === operable[0].column ? .9 - windowJoint / 2 : 2.1 - windowFrame)
      }
      for (const panel of operable) {
        expect(panel.bottom).toBeCloseTo(.9 + windowJoint / 2)
        expect(panel.bottom + panel.height).toBeCloseTo(2.1 - windowFrame)
      }
      expect(window.width * window.height).toBeCloseTo(1.5 * 2.1)
      expect(window.sill + window.height).toBeLessThan(roofHeight(window.start))
      expect(window.sill + window.height).toBeLessThan(roofHeight(window.start + window.width))
    }
    expect(ground.walls.find(wall => wall.id === 'south')!.width - (southGround.at(-1)!.start + southGround.at(-1)!.width)).toBeCloseTo(0)
  })
})