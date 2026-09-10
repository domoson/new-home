import * as THREE from 'three'

export function flatGeometry(vertices: Float32Array, indices: Uint32Array) {
  const indexed = new THREE.BufferGeometry()
  indexed.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  indexed.setIndex(new THREE.BufferAttribute(indices, 1))
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  return geometry
}