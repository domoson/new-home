import { expect, it } from 'vitest'
import { roofPanels, roofWindows } from './model'
import { roofTileGeometry, roofTileSpacing, roofTileStrips } from './roofTiles'

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