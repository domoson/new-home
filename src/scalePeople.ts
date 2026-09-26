import * as THREE from 'three'
import { makeFloor } from './model'
import type { FloorId } from './model'

export const familySizes = [1.75, 1.65, 1.2, .95] as const
type Pose = 'standing' | 'sitting' | 'lying' | 'walking'
type Placement = { height: number; x: number; z: number; bottom?: number; angle?: number; pose: Pose; seat?: number }

export function peoplePlacements(id: FloorId, furnished: boolean): Placement[] {
  const floor = makeFloor(id)
  const bed = (itemId: string, height: number): Placement => {
    const item = floor.furniture.find(item => item.id === itemId)!
    const south = item.angle === Math.PI
    return { height, x: item.x + item.width / 2, z: south ? item.z + .12 : item.z + item.depth - .12, bottom: item.height + .015 + height * .065, angle: south ? Math.PI : 0, pose: 'lying' }
  }
  const seat = (itemId: string, height: number, seatHeight: number, angle = 0): Placement => {
    const item = floor.furniture.find(item => item.id === itemId)!
    return { height, x: item.x + item.width / 2, z: item.z + item.depth / 2, pose: 'sitting', seat: seatHeight, angle }
  }
  const placements: Placement[] = id === 'EG' ? [
    { height: 1.75, x: 3.5, z: 6.7, pose: 'walking' },
    { height: 1.65, x: 1.95, z: 9.5, pose: 'sitting', seat: .43, angle: Math.PI },
    { height: 1.2, x: 5.25, z: 6.85, pose: 'standing', angle: -.6 },
    { height: .95, x: 2.8, z: 7.5, pose: 'standing', angle: .5 },
  ] : id === 'OG' ? [
    { height: 1.75, x: 2.7, z: 1.3, pose: 'standing', angle: -Math.PI / 2 },
    { height: 1.65, x: 2.85, z: 5.45, pose: 'standing' },
    bed('bed-north', 1.2), seat('desk-chair-south', .95, .44),
  ] : id === 'DG' ? [
    bed('parents-bed', 1.75), seat('office-chair', 1.65, .45),
    { height: 1.2, x: 4.9, z: 4.2, pose: 'standing' },
    { height: .95, x: 2.8, z: 6.5, pose: 'standing' },
  ] : [
    { height: 1.75, x: 3.8, z: 1.3, pose: 'standing' },
    { height: 1.65, x: 5, z: 4.8, pose: 'standing' },
    { height: 1.2, x: 3.8, z: 7.2, pose: 'walking' },
    { height: .95, x: 2.2, z: 8.3, pose: 'standing' },
  ]
  return placements.map((placement, index) => !furnished && ['sitting', 'lying'].includes(placement.pose)
    ? { height: placement.height, x: floor.rooms[index % floor.rooms.length].spawn[0], z: floor.rooms[index % floor.rooms.length].spawn[1], pose: 'standing' }
    : placement)
}

export function createScalePeople(floors: FloorId[], furnished: boolean) {
  const group = new THREE.Group()
  group.name = 'scale-people'
  group.visible = false
  const sphere = new THREE.SphereGeometry(1, 12, 8)
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10)
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .9 })
  const skin = material('#c99b7c'), hair = material('#443f3b'), trousers = material('#465354'), shoes = material('#eceae3')
  const shirts = ['#3b8788', '#b94e64', '#d4a72f', '#759851'].map(material)
  const materials = [skin, hair, trousers, shoes, ...shirts]
  const animations: ((seconds: number) => void)[] = []
  const up = new THREE.Vector3(0, 1, 0)
  for (const floor of floors) for (const [index, placement] of peoplePlacements(floor, furnished).entries()) {
    const root = new THREE.Group(), body = new THREE.Group()
    root.name = `${floor}-person-${index}`
    root.userData.person = { floor, ...placement }
    root.position.set(placement.x, makeFloor(floor).elevation + (placement.bottom ?? 0), placement.z)
    root.rotation.y = placement.angle ?? 0
    root.add(body); group.add(root)
    body.scale.setScalar(placement.height)
    if (placement.pose === 'lying') body.rotation.x = -Math.PI / 2
    if (placement.pose === 'sitting') body.position.y = (placement.seat ?? .45) - placement.height * .4
    const ellipsoid = (name: string, center: number[], size: number[], surface: THREE.Material) => {
      const mesh = new THREE.Mesh(sphere, surface)
      mesh.name = name
      mesh.position.set(center[0], center[1], center[2]); mesh.scale.set(size[0], size[1], size[2])
      mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh)
      return mesh
    }
    const segment = (name: string, radius: number, surface: THREE.Material) => {
      const mesh = new THREE.Mesh(cylinder, surface)
      mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh)
      return (start: THREE.Vector3, end: THREE.Vector3) => {
        mesh.position.copy(start).add(end).multiplyScalar(.5)
        mesh.scale.set(radius, start.distanceTo(end), radius)
        mesh.quaternion.setFromUnitVectors(up, end.clone().sub(start).normalize())
      }
    }
    ellipsoid('shirt', [0, .66, 0], [.135, .19, .073], shirts[index])
    ellipsoid('hips', [0, .47, 0], [.105, .07, .065], trousers)
    ellipsoid('neck', [0, .845, 0], [.033, .035, .035], skin)
    ellipsoid('head', [0, .922, 0], [.057, .078, .061], skin)
    ellipsoid('hair', [0, .953, -.009], [.058, .046, .055], hair)
    ellipsoid('nose', [0, .915, .061], [.012, .016, .017], skin)
    const limbs = [-1, 1].map(side => ({ side,
      thigh: segment('trouser-leg', .044, trousers), shin: segment('lower-leg', .031, trousers),
      sleeve: segment('sleeve', .037, shirts[index]), forearm: segment('forearm', .026, skin),
      hand: ellipsoid('hand', [0, 0, 0], [.025, .035, .021], skin),
      foot: ellipsoid('shoe', [0, 0, 0], [.04, .03, .078], shoes),
    }))
    const update = (seconds: number) => {
      const walking = placement.pose === 'walking'
      const phase = seconds * 3
      const stride = walking ? Math.sin(phase) * .12 : 0
      if (walking) {
        root.position.z = placement.z + (1 - Math.cos(seconds * .65)) * .35
        root.rotation.y = (placement.angle ?? 0) + (Math.sin(seconds * .65) < 0 ? Math.PI : 0)
      }
      for (const limb of limbs) {
        const side = limb.side, sitting = placement.pose === 'sitting'
        const hip = new THREE.Vector3(side * .065, .47, 0)
        const knee = new THREE.Vector3(side * .065, sitting ? .46 : .255, sitting ? .24 : stride * side * .55)
        const ankle = new THREE.Vector3(side * .065, sitting ? Math.max(.14, .035 - body.position.y / placement.height) : .035, sitting ? .24 : stride * side)
        limb.thigh(hip, knee); limb.shin(knee, ankle)
        limb.foot.position.copy(ankle).add(new THREE.Vector3(0, -.005, .035))
        const shoulder = new THREE.Vector3(side * .13, .78, 0)
        const elbow = new THREE.Vector3(side * .16, .63, sitting ? .06 : -stride * side * .6)
        const wrist = new THREE.Vector3(side * .13, sitting ? .53 : .49, sitting ? .22 : -stride * side)
        limb.sleeve(shoulder, elbow); limb.forearm(elbow, wrist); limb.hand.position.copy(wrist)
      }
    }
    update(0)
    if (placement.pose === 'walking') animations.push(update)
  }
  let moving = true
  return { group,
    set(visible: boolean, animate: boolean) { group.visible = visible; moving = animate; if (!animate) for (const update of animations) update(0) },
    update(seconds: number) { if (!group.visible || !moving) return false; for (const update of animations) update(seconds); return animations.length > 0 },
    dispose() { sphere.dispose(); cylinder.dispose(); for (const surface of materials) surface.dispose() },
  }
}