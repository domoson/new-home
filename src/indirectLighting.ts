import * as THREE from 'three'
import { area, elevations, makeFloor, roofHeight, stairOpeningParts } from './model'
import type { FloorId } from './model'
import { roomDaylight } from './roomDaylight'
import { interiorLightingEnabled } from './lighting'

export function createIndirectLighting(floors: FloorId[], materials: THREE.Material[], coordinates = new THREE.Matrix4(), houseSide: 'east' | 'west' = 'east') {
  const volumes = floors.flatMap(floorId => {
    const floor = makeFloor(floorId, houseSide)
    const daylight = roomDaylight(floorId, houseSide)
    return [...floor.rooms.map(room => ({ id: `${floorId}-${room.id}`, parts: room.parts, strength: room.id === 'living' ? .65 : THREE.MathUtils.clamp(800 / area(room.parts) / 55, .4, .85) })), { id: `${floorId}-stairs`, parts: stairOpeningParts, strength: .55 }].flatMap(room => room.parts.map(part => ({
      id: room.id, floor: floorId, strength: room.strength,
      daylight: daylight.find(source => source.id === room.id)!,
      min: new THREE.Vector3(part.x - .025, elevations[floorId] - .025, part.z - .025),
      max: new THREE.Vector3(part.x + part.width + .025, elevations[floorId] + (floorId === 'DG' ? roofHeight(5) : floor.height) + .025, part.z + part.depth + .025),
    })))
  })
  const uniforms = {
    bounceMin: { value: volumes.map(volume => volume.min) },
    bounceMax: { value: volumes.map(volume => volume.max) },
    bounceStrength: { value: volumes.map(() => 0) },
    bounceCoordinates: { value: coordinates },
    roomDaylightLevel: { value: 0 },
    roomDaylightSources: { value: volumes.map(volume => new THREE.Vector3(volume.daylight.center.x, volume.daylight.center.y, volume.daylight.strength)) },
  }
  for (const material of materials) {
    if (!(material instanceof THREE.MeshStandardMaterial) || material.transparent) continue
    const compile = material.onBeforeCompile, cacheKey = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer)
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = `uniform mat4 bounceCoordinates; varying vec3 bouncePosition;\n${shader.vertexShader}`.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 bounceVertex = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          bounceVertex = batchingMatrix * bounceVertex;
        #endif
        #ifdef USE_INSTANCING
          bounceVertex = instanceMatrix * bounceVertex;
        #endif
        bouncePosition = (bounceCoordinates * modelMatrix * bounceVertex).xyz;
      `)
      shader.fragmentShader = `varying vec3 bouncePosition; uniform vec3 bounceMin[${volumes.length}]; uniform vec3 bounceMax[${volumes.length}]; uniform float bounceStrength[${volumes.length}]; uniform float roomDaylightLevel; uniform vec3 roomDaylightSources[${volumes.length}];\n${shader.fragmentShader}`.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        float roomBounce = 0.0;
        float daylightBounce = 0.0;
        for (int volume = 0; volume < ${volumes.length}; volume++) {
          vec3 inside = step(bounceMin[volume], bouncePosition) * step(bouncePosition, bounceMax[volume]);
          roomBounce = max(roomBounce, inside.x * inside.y * inside.z * bounceStrength[volume]);
          vec2 windowDistance = bouncePosition.xz - roomDaylightSources[volume].xy;
          float daylightFalloff = 0.35 + 0.65 / (1.0 + 0.055 * dot(windowDistance, windowDistance));
          daylightBounce = max(daylightBounce, inside.x * inside.y * inside.z * roomDaylightSources[volume].z * daylightFalloff);
        }
        vec3 bounceNormal = inverseTransformDirection(normal, viewMatrix);
        float floorReflection = 0.55 + 0.45 * max(0.0, -bounceNormal.y);
        reflectedLight.indirectDiffuse += material.diffuseColor * vec3(1.0, 0.82, 0.62) * roomBounce * floorReflection;
        reflectedLight.indirectDiffuse += material.diffuseColor * vec3(0.94, 0.97, 1.0) * daylightBounce * roomDaylightLevel * (0.8 + 0.2 * max(0.0, -bounceNormal.y));
      `)
    }
    material.customProgramCacheKey = () => `${cacheKey}-room-bounce-${volumes.length}-daylight-v1`
    material.needsUpdate = true
  }
  return { volumes, uniforms, setDaylight(strength: number) { uniforms.roomDaylightLevel.value = strength }, update(states: Record<string, boolean>, activeFloor: FloorId) {
    volumes.forEach((volume, index) => { uniforms.bounceStrength.value[index] = interiorLightingEnabled && volume.floor === activeFloor && (states[volume.id] ?? volume.floor === 'KG') ? volume.strength : 0 })
  } }
}