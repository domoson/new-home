import * as THREE from 'three'
import { raffstoreDetail, type Raffstore } from './raffstore'

export function createRaffstore(blind: Raffstore, elevation: number, facade: THREE.Material, metal: THREE.Material) {
  const group = new THREE.Group()
  group.name = `${blind.id}-raffstore`
  group.userData.raffstore = blind.id
  const box = (name: string, x: number, bottom: number, z: number, width: number, height: number, depth: number, material = metal) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
    mesh.position.set(x + width / 2, elevation + bottom + height / 2, z + depth / 2)
    mesh.name = `${blind.id}-raffstore-${name}`
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
    return mesh
  }
  const housing = blind.box, skin = .008, north = blind.wallId === 'north'
  const casingLength = blind.sharedEndGuide ? housing.width - raffstoreDetail.boxDepth : housing.width
  box('housing-top', housing.x, housing.bottom + housing.height - skin, housing.z, casingLength, skin, housing.depth)
  if (blind.axis === 'x') {
    box('housing-back', housing.x, housing.bottom, housing.z + (north ? housing.depth - skin : 0), casingLength, housing.height - skin, skin)
    box('plaster-cover', housing.x, housing.bottom + .018, housing.z + (north ? -.001 : housing.depth - .014 + .001), housing.width, housing.height - .018, .014, facade)
  } else {
    box('housing-back', housing.x, housing.bottom, housing.z, skin, housing.height - skin, housing.depth)
    box('plaster-cover', housing.x + housing.width - .014 + .001, housing.bottom + .018, housing.z, .014, housing.height - .018, housing.depth, facade)
  }
  const curtain = new THREE.Group()
  curtain.position.set(blind.x, elevation + blind.sill, blind.z)
  curtain.rotation.y = blind.axis === 'z' ? -Math.PI / 2 : 0
  group.add(curtain)
  const localBox = (name: string, start: number, bottom: number, width: number, height: number, depth: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), metal)
    mesh.position.set(start + width / 2, bottom + height / 2, 0)
    mesh.name = `${blind.id}-raffstore-${name}`; mesh.castShadow = true; mesh.receiveShadow = true; curtain.add(mesh)
    return mesh
  }
  localBox('guide-start', 0, 0, raffstoreDetail.guideWidth, blind.height + .018, .035)
  if (!blind.sharedEndGuide) localBox('guide-end', blind.width - (blind.corner ? raffstoreDetail.guideWidth / 2 : raffstoreDetail.guideWidth), 0, raffstoreDetail.guideWidth, blind.height + .018, .035)
  const startGap = .035, endGap = blind.corner ? .055 : .035, span = blind.width - startGap - endGap
  const profile = new THREE.Shape([new THREE.Vector2(-.04, .006), new THREE.Vector2(-.036, .006), new THREE.Vector2(-.032, .002), new THREE.Vector2(.032, .002), new THREE.Vector2(.036, .006), new THREE.Vector2(.04, .006), new THREE.Vector2(.034, 0), new THREE.Vector2(-.034, 0)])
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: span, bevelEnabled: false, steps: 1 })
  geometry.rotateY(Math.PI / 2)
  const count = Math.ceil(blind.height / raffstoreDetail.slatPitch)
  const lamellas = new THREE.InstancedMesh(geometry, metal, count)
  lamellas.name = `${blind.id}-raffstore-lamellas`; lamellas.castShadow = true; lamellas.receiveShadow = true; curtain.add(lamellas)
  const bottomRail = localBox('bottom-rail', startGap, blind.height + .006, span, .025, .07)
  const transform = new THREE.Object3D()
  const set = (extension: number, angle: number) => {
    const amount = Number.isFinite(extension) ? THREE.MathUtils.clamp(extension, 0, 1) : 0
    const tilt = Number.isFinite(angle) ? THREE.MathUtils.clamp(angle, 0, 75) * Math.PI / 180 : 0
    for (let index = 0; index < count; index++) {
      const raised = blind.height + .04 + (count - 1 - index) * raffstoreDetail.stackPitch
      const lowered = blind.height - .045 - index * (blind.height - .115) / (count - 1)
      transform.position.set(startGap, THREE.MathUtils.lerp(raised, lowered, amount), 0)
      transform.rotation.x = tilt * Math.min(1, amount * 10)
      transform.updateMatrix(); lamellas.setMatrixAt(index, transform.matrix)
    }
    lamellas.instanceMatrix.needsUpdate = true; lamellas.computeBoundingBox(); lamellas.computeBoundingSphere()
    bottomRail.position.y = THREE.MathUtils.lerp(blind.height + .0185, .0125, amount)
    group.userData.extension = amount; group.userData.tilt = angle
    group.updateMatrixWorld(true)
  }
  set(0, 30)
  return { group, set, dispose: () => lamellas.dispose() }
}