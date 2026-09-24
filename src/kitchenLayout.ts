import type { Furniture, Rect } from './model'

export const kitchenPrep: Rect = { x: 4.6, z: 5.54, width: .55, depth: .52 }
export const kitchenDeviceZones: Rect[] = [
  { x: 3.5, z: 3.13, width: .5, depth: .42 },
  { x: 6.05, z: 2.57, width: .3, depth: .22 },
  { x: 6.1, z: 4.95, width: .22, depth: .26 },
  { x: 3.5, z: 3.6, width: .5, depth: .5 },
]

export function kitchenFurniture(ceiling: number): Furniture[] {
  const item = (id: string, kind: Furniture['kind'], x: number, z: number, width: number, depth: number, height: number, bottom = 0): Furniture => ({ id, kind, x, z, width, depth, height, bottom, angle: 0 })
  return [
    ...['kitchen-tall-storage-1', 'kitchen-tall-storage-2', 'kitchen-tall', 'fridge', 'kitchen-tall-storage-3'].map((id, index) => ({ ...item(id, 'cabinet', 3.45 + index * .63, 2.5, .63, .6, ceiling), ...(index === 0 ? { frontBottom: 1.52 } : {}), ...(index === 4 ? { niche: { bottom: .92, height: .6 } } : {}) })),
    item('coffee-counter', 'counter', 3.45, 3.1, .6, 1, .92),
    item('kitchen', 'counter', 6, 3.1, .6, 2.4, .92),
    { ...item('peninsula', 'counter', 4.2, 5.5, 2.4, 1, .92), baseInset: { west: .35, south: .4 } },
    { ...item('kitchen-sink', 'sink', 6.03, 3.7, .54, .8, .92), angle: Math.PI / 2 },
    item('induction', 'hob', 5.18, 5.54, .8, .52, .025, .92),
    item('espresso', 'espresso', 3.52, 3.14, .38, .4, .4, .92),
    item('toaster', 'machine', 6.05, 2.57, .3, .22, .22, .92),
    item('sodastream', 'machine', 6.1, 4.95, .22, .26, .45, .92),
    item('cookit', 'machine', 3.5, 3.6, .5, .5, .45, .92),
  ]
}