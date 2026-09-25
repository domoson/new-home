import { expect, test } from 'vitest'
import { area, makeFloor } from './model'
import type { Rect } from './model'
import { kitchenDeviceZones, kitchenPrep } from './kitchenLayout'

const overlap = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

test('U kitchen has disjoint connected tops and a genuinely free prep rectangle', () => {
  const furniture = makeFloor('EG').furniture
  const tops = furniture.filter(item => item.kind === 'counter')
  expect(area(tops)).toBeCloseTo(4.44)
  for (const [index, top] of tops.entries()) for (const other of tops.slice(index + 1)) expect(overlap(top, other)).toBeCloseTo(0)
  expect(overlap(kitchenPrep, tops.find(item => item.id === 'peninsula')!)).toBeCloseTo(.286)
  for (const obstacle of [...kitchenDeviceZones, ...furniture.filter(item => ['hob', 'sink'].includes(item.kind))]) expect(overlap(kitchenPrep, obstacle)).toBeCloseTo(0)
  for (const device of furniture.filter(item => (item.bottom ?? 0) === .92)) expect([...tops, ...furniture.filter(item => item.niche)].some(top => Math.abs(overlap(top, device) - device.width * device.depth) < 1e-8)).toBe(true)
})

test('New kitchen has five towers, low counters, clear west access and east dining', () => {
  const floor = makeFloor('EG'), furniture = floor.furniture
  const island = furniture.find(item => item.id === 'peninsula')!
  expect(island.x - 2.8).toBeCloseTo(1.4)
  expect(furniture.find(item => item.id === 'dining-bench')!.z - island.z - island.depth).toBeCloseTo(1.25)
  expect(furniture.find(item => item.id === 'dining')).toMatchObject({ x: 5.2, z: 7.75, width: .9, depth: 1.8 })
  expect(furniture.filter(item => item.id === 'fridge' || item.id.startsWith('kitchen-tall'))).toHaveLength(5)
  for (const id of ['fridge', 'kitchen-tall']) expect(furniture.find(item => item.id === id)!.height).toBe(floor.height)
  expect(furniture.some(item => item.id === 'kitchen-upper')).toBe(false)
  expect(furniture.some(item => item.id === 'pantry-cabinet')).toBe(false)
})