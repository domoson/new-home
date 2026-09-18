import type { Furniture, Rect } from './model'
import { house } from './model'

export const terraceMain: Rect = { x: 0, z: house.depth, width: 0, depth: 0 }
export const terraceReturn: Rect = { ...terraceMain }
export const terraceParts: Rect[] = []
export const terraceArea = terraceParts.reduce((total, part) => total + part.width * part.depth, 0)
export const terraceOutline: [number, number][] = []
export const westTerraceFurniture: Furniture[] = []
export const terraceFurniture: Furniture[] = []