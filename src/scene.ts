import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { atticCeiling, atticCeilingPanels, construction, house, elevations, floorIds, floorSlabs, furnitureVolumes, lightWells, makeFloor, rect, ridgeElevations, roofHeight, roofInnerElevation, roofOuterElevation, roofPanels, roofVerticalThickness, roofWindows, slabThickness, stairFor, stairGuards, stairHandrails, stairSolids, storeyRise, wallSolids } from './model'
import { windowFrame, windowGap, windowJoint, windowPanels } from './windowLayout'
import { kitchenModules, moduleFront } from './kitchenStorage'
import { terraceFurniture, terraceParts, westTerraceFurniture } from './terrace'
import { createPartyRoom } from './partyRoom'
import { createRoomLighting } from './lighting'
import { createIndirectLighting } from './indirectLighting'
import { stairPrism } from './winderStair'
import { roofTileGeometry } from './roofTiles'
import type { FloorId, Furniture, Rect, Solid } from './model'
import { initialAppearance, partner, siteBoundary } from './context'
import type { FacadeComposition, FinishKey, WoodProfile } from './context'
import { createFacadeMaterial } from './facade'
import { flatGeometry } from './geometry'
import { createSurroundings } from './surroundings'

export type ColliderShape = { position: THREE.Vector3; size: THREE.Vector3; rotation: THREE.Quaternion }
export type DoorModel = { id: string; label: string; kind: 'door' | 'window'; pivot: THREE.Group; closedAngle: number; closedPitch?: number; direction?: number; amount: number; open: boolean; size: THREE.Vector3; center: THREE.Vector3; position: THREE.Vector3; object: THREE.Mesh; sliding: boolean }
export type SceneModel = { activateVehicle: (object: THREE.Object3D) => boolean; updateVehicle: (delta: number, reducedMotion?: boolean) => boolean; setDaylight: (strength: number) => void; group: THREE.Group; colliders: ColliderShape[]; triangles: { vertices: Float32Array; indices: Uint32Array }[]; doors: DoorModel[]; setLighting: (states: Record<string, boolean>, activeFloor: FloorId) => void; updateAnimations: (seconds: number) => boolean; setOpening: (id: string, amount: number) => boolean; toggleOpening: (id: string) => boolean; setFinish: (key: FinishKey, color: string, house?: 'east' | 'west') => void; setCladding: (composition: FacadeComposition, tone: number, profile?: WoodProfile, house?: 'east' | 'west') => void; setCarportRoof: (type: 'metal' | 'green') => void; setGroundOpacity: (value: number) => void; dispose: () => void }

function oakTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512
  const context = canvas.getContext('2d')!
  let seed = 2718
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  context.fillStyle = '#c8ad80'; context.fillRect(0, 0, 512, 512)
  for (let board = 0; board < 8; board++) {
    const lightness = 63 + random() * 9
    context.fillStyle = `hsl(36 35% ${lightness}%)`; context.fillRect(board * 64 + 1, 0, 62, 512)
    for (let grain = 0; grain < 65; grain++) {
      const across = board * 64 + random() * 62
      context.strokeStyle = `rgba(93, 69, 39, ${.025 + random() * .09})`; context.lineWidth = .25 + random() * .6
      context.beginPath(); context.moveTo(across, 0); context.bezierCurveTo(across + random() * 8, 150, across - random() * 5, 350, across + random() * 3, 512); context.stroke()
    }
    context.fillStyle = '#b7a17e'; context.fillRect(board * 64, (board % 3) * 160, 64, 1)
  }
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8
  return texture
}

export function buildScene(floorId: FloorId, walk: boolean, showRoof: boolean, furnished: boolean, cutWalls = false, includeSite = true): SceneModel {
  const group = new THREE.Group(), colliders: ColliderShape[] = [], triangles: SceneModel['triangles'] = [], doors: DoorModel[] = []
  const textures: THREE.Texture[] = [], materials: THREE.Material[] = []
  const mat = (color: string, roughness = .8, map?: THREE.Texture) => { const result = new THREE.MeshStandardMaterial({ color, roughness, map: map ?? null }); materials.push(result); return result }
  const oak = oakTexture(); textures.push(oak)
  const coordinates = includeSite ? new THREE.Matrix4() : new THREE.Matrix4().makeScale(-1, 1, 1).setPosition(0, 0, -partner.z)
  const facadeFinish = createFacadeMaterial(oak, false, coordinates), facade = facadeFinish.material; materials.push(facade)
  const canopyFinish = createFacadeMaterial(oak, true, coordinates); materials.push(canopyFinish.material)
  facade.color.set(initialAppearance.facade)
  facadeFinish.setComposition(initialAppearance.composition, initialAppearance.woodTone, initialAppearance.woodProfile)
  canopyFinish.setComposition(initialAppearance.composition, initialAppearance.woodTone, 'boards')
  const timber = mat('#ffffff', .75, oak), plaster = mat('#ffffff'), ceramic = mat('#f4f7f3', .28), linen = mat('#e6e5db'), sage = mat('#9fab94'), teal = mat('#687d77'), dark = mat('#343e3b'), stone = mat('#cfcec6'), roofMaterial = mat(initialAppearance.roof), frameMaterial = mat(initialAppearance.frame)
  const kitchenStone = mat('#eeeee8', .48), kitchenWhite = mat('#edeee9', .65), kitchenSage = mat('#8eaaa0', .65), steel = mat('#b9c0bf', .26)
  steel.metalness = .75
  const doorMaterial = mat('#dfd6c2', .75, oak)
  const roofCourseMaterial = mat(initialAppearance.roof)
  roofCourseMaterial.color.copy(roofMaterial.color).multiplyScalar(.72)
  const groundMaterial = mat('#a6b894'); groundMaterial.side = THREE.DoubleSide
  const glass = new THREE.MeshStandardMaterial({ color: '#bddadc', roughness: .15, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }); materials.push(glass)
  const addBox = (bounds: Rect, bottom: number, height: number, material: THREE.Material | THREE.Material[], collide = true, round = false, parent: THREE.Object3D = group) => {
    const size = new THREE.Vector3(bounds.width, height, bounds.depth)
    const geometry = round ? new RoundedBoxGeometry(size.x, size.y, size.z, 2, Math.min(.035, size.x / 6, size.y / 6, size.z / 6)) : new THREE.BoxGeometry(size.x, size.y, size.z)
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(bounds.x + bounds.width / 2, bottom + height / 2, bounds.z + bounds.depth / 2); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh)
    if (material === glass) { mesh.castShadow = false; mesh.userData.glazing = true }
    if (collide) colliders.push({ position: mesh.position.clone(), size, rotation: mesh.quaternion.clone() })
    return mesh
  }
  const beam = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 8), material)
    mesh.position.copy(from).add(to).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()); group.add(mesh); mesh.castShadow = true
    return mesh
  }
  const wedge = (bounds: Rect, bottoms: [number, number], tops: [number, number], material: THREE.Material | THREE.Material[], collide = true) => {
    const { x, z, width, depth } = bounds
    const vertices = new Float32Array([x,bottoms[0],z, x+width,bottoms[0],z, x+width,bottoms[1],z+depth, x,bottoms[1],z+depth, x,tops[0],z, x+width,tops[0],z, x+width,tops[1],z+depth, x,tops[1],z+depth])
    const indices = new Uint32Array([0,1,2,0,2,3, 4,6,5,4,7,6, 0,4,5,0,5,1, 3,2,6,3,6,7, 0,3,7,0,7,4, 1,5,6,1,6,2])
    const geometry = flatGeometry(vertices, indices)
    if (Array.isArray(material)) { for (let face = 0; face < 6; face++) geometry.addGroup(face * 6, 6, material.length === 6 ? face : face === 1 ? 1 : 0) }
    const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; mesh.castShadow = true; group.add(mesh)
    if (collide) triangles.push({ vertices, indices })
    return mesh
  }
  const addFurniture = (item: Furniture, elevation: number) => {
    elevation += item.bottom ?? 0
    const { x, z, width, depth, height, kind } = item
    const box = (east: number, south: number, wide: number, deep: number, bottom: number, high: number, material: THREE.Material, round = false) => {
      if (kind === 'cabinet' && item.angle === -Math.PI) east = x + width - (east - x) - wide
      if (kind === 'sofa' && item.angle === -Math.PI / 2) east = x + width - (east - x) - wide
      if (kind === 'espresso' && item.angle === Math.PI) south = z + depth - (south - z) - deep
      if (kind === 'sofa' && item.angle === Math.PI) {
        east = x + width - (east - x) - wide
        south = z + depth - (south - z) - deep
      }
      const mesh = addBox(rect(east, south, wide, deep), elevation + bottom, high, material, false, round)
      mesh.userData.furniture = item.id
      return mesh
    }
    const surface = (bottom: number, high: number, material: THREE.Material, round = false) => box(x, z, width, depth, bottom, high, material, round)
    const cylinder = (east: number, south: number, bottom: number, high: number, radiusTop: number, radiusBottom: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, high, 32), material)
      mesh.position.set(east, elevation + bottom + high / 2, south)
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.furniture = item.id; group.add(mesh)
      return mesh
    }
    if (!['plant', 'tv', 'shower'].includes(kind)) for (const part of furnitureVolumes(item)) colliders.push({ position: new THREE.Vector3(part.x + part.width / 2, elevation + part.bottom + part.height / 2, part.z + part.depth / 2), size: new THREE.Vector3(part.width, part.height, part.depth), rotation: new THREE.Quaternion() })
    if (kind === 'coat-rack') {
      box(x, z, width, .025, .04, .1, timber).name = `${item.id}-rail`
      for (let index = 0; index < 7; index++) {
        const east = x + .15 + index * (width - .3) / 6
        box(east - .01, z + .025, .02, depth - .025, .055, .02, steel).name = `${item.id}-hook-${index}`
        box(east - .01, z + depth - .02, .02, .02, .055, .065, steel)
      }
    } else if (kind === 'bed' && item.angle === Math.PI / 2) {
      box(x, z, width - .075, depth, .12, .17, timber, true).name = `bed-base-${item.id}`
      box(x, z, width - .075, depth, .29, .2, ceramic, true).name = `bed-mattress-${item.id}`
      box(x + .02, z + .025, width - .55, depth - .05, .49, .055, sage, true)
      for (const south of [z + .1, z + depth / 2 + .04]) box(x + width - .48, south, .32, depth / 2 - .16, .49, .1, linen, true)
      box(x + width - .07, z, .07, depth, .12, .68, timber, true).name = `bed-head-${item.id}`
    } else if (kind === 'bed') {
      const headSouth = item.angle === Math.PI
      const bodySouth = headSouth ? z : z + .075
      box(x, bodySouth, width, depth - .075, .12, .17, timber, true).name = `bed-base-${item.id}`
      box(x, bodySouth, width, depth - .075, .29, .2, ceramic, true).name = `bed-mattress-${item.id}`
      box(x + .025, z + (headSouth ? .02 : .55), width - .05, depth - .57, .49, .055, sage, true)
      const count = width > 1.3 ? 2 : 1
      for (let index = 0; index < count; index++) box(x + .1 + index * width / count, z + (headSouth ? depth - .45 : .13), width / count - .2, .32, .49, .1, linen, true)
      const head = box(x, z + (headSouth ? depth - .07 : 0), width, .07, .12, .68, timber, true)
      head.name = `bed-head-${item.id}`; head.userData.bedHead = headSouth ? 'south' : 'north'
    } else if (kind === 'sofa' && Math.abs(item.angle ?? 0) === Math.PI / 2) {
      surface(.1, .2, timber, true); box(x + width - .18, z, .18, depth, .28, .52, linen, true).name = `sofa-back-${item.id}`
      for (let index = 0; index < 3; index++) { box(x + .02, z + .1 + index * (depth - .2) / 3, width - .22, (depth - .25) / 3, .3, .18, linen, true); box(x + width - .36, z + .1 + index * (depth - .2) / 3, .16, Math.min(.43, (depth - .25) / 3), .47, .3, index === 1 ? sage : linen, true) }
      box(x, z, width, .1, .3, .25, linen, true)
    } else if (kind === 'sofa') {
      surface(.1, .2, timber, true); box(x, z, width, .18, .28, .52, linen, true).name = `sofa-back-${item.id}`
      for (let index = 0; index < 3; index++) { box(x + .1 + index * (width - .2) / 3, z + .2, (width - .25) / 3, depth - .22, .3, .18, linen, true); box(x + .18 + index * .82, z + .2, .43, .16, .47, .3, index === 1 ? sage : linen, true) }
      box(x, z, .1, depth, .3, .25, linen, true); box(x + width - .1, z, .1, depth, .3, .25, linen, true)
    } else if (kind === 'chaise') {
      surface(.1, .2, timber, true); surface(.3, .18, linen, true)
    } else if (kind === 'bookcase') {
      const white = mat(item.color ?? '#fafafa')
      const alongX = width > depth, length = Math.max(width, depth), shelfDepth = Math.min(width, depth)
      const shelfBox = (along: number, inward: number, wide: number, deep: number, bottom: number, high: number, material: THREE.Material) => {
        const mesh = alongX ? box(x + along, z + inward, wide, deep, bottom, high, material) : box(item.angle === Math.PI ? x + width - inward - deep : x + inward, z + along, deep, wide, bottom, high, material)
        mesh.userData.furniture = item.id
        return mesh
      }
      const rows = Math.max(2, Math.round(height / .4)), pitch = (height - .03) / rows, bayWidth = length / 3
      if (item.id.startsWith('pantry-')) {
        shelfBox(0, 0, length, .018, 0, height, white).name = `${item.id}-back`
        for (const along of [0, bayWidth, bayWidth * 2, length - .025]) shelfBox(along, .023, .025, shelfDepth - .023, 0, height, white)
        for (let bay = 0; bay < 3; bay++) {
          for (let level = 0; level <= rows; level++) shelfBox(bay * bayWidth + .03, .023, bayWidth - .06, shelfDepth - .023, level * pitch, .025, white)
          for (let row = 0; row < rows; row++) {
            if (row < 2) shelfBox(bay * bayWidth + .05, .04, bayWidth - .1, shelfDepth - .065, row * pitch + .03, pitch - .12, sage).name = `${item.id}-storage-bin`
            else for (let index = 0; index < 2; index++) {
              const along = bay * bayWidth + bayWidth * (.3 + index * .4), inward = shelfDepth * .55
              const east = alongX ? x + along : item.angle === Math.PI ? x + width - inward : x + inward, south = alongX ? z + inward : z + along
              cylinder(east, south, row * pitch + .03, .22, .055, .055, index === 0 ? ceramic : teal).name = `${item.id}-storage-jar`
              cylinder(east, south, row * pitch + .25, .015, .06, .06, timber)
            }
          }
        }
        return
      }
      shelfBox(0, 0, length, .03, 0, height, white)
      for (const along of [0, bayWidth, bayWidth * 2, length - .03]) shelfBox(along, 0, .03, shelfDepth, 0, height, white)
      for (let level = 0; level <= rows; level++) shelfBox(0, 0, length, shelfDepth, level * pitch, .03, white)
      for (let bay = 0; bay < 3; bay++) for (let row = 0; row < rows; row++) {
        if (height > 1.4 && row < 2) {
          shelfBox(bay * bayWidth + .04, .03, bayWidth - .07, shelfDepth - .045, row * pitch + .04, pitch - .07, white)
          shelfBox(bay * bayWidth + bayWidth / 2 - .06, shelfDepth - .015, .12, .015, row * pitch + pitch / 2, .02, dark)
        } else for (let index = 0; index < Math.floor((bayWidth - .08) / .08); index++) {
          shelfBox(bay * bayWidth + .04 + index * .08, .04, .05, Math.min(.26, shelfDepth - .06), row * pitch + .03, Math.min(.23 + index % 3 * .03, pitch - .065), index % 3 === 0 ? teal : index % 3 === 1 ? sage : stone)
        }
      }
    } else if (kind === 'table' || kind === 'desk') {
      const topMaterial = item.color ? mat(item.color) : timber
      if (item.shape === 'round') {
        cylinder(x + width / 2, z + depth / 2, height - .06, .06, width / 2, width / 2, topMaterial).name = `table-top-${item.id}`
        for (let index = 0; index < 4; index++) {
          const angle = Math.PI / 4 + index * Math.PI / 2
          box(x + width / 2 + Math.cos(angle) * width * .3 - .03, z + depth / 2 + Math.sin(angle) * depth * .3 - .03, .06, .06, .02, height - .08, timber).name = `table-leg-${item.id}-${index}`
        }
      } else {
        surface(height - .06, .06, topMaterial, true)
        for (const east of [x + .08, x + width - .14]) for (const south of [z + .08, z + depth - .14]) box(east, south, .06, .06, .02, height - .08, timber)
      }
      if (kind === 'desk') { box(x + width * .5, z + depth * .3, .06, depth * .4, height + .15, .32, dark); box(x + .18, z + depth * .4, .18, depth * .2, height, .02, teal) }
    } else if (kind === 'bench') {
      surface(.39, .06, timber, true); surface(.45, .06, sage, true)
      if (Math.abs(item.angle ?? 0) === Math.PI / 2) {
        const back = box(x, item.angle! < 0 ? z : z + depth - .07, width, .07, .45, height - .45, timber, true)
        back.name = 'dining-bench-back'
        for (const east of [x + .12, x + width - .18]) box(east, z + .06, .06, depth - .12, .02, .37, timber)
      } else {
        box(x + width - .07, z, .07, depth, .45, height - .45, timber, true)
        for (const south of [z + .12, z + depth - .18]) box(x + .06, south, width - .12, .06, .02, .37, timber)
      }
    } else if (kind === 'chair') {
      const seat = item.seatHeight ?? .45
      surface(seat - .03, .06, timber, true).name = `${item.seatHeight ? 'barstool' : 'chair'}-seat-${item.id}`
      if (!item.seatHeight) {
        const back = item.angle === Math.PI ? box(x, z + depth - .065, width, .065, seat, .33, timber, true) : item.angle ? box(item.angle < 0 ? x : x + width - .065, z, .065, depth, seat, .33, timber, true) : box(x, z, width, .065, seat, .33, timber, true)
        back.name = `chair-back-${item.id}`
      }
      for (const east of [x + .04, x + width - .08]) for (const south of [z + .04, z + depth - .08]) box(east, south, .04, .04, .01, seat - .04, timber)
      if (item.seatHeight) {
        for (const south of [z + .055, z + depth - .07]) box(x + .04, south, width - .08, .025, .25, .025, steel)
        for (const east of [x + .055, x + width - .07]) box(east, z + .04, .025, depth - .08, .25, .025, steel)
      }
    } else if (item.id === 'toaster') {
      surface(.012, .025, dark, true)
      box(x + .008, z + .008, width - .016, depth - .016, .035, height - .055, steel, true)
      for (const south of [.065, .135]) box(x + .035, z + south, width - .085, .025, height - .024, .006, dark, true)
      box(x + width - .018, z + .04, .009, .11, .075, .008, dark)
      box(x + width - .023, z + .11, .02, .035, .11, .018, dark, true)
      cylinder(x + width - .045, z + .185, .14, .015, .014, .014, dark)
    } else if (item.id === 'sodastream') {
      surface(.005, .025, dark, true)
      box(x + .035, z + .015, width - .07, .07, .03, height - .06, kitchenWhite, true)
      box(x + .035, z + .03, width - .07, .18, height - .07, .055, kitchenWhite, true)
      cylinder(x + width / 2, z + .08, height - .015, .012, .024, .024, steel)
      cylinder(x + width / 2, z + .165, .045, .21, .032, .042, glass)
      cylinder(x + width / 2, z + .165, .05, .12, .029, .036, teal)
      cylinder(x + width / 2, z + .165, .255, .045, .019, .032, glass)
      cylinder(x + width / 2, z + .165, .3, .075, .016, .016, dark)
    } else if (item.id === 'cookit') {
      box(x + .025, z + .025, width - .05, depth - .05, .01, .11, kitchenWhite, true)
      box(x + .07, z + .045, width - .13, depth - .09, .1, .1, kitchenWhite, true)
      cylinder(x + .29, z + depth / 2, .17, .19, .145, .1, steel)
      cylinder(x + .29, z + depth / 2, .36, .025, .15, .15, dark)
      cylinder(x + .29, z + depth / 2, .385, .035, .065, .09, glass)
      cylinder(x + .29, z + depth / 2, .42, .025, .028, .028, dark)
      for (const south of [.055, .415]) box(x + .19, z + south, .16, .03, .27, .05, dark, true)
      box(x + .02, z + .14, .035, .22, .12, .07, dark, true)
      const display = box(x + .018, z + .155, .004, .15, .138, .045, teal)
      display.name = 'cookit-display'
      box(x + .02, z + .33, .035, .035, .15, .025, steel, true)
    } else if (item.id === 'kitchen-scribe') {
      surface(0, height, timber)
    } else if (item.id === 'kitchen-upper') {
      box(x, z, width, depth - .025, 0, height, timber)
      for (let panel = 0; panel < 3; panel++) {
        const panelWidth = width / 3
        const front = box(x + panel * panelWidth + .003, z + depth - .022, panelWidth - .006, .022, .006, height - .056, kitchenWhite)
        front.name = 'kitchen-upper-front'
        box(x + panel * panelWidth + .04, z + depth - .026, panelWidth - .08, .025, .005, .012, dark)
      }
      box(x, z, width, depth, height - .05, .05, kitchenWhite)
    } else if (item.niche) {
      const { bottom, height: clearHeight } = item.niche, upper = bottom + clearHeight
      box(x, z, width, depth, .04, bottom - .07, timber).name = `${item.id}-lower-body`
      surface(bottom - .03, .03, kitchenStone).name = `${item.id}-niche-worktop`
      box(x, z, width, .025, bottom, clearHeight, timber).name = `${item.id}-niche-back`
      box(x + width - .025, z, .025, depth, bottom, clearHeight, timber).name = `${item.id}-niche-side`
      box(x, z, width, depth - .031, upper, height - upper - .03, timber).name = `furniture-body-${item.id}`
      box(x + .004, z + depth - .026, width - .008, .02, upper, height - upper - .03, kitchenWhite).name = `kitchen-front-${item.id}`
      surface(height - .03, .03, kitchenWhite)
    } else if (kind === 'cabinet' && item.front) {
      const alongX = item.front === 'north' || item.front === 'south'
      const body = rect(x + (item.front === 'west' ? .031 : 0), z + (item.front === 'north' ? .031 : 0), width - (alongX ? 0 : .031), depth - (alongX ? .031 : 0))
      box(body.x, body.z, body.width, body.depth, .04, height - .04, timber).name = `furniture-body-${item.id}`
      const count = Math.max(1, Math.round((alongX ? width : depth) / .6))
      for (let index = 0; index < count; index++) {
        const bounds = moduleFront({ ...item, id: item.id, x: x + (alongX ? index * width / count : 0), z: z + (alongX ? 0 : index * depth / count), width: alongX ? width / count : width, depth: alongX ? depth : depth / count, front: item.front, use: 'cupboard' })
        box(bounds.x, bounds.z, bounds.width, bounds.depth, .04, height - .08, linen).name = `cabinet-front-${item.id}`
        box(bounds.x + bounds.width / 2, bounds.z + bounds.depth / 2, alongX ? .018 : .006, alongX ? .006 : .018, Math.min(1, height - .3), .18, dark)
      }
    } else if ((item.id === 'fridge' || item.id.startsWith('kitchen-tall')) && !item.angle) {
      box(x + .035, z + .045, width - .07, depth - .09, 0, .1, dark)
      box(x, z, width, depth - .031, .1, height - .15, timber).name = `furniture-body-${item.id}`
      const frontBottom = item.frontBottom ?? .1
      const front = box(x + .004, z + depth - .026, width - .008, .02, frontBottom, height - frontBottom - .05, kitchenWhite)
      front.name = `kitchen-front-${item.id}`
      box(x, z, width, depth, height - .05, .05, kitchenWhite)
      for (const level of (item.id === 'fridge' ? [.8, 2.1] : [.85, 1.45, 2.1]).filter(level => level > frontBottom)) box(x + .004, z + depth - .006, width - .008, .002, level, .008, dark)
      if (item.id === 'fridge') {
        box(x + .05, z + depth - .025, .018, .028, 1.1, .32, dark)
        for (let slot = 0; slot < 9; slot++) box(x + .08 + slot * .05, z + depth - .05, .035, .012, .035, .022, dark)
      } else if (item.id === 'kitchen-tall') {
        const oven = box(x + .015, z + depth - .003, width - .03, .02, .85, .6, dark)
        oven.name = 'kitchen-oven'
        box(x + .065, z + depth + .018, width - .13, .001, .93, .32, teal)
        box(x + .07, z + depth + .005, width - .14, .04, 1.34, .025, steel)
        box(x + .22, z + depth + .019, .16, .002, 1.39, .025, teal)
      }
    } else if (kitchenModules(item).length) {
      const body = furnitureVolumes(item)[0]
      box(body.x + .05, body.z + .05, body.width - .1, body.depth - .1, 0, .1, dark)
      box(body.x + .021, body.z + .021, body.width - .042, body.depth - .042, .1, height - .13, item.id === 'peninsula' ? timber : kitchenSage).name = `${item.id}-base`
      surface(height - .03, .03, kitchenStone)
      for (const module of kitchenModules(item)) {
        const bounds = moduleFront(module), alongZ = module.front === 'west' || module.front === 'east'
        const front = box(bounds.x, bounds.z, bounds.width, bounds.depth, .105, height - .145, module.front === 'south' && item.id === 'peninsula' ? timber : kitchenSage)
        front.name = `kitchen-module-${module.id}`; front.userData.kitchenModule = module
        const rows = module.use === 'drawers' ? module.id === 'hob-drawers' ? 2 : 3 : 1
        for (let row = 1; row <= rows; row++) {
          const level = .105 + (height - .145) * row / rows - .023
          box(bounds.x + (module.front === 'east' ? .018 : -.001), bounds.z + (alongZ ? .04 : module.front === 'south' ? .018 : -.001), alongZ ? .003 : bounds.width - .08, alongZ ? bounds.depth - .08 : .003, level, .012, dark)
        }
        if (module.use === 'cupboard' && (module.frontLength ?? module.width) > .8) box(bounds.x + bounds.width / 2, bounds.z, .005, .022, .105, height - .145, dark)
      }
      if (item.id === 'coffee-counter') box(x, z, .018, depth, height, .12, kitchenStone)
    } else if (item.id === 'wardrobe' && item.angle === Math.PI) {
      box(x, z + .027, width, depth - .027, .04, height - .04, timber).name = `furniture-body-${item.id}`
      for (let panel = 0; panel < 2; panel++) {
        const front = box(x + panel * width / 2 + .004, z, width / 2 - .008, .022, .04, height - .08, linen)
        front.name = 'entry-wardrobe-front'
        box(x + (panel + .5) * width / 2, z - .003, .018, .006, 1, .18, dark)
      }
    } else if (['fridge', 'kitchen-tall'].includes(item.id) && Math.abs(item.angle ?? 0) === Math.PI) {
      box(x, z, width - .025, depth, .04, height - .04, timber).name = `furniture-body-${item.id}`
      const front = box(x + width - .02, z + .004, .02, depth - .008, .06, height - .09, linen)
      front.name = `kitchen-front-${item.id}`
      box(x + width, z + .06, .008, .18, 1.1, .025, dark)
      if (item.id === 'kitchen-tall') {
        const oven = box(x + width + .003, z + .04, .018, depth - .08, .85, .55, dark)
        oven.name = 'kitchen-oven'
        box(x + width + .026, z + .09, .02, depth - .18, 1.32, .025, stone)
      } else box(x + width, z + .01, .003, depth - .02, .75, .008, dark)
    } else if (kind === 'cabinet' && Math.abs(item.angle ?? 0) === Math.PI) {
      box(x + .004, z + .004, width - .03, depth - .008, .004, height - .004, timber).name = `furniture-body-${item.id}`
      const frontX = x + width + .004
      for (let panel = 0; panel < 2; panel++) {
        box(frontX - .025, z + panel * depth / 2 + .005, .025, depth / 2 - .01, .02, height - .04, linen)
        box(frontX + .001, z + depth / 2 + (panel === 0 ? -.055 : .04), .003, .015, 1, .18, dark)
      }
    } else if (kind === 'cabinet' || kind === 'counter') {
      surface(.06, height - .09, kind === 'counter' ? sage : timber)
      surface(height - .03, .03, kind === 'counter' ? stone : timber)
      if (['fridge', 'kitchen-tall', 'pantry-cabinet'].includes(item.id)) {
        const front = box(x + .004, z + depth - .02, width - .008, .02, .06, height - .09, linen)
        front.name = `kitchen-front-${item.id}`
        box(x + .06, z + depth, .18, .008, 1.1, .025, dark)
      }
      const count = Math.max(1, Math.round(Math.max(width, depth) / .6))
      if (kitchenModules(item).length === 0) for (let index = 1; index < count; index++) if (width > depth) box(x + index * width / count, z + depth, .008, .003, .09, height - .15, dark); else box(x, z + index * depth / count, .003, .008, .09, height - .15, dark)
      for (const module of kitchenModules(item)) {
        const bounds = moduleFront(module), alongZ = module.front === 'west' || module.front === 'east'
        const front = box(bounds.x, bounds.z, bounds.width, bounds.depth, .09, height - .15, module.use === 'dishwasher' ? linen : sage)
        front.name = `kitchen-module-${module.id}`
        front.userData.kitchenModule = module
        const rows = module.use === 'drawers' ? 3 : 1
        for (let row = 1; row <= rows; row++) {
          const level = .09 + (height - .15) * row / rows - .045
          box(bounds.x + (module.front === 'east' ? .02 : -.003), bounds.z + (alongZ ? .05 : module.front === 'south' ? .02 : -.003), alongZ ? .003 : bounds.width - .1, alongZ ? bounds.depth - .1 : .003, level, .015, dark)
        }
      }
      
      if (item.id === 'kitchen-tall') {
        const ovenWidth = Math.min(.52, width - .08), ovenX = x + (width - ovenWidth) / 2
        const oven = box(ovenX, z + depth + .002, ovenWidth, .018, .85, .55, dark)
        oven.name = 'kitchen-oven'
        box(ovenX + .05, z + depth + .025, ovenWidth - .1, .025, 1.32, .025, stone)
        box(x, z + depth + .005, width, .01, 2.1, .008, dark)
      }
    } else if (kind === 'hob') {
      surface(0, height, dark, true)
      for (const east of [width > depth ? .18 : .14, width - (width > depth ? .18 : .14)]) for (const south of [width > depth ? .14 : .18, depth - (width > depth ? .14 : .18)]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.095, .003, 6, 32), stone); ring.rotation.x = Math.PI / 2; ring.position.set(x + east, elevation + height + .004, z + south); group.add(ring)
      }
      if (width > depth) box(x + width / 2 - .035, z + .04, .07, depth - .08, height + .001, .006, teal)
      else box(x + .04, z + depth / 2 - .035, width - .08, .07, height + .001, .006, teal)
    } else if (kind === 'espresso' && item.angle === Math.PI / 2) {
      surface(.02, .035, dark, true)
      box(x + width * .45, z, width * .55, depth, .055, height - .055, ceramic, true)
      const front = box(x + width * .45 - .06, z + .035, .06, depth - .07, height * .7, .06, stone)
      front.name = 'espresso-front'
      beam(new THREE.Vector3(x + width * .42, elevation + height * .68, z + depth / 2), new THREE.Vector3(x, elevation + height * .68, z + depth / 2), .018, dark)
      box(x + width * .14, z + .08, .09, .09, .06, .09, ceramic, true)
      beam(new THREE.Vector3(x + width - .18, elevation + .28, z + depth - .04), new THREE.Vector3(x + width - .32, elevation + .1, z + depth - .025), .009, stone)
    } else if (kind === 'espresso') {
      const facingSouth = (south: number) => item.angle === Math.PI ? z + depth - (south - z) : south
      surface(.02, .035, dark, true)
      box(x, z, width, depth * .55, .055, height - .055, ceramic, true)
      box(x + .035, z + depth * .55, width - .07, .06, height * .7, .06, stone)
      beam(new THREE.Vector3(x + width / 2, elevation + height * .68, facingSouth(z + depth * .58)), new THREE.Vector3(x + width / 2, elevation + height * .68, facingSouth(z + depth)), .018, dark)
      box(x + .08, z + depth * .63, .09, .09, .06, .09, ceramic, true)
      beam(new THREE.Vector3(x + width - .04, elevation + .28, facingSouth(z + .18)), new THREE.Vector3(x + width - .025, elevation + .1, facingSouth(z + .32)), .009, stone)
    } else if (kind === 'sink') {
      surface(height - .18, .18, ceramic, true); box(x + .07, z + .07, width - .14, depth - .14, height, .008, teal, true)
      const tapX = item.angle === Math.PI / 2 ? x + width - .04 : x + .1, tapZ = Math.abs(item.angle ?? 0) === Math.PI / 2 ? z + depth / 2 : z + .08
      if (item.concealedFittings && item.angle === Math.PI / 2) {
        box(x + width - .015, tapZ - .12, .02, .24, height + .15, .1, steel).name = `${item.id}-concealed-control`
        box(x + width - .2, tapZ - .015, .2, .03, height + .18, .025, steel).name = `${item.id}-wall-spout`
      } else if (item.concealedFittings && item.angle === -Math.PI / 2) {
        box(x - .005, tapZ - .12, .02, .24, height + .15, .1, steel).name = `${item.id}-concealed-control`
        box(x, tapZ - .015, .2, .03, height + .18, .025, steel).name = `${item.id}-wall-spout`
      } else if (item.concealedFittings) {
        box(x + width / 2 - .12, z - .015, .24, .02, height + .15, .1, steel).name = `${item.id}-concealed-control`
        box(x + width / 2 - .015, z - .015, .03, .2, height + .18, .025, steel).name = `${item.id}-wall-spout`
      } else {
        beam(new THREE.Vector3(tapX, elevation + height, tapZ), new THREE.Vector3(tapX, elevation + height + .24, tapZ), .012, dark)
        if (item.angle === Math.PI / 2) box(x + width - .02, z + depth / 2 - .12, .025, .24, height + .1, .1, stone)
      }
    } else if (kind === 'wc') {
      if (item.angle === Math.PI / 2) {
        box(x + .02, z + .1, width - .15, depth - .2, .05, .34, ceramic, true); surface(.38, .06, ceramic, true); box(x + .08, z + .08, width - .25, depth - .16, .442, .006, stone, true)
        box(x + width - .01, z + depth / 2 - .12, .025, .24, 1, .14, stone).name = `${item.id}-flush-plate`
      } else {
        box(x + .12, z + (item.angle === Math.PI ? .02 : .13), width - .24, depth - .15, .05, .34, ceramic, true); surface(.38, .06, ceramic, true); box(x + .1, z + (item.angle === Math.PI ? .1 : .2), width - .2, depth - .3, .442, .006, stone, true)
        if (item.concealedFittings) box(x + width / 2 - .12, z - .015, .24, .025, 1, .14, stone).name = `${item.id}-flush-plate`
      }
    } else if (kind === 'bath') {
      surface(.03, height - .03, ceramic, true); box(x + .09, z + .09, width - .18, depth - .18, height, .008, stone, true)
      if (item.id === 'bath-tub') { box(x, z + depth / 2 - .12, .025, .24, .78, .1, stone); beam(new THREE.Vector3(x, elevation + .8, z + depth / 2), new THREE.Vector3(x + .15, elevation + .8, z + depth / 2), .014, dark) }
    } else if (kind === 'shower') {
      surface(.015, .025, ceramic)
      // angle PI: walk-in shower backed by a south service wall, open toward the room without a glass screen
      if (item.angle !== Math.PI) box(x + width - .02, z, .015, depth * .65, .04, 1.95, glass)
      if (item.concealedFittings && item.angle === Math.PI) {
        box(x + width / 2 - .08, z + depth - .01, .16, .02, 1.05, .22, steel).name = `${item.id}-concealed-control`
        box(x + width / 2 - .015, z + depth - .31, .03, .32, 2.1, .03, steel)
        box(x + width / 2 - .12, z + depth - .43, .24, .24, 2.08, .025, steel).name = `${item.id}-rain-head`
      } else if (item.concealedFittings) {
        box(x + width / 2 - .08, z - .01, .16, .02, 1.05, .22, steel).name = `${item.id}-concealed-control`
        box(x + width / 2 - .015, z - .01, .03, .32, 2.1, .03, steel)
        box(x + width / 2 - .12, z + .19, .24, .24, 2.08, .025, steel).name = `${item.id}-rain-head`
      } else {
        beam(new THREE.Vector3(x + .12, elevation + 1, z + .12), new THREE.Vector3(x + .12, elevation + 2.1, z + .12), .015, dark)
        box(x + .05, z + .05, .2, .2, 2.1, .025, dark)
      }
    } else if (kind === 'tv' && item.angle === Math.PI / 2) {
      box(x, z, width, depth, .88, .73, dark); box(x + .025, z + depth, width - .05, .003, .9, .68, teal)
    } else if (kind === 'tv') {
      box(x, z, width, depth, .88, .73, dark); box(x + width, z + .025, .003, depth - .05, .9, .68, teal)
    } else if (kind === 'machine') {
      surface(.02, height, ceramic, true); box(x + width - .01, z + .12, .02, depth - .24, .25, Math.min(.45, height * .3), teal, true)
    } else {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(width / 2, width / 2.6, .36, 16), stone); pot.position.set(x + width / 2, elevation + .18, z + depth / 2); group.add(pot)
      for (let leaf = 0; leaf < 7; leaf++) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), sage); const angle = leaf * 2.4; mesh.scale.set(.45, 1.6, .8); mesh.rotation.z = Math.sin(angle) * .8; mesh.position.set(x + width / 2 + Math.cos(angle) * .15, elevation + .55 + leaf * .07, z + depth / 2 + Math.sin(angle) * .15); group.add(mesh) }
    }
  }
  const addStairSolid = (solid: Solid, base: number, material: THREE.Material, collide = true) => {
    const { vertices, indices } = stairPrism(solid.footprint!, base + solid.bottom, solid.height)
    const mesh = new THREE.Mesh(flatGeometry(vertices, indices), material)
    mesh.name = `stair-${solid.id}`; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
    if (collide) triangles.push({ vertices, indices })
  }
  const renderedFloors = walk || showRoof ? floorIds : [floorId]
  const roomLighting = createRoomLighting(includeSite ? renderedFloors : [], materials, furnished); group.add(roomLighting.group)
  const party = furnished && includeSite && makeFloor('KG').furniture.some(item => item.id === 'party-sofa') && renderedFloors.includes('KG') ? createPartyRoom(materials) : undefined
  if (party) group.add(party.group)
  for (const id of renderedFloors) {
    const floor = makeFloor(id, includeSite ? 'east' : 'west'), base = floor.elevation
    const cut = cutWalls && !walk && !showRoof
    for (const slab of includeSite ? floorSlabs(id) : [rect(0, 0, house.width, house.depth)]) {
      const texture = oak.clone(); texture.repeat.set(slab.width / 2, slab.depth / 2); texture.needsUpdate = true; textures.push(texture)
      const floorMaterial = id === 'KG' ? stone : mat('#ffffff', .8, texture)
      const mesh = addBox(slab, base - slabThickness(id), slabThickness(id), [Math.abs(slab.x + slab.width - house.width) < .000001 ? facade : plaster, slab.x === 0 ? facade : plaster, floorMaterial, plaster, Math.abs(slab.z + slab.depth - house.depth) < .000001 ? facade : plaster, slab.z === 0 ? facade : plaster]); mesh.name = `${id}-slab`
    }
    for (const room of floor.rooms.filter(room => ['wc', 'bath', 'entry', 'pantry'].includes(room.id) || room.id === 'hall' && id !== 'EG')) for (const part of room.tileParts ?? room.parts) {
      if (room.id === 'hall' && id !== 'EG') {
        const parquet = oak.clone(); parquet.repeat.set(part.width / 2, part.depth / 2); parquet.needsUpdate = true; textures.push(parquet)
        const mesh = addBox(part, base + .001, .008, mat('#ffffff', .8, parquet), false); mesh.userData.floorRoom = room.id; mesh.userData.floorLevel = id
      } else if (part.footprint) {
        addStairSolid({ ...part, bottom: .001, height: .008, kind: 'floor', id: `${id}-${room.id}` }, base, ['hall', 'entry'].includes(room.id) ? mat('#e7e4d9') : mat('#ced9d5'), false)
      } else {
        const mesh = addBox(part, base + .001, .008, ['hall', 'entry'].includes(room.id) ? mat('#e7e4d9') : mat('#ced9d5'), false); mesh.userData.floorRoom = room.id; mesh.userData.floorLevel = id
      }
    }
    if (id === 'EG') for (const part of floor.rooms.find(room => room.id === 'entry')?.tileParts ?? []) {
      if (part.footprint) continue
      for (let east = part.x + .6; east < part.x + part.width; east += .6) addBox(rect(east, part.z, .008, part.depth), base + .009, .001, stone, false)
      for (let south = part.z + .6; south < part.z + part.depth; south += .6) addBox(rect(part.x, south, part.width, .008), base + .009, .001, stone, false)
    }
    for (const wall of floor.walls) {
      const exteriorFace = { east: 0, west: 1, south: 4, north: 5 }[wall.id]
      const interiorFace = { east: 1, west: 0, south: 5, north: 4 }[wall.id]
      const wallMaterials = Array.from({ length: 6 }, (_, index) => exteriorFace !== undefined && index !== interiorFace ? facade : plaster)
      const height = cut ? 1.05 : id === 'DG' ? exteriorFace === undefined ? atticCeiling.height : roofHeight(house.depth / 2) : floor.height
      for (const solid of wallSolids(wall, height)) {
        if (solid.footprint) addStairSolid(solid, base, plaster)
        else if (id !== 'DG') { const mesh = addBox(solid, base + solid.bottom, solid.height, wallMaterials); mesh.name = `${id}-wall-${wall.id}` }
        else {
          const ridge = house.depth / 2
          const split = solid.z < ridge && solid.z + solid.depth > ridge ? [rect(solid.x, solid.z, solid.width, ridge - solid.z), rect(solid.x, ridge, solid.width, solid.z + solid.depth - ridge)] : [solid]
          for (const part of split) {
            const tops = [Math.min(solid.bottom + solid.height, roofHeight(part.z)), Math.min(solid.bottom + solid.height, roofHeight(part.z + part.depth))]
            const wedgeInteriorFace = { north: 3, south: 2, west: 5, east: 4 }[wall.id]
            if (Math.min(...tops) > solid.bottom) { const mesh = wedge(part, [base + solid.bottom, base + solid.bottom], [base + tops[0], base + tops[1]], Array.from({ length: 6 }, (_, index) => wedgeInteriorFace !== undefined && index !== wedgeInteriorFace ? facade : plaster)); mesh.name = `${id}-wall-${wall.id}` }
          }
        }
      }
      for (const opening of wall.openings) {
        if (opening.kind === 'passage') continue
        const east = wall.x + (wall.axis === 'x' ? opening.start : wall.width / 2), south = wall.z + (wall.axis === 'z' ? opening.start : wall.depth / 2)
        const openHeight = cut && opening.kind !== 'window' ? Math.min(opening.height, Math.max(0, 1.05 - opening.sill)) : opening.height
        if (opening.kind === 'window') {
          if (openHeight <= 0) continue
          const glazing = opening.cornerGlazing ? { ...opening, width: opening.width + (wall.axis === 'x' ? construction.exteriorWall / 2 : -construction.exteriorWall / 2) } : opening
          const fixedBox = (start: number, bottom: number, width: number, height: number, material: THREE.Material, thickness = .08) => {
            const bounds = wall.axis === 'x' ? rect(east + start, south - thickness / 2, width, thickness) : rect(east - thickness / 2, south + start, thickness, width)
            return addBox(bounds, base + opening.sill + bottom, height, material)
          }
          for (const start of [0, glazing.width - windowFrame]) fixedBox(start, 0, windowFrame, openHeight, frameMaterial)
          for (const bottom of [0, openHeight - windowFrame]) fixedBox(windowFrame, bottom, glazing.width - 2 * windowFrame, windowFrame, frameMaterial)
          if (opening.cornerGlazing && wall.axis === 'z') addBox(rect(east - .04, south + glazing.width - .04, .08, .08), base + opening.sill, openHeight, frameMaterial).name = `${id}-glazing-corner-coupling`
          const columns = opening.windowLayout?.columns ?? 1, lowerFixed = opening.windowLayout?.lowerFixed
          if (columns === 2) fixedBox(opening.width / 2 - windowJoint / 2, windowFrame, windowJoint, openHeight - 2 * windowFrame, frameMaterial).name = `${id}-${opening.id}-mullion`
          for (const panel of windowPanels(glazing)) {
            if (lowerFixed && panel.fixed) fixedBox(panel.start, lowerFixed - windowJoint / 2, panel.width, windowJoint, frameMaterial).name = `${id}-${opening.id}-transom-${panel.column}`
            if (panel.fixed) {
              fixedBox(panel.start, panel.bottom, panel.width, panel.height, glass, .03).name = `${id}-${opening.id}-fixed-${panel.column}`
              continue
            }
            const width = panel.width - 2 * windowGap, height = panel.height - 2 * windowGap
            const reverseHinge = panel.hinge === 'end', start = panel.start + windowGap + (reverseHinge ? width : 0)
            const pivot = new THREE.Group()
            pivot.position.set(east + (wall.axis === 'x' ? start : 0), base + opening.sill + panel.bottom + windowGap, south + (wall.axis === 'z' ? start : 0))
            pivot.rotation.y = (wall.axis === 'x' ? 0 : -Math.PI / 2) + (reverseHinge ? Math.PI : 0)
            group.add(pivot)
            const mesh = addBox(rect(.035, -.015, width - .07, .03), .035, height - .07, glass, false, false, pivot)
            for (const edge of [0, width - .035]) addBox(rect(edge, -.03, .035, .06), 0, height, frameMaterial, false, false, pivot)
            for (const bottom of [0, height - .035]) addBox(rect(.035, -.03, width - .07, .06), bottom, .035, frameMaterial, false, false, pivot)
            const direction = (['north', 'east'].includes(wall.id) ? -1 : 1) * (reverseHinge ? -1 : 1)
            addBox(rect(width - .03, direction < 0 ? .033 : -.045, .018, .012), Math.max(.12, height / 2 - .08), .16, dark, false, false, pivot)
            const leafId = `${id}-${opening.id}${panel.column ? '-secondary' : ''}`
            pivot.name = `${leafId}-sash`
            const name = ({ 'kitchen-window': 'Küche', 'wc-window': 'Dusche / Ost', 'bath-window': 'Bad', 'child-north-window': 'Kind Nord', 'living-east': 'Wohnen / Ost', 'east-north': 'Ost / Nord', 'east-south': 'Ost / Süd', 'south-west': 'Südwest', 'south-east': 'Südost', 'gable-office': 'Büro / Ostgiebel', 'gable-parents': 'Schlafen / Ostgiebel', 'well-plant': 'Technik / Lichtschacht', 'well-hobby': 'Keller / Lichtschacht' } as Record<string, string>)[opening.id] ?? opening.id
            doors.push({ id: leafId, label: `${id} · Fenster ${name}${columns === 2 ? ` · Flügel ${panel.column + 1}` : ''}`, kind: 'window', pivot, closedAngle: pivot.rotation.y, direction, amount: 0, open: false, size: new THREE.Vector3(width, height, .06), center: new THREE.Vector3(width / 2, height / 2, 0), position: pivot.position.clone(), object: mesh, sliding: false })
          }
        } else {
          const reverseHinge = opening.hinge === 'end'
          const jamb = opening.frame ?? 0, leafWidth = opening.width - 2 * jamb, leafHeight = Math.min(openHeight, opening.height - jamb)
          if (jamb) {
            const frameBox = (start: number, bottom: number, width: number, height: number) => {
              const thickness = (wall.axis === 'x' ? wall.depth : wall.width) + .02
              const bounds = wall.axis === 'x' ? rect(east + start, south - thickness / 2, width, thickness) : rect(east - thickness / 2, south + start, thickness, width)
              addBox(bounds, base + bottom, height, doorMaterial).name = `${id}-${opening.id}-frame`
            }
            for (const start of [0, opening.width - jamb]) frameBox(start, 0, jamb, openHeight)
            if (openHeight === opening.height) frameBox(jamb, leafHeight, leafWidth, jamb)
          }
          const hingeOffset = reverseHinge ? opening.width - jamb : jamb
          const pivot = new THREE.Group(); pivot.position.set(east + (wall.axis === 'x' ? hingeOffset : 0), base, south + (wall.axis === 'z' ? hingeOffset : 0)); group.add(pivot)
          const closedAngle = (wall.axis === 'x' ? 0 : -Math.PI / 2) + (reverseHinge ? Math.PI : 0)
          const sliding = opening.id === 'terrace'
          const glazed = sliding || opening.id.startsWith('garden-door')
          const mesh = addBox(rect(0, -.018, leafWidth, .036), 0, leafHeight, glazed ? glass : doorMaterial, false, false, pivot)
          mesh.name = `${id}-${opening.id}-leaf`
          if (!glazed) for (const side of [-.04, .025]) addBox(rect(leafWidth - .16, side, .12, .015), Math.min(1.02, leafHeight - .25), .025, steel, false, false, pivot)
          if (glazed) {
            for (const east of [0, opening.width - .035]) addBox(rect(east, -.025, .035, .05), 0, openHeight, frameMaterial, false, false, pivot)
            for (const bottom of [0, openHeight - .035]) addBox(rect(0, -.025, opening.width, .05), bottom, .035, frameMaterial, false, false, pivot)
            if (opening.id.startsWith('garden-door') && openHeight > .75) addBox(rect(.035, -.025, opening.width - .07, .05), .67, .06, frameMaterial, false, false, pivot).name = `${id}-${opening.id}-transom`
            addBox(rect(.1, -.08, .025, .025), Math.min(.8, openHeight - .25), .2, dark, false, false, pivot)
            addBox(rect(east, south - .09, opening.width * (sliding ? 2 : 1), .18), base, .012, frameMaterial, false)
          }
          const open = true
          const direction = (['store-north', 'parents-entry-south'].includes(wall.id) ? -1 : 1) * (reverseHinge ? -1 : 1) * (opening.swing === 'reverse' ? -1 : 1)
          const position = pivot.position.clone()
          pivot.rotation.y = closedAngle + (sliding ? 0 : direction * Math.PI / 2)
          if (sliding) { pivot.position.x += opening.width; pivot.position.z -= .07; pivot.position.y += .012 }
          const names: Record<string, string> = { entrance: 'Eingang', terrace: 'Terrasse', wc: 'Dusch-WC', bath: 'Bad / Technik', 'child-north': 'Kind Nord / Waschen', 'child-south': 'Kind Süd / Hobby', store: 'Abstellraum', pantry: 'Speisekammer', bedroom: 'Büro / Gäste', office: 'Eltern', 'attic-office': 'Büro / Gäste', 'attic-parents': 'Eltern', 'low-storage': 'Dachstauraum' }
          const roomName = floor.rooms.find(room => room.id === opening.id)?.name ?? ({ 'attic-parents-south': 'Eltern / Ankleide', 'stair-lower': 'Treppe nach oben', 'stair-upper': 'Treppe nach unten' }[opening.id])
          doors.push({ id: `${id}-${opening.id}`, label: `${id} · ${sliding ? 'Hebeschiebetür' : 'Tür'} ${roomName ?? (opening.id === 'basement-stair' ? 'Kellertreppe' : names[opening.id]) ?? opening.id}`, kind: 'door', pivot, closedAngle, direction, amount: 1, open, size: new THREE.Vector3(leafWidth, leafHeight, .036), center: mesh.position.clone(), position, object: mesh, sliding })
        }
      }
    }
    if (furnished) for (const item of floor.furniture) addFurniture(item, base)
    if (includeSite && id !== 'KG') {
      const core = stairFor()
      const edge = addBox(rect(core.x + core.width, core.z + core.runWidth, .04, core.depth - 2 * core.runWidth), base, 1, frameMaterial)
      edge.name = 'stair-eye-guard'
    }
    if (includeSite && id !== 'DG') {
      const rise = storeyRise(id)
      for (const solid of stairSolids(rise)) addStairSolid(solid, base, timber)
      for (const solid of stairGuards(rise)) addStairSolid(solid, base, plaster)
      
        for (const rail of stairHandrails(rise)) beam(new THREE.Vector3(...rail.from).add(new THREE.Vector3(0, base, 0)), new THREE.Vector3(...rail.to).add(new THREE.Vector3(0, base, 0)), .025, timber)
      
    } else if (includeSite) { const core = stairFor(); addBox(rect(core.x + core.width, core.end - core.runWidth, .065, core.runWidth), base, 1, plaster) }
  }
  if (includeSite && !walk && !showRoof && floorId !== 'KG') {
    const lowerId = floorIds[floorIds.indexOf(floorId) - 1]
    for (const solid of stairSolids(storeyRise(lowerId))) addStairSolid(solid, elevations[lowerId], timber, false)
  }
  if (walk || showRoof) {
    const ceilingBottom = elevations.DG + atticCeiling.height
    for (const part of atticCeilingPanels()) {
      const mesh = wedge(part, [ceilingBottom, ceilingBottom], [Math.min(ceilingBottom + atticCeiling.thickness, roofInnerElevation(part.z)), Math.min(ceilingBottom + atticCeiling.thickness, roofInnerElevation(part.z + part.depth))], plaster)
      mesh.name = 'attic-ceiling'
    }
    const thickness = roofVerticalThickness
    const roofAt = roofInnerElevation
    for (const part of roofPanels()) { const bottom: [number, number] = [roofAt(part.z), roofAt(part.z + part.depth)]; const panel = wedge(part, bottom, [bottom[0] + thickness, bottom[1] + thickness], [plaster, roofMaterial, roofMaterial, roofMaterial, roofMaterial, roofMaterial]); panel.name = 'main-roof-panel' }
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(construction.ridgeCapAllowance, construction.ridgeCapAllowance, house.width + .35, 20), roofMaterial)
    ridge.rotation.z = Math.PI / 2; ridge.position.set((house.width + .15) / 2, ridgeElevations.roofSurface, house.depth / 2)
    ridge.name = 'main-ridge-cap'; ridge.castShadow = true; ridge.receiveShadow = true; group.add(ridge)
    const tileCourses = new THREE.Mesh(roofTileGeometry(roofPanels(), roofAt, thickness), roofCourseMaterial)
    tileCourses.name = 'roof-tile-courses'; tileCourses.castShadow = true; tileCourses.receiveShadow = true; group.add(tileCourses)
    const roofEdge = mat('#d6dbdc', .34)
    roofEdge.metalness = .35
    roofEdge.side = THREE.DoubleSide
    for (const [side, south] of [['north', -.25], ['south', house.depth + .25]] as const) {
      const gutter = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, house.width + .35, 16, 1, true, Math.PI, Math.PI), roofEdge)
      gutter.rotation.z = Math.PI / 2; gutter.position.set((house.width + .25) / 2, roofOuterElevation(south) - .07, south); group.add(gutter)
      gutter.name = `main-gutter-${side}`
      const pipeX = house.west + .04, wallSouth = side === 'north' ? 0 : house.depth, bendRadius = .1, tubeRadius = .04, gutterY = roofOuterElevation(south) - .07
      const wallZ = side === 'north' ? wallSouth - .04 : wallSouth + .04
      const pipeTop = gutterY - bendRadius
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(tubeRadius, tubeRadius, pipeTop + .14, 12), roofEdge)
      pipe.position.set(pipeX + .04, (-.14 + pipeTop) / 2, wallZ); group.add(pipe)
      pipe.name = `main-downpipe-${side}-inner`
      const elbow = new THREE.Mesh(new THREE.TorusGeometry(bendRadius, tubeRadius, 8, 16, Math.PI / 2), roofEdge)
      elbow.rotation.y = side === 'north' ? -Math.PI / 2 : Math.PI / 2
      elbow.position.set(pipeX + .04, pipeTop, side === 'north' ? wallZ - bendRadius : wallZ + bendRadius)
      elbow.name = `main-downpipe-${side}-elbow`; elbow.castShadow = true; elbow.receiveShadow = true; group.add(elbow)
      const connector = beam(new THREE.Vector3(pipeX + .04, gutterY, side === 'north' ? wallZ - bendRadius : wallZ + bendRadius), new THREE.Vector3(pipeX + .04, gutterY, south), tubeRadius, roofEdge)
      connector.name = `main-downpipe-${side}-gutter-connector`
    }
    for (const skylight of roofWindows) {
      const southSlope = skylight.z >= house.depth / 2
      const pivot = new THREE.Group(); pivot.position.set(skylight.x, roofAt(skylight.z + skylight.depth), skylight.z + skylight.depth); const pitch = Math.PI / 2 + (southSlope ? 1 : -1) * 35 * Math.PI / 180; pivot.rotation.x = pitch; group.add(pivot)
      const length = skylight.depth / Math.cos(35 * Math.PI / 180)
      const mesh = addBox(rect(0, -.015, skylight.width, .03), -length, length, glass, false, false, pivot)
      for (const edge of [0, skylight.width - .05]) addBox(rect(edge, -.04, .05, .08), -length, length, frameMaterial, false, false, pivot)
      for (const bottom of [-length, -.05]) addBox(rect(0, -.04, skylight.width, .08), bottom, .05, frameMaterial, false, false, pivot)
      doors.push({ id: skylight.id, label: `DG · ${skylight.name}`, kind: 'window', pivot, closedAngle: 0, closedPitch: pitch, amount: 0, open: false, size: new THREE.Vector3(skylight.width, length, .03), center: mesh.position.clone(), position: pivot.position.clone(), object: mesh, sliding: false })
    }
  }
  if (walk || showRoof || floorId === 'EG') {
    for (const part of terraceParts) addBox(part, -.14, .1, dark).name = 'terrace-base'
    const deckTexture = oak.clone(); deckTexture.repeat.set(.125, 1); deckTexture.needsUpdate = true; textures.push(deckTexture)
    const deckMaterial = mat('#ffffff', .85, deckTexture)
    for (const part of terraceParts) for (let offset = 0; offset < part.width - .006; offset += .15) { const mesh = addBox(rect(part.x + offset, part.z, Math.min(.144, part.width - offset), part.depth), -.04, .04, deckMaterial); mesh.name = 'terrace-board'; mesh.castShadow = false }
    const entranceOpenings = makeFloor('EG', includeSite ? 'east' : 'west').walls.find(wall => wall.id === 'east')!.openings.filter(opening => ['entrance', 'entrance-fixed'].includes(opening.id))
    const entranceStart = Math.min(...entranceOpenings.map(opening => opening.start))
    const entranceEnd = Math.max(...entranceOpenings.map(opening => opening.start + opening.width))
    addBox(rect(house.width, entranceStart - .1, .9, entranceEnd - entranceStart + .2), -.2, .2, stone).name = 'entry-step'
    if (furnished) for (const item of includeSite ? terraceFurniture : westTerraceFurniture) addFurniture(item, 0)
  }
  if (walk || showRoof || floorId === 'KG') {
    const wells = lightWells
    if (includeSite) {
    const shape = new THREE.Shape(siteBoundary.map(([x, z]) => new THREE.Vector2(x, z)))
    for (const hole of [rect(0, 0, house.width, house.depth), rect(partner.x, partner.z, partner.width, partner.depth), ...wells, ...wells.map(well => rect(-well.x - well.width, well.z + partner.z, well.width, well.depth))]) shape.holes.push(new THREE.Path([new THREE.Vector2(hole.x, hole.z), new THREE.Vector2(hole.x + hole.width, hole.z), new THREE.Vector2(hole.x + hole.width, hole.z + hole.depth), new THREE.Vector2(hole.x, hole.z + hole.depth)]))
    const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(Math.PI / 2); geometry.translate(0, construction.terrain, 0)
    const ground = new THREE.Mesh(geometry, groundMaterial); ground.name = 'site-ground'; ground.receiveShadow = true; group.add(ground)
    triangles.push({ vertices: new Float32Array(geometry.getAttribute('position').array), indices: new Uint32Array(geometry.getIndex()!.array) })
    for (let index = 0; index < siteBoundary.length; index++) { const [x, z] = siteBoundary[index], [nextX, nextZ] = siteBoundary[(index + 1) % siteBoundary.length]; beam(new THREE.Vector3(x, construction.terrain + .02, z), new THREE.Vector3(nextX, construction.terrain + .02, nextZ), .035, stone) }
    }
    for (const well of wells) {
      addBox(well, -1.4, .12, stone).name = 'light-well-base'
      const edges = well.x >= house.width ? [rect(well.x, well.z, well.width, .08), rect(well.x, well.z + well.depth - .08, well.width, .08), rect(well.x + well.width - .08, well.z, .08, well.depth)] : [rect(well.x, well.z, .08, well.depth), rect(well.x + well.width - .08, well.z, .08, well.depth), rect(well.x, well.z, well.width, .08)]
      for (const edge of edges) addBox(edge, -1.4, 1.26, stone)
      for (let along = .08; along < well.depth; along += .12) addBox(rect(well.x, well.z + along, well.width, .012), -.14, .015, dark, false)
    }
    const soil = mat('#969b93'); soil.transparent = true; soil.opacity = .18; soil.depthWrite = false
    for (const edge of [rect(-.08, 0, .08, house.depth), rect(0, -.08, house.width, .08), rect(house.width, 0, .08, house.depth), rect(0, house.depth, house.width, .08)]) addBox(edge, elevations.KG - slabThickness('KG'), construction.terrain - elevations.KG + slabThickness('KG'), soil, false)
    groundMaterial.transparent = floorId === 'KG'; groundMaterial.opacity = floorId === 'KG' ? .25 : 1; groundMaterial.depthWrite = floorId !== 'KG'
  }
  const targetMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }); materials.push(targetMaterial)
  for (const opening of doors) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(opening.size.x, opening.size.y, opening.size.z), targetMaterial)
    target.quaternion.setFromEuler(new THREE.Euler(opening.closedPitch ?? 0, opening.closedAngle, 0))
    target.position.copy(opening.center).applyQuaternion(target.quaternion).add(opening.position)
    target.userData.opening = opening; target.name = 'opening-target'; group.add(target)
  }
  const west = includeSite ? buildScene(floorId, walk, showRoof, furnished, cutWalls, false) : undefined
  const indirectLighting = createIndirectLighting(renderedFloors, materials, coordinates, includeSite ? 'east' : 'west')
  if (west) {
    west.group.name = 'house-west'; west.group.scale.x = -1; west.group.position.z = partner.z; group.add(west.group)
    for (const collider of west.colliders) colliders.push({ position: new THREE.Vector3(-collider.position.x, collider.position.y, collider.position.z + partner.z), size: collider.size.clone(), rotation: new THREE.Quaternion(collider.rotation.x, -collider.rotation.y, -collider.rotation.z, collider.rotation.w) })
    for (const triangle of west.triangles) {
      const vertices = triangle.vertices.slice(), indices = triangle.indices.slice()
      for (let index = 0; index < vertices.length; index += 3) { vertices[index] *= -1; vertices[index + 2] += partner.z }
      for (let index = 0; index < indices.length; index += 3) { const next = indices[index + 1]; indices[index + 1] = indices[index + 2]; indices[index + 2] = next }
      triangles.push({ vertices, indices })
    }
    const mirroredNames: Record<string, string> = { Nordost: 'Nordwest', Nordwest: 'Nordost', Südost: 'Südwest', Südwest: 'Südost', Ostgiebel: 'Westgiebel', 'Ost /': 'West /' }
    for (const opening of west.doors) { opening.id = `west-${opening.id}`; opening.label = `West · ${opening.label.replace(/Nordost|Nordwest|Südost|Südwest|Ostgiebel|Ost \//g, name => mirroredNames[name])}`; doors.push(opening) }
  }
  group.updateMatrixWorld(true)
  const surroundings = includeSite && (walk || showRoof || floorId === 'KG') ? createSurroundings() : undefined
  if (surroundings) { group.add(surroundings.neighborhood, surroundings.garden); colliders.push(...surroundings.colliders) }
  const model: SceneModel = { activateVehicle(object) { return surroundings?.activateVehicle(object) ?? false }, updateVehicle(delta, reducedMotion = false) { return surroundings?.updateVehicle(delta, reducedMotion) ?? false }, setDaylight(strength) { indirectLighting.setDaylight(strength); west?.setDaylight(strength) }, group, colliders, triangles, doors, setLighting(states, activeFloor) { roomLighting.update(states, activeFloor); indirectLighting.update(states, activeFloor); party?.setEnabled(states['KG-party-effects'] ?? true, activeFloor === 'KG'); west?.setLighting(Object.fromEntries(Object.entries(states).filter(([id]) => id.startsWith('west-')).map(([id, value]) => [id.slice(5), value])), activeFloor) }, updateAnimations(seconds) { party?.update(seconds); const westActive = west?.updateAnimations(seconds); return !!party || !!westActive }, setCladding(composition, tone, profile = 'boards', house = 'east') { surroundings?.setWoodTone(house, tone); if (house === 'west') { west?.setCladding(composition, tone, profile); return } facadeFinish.setComposition(composition, tone, profile); canopyFinish.setComposition(composition, tone, 'boards') }, setCarportRoof(type) { surroundings?.setCarportRoof(type) }, toggleOpening(id) {
    const door = doors.find(door => door.id === id); if (!door) return false
    return model.setOpening(id, door.amount > 0 ? 0 : 1)
  }, setOpening(id, value) {
    if (west && id.startsWith('west-')) return west.setOpening(id, value)
    const door = doors.find(door => door.id === id); if (!door || !Number.isFinite(value)) return false
    const amount = THREE.MathUtils.clamp(value, 0, 1)
    door.amount = amount; door.open = amount > 0; door.pivot.position.copy(door.position)
    door.pivot.rotation.set(door.closedPitch === undefined ? 0 : door.closedPitch - amount * Math.PI / 5, door.closedAngle + (!door.sliding && door.closedPitch === undefined ? amount * (door.direction ?? 1) * Math.PI / 2 : 0), 0)
    if (door.sliding) { door.pivot.position.x += amount * door.size.x; door.pivot.position.z -= Math.min(1, amount * 10) * .07; door.pivot.position.y += Math.min(1, amount * 10) * .012 }
    door.pivot.updateMatrixWorld(true); return true
  }, setFinish(key, color, house = 'east') { if (house === 'west') { west?.setFinish(key, color); return } ({ facade, roof: roofMaterial, frame: frameMaterial })[key].color.set(color); if (key === 'roof') roofCourseMaterial.color.copy(roofMaterial.color).multiplyScalar(.72) }, setGroundOpacity(value) { groundMaterial.opacity = value; groundMaterial.transparent = value < 1; groundMaterial.depthWrite = value === 1 }, dispose() { if (surroundings) { group.remove(surroundings.neighborhood, surroundings.garden); surroundings.dispose() } if (west) { group.remove(west.group); west.dispose() } const geometries = new Set<THREE.BufferGeometry>(); group.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); if (object instanceof THREE.SpotLight || object instanceof THREE.PointLight) object.dispose() }); for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose(); for (const texture of textures) texture.dispose() } }
  model.setLighting({}, floorId)
  return model
}