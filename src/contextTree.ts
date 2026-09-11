import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

export function createContextTree(height: number, radius: number, trunk: THREE.Material, foliage: THREE.MeshStandardMaterial, seed: number) {
  const tree = new THREE.Group()
  tree.name = 'context-tree'
  let state = Math.max(1, Math.abs(Math.floor(seed)) % 2147483647)
  const random = () => { state = state * 16807 % 2147483647; return state / 2147483647 }
  const transform = new THREE.Object3D()
  const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 7), trunk, 8)
  branches.name = 'context-tree-branches'
  const branch = (index: number, start: THREE.Vector3, end: THREE.Vector3, thickness: number) => {
    const direction = end.clone().sub(start)
    transform.position.copy(start).add(end).multiplyScalar(.5)
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
    transform.scale.set(thickness, direction.length(), thickness)
    transform.updateMatrix()
    branches.setMatrixAt(index, transform.matrix)
  }
  const branchPositions = branches.geometry.getAttribute('position')
  for (let index = 0; index < branchPositions.count; index++) {
    const taper = branchPositions.getY(index) > 0 ? .48 : 1
    branchPositions.setXYZ(index, branchPositions.getX(index) * taper, branchPositions.getY(index), branchPositions.getZ(index) * taper)
  }
  branches.geometry.computeVertexNormals()
  branch(0, new THREE.Vector3(), new THREE.Vector3(radius * .08, height * .74, 0), Math.max(.065, radius * .075))
  const source = new THREE.IcosahedronGeometry(1, 2), crownGeometry = mergeVertices(source)
  source.dispose()
  const canopy = new THREE.InstancedMesh(crownGeometry, foliage, 56)
  canopy.name = 'context-tree-foliage'
  const positions = canopy.geometry.getAttribute('position')
  for (let index = 0; index < positions.count; index++) {
    const east = positions.getX(index), up = positions.getY(index), south = positions.getZ(index)
    const irregularity = 1 + .09 * Math.sin(east * 13 + south * 7) * Math.cos(up * 11 - east * 5)
    positions.setXYZ(index, east * irregularity, up * irregularity, south * irregularity)
  }
  canopy.geometry.computeVertexNormals()
  for (let limb = 0; limb < 7; limb++) {
    const angle = limb * Math.PI * 2 / 7 + (random() - .5) * .55
    const spread = limb === 6 ? .16 : .48 + random() * .13
    const center = new THREE.Vector3(Math.cos(angle) * radius * spread, height * (limb === 6 ? .88 : .65 + random() * .15), Math.sin(angle) * radius * spread * .9)
    branch(limb + 1, new THREE.Vector3(0, height * (.32 + random() * .12), 0), center, radius * (.022 + random() * .012))
    for (let cluster = 0; cluster < 8; cluster++) {
      const azimuth = random() * Math.PI * 2, elevation = random() * 2 - 1
      const horizontal = Math.sqrt(1 - elevation * elevation)
      transform.position.copy(center).add(new THREE.Vector3(Math.cos(azimuth) * horizontal * radius * .22, elevation * height * .065, Math.sin(azimuth) * horizontal * radius * .22))
      transform.rotation.set(random() * .4, random() * Math.PI, random() * .4)
      const size = .18 + random() * .09
      transform.scale.set(radius * size, height * size * .43, radius * size * .85)
      transform.updateMatrix()
      canopy.setMatrixAt(limb * 8 + cluster, transform.matrix)
      canopy.setColorAt(limb * 8 + cluster, new THREE.Color().setHSL(.04 + random() * .08, .06 + random() * .12, .72 + random() * .22))
    }
  }
  for (const mesh of [branches, canopy]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
    tree.add(mesh)
  }
  canopy.scale.set(.9, 1, .9)
  return tree
}