import * as THREE from 'three'
import { construction, elevations, house } from './model'
import { partner } from './context'

export function createOutdoorLighting(group: THREE.Object3D) {
  const strength = { value: 0 }
  const materials = new Set<THREE.MeshStandardMaterial>()
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial && !material.transparent) materials.add(material)
    }
  })
  for (const material of materials) {
    const compile = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer)
      shader.uniforms.outdoorSkyStrength = strength
      shader.vertexShader = `varying vec3 outdoorPosition;\n${shader.vertexShader}`.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 outdoorVertex = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          outdoorVertex = batchingMatrix * outdoorVertex;
        #endif
        #ifdef USE_INSTANCING
          outdoorVertex = instanceMatrix * outdoorVertex;
        #endif
        outdoorPosition = (modelMatrix * outdoorVertex).xyz;
      `)
      shader.fragmentShader = `varying vec3 outdoorPosition; uniform float outdoorSkyStrength;\n${shader.fragmentShader}`.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        float localSouth = outdoorPosition.z - (outdoorPosition.x < 0.0 ? ${partner.z.toFixed(4)} : 0.0);
        float localEast = abs(outdoorPosition.x);
        float roofLimit = ${elevations.DG.toFixed(4)} + ${house.knee.toFixed(4)} + (min(localSouth, 10.0 - localSouth) - ${house.north.toFixed(4)}) * ${Math.tan(house.pitch * Math.PI / 180).toFixed(6)};
        bool indoors = localEast > 0.02 && localEast < ${(house.width - .02).toFixed(4)} && localSouth > 0.02 && localSouth < 9.98 && outdoorPosition.y < roofLimit + 0.12;
        if (!indoors && outdoorPosition.y >= ${(construction.terrain - .01).toFixed(4)}) {
          vec3 outdoorNormal = inverseTransformDirection(normal, viewMatrix);
          float skyView = 0.65 + 0.35 * clamp(outdoorNormal.y, -1.0, 1.0);
          reflectedLight.indirectDiffuse += material.diffuseColor * vec3(0.88, 0.94, 1.0) * outdoorSkyStrength * skyView;
        }
      `)
    }
    material.customProgramCacheKey = () => `${key}-outdoor-sky-v1`
    material.needsUpdate = true
  }
  return { update(value: number) { strength.value = value } }
}