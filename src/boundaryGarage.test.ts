import { expect, it } from 'vitest'
import { boundaryDistance } from './context'
import { directNeighbors } from './directNeighbors'
import { neighbor8 } from './neighbor8'
import { boundaryAttachedPoint, placementPoint } from './neighborhoodLayout'

it('legt beide Garagenaussenwaende vollstaendig auf die Grenze und behaelt den Hausanschluss', () => {
  const west = directNeighbors.find(spec => spec.number === 12)!
  for (const { placement, rect, side, attachedX, outerX } of [
    { placement: neighbor8.placement, rect: neighbor8.garage, side: 1 as const, attachedX: 3.2, outerX: 0 },
    { placement: west.placement, rect: west.annex, side: 3 as const, attachedX: west.annex.x, outerX: west.annex.x + west.annex.width },
  ]) {
    for (const fraction of [0, .25, .5, .75, 1]) {
      const south = rect.z + rect.depth * fraction
      const outer = boundaryAttachedPoint(placement, attachedX, outerX, side, outerX, south)
      expect(boundaryDistance(placementPoint(placement, ...outer), side)).toBeCloseTo(0, 9)
      const attached = boundaryAttachedPoint(placement, attachedX, outerX, side, attachedX, south)
      expect(attached).toEqual([attachedX, south])
      expect(boundaryDistance(placementPoint(placement, ...attached), side)).toBeLessThan(0)
    }
  }
})