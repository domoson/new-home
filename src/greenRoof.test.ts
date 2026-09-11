import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createGreenRoof } from './greenRoof'
import { carportRoof } from './parking'

test('green roof has bounded three-dimensional sedum, flowers, gravel and substrate following the roof pitch', () => {
  const materials: THREE.Material[] = []
  const roof = createGreenRoof(3.25, 6, materials)
  expect(roof.visible).toBe(false)
  for (const name of ['green-roof-substrate', 'green-roof-gravel-bed', 'green-roof-retaining-edge']) expect(roof.getObjectByName(name)).toBeDefined()
  for (const name of ['green-roof-sedum-leaves', 'green-roof-flowers', 'green-roof-pebbles']) {
    const mesh = roof.getObjectByName(name) as THREE.InstancedMesh
    expect(mesh.isInstancedMesh).toBe(true)
    expect(mesh.count).toBeGreaterThan(100)
    expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(12)
    expect(mesh.boundingBox!.min.x).toBeGreaterThan(0)
    expect(mesh.boundingBox!.max.x).toBeLessThan(3.25)
    expect(mesh.boundingBox!.min.z).toBeGreaterThan(0)
    expect(mesh.boundingBox!.max.z).toBeLessThan(6)
  }
  const north = roof.localToWorld(new THREE.Vector3(0, 0, 0)), south = roof.localToWorld(new THREE.Vector3(0, 0, 6))
  expect(north.y).toBeCloseTo(carportRoof.lowEdge + carportRoof.thickness)
  expect(south.y - north.y).toBeCloseTo(6 * Math.tan(carportRoof.pitch * Math.PI / 180))
  expect(materials.every(finish => (finish as THREE.MeshStandardMaterial).roughness === 1)).toBe(true)
  roof.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (object instanceof THREE.InstancedMesh) object.dispose() } })
  materials.forEach(finish => finish.dispose())
})