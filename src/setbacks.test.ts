import { expect, it } from 'vitest'
import { currentSetbackParameters, houseSetbacks } from './setbacks'

it('berechnet Traufe mit Dachdrittel und Giebel mit voller lokaler Wandhoehe', () => {
  const result = houseSetbacks('east')
  expect(result.faces[0].maximum).toBeCloseTo(3.220615)
  const gable = result.faces.find(face => face.id === 'gable')!
  expect(gable.minimum).toBe(3)
  expect(gable.maximum).toBeCloseTo(4.172892)
  expect(gable.outer).toHaveLength(5)
  expect(gable.outer[2]).toEqual([7 + gable.maximum, 5])
  expect(result.sharedWall).toEqual([[0, 1.2], [0, 10]])
  expect(result.faces.find(face => face.id === 'return-north')!.wall.at(-1)).toEqual([0, 1.2])
})

it('spiegelt Westhaus und beruecksichtigt dessen freies suedliches Wandstueck', () => {
  const east = houseSetbacks('east'), west = houseSetbacks('west')
  east.faces.slice(0, 3).forEach((face, index) => face.points.forEach(([east, south], point) => {
    expect(west.faces[index].points[point][0]).toBeCloseTo(-east)
    expect(west.faces[index].points[point][1]).toBeCloseTo(south + 1.2)
  }))
  const returning = west.faces.find(face => face.id === 'return-south')!.wall
  expect(returning[0][1]).toBeCloseTo(10)
  expect(returning.at(-1)![1]).toBeCloseTo(11.2)
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
  expect(larger.faces[2].wall).toContainEqual([9, 6])
  expect(larger.faces[2].maximum).toBeGreaterThan(original.faces[2].maximum)
  expect(houseSetbacks('east', { ...parameters, partnerOffset: 0 }).faces).toHaveLength(3)
  expect(houseSetbacks('east', { ...parameters, partnerOffset: 12 }).faces).toHaveLength(4)
  expect(houseSetbacks('east', { ...parameters, attic: 0, pitch: 0 }).faces.every(face => face.maximum === 3)).toBe(true)
  const steep = houseSetbacks('east', { ...parameters, pitch: 71 })
  expect(steep.faces[0].maximum).toBeCloseTo(.4 * (steep.ridge - steep.terrain))
})