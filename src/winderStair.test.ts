import { expect, test } from 'vitest'
import { stairWalkingLine, winderCore, winderSteps } from './winderStair'

test('Continuous stair uses two quarter windings, uniform rises and a northern entrance', () => {
  expect(winderCore.width * winderCore.depth).toBeLessThan(2.79 * 1.88)
  for (const rise of [2.7, 2.95]) {
    const steps = winderSteps(rise)
    expect(steps).toHaveLength(15)
    expect(steps.filter(step => step.id.startsWith('winder'))).toHaveLength(8)
    steps.forEach((step, index) => {
      expect(step.height).toBeCloseTo((index + 1) * rise / 16)
      for (const [east, south] of step.footprint) {
        expect(east).toBeGreaterThanOrEqual(winderCore.x - 1e-8)
        expect(east).toBeLessThanOrEqual(winderCore.x + winderCore.width + 1e-8)
        expect(south).toBeGreaterThanOrEqual(winderCore.z - 1e-8)
        expect(south).toBeLessThanOrEqual(winderCore.end + 1e-8)
      }
    })
    const line = stairWalkingLine(rise)
    expect(line[0][2]).toBeLessThan(line.at(-1)![2])
    expect(line.at(-1)![1]).toBe(rise)
    expect(2 * rise / 16 + .65 * Math.PI / 8).toBeGreaterThan(.59)
    expect(2 * rise / 16 + .65 * Math.PI / 8).toBeLessThan(.65)
  }
})