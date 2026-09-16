import { expect, test } from 'vitest'
import { area, house, makeFloor, stair } from './model'

test('EG has a snug southwest shower, northern WC entry and a kitchen-side pantry', () => {
  const floor = makeFloor('EG'), wc = floor.rooms.find(room => room.id === 'wc')!, hall = floor.rooms.find(room => room.id === 'hall')!
  const shower = floor.furniture.find(item => item.id === 'guest-shower')!
  const back = floor.walls.find(wall => wall.id === 'wc-niche-back')!
  const pantry = floor.rooms.find(room => room.id === 'pantry')!
  expect(wc.parts).toHaveLength(2)
  expect(area(wc.parts)).toBeCloseTo(3.996)
  expect(area(hall.parts)).toBeCloseTo(8.1676)
  expect(area(pantry.parts)).toBeCloseTo(1.188)
  expect(pantry.parts[0].width).toBeCloseTo(1.2)
  expect(pantry.parts[0].depth).toBeCloseTo(.99)
  expect(shower).toMatchObject({ x: house.west, width: .9, depth: .9 })
  expect(shower.z + shower.depth).toBeCloseTo(stair.z - .16)
  expect(shower.x + shower.width).toBeCloseTo(back.x)
  const shelf = floor.furniture.find(item => item.id === 'pantry-shelf')!
  expect(shelf.width).toBe(.25)
  expect(pantry.parts[0].x + pantry.parts[0].width - shelf.x - shelf.width).toBeCloseTo(.925)
  const entryWall = floor.walls.find(wall => wall.id === 'wc-east')!, entry = entryWall.openings[0]
  expect(entry).toMatchObject({ width: .9, hinge: 'end', swing: 'reverse' })
  expect(entryWall.z + entry.start + entry.width).toBeLessThan(shower.z)
  for (const id of ['KG', 'OG', 'DG'] as const) expect(makeFloor(id).walls.some(wall => wall.id.startsWith('wc-niche'))).toBe(false)
})

test('WC divider and entrance retain the north-shifted alignment', () => {
  const floor = makeFloor('EG')
  const divider = floor.walls.find(wall => wall.id === 'hall-south')!
  expect(divider.z).toBeCloseTo(2.39)
  const east = floor.walls.find(wall => wall.id === 'east')!, entrance = east.openings.find(opening => opening.id === 'entrance')!
  expect(entrance.start).toBeCloseTo(1.1 - .35)
  expect(entrance.start + entrance.width).toBeLessThan(divider.z)
  expect(east.openings.find(opening => opening.id === 'kitchen-window')!.start).toBeCloseTo(4.2)
})