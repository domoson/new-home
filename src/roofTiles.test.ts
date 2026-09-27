import { expect, it } from 'vitest'
import { area, atticCeiling, house, makeFloor, roofHeight, roofPanels, roofVerticalThickness, roofWindows } from './model'
import { roofTileGeometry, roofTileSpacing, roofTileStrips } from './roofTiles'

it('fits two standard roof windows below the attic ceiling in the occupied north and south rooms', () => {
  expect(roofWindows).toHaveLength(2)
  const rooms = makeFloor('DG').rooms
  for (const [index, window] of roofWindows.entries()) {
    expect(window.width).toBe(.94)
    expect(window.x + window.width / 2).toBeCloseTo((house.west + house.east) / 2)
    expect(window.length).toBe(1.4)
    expect(window.depth).toBeCloseTo(1.4 * Math.cos(house.pitch * Math.PI / 180))
    expect(rooms.find(room => room.id === (index === 0 ? 'office' : 'bedroom'))!.parts.some(part => window.x >= part.x && window.x + window.width <= part.x + part.width && window.z >= part.z && window.z + window.depth <= part.z + part.depth)).toBe(true)
    for (const south of [window.z, window.z + window.depth]) {
      expect(roofHeight(south)).toBeGreaterThan(1.5)
      expect(roofHeight(south) + roofVerticalThickness + .055).toBeLessThan(atticCeiling.height - .1)
    }
    for (const panel of roofPanels()) {
      const overlap = Math.max(0, Math.min(panel.x + panel.width, window.x + window.width) - Math.max(panel.x, window.x)) * Math.max(0, Math.min(panel.z + panel.depth, window.z + window.depth) - Math.max(panel.z, window.z))
      expect(overlap).toBeLessThan(1e-8)
    }
  }
  expect(area(roofPanels()) + area(roofWindows)).toBeCloseTo((house.width + .35) * (house.depth + .5))
  expect(roofPanels([])).toHaveLength(2)
  expect(area(roofPanels([]))).toBeCloseTo((house.width + .35) * (house.depth + .5))
})

it('clips continuous tile courses to roof panels and leaves every skylight clear', () => {
  const panels = roofPanels(), strips = roofTileStrips(panels)
  expect(roofTileSpacing / Math.cos(35 * Math.PI / 180)).toBeCloseTo(.32)
  expect(strips.some(strip => strip.z < 5)).toBe(true)
  expect(strips.some(strip => strip.z > 5)).toBe(true)
  for (const strip of strips) {
    expect(panels.some(panel => strip.x >= panel.x && strip.x + strip.width <= panel.x + panel.width + 1e-8 && strip.z >= panel.z && strip.z + strip.depth <= panel.z + panel.depth + 1e-8)).toBe(true)
    for (const window of roofWindows) {
      const overlap = Math.max(0, Math.min(strip.x + strip.width, window.x + window.width) - Math.max(strip.x, window.x)) * Math.max(0, Math.min(strip.z + strip.depth, window.z + window.depth) - Math.max(strip.z, window.z))
      expect(overlap).toBeLessThan(1e-8)
    }
  }
  const geometry = roofTileGeometry(panels, south => 9 - Math.abs(south - 5) * Math.tan(35 * Math.PI / 180), .3)
  expect(geometry.getAttribute('position').count).toBe(strips.length * 36)
  expect([...geometry.getAttribute('normal').array].every(Number.isFinite)).toBe(true)
  geometry.dispose()
})