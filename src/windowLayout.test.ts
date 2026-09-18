import { describe, expect, it } from 'vitest'
import { floorIds, makeFloor } from './model'
import { windowPanels } from './windowLayout'

describe('Fensterteilungen', () => {
  it('splits broad windows into two leaves and tall windows above fixed lower glazing', () => {
    for (const floor of floorIds) for (const wall of makeFloor(floor).walls) for (const opening of wall.openings.filter(opening => opening.kind === 'window')) {
      const panels = windowPanels(opening)
      expect(panels.filter(panel => !panel.fixed)).toHaveLength(opening.id.includes('fixed') ? 0 : opening.width >= 1.5 ? 2 : 1)
      if (opening.sill === 0 && !opening.id.includes('fixed')) {
        expect(opening.windowLayout?.lowerFixed).toBe(.7)
        expect(panels.some(panel => panel.fixed && panel.bottom === .05)).toBe(true)
      }
      for (const panel of panels) {
        expect(panel.width).toBeGreaterThan(0)
        expect(panel.height).toBeGreaterThan(0)
        expect(panel.start + panel.width).toBeLessThan(opening.width)
        expect(panel.bottom + panel.height).toBeLessThan(opening.height)
      }
      if (opening.width >= 1.5 && !opening.id.includes('fixed')) expect(panels.filter(panel => !panel.fixed).map(panel => panel.hinge)).toEqual(['start', 'end'])
    }
  })
})