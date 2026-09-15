import * as THREE from 'three'
import { elevations, house, slabThickness } from './model'
import { facadeCompositions, woodProfiles, woodTones } from './context'
import type { FacadeComposition, WoodProfile } from './context'

export function createFacadeMaterial(texture: THREE.Texture, alwaysWood = false, coordinates = new THREE.Matrix4()) {
  const material = new THREE.MeshStandardMaterial({ color: '#fafafa', roughness: .85 })
  const uniforms = { claddingTexture: { value: texture }, claddingMode: { value: 0 }, claddingColor: { value: new THREE.Color(woodTones[0].color) }, claddingProfile: { value: 0 }, alwaysWood: { value: alwaysWood } }
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.uniforms.claddingCoordinates = { value: coordinates }
    shader.vertexShader = `uniform mat4 claddingCoordinates; varying vec3 claddingPosition; varying vec3 claddingNormal;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\ncladdingPosition = (claddingCoordinates * modelMatrix * vec4(transformed, 1.0)).xyz; claddingNormal = normalize(mat3(modelMatrix) * objectNormal);')
    shader.fragmentShader = `varying vec3 claddingPosition; varying vec3 claddingNormal; uniform sampler2D claddingTexture; uniform int claddingMode; uniform vec3 claddingColor; uniform int claddingProfile; uniform bool alwaysWood;\n${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
      bool aboveGround = claddingPosition.y >= 0.0;
      bool exterior = claddingPosition.x >= ${((house.width + house.east) / 2 - .0001).toFixed(4)} || claddingPosition.x <= ${(house.west / 2 + .0001).toFixed(4)} || claddingPosition.z <= ${(house.north / 2 + .0001).toFixed(4)} || claddingPosition.z >= ${((house.depth + house.south) / 2 - .0001).toFixed(4)};
      bool eastFace = claddingPosition.x >= ${house.east.toFixed(4)};
      bool entry = eastFace && claddingPosition.y <= 2.65 && claddingPosition.z >= 0.35 && claddingPosition.z <= 2.65;
      bool og = claddingPosition.y >= ${(elevations.OG - slabThickness('OG')).toFixed(4)} && claddingPosition.y < ${(elevations.DG - slabThickness('DG')).toFixed(4)};
      bool timber = alwaysWood || (aboveGround && (claddingMode == 1 || (claddingMode == 2 && claddingPosition.y >= ${(elevations.OG - slabThickness('OG')).toFixed(4)}) || (claddingMode == 3 && eastFace && claddingPosition.y >= ${elevations.DG.toFixed(4)}) || (claddingMode == 4 && entry) || (claddingMode == 5 && og) || (claddingMode == 6 && (og || entry)) || (claddingMode == 7 && ((eastFace && claddingPosition.z > 2.7 && claddingPosition.z < 4.9) || (!eastFace && claddingPosition.x > 4.2 && claddingPosition.x < 6.4)))));
      if (!exterior && !alwaysWood) diffuseColor.rgb = vec3(1.0);
      if (timber && (exterior || alwaysWood)) {
        float horizontal = claddingPosition.x >= ${house.east.toFixed(4)} || claddingPosition.x <= 0.4 ? claddingPosition.z : claddingPosition.x;
        vec3 wood = texture2D(claddingTexture, vec2(horizontal / 1.12, claddingPosition.y / 2.8)).rgb;
        float luminance = dot(wood, vec3(0.2126, 0.7152, 0.0722));
        wood = claddingColor * (0.75 + luminance * 0.65);
        float pitch = claddingProfile == 0 || alwaysWood ? 0.14 : claddingProfile == 1 ? 0.06 : 0.16;
        float along = fract(horizontal / pitch);
        float pixel = max(fwidth(horizontal / pitch), 0.0001);
        float distant = smoothstep(0.35, 1.0, pixel);
        if (claddingProfile == 2 && !alwaysWood) {
          float coverage = 1.0 - smoothstep(0.225 - pixel * 0.5, 0.225 + pixel * 0.5, abs(along - 0.225));
          diffuseColor.rgb = mix(diffuseColor.rgb, wood, mix(coverage, 0.45, distant));
        } else {
          float gap = claddingProfile == 1 && !alwaysWood ? 0.083333 : 0.021429;
          float boardEdge = smoothstep(gap - pixel * 0.5, gap + pixel * 0.5, min(along, 1.0 - along));
          diffuseColor.rgb = wood * mix(claddingProfile == 1 && !alwaysWood ? 0.3 : 0.5, 1.0, mix(boardEdge, 1.0 - 2.0 * gap, distant));
        }
      }
    `)
  }
  material.customProgramCacheKey = () => 'facade-profiles-v3'
  return { material, setComposition(composition: FacadeComposition, tone: number, profile: WoodProfile = 'boards') { uniforms.claddingMode.value = facadeCompositions.findIndex(option => option.id === composition); uniforms.claddingColor.value.set(woodTones[tone]?.color ?? woodTones[0].color); uniforms.claddingProfile.value = woodProfiles.findIndex(option => option.id === profile) } }
}