import * as THREE from 'three'
import { partyRoom } from './partyRoomData'

export function createPartyRoom(materials: THREE.Material[]) {
  const group = new THREE.Group(); group.name = 'kids-party-room'; group.position.y = -2.7
  const finish = (color: string, emission = 0) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .45, emissive: color, emissiveIntensity: emission })
    materials.push(material); return material
  }
  const mirror = finish('#dce8e8'); mirror.metalness = .8; mirror.roughness = .18
  const ball = new THREE.Group(); ball.name = 'disco-ball'; ball.position.set(partyRoom.x, partyRoom.ballHeight, partyRoom.z); group.add(ball)
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(partyRoom.radius - .005, 24, 16), finish('#718486')); ball.add(sphere)
  const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(.025, .025), mirror, 264)
  const tile = new THREE.Object3D(); let index = 0
  for (let row = 1; row < 12; row++) for (let column = 0; column < 24; column++) {
    tile.position.setFromSphericalCoords(partyRoom.radius, row * Math.PI / 12, column * Math.PI / 12)
    tile.lookAt(tile.position.clone().multiplyScalar(2)); tile.updateMatrix(); tiles.setMatrixAt(index++, tile.matrix)
  }
  ball.add(tiles)
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .09, 6), finish('#596560')); cable.position.set(partyRoom.x, 2.355, partyRoom.z); group.add(cable)
  const dots: THREE.Mesh[] = []
  const lights: THREE.SpotLight[] = [], emitters: THREE.MeshStandardMaterial[] = []
  partyRoom.colors.forEach((color, colorIndex) => {
    const material = finish(color, .8)
    emitters.push(material)
    const fixture = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), material)
    fixture.position.set(2.4 + colorIndex * 1.2, 2.32, 7.1); fixture.name = 'party-lamp'; group.add(fixture)
    const light = new THREE.SpotLight(color, 18, 5, 1.05, .8, 2); light.position.copy(fixture.position); light.name = 'party-color-light'
    light.target.position.set(2.8 + colorIndex * .8, 0, 7.6); light.castShadow = true; light.shadow.mapSize.set(256, 256); light.shadow.camera.near = .08; light.shadow.normalBias = .012
    group.add(light, light.target); lights.push(light)
    for (let spot = 0; spot < 8; spot++) {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(.045 + spot * .005, 12), material)
      dot.rotation.x = -Math.PI / 2; dot.position.y = .014; dot.name = 'party-light-spot'; group.add(dot); dots.push(dot)
    }
  })
  const update = (seconds: number) => {
    ball.rotation.y = seconds * .16
    dots.forEach((dot, dotIndex) => {
      const angle = dotIndex * 2.4 + seconds * .12, radius = .4 + (dotIndex % 6) * .21
      dot.position.x = partyRoom.x + Math.cos(angle) * radius
      dot.position.z = partyRoom.z + Math.sin(angle) * radius * .7
    })
  }
  update(0)
  return { group, update, setEnabled(on: boolean, active: boolean) {
    for (const light of lights) light.visible = on && active
    for (const dot of dots) dot.visible = on
    for (const material of emitters) material.emissiveIntensity = on ? .8 : 0
  } }
}