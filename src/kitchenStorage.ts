import type { Furniture, Rect } from './model'

export type KitchenModule = Rect & { id: string; front: 'north' | 'south' | 'west'; use: 'drawers' | 'cupboard' | 'dishwasher' | 'sink' }

export function kitchenModules(item: Furniture): KitchenModule[] {
  const { x, z, width, depth } = item
  if (item.id === 'peninsula') return [
    { id: 'prep-drawers', x: x + .03, z, width: 1, depth: .6, front: 'north', use: 'drawers' },
    { id: 'hob-drawers', x: x + 1.06, z, width: .9, depth: .6, front: 'north', use: 'drawers' },
    ...Array.from({ length: 4 }, (_, index): KitchenModule => ({ id: `dining-storage-${index}`, x: x + .03 + index * .6, z: z + depth - .37, width: .6, depth: .35, front: 'south', use: 'cupboard' })),
  ]
  if (item.id === 'coffee-counter') return [{ id: 'coffee-drawers', x: x + .02, z, width: .56, depth, front: 'south', use: 'drawers' }]
  if (item.id === 'kitchen') return [
    { id: 'dishwasher', x, z: z + .05, width, depth: .6, front: 'west', use: 'dishwasher' },
    { id: 'sink-base', x, z: z + .65, width, depth: .6, front: 'west', use: 'sink' },
  ]
  return []
}

export function moduleOpening(module: KitchenModule, extension = .6): Rect {
  if (module.front === 'west') return { x: module.x - extension, z: module.z, width: extension, depth: module.depth }
  return { x: module.x, z: module.front === 'north' ? module.z - extension : module.z + module.depth, width: module.width, depth: extension }
}