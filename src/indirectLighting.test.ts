import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createIndirectLighting } from './indirectLighting'

test('Reflektiertes Licht bleibt auf eingeschaltete Raeume und das aktive Geschoss begrenzt', () => {
  const model = createIndirectLighting(['EG', 'OG'], [])
  model.update({ 'EG-living': true, 'OG-bath': true }, 'EG')
  const strengthAt = (point: THREE.Vector3) => Math.max(0, ...model.volumes.map((volume, index) => new THREE.Box3(volume.min, volume.max).containsPoint(point) ? model.uniforms.bounceStrength.value[index] : 0))
  expect(strengthAt(new THREE.Vector3(5, 2.65, 7))).toBeGreaterThan(.3)
  expect(strengthAt(new THREE.Vector3(1, 1, 1))).toBe(0)
  expect(strengthAt(new THREE.Vector3(-5, 1, 7))).toBe(0)
  expect(strengthAt(new THREE.Vector3(1, 4, 1))).toBe(0)
  model.update({ 'EG-living': false }, 'EG')
  expect(strengthAt(new THREE.Vector3(5, 2.65, 7))).toBe(0)
})