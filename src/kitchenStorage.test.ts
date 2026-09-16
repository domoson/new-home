import { expect, test } from 'vitest'
import { area, makeFloor, wallSolids } from './model'
import type { Rect } from './model'
import { kitchenModules, moduleFront, moduleOpening } from './kitchenStorage'

const overlap = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

test('Two ceiling-height towers preserve the hall and accessible south fronts', () => {
  const floor = makeFloor('EG'), north = floor.walls.find(wall => wall.id === 'hall-south')!
  expect(north.z).toBeCloseTo(2.39)
  expect(north.openings[0].width).toBeCloseTo(1.3)
  expect(area(floor.rooms.find(room => room.id === 'hall')!.parts)).toBeCloseTo(8.1676)
  expect(area(floor.rooms.find(room => room.id === 'living')!.parts)).toBeCloseTo(37.3988)
  for (const [index, id] of ['fridge', 'kitchen-tall'].entries()) {
    const cabinet = floor.furniture.find(item => item.id === id)!
    expect(cabinet.x).toBeCloseTo(4 + index * .6)
    expect(cabinet).toMatchObject({ z: 2.55, width: .6, depth: .65, height: 2.65, angle: 0 })
    const opening = { x: cabinet.x, z: 3.2, width: .6, depth: .6 }
    for (const other of floor.furniture) expect(overlap(opening, other), `${id}/${other.id}`).toBeLessThan(1e-8)
  }
})

test('Eight storage modules have accessible fronts and individual opening clearance', () => {
  const floor = makeFloor('EG'), owners = floor.furniture.filter(item => kitchenModules(item).length)
  const modules = owners.flatMap(kitchenModules)
  expect(modules).toHaveLength(8)
  expect(modules.filter(module => module.use === 'dishwasher')).toHaveLength(1)
  for (const owner of owners) for (const module of kitchenModules(owner)) {
    expect(overlap(module, owner)).toBeCloseTo(module.width * module.depth)
    const front = moduleFront(module)
    expect(overlap(front, module)).toBeCloseTo(front.width * front.depth)
    const opening = moduleOpening(module)
    for (const other of floor.furniture.filter(item => item !== owner && (item.bottom ?? 0) < .9 && !['sink', 'hob', 'espresso'].includes(item.kind))) expect(overlap(opening, other), `${module.id}/${other.id}`).toBeLessThan(1e-8)
    for (const wall of floor.walls.flatMap(wall => wallSolids(wall, floor.height)).filter(solid => solid.bottom < .9)) expect(overlap(opening, wall), `${module.id}/${wall.id}`).toBeLessThan(1e-8)
  }
  for (const [index, module] of modules.entries()) for (const other of modules.slice(index + 1)) expect(overlap(module, other)).toBeLessThan(1e-8)
  const corner = modules.find(module => module.id === 'corner-storage')!
  expect(moduleOpening(corner).width).toBeCloseTo(.6)
  expect(moduleFront(corner).width).toBeCloseTo(.59)
  const hob = floor.furniture.find(item => item.id === 'induction')!
  expect(overlap(hob, modules.find(module => module.id === 'hob-drawers')!)).toBeCloseTo(hob.width * hob.depth)
  for (const module of modules.filter(module => module.id.startsWith('rear-storage'))) expect(module.depth).toBe(.35)
})