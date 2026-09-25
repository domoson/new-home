import { expect, test } from 'vitest'
import { house } from './model'
import { partner } from './context'
import { siteEntrySteps, siteLightWells, splashStripParts, splashStripWidth } from './splashStrip'

test('Traufstreifen bleibt vor Fassaden, Lichtschächten und Eingangspodesten', () => {
  expect(splashStripWidth).toBe(.4)
  expect(splashStripParts.length).toBeGreaterThan(0)
  const obstacles = [{ x: 0, z: 0, width: house.width, depth: house.depth }, partner, ...siteLightWells, ...siteEntrySteps]
  for (const [index, part] of splashStripParts.entries()) {
    expect(part.width).toBeGreaterThan(0)
    expect(part.depth).toBeGreaterThan(0)
    for (const obstacle of [...obstacles, ...splashStripParts.slice(index + 1)]) {
      const overlapEast = Math.min(part.x + part.width, obstacle.x + obstacle.width) - Math.max(part.x, obstacle.x)
      const overlapSouth = Math.min(part.z + part.depth, obstacle.z + obstacle.depth) - Math.max(part.z, obstacle.z)
      expect(Math.min(overlapEast, overlapSouth)).toBeLessThan(1e-8)
    }
  }
})

test('40 cm Kies schließt seitlich an unveränderte Schächte an und folgt den Hausversätzen', () => {
  const covered = (east: number, south: number) => splashStripParts.some(part => east > part.x && east < part.x + part.width && south > part.z && south < part.z + part.depth)
  for (const well of siteLightWells) {
    if (well.width > well.depth) {
      expect(well.depth).toBe(.5)
      expect(covered(well.x - .01, well.z + well.depth / 2)).toBe(true)
      expect(covered(well.x + well.width + .01, well.z + well.depth / 2)).toBe(true)
    } else {
      expect(well.width).toBe(.5)
      expect(covered(well.x + well.width / 2, well.z - .01)).toBe(true)
      expect(covered(well.x + well.width / 2, well.z + well.depth + .01)).toBe(true)
    }
  }
  expect(covered(-.25, .1)).toBe(true)
  expect(covered(.25, house.depth + partner.z - .1)).toBe(true)
  expect(covered(0, house.depth / 2)).toBe(false)
  expect(covered(house.width + .39, 5)).toBe(true)
  expect(covered(-house.width - .39, 5)).toBe(true)
  expect(covered(house.width + .41, 5)).toBe(false)
  expect(covered(-house.width - .41, 5)).toBe(false)
})