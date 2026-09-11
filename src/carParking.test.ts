import * as THREE from 'three'
import { expect, it } from 'vitest'
import { createCarParking } from './carParking'

it('toggles by child hits, reverses without jumps and stops exactly at each endpoint', () => {
  const car = new THREE.Group(), child = new THREE.Group(); car.add(child); car.position.set(1.625, -.1, 3); car.rotation.y = Math.PI
  const parking = createCarParking(car, 13)
  expect(parking.activate(new THREE.Group())).toBe(false)
  expect(parking.update(.1)).toBe(false)
  expect(parking.activate(child)).toBe(true)
  for (let frame = 0; frame < 120; frame++) parking.update(1 / 60)
  const halfway = car.position.z
  expect(halfway).toBeGreaterThan(3); expect(halfway).toBeLessThan(13)
  parking.activate(child); expect(car.position.z).toBe(halfway)
  for (let frame = 0; frame < 600; frame++) parking.update(1 / 60)
  expect(car.position.z).toBe(3); expect(parking.update(.1)).toBe(false)
  parking.activate(child)
  for (let frame = 0; frame < 600; frame++) parking.update(1 / 60)
  expect(car.position.z).toBe(13); expect(parking.update(.1)).toBe(false)
  parking.activate(child); expect(parking.update(0, true)).toBe(true)
  expect(car.position.toArray()).toEqual([1.625, -.1, 3]); expect(car.rotation.y).toBe(Math.PI)
})