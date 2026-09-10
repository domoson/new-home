import * as THREE from 'three'
import { area, elevations, floorIds, makeFloor, roofHeight, stair } from './model'
import type { FloorId } from './model'

export type LightingCircuit = { id: string; label: string; floor: FloorId; defaultOn: boolean }
export const lightingCircuits: LightingCircuit[] = [...floorIds.flatMap(floor => [...makeFloor(floor).rooms.map(room => ({ id: `${floor}-${room.id}`, label: room.name, floor, defaultOn: floor === 'KG' })), { id: `${floor}-stairs`, label: 'Treppe', floor, defaultOn: floor === 'KG' }]), { id: 'KG-party-effects', label: 'Partylicht', floor: 'KG', defaultOn: true }]

export function daylightLevels(altitude: number, mode: 'room' | 'global' = 'room') {
  const daylight = THREE.MathUtils.smoothstep(Math.sin(altitude), -.08, .35)
  return { interior: mode === 'global' ? 0 : daylight, ambient: mode === 'global' ? .48 + daylight * .82 : .035 + daylight * .085, exterior: mode === 'global' ? 0 : daylight * .65, sky: mode === 'global' ? 0 : daylight * .55, sun: altitude > 0 ? 3 * Math.min(1, Math.sin(altitude) * 3) : 0, background: new THREE.Color('#131b25').lerp(new THREE.Color('#dce7eb'), daylight) }
}

export function createRoomLighting(floors: FloorId[], materials: THREE.Material[]) {
  const group = new THREE.Group(); group.name = 'room-lighting'
  const circuits = floors.flatMap(floorId => {
    const floor = makeFloor(floorId)
    const stairRoom = { id: 'stairs', parts: [{ x: stair.x, z: stair.z, width: stair.width, depth: stair.depth }] }
    return [...floor.rooms, stairRoom].map(room => {
      const id = `${floorId}-${room.id}`
      const isStair = room.id === 'stairs'
      const part = room.parts.reduce((largest, current) => area([current]) > area([largest]) ? current : largest)
      const positions = isStair ? [[stair.x + .065, stair.z + stair.depth / 2]] : room.id === 'living' ? [[5.1, 3.65], [3.1, 7.25], [5.9, 8.1]] : floorId === 'KG' && room.id === 'child-south' ? [[4.8, 7.5]] : [[part.x + part.width / 2, part.z + part.depth / 2]]
      const diffuser = new THREE.MeshStandardMaterial({ color: '#f2f0e8', roughness: .55, emissive: '#ffe3bc', emissiveIntensity: 0 })
      const trim = new THREE.MeshStandardMaterial({ color: '#deded9', roughness: .65 })
      materials.push(diffuser, trim)
      const lamps = positions.map(([east, south], index) => {
        const rise = floorId === 'KG' ? 2.7 : 2.95
        const ceiling = isStair ? (floorId === 'DG' ? 1.7 : rise / 2 + 1.2) : floorId === 'DG' ? roofHeight(south) : floor.height
        const mount = new THREE.Group(); mount.name = `${id}-${isStair ? 'wall' : 'ceiling'}-light-${index}`; mount.userData.lightCircuit = id
        mount.position.set(east, floor.elevation + ceiling - .05, south)
        if (floorId === 'DG' && !isStair) mount.rotation.x = -Math.atan((roofHeight(south + .01) - roofHeight(south)) / .01)
        const body = new THREE.Mesh(isStair ? new THREE.BoxGeometry(.1, .28, .34) : new THREE.CylinderGeometry(.19, .19, .07, 24), trim)
        const glass = new THREE.Mesh(isStair ? new THREE.BoxGeometry(.012, .2, .28) : new THREE.CylinderGeometry(.175, .175, .018, 24), diffuser)
        if (isStair) glass.position.x = .055
        else glass.position.y = -.043
        mount.add(body, glass); group.add(mount)
        const lumens = isStair ? 600 : room.id === 'living' ? 500 : Math.min(1200, Math.max(450, area(room.parts) * 60 / positions.length))
        const light = new THREE.SpotLight(floorId === 'KG' && room.id !== 'child-south' || room.id === 'bath' ? '#fff1dd' : '#ffe3bc', lumens / (2 * Math.PI * (1 - Math.cos(1.3))), 11, 1.3, .65, 2)
        light.name = `${id}-light-source-${index}`; light.position.set(east + (isStair ? .12 : 0), elevations[floorId] + ceiling - .16, south)
        light.target.position.set(isStair ? stair.x + stair.runWidth : east, elevations[floorId] + (isStair && floorId !== 'DG' ? rise / 2 : 0), south)
        light.castShadow = true; light.shadow.mapSize.set(512, 512); light.shadow.camera.near = .08; light.shadow.camera.far = 11; light.shadow.bias = -.00015; light.shadow.normalBias = .012
        light.visible = false; group.add(light, light.target)
        return { mount, light }
      })
      return { id, floor: floorId, diffuser, lamps }
    })
  })
  return { group, update(states: Record<string, boolean>, activeFloor: FloorId) {
    for (const circuit of circuits) {
      const on = states[circuit.id] ?? circuit.floor === 'KG'
      circuit.diffuser.emissiveIntensity = on ? 1.5 : 0
      for (const { light } of circuit.lamps) light.visible = on && circuit.floor === activeFloor
    }
  } }
}