import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import type { SceneModel } from './scene'

let ready: Promise<void> | undefined
export const initializePhysics = () => ready ??= RAPIER.init()
export function createWalker(model: SceneModel, camera: THREE.PerspectiveCamera, spawn: THREE.Vector3) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  world.timestep = 1 / 60
  for (const collider of model.colliders) world.createCollider(RAPIER.ColliderDesc.cuboid(collider.size.x / 2, collider.size.y / 2, collider.size.z / 2).setTranslation(collider.position.x, collider.position.y, collider.position.z).setRotation(collider.rotation))
  for (const triangle of model.triangles) world.createCollider(RAPIER.ColliderDesc.trimesh(triangle.vertices, triangle.indices))
  const doorColliders = model.doors.map(door => {
    const center = door.center.clone().applyMatrix4(door.pivot.matrixWorld)
    return world.createCollider(RAPIER.ColliderDesc.cuboid(door.size.x / 2, door.size.y / 2, door.size.z / 2).setTranslation(center.x, center.y, center.z).setRotation(door.pivot.getWorldQuaternion(new THREE.Quaternion())))
  })
  const syncOpenings = () => model.doors.forEach((door, index) => {
    door.pivot.updateMatrixWorld(true)
    doorColliders[index].setTranslation(door.center.clone().applyMatrix4(door.pivot.matrixWorld))
    doorColliders[index].setRotation(door.pivot.getWorldQuaternion(new THREE.Quaternion()))
  })
  syncOpenings()
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + .9, spawn.z))
  const capsule = world.createCollider(RAPIER.ColliderDesc.capsule(.625, .25), body)
  const controller = world.createCharacterController(.012)
  controller.enableAutostep(.205, .16, false); controller.enableSnapToGround(.3); controller.setMaxSlopeClimbAngle(Math.PI / 4); controller.setMinSlopeSlideAngle(Math.PI / 3)
  const keys = new Set<string>()
  let falling = 0, stopped = false
  const teleport = (point: THREE.Vector3) => { body.setTranslation({ x: point.x, y: point.y + .9, z: point.z }, true); body.setNextKinematicTranslation({ x: point.x, y: point.y + .9, z: point.z }); falling = 0; world.step(); camera.position.set(point.x, point.y + 1.65, point.z) }
  world.step(); teleport(spawn)
  const tick = () => {
    if (stopped) return
    syncOpenings()
    const direction = camera.getWorldDirection(new THREE.Vector3()); direction.y = 0; direction.normalize()
    const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0))
    const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
    const sideways = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
    const movement = direction.multiplyScalar(forward).addScaledVector(right, sideways).normalize().multiplyScalar(1.8 / 60)
    falling = controller.computedGrounded() ? -.6 : Math.max(-5, falling - 9.81 / 60)
    movement.y = falling / 60
    controller.computeColliderMovement(capsule, movement, undefined, undefined, collider => collider.handle !== capsule.handle)
    const translation = body.translation(), corrected = controller.computedMovement()
    body.setNextKinematicTranslation({ x: translation.x + corrected.x, y: translation.y + corrected.y, z: translation.z + corrected.z }); world.step()
    const next = body.translation(); camera.position.set(next.x, next.y + .775, next.z)
    if (next.y < -6) teleport(spawn)
  }
  const setOpening = (id: string, amount: number) => {
    const door = model.doors.find(door => door.id === id)
    if (!door || !Number.isFinite(amount)) return false
    const original = door.amount, target = THREE.MathUtils.clamp(amount, 0, 1), position = body.translation()
    const count = Math.max(1, Math.ceil(Math.abs(target - original) * 40))
    for (let index = 1; index <= count; index++) {
      model.setOpening(id, original + (target - original) * index / count)
      const center = door.center.clone().applyMatrix4(door.pivot.matrixWorld)
      const localPlayer = new THREE.Vector3(position.x, position.y, position.z).sub(center).applyQuaternion(door.pivot.getWorldQuaternion(new THREE.Quaternion()).invert())
      if (Math.abs(localPlayer.x) < door.size.x / 2 + .3 && Math.abs(localPlayer.z) < .35 && Math.abs(localPlayer.y) < door.size.y / 2 + .9) { model.setOpening(id, original); return false }
    }
    syncOpenings(); world.step(); return true
  }
  const toggleDoor = (id?: string) => {
    const position = body.translation()
    const nearest = model.doors.filter(door => id ? door.id === id : door.kind === 'door').map(door => ({ door, distance: door.position.clone().applyMatrix4(door.pivot.parent!.matrixWorld).distanceTo(new THREE.Vector3(position.x, position.y - .9, position.z)) })).sort((first, second) => first.distance - second.distance)[0]
    if (!nearest || (!id && nearest.distance > 2.1)) return false
    const { door } = nearest
    return setOpening(door.id, door.amount > 0 ? 0 : 1)
  }
  return { keys, tick, teleport, toggleDoor, setOpening, position: () => body.translation(), dispose() { stopped = true; keys.clear(); world.free() } }
}