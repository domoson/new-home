import type { Furniture, Rect } from './model'
import { house } from './model'

export const terraceMain: Rect = { x: house.width - 4.25, z: 10, width: 5, depth: 3 }
export const terraceReturn: Rect = { x: house.width, z: 8.5, width: .75, depth: 1.5 }
export const terraceParts = [terraceMain, terraceReturn]
export const terraceArea = terraceParts.reduce((total, part) => total + part.width * part.depth, 0)
export const terraceOutline: [number, number][] = [[terraceMain.x, 10], [house.width, 10], [house.width, 8.5], [house.width + .75, 8.5], [house.width + .75, 13], [terraceMain.x, 13]]
export const westTerraceFurniture: Furniture[] = [
  { id: 'outdoor-table', kind: 'table', x: terraceMain.x + 1.45, z: 10.85, width: 1.6, depth: .85, height: .75 },
  ...[terraceMain.x + 1.65, terraceMain.x + 2.45].flatMap(east => [10.35, 11.8].map(south => ({ id: `outdoor-chair-${east}-${south}`, kind: 'chair' as const, x: east, z: south, width: .45, depth: .4, height: .8 }))),
]
export const terraceFurniture: Furniture[] = westTerraceFurniture.map(item => ({ ...item, z: item.z + .65 }))