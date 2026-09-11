import * as THREE from 'three'

export function createCarParking(car: THREE.Group, streetCenter: number) {
  const parked = car.position.z, distance = streetCenter - parked
  let progress = 0, target = 0
  const wheels = car.children.filter(part => /leon-(tire|rim|brake|rim-edge|alloy-spoke|hub)$/.test(part.name))
  const original = wheels.map(wheel => ({ position: wheel.position.clone(), rotation: wheel.quaternion.clone() }))
  const apply = () => {
    const travelled = distance * progress * progress * (3 - 2 * progress)
    car.position.z = parked + travelled
    wheels.forEach((wheel, index) => {
      const axle = original[index].position.z > 0 ? 1.433 : -1.253
      const center = new THREE.Vector3(original[index].position.x, .315, axle)
      const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -travelled / .315)
      wheel.position.copy(original[index].position).sub(center).applyQuaternion(rotation).add(center)
      wheel.quaternion.copy(rotation).multiply(original[index].rotation)
    })
    car.updateMatrixWorld(true)
  }
  return {
    activate(object: THREE.Object3D) {
      let current: THREE.Object3D | null = object
      while (current && current !== car) current = current.parent
      if (!current) return false
      target = 1 - target
      return true
    },
    update(delta: number, reducedMotion = false) {
      if (progress === target) return false
      progress = reducedMotion ? target : THREE.MathUtils.clamp(progress + Math.sign(target - progress) * Math.max(0, Math.min(delta, .1)) / (Math.abs(distance) / 1.2), 0, 1)
      apply(); return true
    },
  }
}