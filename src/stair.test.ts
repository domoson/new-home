import { expect, it } from 'vitest'
import { area, floorSlabs, roofHeight, stair, stairGuards, stairHandrails, stairInnerWall, stairSolids } from './model'
import { sectionSpan } from './section'
import { winderSteps } from './winderStair'

it('fuehrt den Handlauf aussen entlang aller Laeufe und Wendungen', () => {
  for (const rise of [2.45, 2.97]) {
    const rails = stairHandrails(rise), steps = winderSteps(rise)
    for (const [index, rail] of rails.entries()) {
      expect(rail.from[1]).toBeCloseTo(steps[index].height + .97)
      expect(rail.to[1]).toBeCloseTo(steps[index].height - rise / stair.risers + .97)
      for (const [east, , south] of [rail.from, rail.to]) {
        expect(Math.min(Math.abs(east - stair.x - .06), Math.abs(south - stair.z - .06), Math.abs(south - stair.end + .06))).toBeLessThan(1e-8)
        expect(east).toBeGreaterThanOrEqual(stair.x + .06 - 1e-8)
        expect(south).toBeGreaterThanOrEqual(stair.z + .06 - 1e-8)
        expect(south).toBeLessThanOrEqual(stair.end - .06 + 1e-8)
      }
      if (index) for (let axis = 0; axis < 3; axis++) expect(rail.to[axis]).toBeCloseTo(rails[index - 1].from[axis])
    }
    expect(rails.some(rail => Math.abs(rail.from[0] - stair.x - .06) < 1e-8 && Math.abs(rail.from[2] - stair.z - .06) < 1e-8)).toBe(true)
    expect(rails.some(rail => Math.abs(rail.from[0] - stair.x - .06) < 1e-8 && Math.abs(rail.from[2] - stair.end + .06) < 1e-8)).toBe(true)
  }
})

it('bildet eine kompakte U-Wendeltreppe ohne Podest', () => {
  expect(stair.width * stair.depth).toBeCloseTo(3.8)
  expect(stair.runWidth).toBe(.9)
  expect(stair.width * stair.depth).toBeLessThan(2.08 * 3.35)
  for (const rise of [2.74, 3]) {
    const solids = stairSolids(rise).sort((first, second) => first.bottom + first.height - second.bottom - second.height)
    expect(solids.filter(solid => solid.id.startsWith('north'))).toHaveLength(3)
    expect(solids.filter(solid => solid.id.startsWith('south'))).toHaveLength(3)
    expect(solids.filter(solid => solid.id.startsWith('middle'))).toHaveLength(0)
    const landing = solids.filter(solid => solid.id.startsWith('landing'))
    expect(landing).toHaveLength(0)
    expect(solids.filter(solid => solid.id.startsWith('winder'))).toHaveLength(8)
    expect(stairGuards(rise)).toHaveLength(1)
    expect(stairHandrails(rise)).toHaveLength(stair.risers - 1)
    const rails = stairHandrails(rise)
    for (let index = 1; index < rails.length; index++) for (let axis = 0; axis < 3; axis++) expect(rails[index].to[axis]).toBeCloseTo(rails[index - 1].from[axis])
    expect(area(solids) + area(stairInnerWall(rise))).toBeCloseTo(stair.width * stair.depth)
    for (const [index, solid] of solids.entries()) {
      expect(solid.bottom + solid.height).toBeCloseTo((index + 1) * rise / stair.risers)
      expect(solid.x).toBeGreaterThanOrEqual(stair.x - 1e-6)
      expect(solid.x + solid.width).toBeLessThanOrEqual(stair.x + stair.width + 1e-6)
      expect(solid.z).toBeGreaterThanOrEqual(stair.z - 1e-6)
      expect(solid.z + solid.depth).toBeLessThanOrEqual(stair.end + 1e-6)
      if (!solid.id.startsWith('winder')) expect(solid.depth).toBeCloseTo(.9)
      expect(Math.min(roofHeight(solid.z), roofHeight(solid.z + solid.depth)) + rise - solid.bottom - solid.height).toBeGreaterThan(2)
      for (const other of [...solids.slice(index + 1), ...floorSlabs('OG')]) {
        for (let sample = 0; sample < 60; sample++) {
          const position = stair.x + (sample + .5) * stair.width / 60
          const first = sectionSpan(solid, 'NS', position), second = sectionSpan(other, 'NS', position)
          if (first && second) expect(Math.min(first[1], second[1]) - Math.max(first[0], second[0])).toBeLessThan(1e-6)
        }
      }
    }
  }
})

it('setzt eine einzige rechteckige Treppenmittelwand mit geraden Stufenanschluessen', () => {
  for (const rise of [2.45, 2.97]) {
    const walls = stairInnerWall(rise)
    expect(walls).toHaveLength(1)
    const wall = walls[0]
    expect(wall.kind).toBe('wall')
    expect(wall.bottom).toBe(0)
    expect(wall.height).toBe(rise)
    expect(wall.x).toBeCloseTo(1.2)
    expect(wall.width).toBeCloseTo(1)
    expect(wall.depth).toBeCloseTo(.2)
    expect(wall.z).toBeCloseTo(stair.z + stair.runWidth)
    expect(wall.footprint).toBeUndefined()
    const guards = stairGuards(rise)
    expect(guards).toHaveLength(1)
    expect(guards[0]).toMatchObject({ x: wall.x, z: wall.z, width: wall.width, depth: wall.depth, bottom: rise, height: 1 })
    for (const solid of stairSolids(rise)) {
      for (let sample = 0; sample < 60; sample++) {
        const position = wall.x + (sample + .5) * wall.width / 60
        const stepSpan = sectionSpan(solid, 'NS', position), wallSpan = sectionSpan(wall, 'NS', position)!
        if (stepSpan) expect(Math.min(stepSpan[1], wallSpan[1]) - Math.max(stepSpan[0], wallSpan[0])).toBeLessThan(1e-8)
      }
      if (solid.id.startsWith('winder')) {
        for (const point of [solid.footprint![0], solid.footprint!.at(-1)!]) expect(Math.min(Math.abs(point[0] - wall.x), Math.abs(point[1] - wall.z), Math.abs(point[1] - wall.z - wall.depth))).toBeLessThan(1e-8)
      }
    }
  }
})