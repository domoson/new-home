import { describe, expect, it } from 'vitest'
import { construction, floorIds, makeFloor } from './model'

describe('Aussenfenster im Steinraster', () => {
  it('ordnet Fensterbreiten und Abstaende zu den Wandenden auf 30 cm ein', () => {
    const module = construction.exteriorWall

    for (const floorId of floorIds) {
      const walls = makeFloor(floorId).walls.filter(wall => ['west', 'east', 'north', 'south'].includes(wall.id))

      for (const wall of walls) {
        const length = wall.axis === 'x' ? wall.width : wall.depth
        const thickness = wall.axis === 'x' ? wall.depth : wall.width
        expect(thickness, `${floorId}/${wall.id} wall thickness`).toBeCloseTo(module)

        for (const opening of wall.openings) {
          expect(opening.start, `${floorId}/${wall.id}/${opening.id} start`).toBeGreaterThanOrEqual(0)
          expect(opening.start + opening.width, `${floorId}/${wall.id}/${opening.id} end`).toBeLessThanOrEqual(length + 1e-6)
          if (opening.kind !== 'window') continue

          for (const [edge, value] of [
            ['start', opening.start],
            ['width', opening.width],
            ['end clearance', length - opening.start - opening.width],
          ] as const) {
            expect(value / module, `${floorId}/${wall.id}/${opening.id} ${edge}`).toBeCloseTo(Math.round(value / module), 6)
          }
          expect(opening.start, `${floorId}/${wall.id}/${opening.id} corner clearance`).toBeGreaterThanOrEqual(module - 1e-6)
          expect(length - opening.start - opening.width, `${floorId}/${wall.id}/${opening.id} far corner clearance`).toBeGreaterThanOrEqual(module - 1e-6)
        }
      }
    }
  })
})