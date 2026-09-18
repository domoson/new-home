import { describe, expect, it } from 'vitest'
import { floorIds, makeFloor } from './model'
import { windowPanels } from './windowLayout'

describe('Fensterteilungen', () => {
  it('places an operable east window in the ground-floor shower room above the service wall', () => {
    const floor = makeFloor('EG')
    const east = floor.walls.find(wall => wall.id === 'east')!
    const window = east.openings.find(opening => opening.id === 'wc-window')!
    const service = floor.walls.find(wall => wall.id === 'wc-installation-east')!
    expect(window).toMatchObject({ kind: 'window', width: .8, height: 1.05, sill: 1.3, windowLayout: { columns: 1 } })
    expect(east.z + window.start).toBeGreaterThan(service.z)
    expect(east.z + window.start + window.width).toBeLessThan(service.z + service.depth)
    expect(window.sill).toBeGreaterThan(service.height!)
    expect(window.sill + window.height).toBeLessThan(floor.height)
    expect(windowPanels(window).filter(panel => !panel.fixed)).toHaveLength(1)
  })

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