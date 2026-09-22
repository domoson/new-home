import { expect, it } from 'vitest'
import { house, rect, roofPanels, roofWindows, stairHandrails, stairSolids } from './model'
import { sectionSpan } from './section'
it('schneidet nur Bauteile auf der gewaehlten Achse', () => {
  expect(sectionSpan(rect(2, 3, 1, 4), 'NS', 2.5)).toEqual([3, 7])
  expect(sectionSpan(rect(2, 3, 1, 4), 'EW', 4)).toEqual([2, 3])
  expect(sectionSpan(rect(2, 3, 1, 4), 'NS', 3)).toBeNull()
})
it('leitet die Dachfläche aus der aktuellen Hülle ab und spart vorhandene Dachfenster aus', () => {
  for (const opening of roofWindows) for (const panel of roofPanels()) {
    const overlap = Math.max(0, Math.min(panel.x + panel.width, opening.x + opening.width) - Math.max(panel.x, opening.x)) * Math.max(0, Math.min(panel.z + panel.depth, opening.z + opening.depth) - Math.max(panel.z, opening.z))
    expect(overlap).toBeLessThan(.000001)
  }
  expect(roofPanels().reduce((area, panel) => area + panel.width * panel.depth, 0)).toBeCloseTo((house.width + .35) * (house.depth + .5) - roofWindows.reduce((area, window) => area + window.width * window.depth, 0))
})
it('haelt Handlaeufe aus beiden Podest-Laufflaechen heraus', () => {
  const landings = stairSolids(2.95).filter(solid => solid.id.startsWith('landing'))
  for (const rail of stairHandrails(2.95)) for (const point of [rail.from, rail.to]) for (const landing of landings) expect(point[0] > landing.x + .001 && point[0] < landing.x + landing.width - .001 && point[2] > landing.z + .001 && point[2] < landing.z + landing.depth - .001).toBe(false)
})