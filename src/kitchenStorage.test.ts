import { expect, test } from 'vitest'
import { area, house, makeFloor, wallSolids } from './model'
import type { Rect } from './model'
import { kitchenModules, moduleOpening } from './kitchenStorage'

const overlap = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

test('East 120 cm shifts south 60 cm while two 60 cm tall cabinets retain their north alignment', () => {
  const floor = makeFloor('EG'), west = floor.walls.find(wall => wall.id === 'hall-south')!, east = floor.walls.find(wall => wall.id === 'entry-wardrobe-back')!, step = floor.walls.find(wall => wall.id === 'kitchen-step')!
  expect(east.width).toBeCloseTo(1.2)
  expect(east.x + east.width).toBeCloseTo(house.east)
  expect(east.z - west.z).toBeCloseTo(.6)
  expect(step.width).toBe(.16)
  expect(west.x + west.width).toBeCloseTo(step.x)
  expect(step.x + step.width).toBeCloseTo(east.x)
  for (const id of ['fridge', 'kitchen-tall']) expect(floor.furniture.find(item => item.id === id)).toMatchObject({ z: 1.95, width: .6, depth: .6 })
  const oven = floor.furniture.find(item => item.id === 'kitchen-tall')!
  expect(step.x - oven.x - oven.width).toBeCloseTo(.08)
  const wardrobe = floor.furniture.find(item => item.id === 'wardrobe')!
  expect(wardrobe).toMatchObject({ width: 1.16, depth: .56, angle: Math.PI })
  expect(wardrobe.z).toBeCloseTo(west.z + .02)
  expect(wardrobe.z + wardrobe.depth).toBeLessThan(east.z)
  expect(area(floor.rooms.find(room => room.id === 'hall')!.parts)).toBeCloseTo(6.5116)
  expect(area(floor.rooms.find(room => room.id === 'living')!.parts)).toBeCloseTo(38.9588)
})

test('Worktop and clear prep width increase without counting any surface twice', () => {
  const furniture = makeFloor('EG').furniture
  const worktops = furniture.filter(item => ['kitchen', 'peninsula', 'coffee-counter'].includes(item.id))
  expect(area(worktops) - (2.66 * 1 + .6 * 1.45)).toBeCloseTo(.63)
  for (const [index, top] of worktops.entries()) for (const other of worktops.slice(index + 1)) expect(overlap(top, other)).toBeLessThan(1e-8)
  const peninsula = furniture.find(item => item.id === 'peninsula')!, hob = furniture.find(item => item.id === 'induction')!, espresso = furniture.find(item => item.id === 'espresso')!, coffee = furniture.find(item => item.id === 'coffee-counter')!
  expect(peninsula.z).toBeCloseTo(4.05 + .4)
  expect(hob.x - peninsula.x).toBeCloseTo(1.14)
  const hobBase = kitchenModules(peninsula).find(module => module.id === 'hob-drawers')!
  expect(hob.x - hobBase.x).toBeGreaterThanOrEqual(.03)
  expect(hobBase.x + hobBase.width - hob.x - hob.width).toBeGreaterThanOrEqual(.01)
  expect(furniture.indexOf(coffee)).toBeLessThan(furniture.indexOf(espresso))
  expect(peninsula.z - coffee.z - coffee.depth).toBeCloseTo(1.3)
  expect(overlap(espresso, coffee)).toBeCloseTo(espresso.width * espresso.depth)
  const prep = { x: peninsula.x, z: peninsula.z, width: 1.14, depth: .6 }
  for (const item of furniture.filter(item => item.kind === 'hob' || item.kind === 'espresso')) expect(overlap(prep, item)).toBeCloseTo(0)
  const dining = furniture.find(item => item.id === 'dining')!
  expect(dining.z - peninsula.z - peninsula.depth).toBeCloseTo(1.55)
  const occupiedNorthChair = { x: dining.x, z: dining.z - .6, width: dining.width, depth: .6 }
  expect(occupiedNorthChair.z - peninsula.z - peninsula.depth).toBeGreaterThanOrEqual(.9)
})

test('Storage modules and 60 cm opening envelopes fit, excluding blind corners', () => {
  const floor = makeFloor('EG'), owners = floor.furniture.filter(item => kitchenModules(item).length > 0)
  const allModules = owners.flatMap(kitchenModules)
  expect(allModules.filter(module => module.id.startsWith('dining-storage'))).toHaveLength(4)
  expect(allModules.filter(module => module.use === 'dishwasher')).toHaveLength(1)
  for (const owner of owners) for (const module of kitchenModules(owner)) {
    expect(overlap(module, owner), module.id).toBeCloseTo(module.width * module.depth)
    const opening = moduleOpening(module)
    for (const other of floor.furniture.filter(item => item !== owner && !['hob', 'espresso', 'sink'].includes(item.kind))) expect(overlap(opening, other), `${module.id}/${other.id}`).toBeLessThan(1e-8)
    for (const wall of floor.walls.flatMap(wall => wallSolids(wall, floor.height)).filter(solid => solid.bottom < .9)) expect(overlap(opening, wall), `${module.id}/${wall.id}`).toBeLessThan(1e-8)
  }
  for (const [index, module] of allModules.entries()) for (const other of allModules.slice(index + 1)) expect(overlap(module, other), `${module.id}/${other.id}`).toBeLessThan(1e-8)
  const counter = owners.find(item => item.id === 'coffee-counter')!
  const blindCorner = { x: house.east - .6, z: counter.z, width: .6, depth: .6 }
  for (const module of allModules) expect(overlap(blindCorner, module), module.id).toBeLessThan(1e-8)
})