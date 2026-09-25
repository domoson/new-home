import { describe, expect, it } from 'vitest'
import { floorIds, makeFloor, rect } from './model'
import type { Wall } from './model'
import { openingDimensions } from './openingDimensions'

describe('opening dimension chain', () => {
  it('sorts openings and includes both corners and every pier', () => {
    const wall: Wall = { ...rect(0, 0, 5, .3), id: 'north', axis: 'x', openings: [
      { id: 'door', start: 3, width: 1, height: 2.1, sill: 0, kind: 'door' },
      { id: 'window', start: .5, width: 1.5, height: 1.2, sill: .9, kind: 'window' },
    ] }
    expect(openingDimensions(wall)).toEqual([
      { start: 0, end: .5, kind: 'pier' },
      { start: .5, end: 2, kind: 'opening', height: 1.2 },
      { start: 2, end: 3, kind: 'pier' },
      { start: 3, end: 4, kind: 'opening', height: 2.1 },
      { start: 4, end: 5, kind: 'pier' },
    ])
  })

  it('covers every exterior wall without gaps on all floors', () => {
    for (const floorId of floorIds) for (const wall of makeFloor(floorId).walls.filter(wall => ['north', 'east', 'south', 'west'].includes(wall.id))) {
      const segments = openingDimensions(wall)
      const length = wall.axis === 'x' ? wall.width : wall.depth
      expect(segments[0].start).toBe(0)
      expect(segments.at(-1)!.end).toBeCloseTo(length)
      expect(segments.reduce((sum, segment) => sum + segment.end - segment.start, 0)).toBeCloseTo(length)
      for (let index = 1; index < segments.length; index++) expect(segments[index].start).toBeCloseTo(segments[index - 1].end)
    }
  })
})