import { describe, expect, it } from 'vitest'
import { elevations, house, makeFloor, roofHeight, slabThickness } from './model'
import { timberGeometry, timberPieces, timberProfiles } from './timberCladding'

describe('3D timber facade', () => {
  for (const profile of Object.keys(timberProfiles) as (keyof typeof timberProfiles)[]) it(`${profile}: real depth, upper floors only, openings and gable preserved`, () => {
    const pieces = timberPieces(['EG', 'OG', 'DG'], 'upper', profile)
    expect(pieces.length).toBeGreaterThan(200)
    expect(pieces.some(piece => piece.kind === 'backing')).toBe(true)
    for (const piece of pieces) {
      expect(piece.face).not.toBe('west')
      for (const [along, height] of piece.polygon) {
        expect(height).toBeGreaterThanOrEqual(elevations.OG - slabThickness('OG') - 1e-7)
        if (piece.face === 'east') expect(height).toBeLessThanOrEqual(elevations.DG + roofHeight(along) + 1e-7)
      }
      if (piece.kind !== 'board' && piece.kind !== 'batten') continue
      for (const id of ['OG', 'DG'] as const) {
        const wall = makeFloor(id).walls.find(wall => wall.id === piece.face)!
        const offset = piece.face === 'east' ? wall.z : wall.x
        for (const opening of wall.openings) {
          const left = offset + opening.start, right = left + opening.width
          const bottom = elevations[id] + opening.sill, top = bottom + opening.height
          const along = piece.polygon.reduce((sum, point) => sum + point[0], 0) / piece.polygon.length
          const height = piece.polygon.reduce((sum, point) => sum + point[1], 0) / piece.polygon.length
          expect(along > left && along < right && height > bottom && height < top).toBe(false)
        }
      }
      const geometry = timberGeometry(piece)
      geometry.computeBoundingBox()
      const size = geometry.boundingBox!
      expect(piece.face === 'east' ? size.max.x - size.min.x : size.max.z - size.min.z).toBeGreaterThan(.006)
      expect(Array.from(geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true)
      geometry.dispose()
    }
    expect(pieces.some(piece => piece.polygon.some(point => point[1] > elevations.DG + house.knee + 1))).toBe(true)
  })
  it('plaster has no added geometry; screens remain optional and limited', () => {
    expect(timberPieces(['EG', 'OG', 'DG'], 'plaster', 'boards')).toEqual([])
    expect(timberPieces(['OG'], 'upper', 'slats').some(piece => piece.kind === 'screen')).toBe(false)
    const screens = timberPieces(['OG'], 'upper', 'slats', false, 'east', 'screen').filter(piece => piece.kind === 'screen')
    expect(screens.length).toBeGreaterThan(0)
    expect(screens.every(piece => piece.face === 'east' && piece.back > .1)).toBe(true)
  })
})