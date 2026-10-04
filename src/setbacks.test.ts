import { expect, it } from 'vitest'
import { currentSetbackParameters, houseSetbacks } from './setbacks'
import { construction, house, houseEnvelope, housePlacement, ridgeElevations, roofOuterElevation } from './model'
import { partner, siteHouseEnvelope } from './context'

it('berechnet Traufe mit Dachdrittel und Giebel mit voller lokaler Wandhoehe', () => {
  const result = houseSetbacks('east')
  const envelope = houseEnvelope(), eaves = roofOuterElevation(envelope.z)
  expect(result.eaves).toBeCloseTo(eaves)
  expect(result.ridge).toBeCloseTo(ridgeElevations.outside)
  expect(result.faces[0].maximum).toBeCloseTo(Math.max(3, .4 * (eaves - construction.terrain + (ridgeElevations.outside - eaves) / 3)))
  const gable = result.faces.find(face => face.id === 'gable')!
  expect(gable.minimum).toBe(3)
  expect(gable.maximum).toBeCloseTo(.4 * (ridgeElevations.outside - construction.terrain))
  expect(gable.outer).toHaveLength(5)
  expect(gable.outer[2][0]).toBeCloseTo(envelope.width + gable.maximum)
  expect(gable.outer[2][1]).toBeCloseTo(house.depth / 2 + housePlacement.z)
  expect(result.sharedWall[0][1]).toBeCloseTo(siteHouseEnvelope().z + partner.z)
  expect(result.sharedWall[1][1]).toBeCloseTo(siteHouseEnvelope().z + envelope.depth)
  expect(result.faces.find(face => face.id === 'return-north')!.wall.at(-1)![1]).toBeCloseTo(siteHouseEnvelope().z + partner.z)
})

it('spiegelt Westhaus und beruecksichtigt dessen freies suedliches Wandstueck', () => {
  const east = houseSetbacks('east'), west = houseSetbacks('west')
  east.faces.slice(0, 3).forEach((face, index) => face.points.forEach(([east, south], point) => {
    expect(west.faces[index].points[point][0]).toBeCloseTo(-east)
    expect(west.faces[index].points[point][1]).toBeCloseTo(south + partner.z)
  }))
  const returning = west.faces.find(face => face.id === 'return-south')!.wall
  expect(returning[0][1]).toBeCloseTo(siteHouseEnvelope().z + houseEnvelope().depth)
  expect(returning.at(-1)![1]).toBeCloseTo(siteHouseEnvelope().z + houseEnvelope().depth + partner.z)
  expect(returning.every(point => Math.abs(point[0]) < 1e-8)).toBe(true)
})

it('reagiert auf Masse, Geschosshoehe, Dachneigung, Gelaende und Versatz', () => {
  const parameters = currentSetbackParameters(), original = houseSetbacks('east', parameters)
  const higher = houseSetbacks('east', { ...parameters, attic: parameters.attic + 1 })
  expect(higher.faces[0].maximum - original.faces[0].maximum).toBeCloseTo(.4)
  expect(higher.faces[2].maximum - original.faces[2].maximum).toBeCloseTo(.4)
  const lowerGround = houseSetbacks('east', { ...parameters, terrain: parameters.terrain - 1 })
  expect(lowerGround.faces[2].maximum).toBeCloseTo(higher.faces[2].maximum)
  const larger = houseSetbacks('east', { ...parameters, width: 9, depth: 12 })
  expect(larger.faces[2].wall).toContainEqual([9, 6 + parameters.north!])
  expect(larger.faces[2].maximum).toBeGreaterThan(original.faces[2].maximum)
  expect(houseSetbacks('east', { ...parameters, partnerOffset: 0 }).faces).toHaveLength(3)
  expect(houseSetbacks('east', { ...parameters, partnerOffset: 12 }).faces).toHaveLength(4)
  expect(houseSetbacks('east', { ...parameters, attic: 0, pitch: 0 }).faces.every(face => face.maximum === 3)).toBe(true)
  const steep = houseSetbacks('east', { ...parameters, pitch: 71 })
  expect(steep.faces[0].maximum).toBeCloseTo(.4 * (steep.ridge - steep.terrain))
})