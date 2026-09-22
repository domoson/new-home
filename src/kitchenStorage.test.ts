import { expect, test } from 'vitest'
import { makeFloor, wallSolids } from './model'
import type { Rect } from './model'
import { kitchenModules, moduleFront, moduleOpening } from './kitchenStorage'

const overlap = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

test('Five tall cabinets have clear south fronts above the connected corner counters', () => {
  const floor = makeFloor('EG')
  for (const [index, id] of ['kitchen-tall-storage-1', 'kitchen-tall-storage-2', 'kitchen-tall', 'fridge', 'kitchen-tall-storage-3'].entries()) {
    const cabinet = floor.furniture.find(item => item.id === id)!
    expect(cabinet.x).toBeCloseTo(3.55 + index * .63)
    expect(cabinet).toMatchObject({ z: 2.5, width: .63, depth: .6, height: floor.height, angle: 0 })
    const opening = { x: cabinet.x, z: 3.1, width: .63, depth: .63 }
    const frontBottom = cabinet.frontBottom ?? (cabinet.niche ? cabinet.niche.bottom + cabinet.niche.height : .1)
    for (const other of floor.furniture.filter(other => other.height + (other.bottom ?? 0) > frontBottom)) expect(overlap(opening, other), `${id}/${other.id}`).toBeLessThan(1e-8)
  }
})

test('Six base modules have accessible fronts and individual opening clearance', () => {
  const floor = makeFloor('EG'), owners = floor.furniture.filter(item => kitchenModules(item).length)
  const modules = owners.flatMap(kitchenModules)
  expect(modules).toHaveLength(6)
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
  expect(modules.some(module => module.id === 'corner-storage')).toBe(false)
  const hob = floor.furniture.find(item => item.id === 'induction')!
  expect(overlap(hob, modules.find(module => module.id === 'hob-drawers')!)).toBeCloseTo(hob.width * hob.depth)
  expect(modules.filter(module => module.id.startsWith('rear-storage'))).toEqual([])
})