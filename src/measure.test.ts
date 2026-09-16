import { expect, it } from 'vitest'
import { makeFloor } from './model'
import { contains, distance, planObjects, snapPoint } from './measure'

it('misst diagonal, rastet an Ecken und sperrt Achsen ohne Zoomabhaengigkeit', () => {
  expect(distance({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5)
  const bounds = [{ x: 1, z: 2, width: 3, depth: 4 }]
  expect(snapPoint({ x: 1.03, z: 2.01 }, bounds, .08)).toEqual({ x: 1, z: 2 })
  expect(snapPoint({ x: 4, z: 2.1 }, bounds, .08, { x: 1, z: 2 }, true)).toEqual({ x: 4, z: 2 })
})
it('bietet reale Masse fuer Moebel, Oeffnungen, Waende, Podeste und Aussenanlagen', () => {
  const objects = planObjects(makeFloor('EG'), true)
  expect(objects.findLast(object => contains(object, { x: 5.5, z: 4.9 }))?.label).toBe('Induktionskochfeld')
  expect(objects.findLast(object => contains(object, { x: 6.1, z: 3.4 }))?.label).toBe('Geschirrspüler')
  expect(objects.findLast(object => contains(object, { x: 5.6, z: 2.8 }))?.label).toBe('Siebträgermaschine')
  expect(objects.find(object => object.label === 'Hebeschiebetür')?.details).toContain('2,35 m')
  expect(objects.find(object => object.label === 'Holzterrasse')?.width).toBe(5)
  expect(objects.find(object => object.label === 'Terrassenrücklauf')?.width).toBe(.75)
  expect(objects.filter(object => object.label === 'Treppenpodest')).toHaveLength(0)
  expect(objects.filter(object => object.label === 'Treppenstufe')).toHaveLength(15)
  expect(objects.find(object => object.label === 'Treppenkern')).toMatchObject({ width: 2.1, depth: 2.2 })
  expect(planObjects(makeFloor('EG'), false).some(object => object.label === 'Sofa')).toBe(false)
  expect(planObjects(makeFloor('KG'), true).filter(object => object.label.startsWith('Lichtschacht')).every(object => object.width * object.depth === .5)).toBe(true)
})