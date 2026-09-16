import { expect, test } from 'vitest'
import { stairWalkingLine, winderCore, winderSteps } from './winderStair'

test('A nearly square half-turn stair sits 80 cm north of center with both exits facing east', () => {
  expect((winderCore.z + winderCore.end) / 2).toBeCloseTo(4.2)
  expect(winderCore.end).toBeCloseTo(winderCore.z + 2.2)
  expect(winderCore.width * winderCore.depth).toBeCloseTo(4.62)
  expect(winderCore.turnSize * 2).toBeCloseTo(winderCore.depth)
  expect((winderCore.width - winderCore.turnSize) / 4).toBeCloseTo(.25)
  for (const rise of [2.74, 3]) {
    const steps = winderSteps(rise)
    expect(steps).toHaveLength(15)
    expect(steps.filter(step => step.id.startsWith('winder'))).toHaveLength(8)
    expect(steps.filter(step => step.id.startsWith('middle'))).toHaveLength(0)
    expect(steps.filter(step => step.id.startsWith('north'))).toHaveLength(4)
    expect(steps.filter(step => step.id.startsWith('south'))).toHaveLength(3)
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
    for (const tread of [winderCore.tread, (winderCore.turnSize - winderCore.runWidth / 2) * Math.PI / 8]) {
      expect(2 * rise / winderCore.risers + tread).toBeGreaterThan(.59)
      expect(2 * rise / winderCore.risers + tread).toBeLessThan(.65)
    }
    for (let index = 1; index < steps.length; index++) {
      expect(steps[index].inner[0][0]).toBeCloseTo(steps[index - 1].inner[1][0])
      expect(steps[index].inner[0][1]).toBeCloseTo(steps[index - 1].inner[1][1])
    }
  }
})