import { expect, it } from 'vitest'
import * as THREE from 'three'
import { createSeatLeon, seatLeonDimensions } from './seatLeon'

it('models the supplied estate dimensions, axle spacing and four wheels', () => {
  const materials: THREE.Material[] = [], car = createSeatLeon(materials)
  const bounds = new THREE.Box3().setFromObject(car), size = bounds.getSize(new THREE.Vector3())
  expect(size.x).toBeCloseTo(seatLeonDimensions.mirrorWidth, 5)
  expect(size.y).toBeCloseTo(seatLeonDimensions.height, 5)
  expect(size.z).toBeCloseTo(seatLeonDimensions.length, 5)
  const body = new THREE.Box3().setFromObject(car.getObjectByName('leon-body')!)
  expect(body.max.x - body.min.x).toBeCloseTo(seatLeonDimensions.bodyWidth, 5)
  const tires = car.children.filter(part => part.name === 'leon-tire')
  expect(tires).toHaveLength(4)
  const axles = [...new Set(tires.map(tire => tire.position.z))].sort((first, second) => first - second)
  expect(axles[1] - axles[0]).toBeCloseTo(seatLeonDimensions.wheelbase)
  expect(bounds.max.z - axles[1]).toBeCloseTo(.888)
  expect(axles[0] - bounds.min.z).toBeCloseTo(1.068)
  expect(car.children.filter(part => part.name === 'leon-side-windows')).toHaveLength(2)
  car.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
  materials.forEach(material => material.dispose())
})