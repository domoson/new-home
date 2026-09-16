import { expect, test } from 'vitest'
import { area, makeFloor } from './model'
import type { Rect } from './model'
import { kitchenDeviceZones, kitchenPrep } from './kitchenLayout'

const overlap = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

test('U kitchen has disjoint connected tops and a genuinely free prep rectangle', () => {
  const furniture = makeFloor('EG').furniture
  const tops = furniture.filter(item => item.kind === 'counter')
  expect(area(tops)).toBeCloseTo(4.9805)
  for (const [index, top] of tops.entries()) for (const other of tops.slice(index + 1)) expect(overlap(top, other)).toBeCloseTo(0)
  expect(overlap(kitchenPrep, tops.find(item => item.id === 'peninsula')!)).toBeCloseTo(.6)
  for (const obstacle of [...kitchenDeviceZones, ...furniture.filter(item => ['hob', 'sink'].includes(item.kind))]) expect(overlap(kitchenPrep, obstacle)).toBeCloseTo(0)
  for (const device of furniture.filter(item => (item.bottom ?? 0) === .92)) expect(tops.some(top => Math.abs(overlap(top, device) - device.width * device.depth) < 1e-8)).toBe(true)
})

test('U kitchen leaves west access and dining unchanged and keeps steam clear overhead', () => {
  const floor = makeFloor('EG'), furniture = floor.furniture
  const island = furniture.find(item => item.id === 'peninsula')!
  expect(island.x - 2.66).toBeCloseTo(1.3)
  expect(furniture.find(item => item.id === 'dining-bench')!.z - island.z - island.depth).toBeCloseTo(.95)
  expect(furniture.find(item => item.id === 'dining')).toMatchObject({ x: 4.4, z: 7.95, width: 1.8, depth: .9 })
  for (const id of ['fridge', 'kitchen-tall']) expect(furniture.find(item => item.id === id)!.height).toBe(floor.height)
  const upper = furniture.find(item => item.id === 'kitchen-upper')!
  expect(upper.bottom! + upper.height).toBeCloseTo(floor.height)
  expect(overlap(upper, kitchenDeviceZones[3])).toBe(0)
  expect(overlap(upper, furniture.find(item => item.id === 'toaster')!)).toBe(0)
  const window = floor.walls.flatMap(wall => wall.openings).find(opening => opening.id === 'kitchen-window')!
  expect(window).toMatchObject({ start: 4.2, sill: 1.45, width: 1.05, hinge: 'end' })
  expect(furniture.some(item => item.id === 'pantry-cabinet')).toBe(false)
})