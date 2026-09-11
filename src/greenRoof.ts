import * as THREE from 'three'
import { carportRoof } from './parking'

export function createGreenRoof(width: number, depth: number, materials: THREE.Material[]) {
  const group = new THREE.Group(); group.name = 'carport-green-roof'; group.visible = false
  const material = (color: string) => {
    const finish = new THREE.MeshStandardMaterial({ color, roughness: 1 })
    materials.push(finish); return finish
  }
  const soil = material('#544438'), gravel = material('#b5b0a1'), edging = material('#535c58')
  const vegetation = material('#ffffff'), flowers = material('#ffffff')
  const layer = (name: string, east: number, height: number, south: number, span: number, thickness: number, length: number, finish: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(span, thickness, length), finish)
    mesh.name = name; mesh.position.set(east + span / 2, height + thickness / 2, south + length / 2)
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
  }
  layer('green-roof-drainage', .035, 0, .035, width - .07, .035, depth - .07, edging)
  layer('green-roof-gravel-bed', .055, .035, .055, width - .11, .045, depth - .11, gravel)
  layer('green-roof-substrate', .26, .035, .26, width - .52, .1, depth - .52, soil)
  for (const east of [.015, width - .045]) layer('green-roof-retaining-edge', east, 0, .015, .03, .13, depth - .03, edging)
  for (const south of [.015, depth - .045]) layer('green-roof-retaining-edge', .045, 0, south, width - .09, .13, .03, edging)
  let seed = 1927
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
  const transform = new THREE.Object3D(), tint = new THREE.Color()
  const instances = (name: string, geometry: THREE.BufferGeometry, finish: THREE.Material, count: number) => {
    const mesh = new THREE.InstancedMesh(geometry, finish, count)
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh
  }
  const stones = instances('green-roof-pebbles', new THREE.IcosahedronGeometry(1, 0), gravel, 850)
  for (let index = 0; index < stones.count; index++) {
    const alongEast = index % 2 === 0, opposite = index % 4 < 2
    const across = .085 + random() * .13
    const east = alongEast ? .085 + random() * (width - .17) : opposite ? across : width - across
    const south = alongEast ? opposite ? across : depth - across : .085 + random() * (depth - .17)
    const radius = .018 + random() * .018
    transform.position.set(east, .08 + radius * .3, south)
    transform.rotation.set(random(), random() * Math.PI, random())
    transform.scale.set(radius, radius * .65, radius * .8); transform.updateMatrix()
    stones.setMatrixAt(index, transform.matrix); stones.setColorAt(index, tint.setScalar(.72 + random() * .28))
  }
  const columns = Math.floor((width - .7) / .18), rows = Math.floor((depth - .7) / .18)
  const leavesPerPlant = 16, plantCount = columns * rows
  const leaves = instances('green-roof-sedum-leaves', new THREE.SphereGeometry(1, 6, 4), vegetation, plantCount * leavesPerPlant)
  const blooms = instances('green-roof-flowers', new THREE.IcosahedronGeometry(1, 0), flowers, Math.ceil(plantCount / 7) * 5)
  const palette = ['#617c3d', '#83964a', '#496c38', '#9aab5b', '#8c5345', '#607f54']
  let flowerIndex = 0
  for (let plant = 0; plant < plantCount; plant++) {
    const east = .36 + (plant % columns + .5) * (width - .72) / columns + (random() - .5) * .075
    const south = .36 + (Math.floor(plant / columns) + .5) * (depth - .72) / rows + (random() - .5) * .075
    const size = .8 + random() * .45, rotation = random() * Math.PI * 2
    const color = palette[Math.floor(random() * palette.length)]
    for (let leaf = 0; leaf < leavesPerPlant; leaf++) {
      const upper = leaf >= 8, angle = rotation + leaf * Math.PI / 4 + (upper ? .3 : 0)
      const radius = (upper ? .027 : .05) * size
      transform.position.set(east + Math.sin(angle) * radius, .15 + (upper ? .055 : .02) * size, south + Math.cos(angle) * radius)
      transform.rotation.set(upper ? -.6 : -.22, angle, 0)
      transform.scale.set(.027 * size, .018 * size, (upper ? .044 : .065) * size); transform.updateMatrix()
      const index = plant * leavesPerPlant + leaf
      leaves.setMatrixAt(index, transform.matrix); leaves.setColorAt(index, tint.set(color).multiplyScalar(.85 + random() * .3))
    }
    if (plant % 7 === 0) for (let flower = 0; flower < 5; flower++) {
      const angle = flower * Math.PI * 2 / 5
      transform.position.set(east + Math.sin(angle) * .024, .245 + random() * .018, south + Math.cos(angle) * .024)
      transform.rotation.set(0, angle, 0); transform.scale.set(.019, .014, .019); transform.updateMatrix()
      blooms.setMatrixAt(flowerIndex, transform.matrix)
      blooms.setColorAt(flowerIndex++, tint.set(plant % 3 === 0 ? '#dbbb58' : '#e0c6b2'))
    }
  }
  for (const mesh of [stones, leaves, blooms]) {
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingBox(); mesh.computeBoundingSphere()
  }
  group.matrix.set(1, 0, 0, 0, 0, 1, Math.tan(carportRoof.pitch * Math.PI / 180), carportRoof.lowEdge + carportRoof.thickness, 0, 0, 1, 0, 0, 0, 0, 1)
  group.matrixAutoUpdate = false; group.matrixWorldNeedsUpdate = true
  return group
}