import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createContextTree } from './contextTree'

test('context trees have reproducible, varied crowns and a bounded geometry budget', () => {
  const trunk = new THREE.MeshStandardMaterial(), foliage = new THREE.MeshStandardMaterial({ color: '#72856b' })
  const tree = createContextTree(6, 2, trunk, foliage, 7401)
  const same = createContextTree(6, 2, trunk, foliage, 7401)
  const different = createContextTree(6, 2, trunk, foliage, 8103)
  const canopy = tree.getObjectByName('context-tree-foliage') as THREE.InstancedMesh
  expect(tree.children).toHaveLength(2)
  expect(canopy.count).toBe(56)
  expect(canopy.geometry.getAttribute('position').count * canopy.count).toBeLessThan(60000)
  expect(canopy.instanceMatrix.array).toEqual((same.children[1] as THREE.InstancedMesh).instanceMatrix.array)
  expect(canopy.instanceMatrix.array).not.toEqual((different.children[1] as THREE.InstancedMesh).instanceMatrix.array)
  expect(new Set(canopy.instanceColor!.array).size).toBeGreaterThan(50)
  const bounds = new THREE.Box3().setFromObject(tree)
  expect(Math.abs(bounds.min.y)).toBeLessThan(.02)
  expect(bounds.max.y).toBeGreaterThan(5.5)
  expect(bounds.max.y).toBeLessThan(6.5)
  expect(Math.max(Math.abs(bounds.min.x), bounds.max.x, Math.abs(bounds.min.z), bounds.max.z)).toBeLessThan(2.2)
})