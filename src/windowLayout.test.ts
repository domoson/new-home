import { describe, expect, it } from 'vitest'
import { floorIds, makeFloor, type Opening } from './model'
import { windowMullionStart, windowPanels } from './windowLayout'

describe('Fensterteilungen', () => {
  it('keeps one uninterrupted fixed pane beside a narrow upper ventilation leaf', () => {
    const panels = windowPanels({ id: 'design-window', kind: 'window', start: 0, width: 1.5, height: 2.4, sill: 0, windowLayout: { columns: 2, ventilationWidth: .6, lowerFixed: .9 } })
    expect(panels).toHaveLength(3)
    expect(panels[0]).toMatchObject({ column: 0, fixed: true, bottom: .05 })
    expect(panels[0].height).toBeCloseTo(2.3)
    const leaf = panels.find(panel => !panel.fixed)!
    expect(leaf).toMatchObject({ column: 1, hinge: 'end' })
    expect(leaf.start).toBeCloseTo(.93)
    expect(leaf.width).toBeCloseTo(.52)
    expect(leaf.bottom).toBeCloseTo(.93)
    expect(panels[2]).toMatchObject({ column: 1, fixed: true, bottom: .05 })
    expect(panels[2].height).toBeCloseTo(.82)
  })
  it('mirrors unequal divisions and retains legacy equal opening leaves', () => {
    const opening: Opening = { id: 'test', kind: 'window', start: 0, width: 1.5, sill: 0, height: 2.4, windowLayout: { columns: 2, lowerFixed: .9, ventilationWidth: .6 } }
    const original = windowPanels(opening)
    const mirrored = { ...opening, windowLayout: { ...opening.windowLayout!, ventilationSide: 'start' as const } }
    for (const panel of original) {
      const counterpart = windowPanels(mirrored).find(other => other.column === 1 - panel.column && other.bottom === panel.bottom)!
      expect(counterpart.fixed).toBe(panel.fixed)
      expect(counterpart.width).toBeCloseTo(panel.width)
      expect(counterpart.start).toBeCloseTo(opening.width - panel.start - panel.width)
    }
    expect(windowMullionStart(mirrored)).toBeCloseTo(.57)
    const legacy = windowPanels({ ...opening, windowLayout: { columns: 2, lowerFixed: .7 } })
    expect(legacy.filter(panel => !panel.fixed).map(panel => panel.hinge)).toEqual(['start', 'end'])
    expect(legacy.filter(panel => panel.fixed)).toHaveLength(2)
  })

  it('keeps all current panels within their apertures with one operable leaf per window', () => {
    for (const floor of floorIds) for (const wall of makeFloor(floor).walls) for (const opening of wall.openings.filter(opening => opening.kind === 'window')) {
      const panels = windowPanels(opening)
      expect(panels.filter(panel => !panel.fixed)).toHaveLength(opening.id.includes('fixed') ? 0 : 1)
      if (opening.sill === 0 && !opening.id.includes('fixed')) {
        expect(opening.windowLayout?.lowerFixed).toBeGreaterThan(0)
        expect(panels.some(panel => panel.fixed && panel.bottom === .05)).toBe(true)
      }
      for (const panel of panels) {
        expect(panel.width).toBeGreaterThan(0)
        expect(panel.height).toBeGreaterThan(0)
        expect(panel.start + panel.width).toBeLessThan(opening.width)
        expect(panel.bottom + panel.height).toBeLessThan(opening.height)
      }
      if (opening.width >= 1.5 && !opening.id.includes('fixed')) expect(opening.windowLayout?.ventilationWidth).toBe(.6)
    }
  })
})