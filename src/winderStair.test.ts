import { expect, test } from 'vitest'
import { stairWalkingLine, winderCore, winderSteps } from './winderStair'

test('Two quarter turns flank a straight middle flight with both exits facing east', () => {
  expect(winderCore.z).toBeCloseTo(2.8 - .35)
  expect(winderCore.end).toBeCloseTo(5.98 - .35)
  expect(winderCore.width * winderCore.depth).toBeCloseTo(5.9784)
  for (const rise of [2.7, 2.95]) {
    const steps = winderSteps(rise)
    expect(steps).toHaveLength(15)
    expect(steps.filter(step => step.id.startsWith('winder'))).toHaveLength(8)
    expect(steps.filter(step => step.id.startsWith('middle'))).toHaveLength(3)
    expect(steps.filter(step => step.id.startsWith('north'))).toHaveLength(2)
    expect(steps.filter(step => step.id.startsWith('south'))).toHaveLength(2)
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
    expect(line[0][0]).toBeCloseTo(line.at(-1)![0])
    expect(line[0][0]).toBeGreaterThan(winderCore.x + winderCore.width)
    expect(2 * rise / 16 + .7 * Math.PI / 8).toBeGreaterThan(.59)
    expect(2 * rise / 16 + .7 * Math.PI / 8).toBeLessThan(.65)
  }
})