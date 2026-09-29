import type { Furniture, Rect } from './model'

export type KitchenModule = Rect & { id: string; front: 'north' | 'south' | 'west' | 'east'; use: 'drawers' | 'cupboard' | 'dishwasher' | 'sink'; frontOffset?: number; frontLength?: number }

export function kitchenModules(item: Furniture): KitchenModule[] {
  const { x, z, width } = item
  if (item.id === 'kitchen-south-counter') return [
    { id: 'south-drawers', x, z, width: .9, depth: item.depth, front: 'north', use: 'drawers' },
    { id: 'south-storage', x: x + .9, z, width: width - .9, depth: item.depth, front: 'north', use: 'cupboard' },
  ]
  if (item.id === 'peninsula') return [
    { id: 'west-storage-north', x, z, width: .4, depth: .5, front: 'west', use: 'cupboard' },
    { id: 'west-storage-south', x, z: z + .5, width: .4, depth: item.depth - .5, front: 'west', use: 'cupboard' },
    { id: 'prep-drawers', x: x + .4, z, width: .6, depth: .6, front: 'north', use: 'drawers' },
    { id: 'hob-drawers', x: x + 1, z, width: 1.05, depth: .6, front: 'north', use: 'drawers' },
    { id: 'rear-storage', x: x + 1.6, z: z + .6, width: .45, depth: item.depth - .6, front: 'south', use: 'cupboard' },
    { id: 'corner-storage', x: x + 2.05, z, width: width - 2.05, depth: item.depth, front: 'south', use: 'cupboard' },
  ]
  if (item.id === 'kitchen') return [
    { id: 'dishwasher', x, z, width, depth: .6, front: 'west', use: 'dishwasher' },
    { id: 'sink-base', x, z: z + .6, width, depth: .8, front: 'west', use: 'sink' },
    { id: 'east-prep', x, z: z + 1.4, width, depth: item.depth - 1.4, front: 'west', use: 'drawers' },
  ]
  if (item.id === 'coffee-counter') return [
    { id: 'coffee-storage', x, z, width, depth: item.depth, front: 'east', use: 'drawers' },
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