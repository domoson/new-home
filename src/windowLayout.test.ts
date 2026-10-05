import { describe, expect, it } from 'vitest'
import { floorIds, makeFloor, type Opening } from './model'
import { windowMullionStart, windowPanels } from './windowLayout'

describe('Fensterteilungen', () => {
  it('moves the OG bathroom window another 30 cm east and extends its bottom to 100 cm height while keeping south EG glazing fixed', () => {
    for (const side of ['east', 'west'] as const) {
      const north = makeFloor('OG', side).walls.find(wall => wall.id === 'north')!
      const bath = north.openings.find(opening => opening.id === 'bath-window')!
      expect(north.x + bath.start).toBeCloseTo(.9 + .3)
      expect(north.x + bath.start + bath.width).toBeCloseTo(3)
      expect(bath).toMatchObject({ width: 1.8, sill: 1.5, height: 1 })
      expect(bath.sill).toBeCloseTo(1.75 - .25)
      expect(bath.sill + bath.height).toBeCloseTo(2.5)
      expect(windowPanels(bath).filter(panel => !panel.fixed)).toHaveLength(1)
      const south = makeFloor('EG', side).walls.find(wall => wall.id === 'south')!
      const fixed = south.openings.find(opening => opening.id === 'garden-west-fixed')!
      expect(south.x + fixed.start).toBeCloseTo(1.2)
      expect(fixed).toMatchObject({ width: 1.2, sill: 0, height: 2.5, windowLayout: { columns: 1 } })
      expect(fixed.windowLayout?.lowerFixed).toBeUndefined()
      expect(windowPanels(fixed)).toHaveLength(1)
      expect(windowPanels(fixed)[0]).toMatchObject({ fixed: true, bottom: .05 })
      expect(windowPanels(fixed)[0].height).toBeCloseTo(2.4)
      const upperSouth = makeFloor('OG', side).walls.find(wall => wall.id === 'south')!.openings.find(opening => opening.id === 'south-west')!
      expect(windowPanels(upperSouth).filter(panel => !panel.fixed)).toHaveLength(1)
      expect(upperSouth.windowLayout?.lowerFixed).toBe(.9)
    }
  })
  it('keeps the hall fixed window 50 cm high and moves it 60 cm west', () => {
    for (const side of ['east', 'west'] as const) {
      const north = makeFloor('EG', side).walls.find(wall => wall.id === 'north')!
      const hall = north.openings.find(opening => opening.id === 'hall-window-fixed')!
      expect(hall).toMatchObject({ start: 3.6, width: 1.8, sill: 2, height: .5, windowLayout: { columns: 1 } })
      expect(hall.sill).toBeCloseTo(1.875 + .125)
      expect(hall.sill + hall.height).toBeCloseTo(2.5)
      expect(hall.windowLayout?.ventilationWidth).toBeUndefined()
      expect(north.x + hall.start).toBeCloseTo(4.5 - .6)
      expect(north.x + hall.start + hall.width).toBeCloseTo(5.7)
      expect(windowPanels(hall)).toHaveLength(1)
      expect(windowPanels(hall)[0]).toMatchObject({ fixed: true, start: .05, bottom: .05 })
      expect(windowPanels(hall)[0].width).toBeCloseTo(1.7)
      expect(windowPanels(hall)[0].height).toBeCloseTo(.4)
    }
  })
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