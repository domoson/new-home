import { expect, test } from 'vitest'
import { boundaryDistance } from './context'
import { parkingEntrance, rectCorners, siteParking } from './parking'

test('Je Haushälfte zwei Mindeststellplätze, Carport mit 3 m Südabstand und freier Fahrradpassage', () => {
  expect(siteParking).toHaveLength(2)
  for (const { side, carport, covered, open, passage, bins, binAccess, point, streetZ } of siteParking) {
    expect(carport.width).toBe(3)
    expect(carport.depth).toBe(6)
    for (const [x, z] of rectCorners(carport)) expect(boundaryDistance(point(x, z), 2)).toBeGreaterThanOrEqual(3 - 1e-9)
    expect(Math.min(...rectCorners(carport).map(([x, z]) => boundaryDistance(point(x, z), 2)))).toBeCloseTo(3, 9)
    expect(Math.min(streetZ(open.x), streetZ(open.x + open.width)) - open.z - open.depth).toBeCloseTo(.45, 9)
    for (const rectangle of [carport, covered, open, bins, binAccess]) for (const [x, z] of rectCorners(rectangle)) {
      const world = point(x, z)
      for (const edge of [0, 1, 2, 3]) expect(boundaryDistance(world, edge)).toBeGreaterThanOrEqual(0)
      expect(side === 'east' ? world[0] : -world[0]).toBeGreaterThan(0)
    }
    for (const stall of [covered, open]) {
      expect(stall.width).toBeGreaterThanOrEqual(2.5)
      expect(stall.depth).toBeGreaterThanOrEqual(5)
      expect(stall.x >= passage.x + passage.width - 1e-9 || stall.x + stall.width <= passage.x + 1e-9).toBe(true)
      expect(parkingEntrance(point(stall.x + stall.width / 2, streetZ(stall.x + stall.width / 2))[0])).toBe(true)
    }
    const gardenEdge = side === 'east' ? carport.x : carport.x + carport.width
    expect(Math.abs(gardenEdge - (side === 'east' ? covered.x : covered.x + covered.width))).toBeCloseTo(.375)
    expect(Math.abs(gardenEdge - siteParking.find(placement => placement.side === side)!.gardenEdge)).toBe(0)
    expect(passage.width).toBe(.9)
    expect(binAccess.depth).toBe(.9)
    expect(carport.x >= passage.x + passage.width - 1e-9 || carport.x + carport.width <= passage.x + 1e-9).toBe(true)
    expect(bins.width).toBeGreaterThanOrEqual(3 * .65 + .2)
    expect(bins.depth).toBeGreaterThanOrEqual(.8)
    const edge = side === 'west' ? 3 : 1, outerX = side === 'west' ? 0 : carport.width
    expect(boundaryDistance(point(outerX, 0), edge)).toBeCloseTo(.18)
    expect(boundaryDistance(point(outerX, 6), edge)).toBeCloseTo(.18)
  }
  expect(parkingEntrance(0)).toBe(false)
})