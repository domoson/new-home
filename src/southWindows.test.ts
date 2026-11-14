import { expect, test } from 'vitest'
import { construction, floorIds, house, makeFloor, wallSolids } from './model'
import { raffstores } from './raffstore'
import { windowPanels } from './windowLayout'

test('south sketch joins the fixed pane and HST and aligns the upper windows', () => {
  const ground = makeFloor('EG')
  const south = ground.walls.find(wall => wall.id === 'south')!
  const [fixed, sliding, companion] = south.openings
  expect(fixed).toMatchObject({ id: 'garden-west-fixed', width: 1.105, sill: 0, height: 2.155 })
  expect(south.x + fixed.start).toBeCloseTo(1.2)
  expect(sliding.start).toBeCloseTo(fixed.start + fixed.width)
  expect(sliding.width).toBe(1.73)
  expect(companion.start).toBeCloseTo(sliding.start + sliding.width)
  expect(companion.width).toBe(sliding.width)
  expect(companion.start + companion.width).toBeLessThan(south.width)
  expect(windowPanels(fixed).every(panel => panel.fixed)).toBe(true)
  expect(windowPanels(companion).every(panel => panel.fixed)).toBe(true)
  expect(wallSolids(south, ground.height).filter(solid => solid.bottom < 2.155 && solid.x > south.x + fixed.start && solid.x < south.x + companion.start + companion.width)).toEqual([])

  const upper = makeFloor('OG').walls.find(wall => wall.id === 'south')!
  const [left, right] = upper.openings
  expect(left.start).toBe(fixed.start)
  expect(left.width).toBe(fixed.width)
  expect(left.windowLayout).toMatchObject({ columns: 1, lowerFixed: .9 })
  expect(right).toMatchObject({ width: 1.3, height: 1.3, sill: .855, windowLayout: { columns: 1 } })
  expect(right.start + right.width).toBeCloseTo(companion.start + companion.width)
  expect(right.sill + right.height).toBeCloseTo(left.sill + left.height)
  expect(windowPanels(right).filter(panel => !panel.fixed)).toHaveLength(1)
  const blind = raffstores(ground).find(blind => blind.id === 'EG-terrace')!
  expect(blind.width).toBeCloseTo(3.46)
  expect(blind.x).toBeCloseTo(south.x + sliding.start)
})

test('west south facade and all other exterior walls retain their existing openings', () => {
  const westSouth = makeFloor('EG', 'west').walls.find(wall => wall.id === 'south')!
  const cornerReturn = Math.max(0, .4 - construction.exteriorWall)
  const start = house.east - house.west - 2.98 - cornerReturn
  expect(westSouth.openings.map(opening => [opening.id, opening.start, opening.width])).toEqual([
    ['garden-west-fixed', 1.2 - house.west, 1.105], ['terrace', start, 1.49], ['garden-fixed', start + 1.49, 1.49],
  ])
  expect(makeFloor('OG', 'west').walls.find(wall => wall.id === 'south')!.openings[1]).toMatchObject({ start: 4.235, width: 1.73, sill: .93, height: 1.23 })
  for (const floorId of floorIds) {
    const east = makeFloor(floorId, 'east'), west = makeFloor(floorId, 'west')
    for (const wallId of ['north', 'east', 'west', ...(['KG', 'DG'].includes(floorId) ? ['south'] : [])]) {
      expect(east.walls.find(wall => wall.id === wallId)!.openings).toEqual(west.walls.find(wall => wall.id === wallId)!.openings)
    }
  }
})