import type { Furniture, Rect } from './model'

export const kitchenPrep: Rect = { x: .96, z: .3, width: .55, depth: .65 }
export const kitchenDeviceZones: Rect[] = [
  { x: .38, z: 3.27, width: .42, depth: .58 },
  { x: .9, z: 3.27, width: .3, depth: .25 },
  { x: 1.3, z: 3.27, width: .3, depth: .35 },
  { x: .35, z: 1, width: .55, depth: .55 },
]

export function kitchenFurniture(ceiling: number): Furniture[] {
  const item = (id: string, kind: Furniture['kind'], x: number, z: number, width: number, depth: number, height: number, bottom = 0): Furniture => ({ id, kind, x, z, width, depth, height, bottom, angle: 0 })
  return [
    { ...item('fridge', 'cabinet', 3.175, 2.025, .65, .6, ceiling), angle: -Math.PI },
    { ...item('kitchen-tall', 'cabinet', 3.175, 2.625, .65, .6, ceiling), angle: -Math.PI },
    { ...item('kitchen-east-storage', 'cabinet', 3.175, 3.225, .65, .6, ceiling), angle: -Math.PI },
    item('coffee-counter', 'counter', .3, .3, 3.525, .65, .92),
    item('kitchen', 'counter', .3, .95, .65, 1.7, .92),
    item('kitchen-south-counter', 'counter', .3, 3.235, 1.85, .65, .92),
    item('kitchen-upper', 'cabinet', 2.8, .3, 1, .35, ceiling - 1.65, 1.65),
    item('kitchen-sink', 'sink', 1.55, .355, .8, .54, .92),
    item('induction', 'hob', .365, 1.75, .52, .8, .025, .92),
    { ...item('espresso', 'espresso', .4, 3.32, .38, .4, .4, .92), angle: Math.PI },
    item('toaster', 'machine', .9, 3.32, .3, .22, .22, .92),
    item('sodastream', 'machine', 1.3, 3.32, .22, .26, .45, .92),
    item('cookit', 'machine', .365, 1.02, .5, .5, .45, .92),
  ]
}