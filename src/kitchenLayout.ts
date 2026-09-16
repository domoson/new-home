import type { Furniture, Rect } from './model'

export const kitchenPrep: Rect = { x: 4.97, z: 5.4, width: 1, depth: .6 }
export const kitchenDeviceZones: Rect[] = [
  { x: 5.2, z: 2.6, width: .42, depth: .58 },
  { x: 5.63, z: 2.93, width: .3, depth: .25 },
  { x: 6.04, z: 2.83, width: .3, depth: .35 },
  { x: 6, z: 3.25, width: .55, depth: .55 },
]

export function kitchenFurniture(ceiling: number): Furniture[] {
  const item = (id: string, kind: Furniture['kind'], x: number, z: number, width: number, depth: number, height: number, bottom = 0): Furniture => ({ id, kind, x, z, width, depth, height, bottom, angle: 0 })
  return [
    item('fridge', 'cabinet', 4, 2.55, .6, .65, ceiling),
    item('kitchen-tall', 'cabinet', 4.6, 2.55, .6, .65, ceiling),
    item('kitchen-scribe', 'cabinet', 3.96, 2.55, .04, .65, ceiling),
    item('coffee-counter', 'counter', 5.2, 2.55, 1.42, .65, .92),
    item('kitchen', 'counter', 5.97, 3.2, .65, 2.15, .92),
    item('peninsula', 'counter', 3.96, 5.35, 2.66, 1, .92),
    item('kitchen-upper', 'cabinet', 5.2, 2.55, 1.42, .35, ceiling - 1.65, 1.65),
    item('kitchen-sink', 'sink', 6.025, 4.05, .54, .6, .92),
    item('induction', 'hob', 4.16, 5.43, .8, .52, .025, .92),
    item('espresso', 'espresso', 5.23, 2.64, .38, .4, .4, .92),
    item('toaster', 'machine', 5.63, 2.95, .3, .22, .22, .92),
    item('sodastream', 'machine', 6.08, 2.87, .22, .26, .45, .92),
    item('cookit', 'machine', 6.025, 3.275, .5, .5, .45, .92),
  ]
}