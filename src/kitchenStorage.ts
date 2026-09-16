import type { Furniture, Rect } from './model'

export type KitchenModule = Rect & { id: string; front: 'north' | 'south' | 'west' | 'east'; use: 'drawers' | 'cupboard' | 'dishwasher' | 'sink'; frontOffset?: number; frontLength?: number }

export function kitchenModules(item: Furniture): KitchenModule[] {
  const { x, z, width } = item
  if (item.id === 'peninsula') return [
    { id: 'hob-drawers', x, z, width: 1, depth: .6, front: 'north', use: 'drawers' },
    { id: 'prep-drawers', x: x + 1, z, width: 1, depth: .6, front: 'north', use: 'drawers' },
    { id: 'rear-storage-west', x: x + .04, z: z + .65, width: 1, depth: .35, front: 'south', use: 'cupboard' },
    { id: 'rear-storage-east', x: x + 1.04, z: z + .65, width: 1, depth: .35, front: 'south', use: 'cupboard' },
  ]
  if (item.id === 'kitchen') return [
    { id: 'east-prep', x, z, width: width - .05, depth: .75, front: 'west', use: 'drawers' },
    { id: 'sink-base', x, z: z + .75, width: width - .05, depth: .8, front: 'west', use: 'sink' },
    { id: 'dishwasher', x, z: z + 1.55, width: width - .05, depth: .6, front: 'west', use: 'dishwasher' },
  ]
  if (item.id === 'coffee-counter') return [{ id: 'corner-storage', x, z, width, depth: .65, front: 'south', use: 'cupboard', frontOffset: .05, frontLength: .6 }]
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