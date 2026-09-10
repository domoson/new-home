import type { Furniture, Rect } from './model'

export const terraceMain: Rect = { x: 3.25, z: 10, width: 5, depth: 3 }
export const terraceReturn: Rect = { x: 7.5, z: 8.5, width: .75, depth: 1.5 }
export const terraceParts = [terraceMain, terraceReturn]
export const terraceArea = terraceParts.reduce((total, part) => total + part.width * part.depth, 0)
export const terraceOutline: [number, number][] = [[3.25, 10], [7.5, 10], [7.5, 8.5], [8.25, 8.5], [8.25, 13], [3.25, 13]]
export const terraceFurniture: Furniture[] = [
  { id: 'outdoor-table', kind: 'table', x: 4.7, z: 10.85, width: 1.6, depth: .85, height: .75 },
  ...[4.9, 5.7].flatMap(east => [10.35, 11.8].map(south => ({ id: `outdoor-chair-${east}-${south}`, kind: 'chair' as const, x: east, z: south, width: .45, depth: .4, height: .8 }))),
]