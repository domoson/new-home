import { describe, expect, it } from 'vitest'
import { house, makeFloor, roofHeight, roomArea, wallSolids } from './model'
import { windowFrame, windowJoint, windowPanels } from './windowLayout'

const onGrid = (value: number) => expect(value / .3).toBeCloseTo(Math.round(value / .3), 6)

describe('Fassadenfenster', () => {
  it('keeps the requested east openings and furniture clearance except the deferred peninsula conflict', () => {
    for (const floorId of ['EG', 'OG', 'DG'] as const) {
      const floor = makeFloor(floorId)
      const windows = floor.walls.find(wall => wall.id === 'east')!.openings.filter(opening => opening.kind === 'window' && !opening.id.includes('fixed'))
      expect(windows.map(opening => opening.start)).toEqual([3.3, 6.3])
      expect(windows.map(opening => opening.width)).toEqual(floorId === 'EG' ? [1.5, .9] : [1.5, 1.5])
      for (const opening of windows) {
        expect(opening.sill + opening.height).toBeCloseTo(floorId === 'DG' ? 2.1 : 2.4)
        for (const furniture of floor.furniture.filter(item => item.x + item.width > 6.3 && item.z < opening.start + opening.width && item.z + item.depth > opening.start)) {
          if (floorId === 'EG' && opening.id === 'living-east' && furniture.id === 'peninsula') {
            expect(furniture.z + furniture.depth - opening.start).toBeCloseTo(.2)
            continue
          }
          expect((furniture.bottom ?? 0) + furniture.height, `${floorId} ${furniture.id}`).toBeLessThan(opening.sill + (opening.windowLayout?.lowerFixed ?? 0))
        }
      }
    }
  })
  it('makes the east ground opening floor-height without changing the kitchen', () => {
    const ground = makeFloor('EG')
    const door = ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'living-east')!
    expect(door).toMatchObject({ start: 6.3, width: .9, sill: 0, height: 2.4, windowLayout: { columns: 1 } })
    expect(door.windowLayout?.lowerFixed).toBeUndefined()
    expect(door.start + door.width).toBeCloseTo(7.2)
    expect(ground.furniture.find(item => item.id === 'peninsula')).toMatchObject({ x: 4.2, z: 5.5, width: 2.4, depth: 1 })
  })

  it('moves the attic office window and partition south with coherent room areas and cabinet clearance', () => {
    const attic = makeFloor('DG')
    const window = attic.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'gable-office')!
    const partition = attic.walls.find(wall => wall.id === 'office-entry')!
    expect(window.start).toBeCloseTo(2.7 + .6)
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
          if (!['garden-fixed', 'living-corner-fixed'].includes(opening.id)) {
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
    expect(southGround.find(opening => opening.id === 'garden-west')).toMatchObject({ start: .6, width: 1.8, sill: 0, height: 2.4 })
    expect(southUpper.find(opening => opening.id === 'south-west')).toMatchObject({ start: .6, width: 1.8, sill: .9, height: 1.5 })
    const terrace = southGround.find(opening => opening.id === 'terrace')!
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
    expect(groundNorth.find(opening => opening.id === 'wc-window')).toMatchObject({ start: .3, width: 1.2, sill: 1.8, height: .6 })
    expect(groundNorth.find(opening => opening.id === 'hall-window')).toMatchObject({ start: 2.1, width: .9, sill: .9, height: 1.5 })
    const kitchenWindow = ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'kitchen-east-window')!
    const childWindow = upper.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'east-north')!
    expect(childWindow).toMatchObject({ start: 3.3, width: 1.5, sill: .9, height: 1.5 })
    expect(kitchenWindow).toMatchObject({ start: childWindow.start, width: childWindow.width })
    const corner = ground.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'living-corner-fixed')!
    expect(corner).toMatchObject({ start: 9.3, width: 1.2, sill: 0, height: terrace.height, cornerGlazing: true })
    expect(ground.walls.find(wall => wall.id === 'east')!.depth - corner.start - corner.width).toBeCloseTo(0)
    expect(house.south - corner.start).toBeCloseTo(.9)
    expect(fixed.cornerGlazing).toBe(true)
    const cornerSolids = ground.walls.filter(wall => ['east', 'south'].includes(wall.id)).flatMap(wall => wallSolids(wall, ground.height))
    expect(cornerSolids.some(solid => solid.bottom < terrace.height && solid.x + solid.width > house.east - .01 && solid.z + solid.depth > house.south - .01)).toBe(false)
    const playWindow = upper.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'play-window')!
    expect(playWindow).toMatchObject({ start: 6.3, width: 1.5, sill: .9, height: 1.5 })
    expect(playWindow.width * playWindow.height).toBeCloseTo(2.25)
    expect(playWindow.start + playWindow.width).toBeLessThan(upper.walls.find(wall => wall.id === 'playroom-south')!.z)
    expect(childWindow.start + childWindow.width).toBeLessThan(upper.furniture.find(item => item.id === 'wardrobe-north')!.z)
    expect(upperNorth.find(opening => opening.id === 'bath-window')).toMatchObject({ start: .3, width: 2.4, sill: 1.5, height: .9, windowLayout: { columns: 2 } })
    expect(upperNorth.some(opening => opening.id === 'bath-tub-window')).toBe(false)
    expect(upper.walls.find(wall => wall.id === 'north')!.x + upperNorth[0].start + upperNorth[0].width).toBeLessThan(3.45)
    for (const id of ['gable-office', 'gable-parents']) {
      const window = makeFloor('DG').walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === id)!
      expect(window).toMatchObject({ width: 1.5, sill: 0, height: 2.1, windowLayout: { columns: 2, lowerFixed: .6 } })
      const panels = windowPanels(window)
      const fixed = panels.filter(panel => panel.fixed)
      const operable = panels.filter(panel => !panel.fixed)
      expect(fixed).toHaveLength(2)
      expect(operable).toHaveLength(2)
      for (const panel of fixed) {
        expect(panel.bottom).toBe(windowFrame)
        expect(panel.bottom + panel.height).toBeCloseTo(.6 - windowJoint / 2)
      }
      for (const panel of operable) {
        expect(panel.bottom).toBeCloseTo(.6 + windowJoint / 2)
        expect(panel.bottom + panel.height).toBeCloseTo(2.1 - windowFrame)
      }
      expect(window.width * window.height).toBeGreaterThan(2 * 1.2 * .9)
      expect(window.sill + window.height).toBeLessThan(roofHeight(window.start))
      expect(window.sill + window.height).toBeLessThan(roofHeight(window.start + window.width))
    }
    expect(ground.walls.find(wall => wall.id === 'south')!.width - (southGround.at(-1)!.start + southGround.at(-1)!.width)).toBeCloseTo(0)
  })
})