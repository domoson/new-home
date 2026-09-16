import { expect, test } from 'vitest'
import { area, makeFloor, rect, roofHeight, roofPanels, roofWindows, stair } from './model'

test('Haustuer schwenkt innen und Kind Sued hat einen freien Eingang', () => {
  expect(makeFloor('EG').walls.flatMap(wall => wall.openings).find(opening => opening.id === 'entrance')?.swing).toBe('reverse')
  const furniture = makeFloor('OG').furniture
  expect(furniture.filter(item => item.id.startsWith('wardrobe-south'))).toHaveLength(1)
  const access = rect(stair.x + stair.width + .16, 5.5, stair.arrivalDepth, 1.8)
  for (const item of furniture) {
    const overlap = Math.max(0, Math.min(access.x + access.width, item.x + item.width) - Math.max(access.x, item.x)) * Math.max(0, Math.min(access.z + access.depth, item.z + item.depth) - Math.max(access.z, item.z))
    expect(overlap, item.id).toBe(0)
  }
})

test('DG-Zugang am Treppenaustritt und Dachoeffnungen auf beiden Dachseiten', () => {
  const floor = makeFloor('DG'), entry = floor.walls.find(wall => wall.id === 'parents-entry-south')!
  expect(entry.z).toBeCloseTo(stair.end)
  expect(area(floor.rooms.find(room => room.id === 'hall')!.parts)).toBeCloseTo(2.09)
  expect(roofWindows.some(window => window.id === 'DG-stair-skylight')).toBe(false)
  expect(roofWindows).toHaveLength(2)
  expect(roofWindows.filter(window => window.z > 5)).toHaveLength(1)
  const gables = floor.walls.find(wall => wall.id === 'east')!.openings
  expect(gables).toHaveLength(2)
  expect(gables.map(window => [window.width, window.height])).toEqual([[.98, 1.18], [.98, 1.18]])
  const officeWall = floor.walls.find(wall => wall.id === 'office-entry')!
  expect(gables[0].start + gables[0].width).toBeLessThan(officeWall.z)
  expect(gables[1].start).toBeGreaterThan(officeWall.z + officeWall.depth)
  for (const window of roofWindows) expect([[1.14, 1.4], [.78, 1.18]]).toContainEqual([window.width, window.length])
  expect(area(roofPanels()) + area(roofWindows)).toBeCloseTo(7.35 * 10.5)
  for (const panel of roofPanels()) for (const window of roofWindows) {
    const overlap = Math.max(0, Math.min(panel.x + panel.width, window.x + window.width) - Math.max(panel.x, window.x)) * Math.max(0, Math.min(panel.z + panel.depth, window.z + window.depth) - Math.max(panel.z, window.z))
    expect(overlap).toBeCloseTo(0)
  }
  for (const window of floor.walls.find(wall => wall.id === 'east')!.openings) expect(window.sill + window.height).toBeLessThan(Math.min(roofHeight(window.start), roofHeight(window.start + window.width)))
})