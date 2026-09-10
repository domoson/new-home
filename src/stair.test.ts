import { expect, it } from 'vitest'
import { floorSlabs, roofHeight, stair, stairGuards, stairHandrails, stairSolids } from './model'
import { sectionSpan } from './section'

it('bildet eine kompakte zweimal viertelgewendelte Treppe ohne Podest', () => {
  expect(stair.width * stair.depth).toBeCloseTo(4.796)
  expect(stair.width * stair.depth).toBeLessThan(2.08 * 3.35)
  for (const rise of [2.7, 2.95]) {
    const solids = stairSolids(rise).sort((first, second) => first.bottom + first.height - second.bottom - second.height)
    expect(solids.filter(solid => solid.id.startsWith('north'))).toHaveLength(4)
    expect(solids.filter(solid => solid.id.startsWith('south'))).toHaveLength(3)
    const landing = solids.filter(solid => solid.id.startsWith('landing'))
    expect(landing).toHaveLength(0)
    expect(solids.filter(solid => solid.id.startsWith('winder'))).toHaveLength(8)
    expect(stairGuards(rise)).toHaveLength(15)
    expect(stairHandrails(rise)).toHaveLength(15)
    for (const [index, solid] of solids.entries()) {
      expect(solid.bottom + solid.height).toBeCloseTo((index + 1) * rise / 16)
      expect(solid.x).toBeGreaterThanOrEqual(stair.x - 1e-6)
      expect(solid.x + solid.width).toBeLessThanOrEqual(stair.x + stair.width + 1e-6)
      expect(solid.z).toBeGreaterThanOrEqual(stair.z - 1e-6)
      expect(solid.z + solid.depth).toBeLessThanOrEqual(stair.end + 1e-6)
      expect(Math.min(roofHeight(solid.z), roofHeight(solid.z + solid.depth)) + rise - solid.bottom - solid.height).toBeGreaterThan(2)
      for (const other of [...solids.slice(index + 1), ...floorSlabs('OG')]) {
        for (let sample = 0; sample < 60; sample++) {
          const position = stair.x + (sample + .5) * stair.width / 60
          const first = sectionSpan(solid, 'NS', position), second = sectionSpan(other, 'NS', position)
          if (first && second) expect(Math.min(first[1], second[1]) - Math.max(first[0], second[0])).toBeLessThan(1e-6)
        }
      }
    }
  }
})