import { expect, test } from 'vitest'
import { boundaryDistance, partner } from './context'
import { house, lightWells } from './model'
import { terraceArea, terraceFurniture, terraceMain, terraceOutline, terraceParts, westTerraceFurniture } from './terrace'

test('Kompakte Eckterrassen bleiben auf beiden Haelften frei von Haus und Lichtschaechten', () => {
  expect(terraceMain.width).toBe(5)
  expect(terraceMain.depth).toBe(3)
  expect(terraceArea).toBeCloseTo(16.125)
  const area = Math.abs(terraceOutline.reduce((total, point, index) => {
    const next = terraceOutline[(index + 1) % terraceOutline.length]
    return total + point[0] * next[1] - next[0] * point[1]
  }, 0)) / 2
  expect(area).toBe(terraceArea)
  for (const [east, south] of terraceOutline) for (const point of [[east, south], [-east, south + partner.z]] as [number, number][]) for (const side of [0, 1, 2, 3]) expect(boundaryDistance(point, side)).toBeGreaterThan(0)
  for (const part of terraceParts) for (const obstacle of [{ x: 0, z: 0, width: house.width, depth: house.depth }, ...lightWells]) {
    const overlap = Math.max(0, Math.min(part.x + part.width, obstacle.x + obstacle.width) - Math.max(part.x, obstacle.x)) * Math.max(0, Math.min(part.z + part.depth, obstacle.z + obstacle.depth) - Math.max(part.z, obstacle.z))
    expect(overlap).toBe(0)
  }
  expect(Math.min(...terraceFurniture.map(item => item.z)) - house.depth).toBeCloseTo(1)
  for (const [index, item] of terraceFurniture.entries()) expect(item.z - westTerraceFurniture[index].z).toBeCloseTo(.65)
  for (const item of [...terraceFurniture, ...westTerraceFurniture]) {
    expect(item.x).toBeGreaterThanOrEqual(terraceMain.x)
    expect(item.x + item.width).toBeLessThanOrEqual(terraceMain.x + terraceMain.width)
    expect(item.z).toBeGreaterThanOrEqual(terraceMain.z)
    expect(item.z + item.depth).toBeLessThanOrEqual(terraceMain.z + terraceMain.depth)
  }
})