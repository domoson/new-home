import { expect, test } from 'vitest'
import { furnitureVolumes, makeFloor, wallSolids } from './model'
import type { Rect } from './model'
import { kitchenModules, moduleFront, moduleOpening } from './kitchenStorage'

const overlap = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

test('Island cabinets fill the underside except a 120 cm stool recess', () => {
  const floor = makeFloor('EG'), island = floor.furniture.find(item => item.id === 'peninsula')!
  const modules = kitchenModules(island), recess = { x: island.x + .4, z: island.z + .6, width: 1.2, depth: .4 }
  expect(island).toMatchObject({ x: 3.95, width: 2.65, depth: 1 })
  expect(modules).toHaveLength(6)
  expect(modules.reduce((area, module) => area + module.width * module.depth, 0) + recess.width * recess.depth).toBeCloseTo(island.width * island.depth)
  for (const [index, module] of modules.entries()) {
    expect(overlap(module, recess)).toBeCloseTo(0)
    expect(overlap(module, island)).toBeCloseTo(module.width * module.depth)
    for (const other of modules.slice(index + 1)) expect(overlap(module, other)).toBeCloseTo(0)
    const body = furnitureVolumes(island).find(body => body.x === module.x && body.z === module.z && body.width === module.width && body.depth === module.depth)!
    expect(body.height).toBeCloseTo(.89)
  }
  expect(modules.filter(module => module.front === 'west').every(module => module.width === .4)).toBe(true)
  expect(modules.find(module => module.id === 'rear-storage')!.depth).toBeCloseTo(.4)
  for (const stool of floor.furniture.filter(item => item.id.startsWith('kitchen-stool'))) {
    expect(stool.x).toBeGreaterThan(recess.x)
    expect(stool.x + stool.width).toBeLessThan(recess.x + recess.width)
    for (const module of modules) expect(overlap(stool, module)).toBeCloseTo(0)
  }
})

test('Five tall cabinets have clear south fronts above the connected corner counters', () => {
  const floor = makeFloor('EG')
  for (const [index, id] of ['kitchen-tall-storage-1', 'kitchen-tall-storage-2', 'kitchen-tall', 'fridge', 'kitchen-tall-storage-3'].entries()) {
    const cabinet = floor.furniture.find(item => item.id === id)!
    expect(cabinet.x).toBeCloseTo(3.6 + index * .6)
    expect(cabinet).toMatchObject({ z: 2.5, width: .6, depth: .6, height: floor.height, angle: 0 })
    const opening = { x: cabinet.x, z: 3.1, width: cabinet.width, depth: cabinet.width }
    const frontBottom = cabinet.frontBottom ?? (cabinet.niche ? cabinet.niche.bottom + cabinet.niche.height : .1)
    for (const other of floor.furniture.filter(other => other.height + (other.bottom ?? 0) > frontBottom)) expect(overlap(opening, other), `${id}/${other.id}`).toBeLessThan(1e-8)
  }
})

test('Nine base modules have accessible fronts and individual opening clearance', () => {
  const floor = makeFloor('EG'), owners = floor.furniture.filter(item => kitchenModules(item).length)
  const modules = owners.flatMap(kitchenModules)
  expect(modules).toHaveLength(9)
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
  expect(modules.find(module => module.id === 'corner-storage')!.front).toBe('south')
  const hob = floor.furniture.find(item => item.id === 'induction')!
  expect(overlap(hob, modules.find(module => module.id === 'hob-drawers')!)).toBeCloseTo(hob.width * hob.depth)
  expect(modules.filter(module => module.id.startsWith('rear-storage'))).toHaveLength(1)
})