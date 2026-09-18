import type { Furniture, Rect } from './model'

export type KitchenModule = Rect & { id: string; front: 'north' | 'south' | 'west' | 'east'; use: 'drawers' | 'cupboard' | 'dishwasher' | 'sink'; frontOffset?: number; frontLength?: number }

export function kitchenModules(item: Furniture): KitchenModule[] {
  const { x, z, width } = item
  if (item.id === 'kitchen-south-counter') return [
    { id: 'south-drawers', x, z, width: .9, depth: item.depth, front: 'north', use: 'drawers' },
    { id: 'south-storage', x: x + .9, z, width: width - .9, depth: item.depth, front: 'north', use: 'cupboard' },
  ]
  if (item.id === 'peninsula') return [
    { id: 'hob-drawers', x, z, width: 1, depth: .6, front: 'north', use: 'drawers' },
    { id: 'prep-drawers', x: x + 1, z, width: 1, depth: .6, front: 'north', use: 'drawers' },
    { id: 'rear-storage-west', x: x + .04, z: z + .65, width: 1, depth: .35, front: 'south', use: 'cupboard' },
    { id: 'rear-storage-east', x: x + 1.04, z: z + .65, width: 1, depth: .35, front: 'south', use: 'cupboard' },
  ]
  if (item.id === 'kitchen') return [
    { id: 'west-prep', x, z, width, depth: .8, front: 'east', use: 'drawers' },
    { id: 'hob-drawers', x, z: z + .8, width, depth: item.depth - .8, front: 'east', use: 'drawers' },
  ]
  if (item.id === 'coffee-counter') return [
    { id: 'corner-storage', x, z, width: .65, depth: .65, front: 'south', use: 'cupboard' },
    { id: 'dishwasher', x: x + .65, z, width: .6, depth: .65, front: 'south', use: 'dishwasher' },
    { id: 'sink-base', x: x + 1.25, z, width: .8, depth: .65, front: 'south', use: 'sink' },
    { id: 'coffee-storage', x: x + 2.05, z, width: width - 2.05, depth: .65, front: 'south', use: 'drawers' },
  ]
  return []
}

export function moduleOpening(module: KitchenModule, extension = .6): Rect {
  const offset = module.frontOffset ?? 0, length = module.frontLength
  if (module.front === 'east') return { x: module.x + module.width, z: module.z + offset, width: extension, depth: length ?? module.depth }
  if (module.front === 'west') return { x: module.x - extension, z: module.z + offset, width: extension, depth: length ?? module.depth }
  return { x: module.x + offset, z: module.front === 'north' ? module.z - extension : module.z + module.depth, width: length ?? module.width, depth: extension }
}

export function moduleFront(module: KitchenModule): Rect {
  const offset = module.frontOffset ?? 0, length = module.frontLength
  if (module.front === 'east' || module.front === 'west') return { x: module.x + (module.front === 'east' ? module.width - .02 : 0), z: module.z + offset + .005, width: .02, depth: (length ?? module.depth) - .01 }
  return { x: module.x + offset + .005, z: module.z + (module.front === 'south' ? module.depth - .02 : 0), width: (length ?? module.width) - .01, depth: .02 }
}