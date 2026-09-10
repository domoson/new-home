import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { elevations, floorIds, floorSlabs, lightWells, makeFloor, rect, roofHeight, roofPanels, roofWindows, stairFor, stairGuards, stairHandrails, stairSolids, wallSolids } from './model'
import { terraceFurniture, terraceParts } from './terrace'
import { createPartyRoom } from './partyRoom'
import { createRoomLighting } from './lighting'
import { createIndirectLighting } from './indirectLighting'
import { stairPrism } from './winderStair'
import type { FloorId, Furniture, Rect, Solid } from './model'
import { initialAppearance, partner, siteBoundary } from './context'
import type { FacadeComposition, FinishKey, WoodProfile } from './context'
import { createFacadeMaterial } from './facade'
import { flatGeometry } from './geometry'
import { createSurroundings } from './surroundings'

export type ColliderShape = { position: THREE.Vector3; size: THREE.Vector3; rotation: THREE.Quaternion }
export type DoorModel = { id: string; label: string; kind: 'door' | 'window'; pivot: THREE.Group; closedAngle: number; closedPitch?: number; direction?: number; amount: number; open: boolean; size: THREE.Vector3; center: THREE.Vector3; position: THREE.Vector3; object: THREE.Mesh; sliding: boolean }
export type SceneModel = { setDaylight: (strength: number) => void; group: THREE.Group; colliders: ColliderShape[]; triangles: { vertices: Float32Array; indices: Uint32Array }[]; doors: DoorModel[]; setLighting: (states: Record<string, boolean>, activeFloor: FloorId) => void; updateAnimations: (seconds: number) => boolean; setOpening: (id: string, amount: number) => boolean; toggleOpening: (id: string) => boolean; setFinish: (key: FinishKey, color: string, house?: 'east' | 'west') => void; setCladding: (composition: FacadeComposition, tone: number, profile?: WoodProfile, house?: 'east' | 'west') => void; setGroundOpacity: (value: number) => void; dispose: () => void }

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
  const doorMaterial = mat('#dfd6c2', .75, oak)
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
    const box = (east: number, south: number, wide: number, deep: number, bottom: number, high: number, material: THREE.Material, round = false) => addBox(rect(east, south, wide, deep), elevation + bottom, high, material, false, round)
    const surface = (bottom: number, high: number, material: THREE.Material, round = false) => box(x, z, width, depth, bottom, high, material, round)
    if (!['plant', 'tv', 'shower'].includes(kind)) colliders.push({ position: new THREE.Vector3(x + width / 2, elevation + height / 2, z + depth / 2), size: new THREE.Vector3(width, height, depth), rotation: new THREE.Quaternion() })
    if (kind === 'bed' && item.angle === Math.PI / 2) {
      surface(.12, .17, timber, true); surface(.29, .2, ceramic, true)
      box(x + .02, z + .025, width - .55, depth - .05, .49, .055, sage, true)
      for (const south of [z + .1, z + depth / 2 + .04]) box(x + width - .48, south, .32, depth / 2 - .16, .49, .1, linen, true)
      box(x + width - .07, z, .07, depth, .12, .68, timber, true)
    } else if (kind === 'bed') {
      surface(.12, .17, timber, true); surface(.29, .2, ceramic, true); box(x + .025, z + .55, width - .05, depth - .57, .49, .055, sage, true)
      const count = width > 1.3 ? 2 : 1
      for (let index = 0; index < count; index++) box(x + .1 + index * width / count, z + .13, width / count - .2, .32, .49, .1, linen, true)
      box(x, z, width, .07, .12, .68, timber, true)
    } else if (kind === 'sofa' && item.angle === Math.PI / 2) {
      surface(.1, .2, timber, true); box(x + width - .18, z, .18, depth, .28, .52, linen, true)
      for (let index = 0; index < 3; index++) { box(x + .02, z + .1 + index * (depth - .2) / 3, width - .22, (depth - .25) / 3, .3, .18, linen, true); box(x + width - .36, z + .18 + index * .82, .16, .43, .47, .3, index === 1 ? sage : linen, true) }
      box(x, z, width, .1, .3, .25, linen, true)
    } else if (kind === 'sofa') {
      surface(.1, .2, timber, true); box(x, z, width, .18, .28, .52, linen, true)
      for (let index = 0; index < 3; index++) { box(x + .1 + index * (width - .2) / 3, z + .2, (width - .25) / 3, depth - .22, .3, .18, linen, true); box(x + .18 + index * .82, z + .2, .43, .16, .47, .3, index === 1 ? sage : linen, true) }
      box(x, z, .1, depth, .3, .25, linen, true); box(x + width - .1, z, .1, depth, .3, .25, linen, true)
    } else if (kind === 'chaise') {
      surface(.1, .2, timber, true); surface(.3, .18, linen, true)
    } else if (kind === 'bookcase') {
      const white = mat(item.color ?? '#fafafa')
      const alongX = width > depth, length = Math.max(width, depth), shelfDepth = Math.min(width, depth)
      const shelfBox = (along: number, inward: number, wide: number, deep: number, bottom: number, high: number, material: THREE.Material) => {
        const mesh = alongX ? box(x + along, z + inward, wide, deep, bottom, high, material) : box(x + inward, z + along, deep, wide, bottom, high, material)
        mesh.userData.furniture = item.id
      }
      const rows = Math.max(2, Math.round(height / .4)), pitch = (height - .03) / rows, bayWidth = length / 3
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
      surface(height - .06, .06, timber, true)
      for (const east of [x + .08, x + width - .14]) for (const south of [z + .08, z + depth - .14]) box(east, south, .06, .06, .02, height - .08, timber)
      if (kind === 'desk') { box(x + width * .5, z + depth * .3, .06, depth * .4, height + .15, .32, dark); box(x + .18, z + depth * .4, .18, depth * .2, height, .02, teal) }
    } else if (kind === 'bench') {
      surface(.39, .06, timber, true); surface(.45, .06, sage, true)
      box(x + width - .07, z, .07, depth, .45, height - .45, timber, true)
      for (const south of [z + .12, z + depth - .18]) box(x + .06, south, width - .12, .06, .02, .37, timber)
    } else if (kind === 'chair') {
      surface(.42, .06, timber, true)
      if (item.angle) box(item.angle < 0 ? x : x + width - .065, z, .065, depth, .45, .33, timber, true)
      else box(x, z, width, .065, .45, .33, timber, true)
      for (const east of [x + .04, x + width - .08]) for (const south of [z + .04, z + depth - .08]) box(east, south, .04, .04, .01, .42, timber)
    } else if (kind === 'cabinet' || kind === 'counter') {
      surface(.06, height - .09, kind === 'counter' ? sage : timber)
      surface(height - .03, .03, kind === 'counter' ? stone : timber)
      const count = Math.max(1, Math.round(Math.max(width, depth) / .6))
      for (let index = 1; index < count; index++) if (width > depth) box(x + index * width / count, z + depth, .008, .003, .09, height - .15, dark); else box(x, z + index * depth / count, .003, .008, .09, height - .15, dark)
      
      if (item.id === 'kitchen-tall') {
        box(x + .64, z + depth + .002, .52, .018, .85, .55, dark)
        box(x + .69, z + depth + .025, .42, .025, 1.32, .025, stone)
        box(x, z + depth + .005, width, .01, 2.1, .008, dark)
      }
    } else if (kind === 'hob') {
      surface(0, height, dark, true)
      for (const east of [.18, width - .18]) for (const south of [.14, depth - .14]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.095, .003, 6, 32), stone); ring.rotation.x = Math.PI / 2; ring.position.set(x + east, elevation + height + .004, z + south); group.add(ring)
      }
      box(x + width / 2 - .035, z + .04, .07, depth - .08, height + .001, .006, teal)
    } else if (kind === 'espresso') {
      surface(.02, .035, dark, true)
      box(x, z, width, depth * .55, .055, height - .055, ceramic, true)
      box(x + .035, z + depth * .55, width - .07, .06, height * .7, .06, stone)
      beam(new THREE.Vector3(x + width / 2, elevation + height * .68, z + depth * .58), new THREE.Vector3(x + width / 2, elevation + height * .68, z + depth), .018, dark)
      box(x + .08, z + depth * .63, .09, .09, .06, .09, ceramic, true)
      beam(new THREE.Vector3(x + width - .04, elevation + .28, z + .18), new THREE.Vector3(x + width - .025, elevation + .1, z + .32), .009, stone)
    } else if (kind === 'sink') {
      surface(height - .18, .18, ceramic, true); box(x + .07, z + .07, width - .14, depth - .14, height, .008, teal, true)
      beam(new THREE.Vector3(x + .1, elevation + height, z + .08), new THREE.Vector3(x + .1, elevation + height + .24, z + .08), .012, dark)
    } else if (kind === 'wc') {
      box(x + .12, z + .13, width - .24, depth - .15, .05, .34, ceramic, true); surface(.38, .06, ceramic, true); box(x + .1, z + .2, width - .2, depth - .3, .442, .006, stone, true)
    } else if (kind === 'bath') {
      surface(.03, height - .03, ceramic, true); box(x + .09, z + .09, width - .18, depth - .18, height, .008, stone, true)
    } else if (kind === 'shower') {
      surface(.015, .025, ceramic); box(x + width - .02, z, .015, depth * .65, .04, 1.95, glass)
      beam(new THREE.Vector3(x + .12, elevation + 1, z + .12), new THREE.Vector3(x + .12, elevation + 2.1, z + .12), .015, dark)
      box(x + .05, z + .05, .2, .2, 2.1, .025, dark)
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
  const roomLighting = createRoomLighting(renderedFloors, materials); group.add(roomLighting.group)
  const party = furnished && renderedFloors.includes('KG') ? createPartyRoom(materials) : undefined
  if (party) group.add(party.group)
  for (const id of renderedFloors) {
    const floor = makeFloor(id), base = floor.elevation
    const cut = cutWalls && !walk && !showRoof
    for (const slab of floorSlabs(id)) {
      const texture = oak.clone(); texture.repeat.set(slab.width / 2, slab.depth / 2); texture.needsUpdate = true; textures.push(texture)
      const floorMaterial = id === 'KG' ? stone : mat('#ffffff', .8, texture)
      const mesh = addBox(slab, base - .3, .3, [Math.abs(slab.x + slab.width - 7.5) < .000001 ? facade : plaster, slab.x === 0 ? facade : plaster, floorMaterial, plaster, Math.abs(slab.z + slab.depth - 10) < .000001 ? facade : plaster, slab.z === 0 ? facade : plaster]); mesh.name = `${id}-slab`
    }
    for (const room of floor.rooms.filter(room => ['wc', 'bath', 'hall', 'pantry'].includes(room.id))) for (const part of room.parts) {
      if (room.id === 'hall' && id !== 'EG') {
        const parquet = oak.clone(); parquet.repeat.set(part.width / 2, part.depth / 2); parquet.needsUpdate = true; textures.push(parquet)
        const mesh = addBox(part, base + .001, .008, mat('#ffffff', .8, parquet), false); mesh.userData.floorRoom = room.id; mesh.userData.floorLevel = id
      } else {
        const mesh = addBox(part, base + .001, .008, room.id === 'hall' ? mat('#e7e4d9') : mat('#ced9d5'), false); mesh.userData.floorRoom = room.id; mesh.userData.floorLevel = id
      }
    }
    if (id === 'EG') for (const part of floor.rooms.find(room => room.id === 'hall')!.parts) {
      for (let east = part.x + .6; east < part.x + part.width; east += .6) addBox(rect(east, part.z, .008, part.depth), base + .009, .001, stone, false)
      for (let south = part.z + .6; south < part.z + part.depth; south += .6) addBox(rect(part.x, south, part.width, .008), base + .009, .001, stone, false)
    }
    for (const wall of floor.walls) {
      const exteriorFace = { east: 0, west: 1, south: 4, north: 5 }[wall.id]
      const interiorFace = { east: 1, west: 0, south: 5, north: 4 }[wall.id]
      const wallMaterials = Array.from({ length: 6 }, (_, index) => exteriorFace !== undefined && index !== interiorFace ? facade : plaster)
      const height = cut ? 1.05 : id === 'DG' ? roofHeight(5) : floor.height
      for (const solid of wallSolids(wall, height)) {
        if (id !== 'DG') { const mesh = addBox(solid, base + solid.bottom, solid.height, wallMaterials); mesh.name = `${id}-wall-${wall.id}` }
        else {
          const split = solid.z < 5 && solid.z + solid.depth > 5 ? [rect(solid.x, solid.z, solid.width, 5 - solid.z), rect(solid.x, 5, solid.width, solid.z + solid.depth - 5)] : [solid]
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
          const bounds = wall.axis === 'x' ? rect(east, south - .015, opening.width, .03) : rect(east - .015, south, .03, opening.width)
          if (opening.id.includes('fixed')) addBox(bounds, base + opening.sill, openHeight, glass)
          else {
            const pivot = new THREE.Group(); pivot.position.set(east, base + opening.sill, south); pivot.rotation.y = wall.axis === 'x' ? 0 : -Math.PI / 2; group.add(pivot)
            const mesh = addBox(rect(0, -.015, opening.width, .03), 0, openHeight, glass, false, false, pivot)
            for (const edge of [0, opening.width - .04]) addBox(rect(edge, -.035, .04, .07), 0, openHeight, frameMaterial, false, false, pivot)
            for (const bottom of [0, openHeight - .04]) addBox(rect(0, -.035, opening.width, .07), bottom, .04, frameMaterial, false, false, pivot)
            const labels: Record<string, string> = { 'wc-window': 'Dusch-WC', 'kitchen-window': 'Küche', 'multifunction-window': 'Multifunktion', 'gable-office': 'Eltern / Ostgiebel', 'gable-office-north': 'Gäste / Arbeit / Ostgiebel', 'well-laundry': 'Waschen / Lichtschacht', 'well-hobby': 'Kinderpartyraum / Lichtschacht', 'well-plant': 'Technik / Lichtschacht' }
            doors.push({ id: `${id}-${opening.id}`, label: `${id} · Fenster ${labels[opening.id] ?? ({ 'north-west': 'Nordwest', 'north-east': 'Nordost', 'east-north': 'Ost / Nord', 'east-south': 'Ost / Süd', 'south-east': 'Südost', 'south-west': 'Südwest' }[opening.id] ?? opening.id)}`, kind: 'window', pivot, closedAngle: pivot.rotation.y, direction: ['north', 'east'].includes(wall.id) ? -1 : 1, amount: 0, open: false, size: new THREE.Vector3(opening.width, openHeight, .03), center: mesh.position.clone(), position: pivot.position.clone(), object: mesh, sliding: false })
          }
          for (const fraction of [0, 1]) addBox(wall.axis === 'x' ? rect(east + fraction * opening.width - .025, south - .04, .05, .08) : rect(east - .04, south + fraction * opening.width - .025, .08, .05), base + opening.sill, openHeight, frameMaterial, false)
          addBox(wall.axis === 'x' ? rect(east, south - .06, opening.width, .12) : rect(east - .06, south, .12, opening.width), base + opening.sill - .025, .05, frameMaterial, false)
        } else {
          const reverseHinge = opening.hinge === 'end'
          const pivot = new THREE.Group(); pivot.position.set(east + (reverseHinge && wall.axis === 'x' ? opening.width : 0), base, south + (reverseHinge && wall.axis === 'z' ? opening.width : 0)); group.add(pivot)
          const closedAngle = (wall.axis === 'x' ? 0 : -Math.PI / 2) + (reverseHinge ? Math.PI : 0)
          const sliding = opening.id === 'terrace'
          const mesh = addBox(rect(0, -.018, opening.width, .036), 0, openHeight, sliding ? glass : doorMaterial, false, false, pivot)
          if (sliding) {
            for (const east of [0, opening.width - .035]) addBox(rect(east, -.025, .035, .05), 0, openHeight, frameMaterial, false, false, pivot)
            for (const bottom of [0, openHeight - .035]) addBox(rect(0, -.025, opening.width, .05), bottom, .035, frameMaterial, false, false, pivot)
            addBox(rect(.1, -.08, .025, .025), Math.min(.8, openHeight - .25), .2, dark, false, false, pivot)
            addBox(rect(east, south - .09, opening.width * 2, .18), base, .012, frameMaterial, false)
          }
          const open = true
          const direction = (['store-north', 'parents-entry-south'].includes(wall.id) ? -1 : 1) * (reverseHinge ? -1 : 1) * (opening.swing === 'reverse' ? -1 : 1)
          const position = pivot.position.clone()
          pivot.rotation.y = closedAngle + (sliding ? 0 : direction * Math.PI / 2)
          if (sliding) { pivot.position.x += opening.width; pivot.position.z -= .07; pivot.position.y += .012 }
          const names: Record<string, string> = { entrance: 'Eingang', terrace: 'Terrasse', wc: 'Dusch-WC', bath: 'Bad / Technik', 'child-north': 'Kind Nord / Waschen', 'child-south': 'Kind Süd / Hobby', store: 'Abstellraum', pantry: 'Speisekammer', bedroom: 'Büro / Gäste', office: 'Eltern', 'attic-office': 'Büro / Gäste', 'attic-parents': 'Eltern', 'low-storage': 'Dachstauraum' }
          const roomName = floor.rooms.find(room => room.id === opening.id)?.name ?? (opening.id === 'attic-parents-south' ? 'Eltern / Ankleide' : undefined)
          doors.push({ id: `${id}-${opening.id}`, label: `${id} · ${sliding ? 'Hebeschiebetür' : 'Tür'} ${roomName ?? names[opening.id] ?? opening.id}`, kind: 'door', pivot, closedAngle, direction, amount: 1, open, size: new THREE.Vector3(opening.width, openHeight, .036), center: mesh.position.clone(), position, object: mesh, sliding })
        }
      }
    }
    if (furnished) for (const item of floor.furniture) addFurniture(item, base)
    if (id !== 'DG') {
      const rise = id === 'KG' ? 2.7 : 2.95
      for (const solid of stairSolids(rise)) addStairSolid(solid, base, timber)
      for (const solid of stairGuards(rise)) addStairSolid(solid, base, plaster)
      
        for (const rail of stairHandrails(rise)) beam(new THREE.Vector3(...rail.from).add(new THREE.Vector3(0, base, 0)), new THREE.Vector3(...rail.to).add(new THREE.Vector3(0, base, 0)), .025, timber)
      
    } else { const core = stairFor(); addBox(rect(core.x + core.width, core.z, .065, core.runWidth), base, 1, plaster) }
  }
  if (!walk && !showRoof && floorId !== 'KG') {
    const lowerId = floorIds[floorIds.indexOf(floorId) - 1]
    for (const solid of stairSolids(lowerId === 'KG' ? 2.7 : 2.95)) addStairSolid(solid, elevations[lowerId], timber, false)
  }
  if (walk || showRoof) {
    const thickness = .25 / Math.cos(35 * Math.PI / 180)
    const roofAt = (south: number) => 5.9 + .5 + Math.min(south - .365, 9.635 - south) * Math.tan(35 * Math.PI / 180)
    for (const part of roofPanels()) { const bottom: [number, number] = [roofAt(part.z), roofAt(part.z + part.depth)]; wedge(part, bottom, [bottom[0] + thickness, bottom[1] + thickness], [plaster, roofMaterial]) }
    for (const skylight of roofWindows) {
      const southSlope = skylight.z >= 5
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
    addBox(rect(7.5, .3, 1.5, 3), -.14, .14, stone)
    addBox(rect(7.5, .35, 1.2, 2.2), 2.35, .16, canopyFinish.material).name = 'entry-canopy-roof'
    addBox(rect(7.5, .35, 1.2, .12), 0, 2.35, canopyFinish.material).name = 'entry-canopy-side'
    if (furnished) for (const item of terraceFurniture) addFurniture(item, 0)
  }
  if (walk || showRoof || floorId === 'KG') {
    const wells = lightWells
    if (includeSite) {
    const shape = new THREE.Shape(siteBoundary.map(([x, z]) => new THREE.Vector2(x, z)))
    for (const hole of [rect(0, 0, 7.5, 10), rect(partner.x, partner.z, partner.width, partner.depth), ...wells, ...wells.map(well => rect(-well.x - well.width, well.z + partner.z, well.width, well.depth))]) shape.holes.push(new THREE.Path([new THREE.Vector2(hole.x, hole.z), new THREE.Vector2(hole.x + hole.width, hole.z), new THREE.Vector2(hole.x + hole.width, hole.z + hole.depth), new THREE.Vector2(hole.x, hole.z + hole.depth)]))
    const geometry = new THREE.ShapeGeometry(shape); geometry.rotateX(Math.PI / 2); geometry.translate(0, -.14, 0)
    const ground = new THREE.Mesh(geometry, groundMaterial); ground.name = 'site-ground'; ground.receiveShadow = true; group.add(ground)
    triangles.push({ vertices: new Float32Array(geometry.getAttribute('position').array), indices: new Uint32Array(geometry.getIndex()!.array) })
    for (let index = 0; index < siteBoundary.length; index++) { const [x, z] = siteBoundary[index], [nextX, nextZ] = siteBoundary[(index + 1) % siteBoundary.length]; beam(new THREE.Vector3(x, -.12, z), new THREE.Vector3(nextX, -.12, nextZ), .035, stone) }
    }
    for (const well of wells) {
      addBox(well, -1.4, .12, stone)
      const edges = well.x > 7 ? [rect(well.x, well.z, well.width, .08), rect(well.x, well.z + well.depth - .08, well.width, .08), rect(well.x + well.width - .08, well.z, .08, well.depth)] : [rect(well.x, well.z, .08, well.depth), rect(well.x + well.width - .08, well.z, .08, well.depth), rect(well.x, well.z, well.width, .08)]
      for (const edge of edges) addBox(edge, -1.4, 1.26, stone)
      for (let along = .08; along < well.depth; along += .12) addBox(rect(well.x, well.z + along, well.width, .012), -.14, .015, dark, false)
    }
    const soil = mat('#969b93'); soil.transparent = true; soil.opacity = .18; soil.depthWrite = false
    for (const edge of [rect(-.08, 0, .08, 10), rect(0, -.08, 7.5, .08), rect(7.5, 0, .08, 10), rect(0, 10, 7.5, .08)]) addBox(edge, -3, 2.86, soil, false)
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
  const indirectLighting = createIndirectLighting(renderedFloors, materials, coordinates)
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
  const model: SceneModel = { setDaylight(strength) { indirectLighting.setDaylight(strength); west?.setDaylight(strength) }, group, colliders, triangles, doors, setLighting(states, activeFloor) { roomLighting.update(states, activeFloor); indirectLighting.update(states, activeFloor); party?.setEnabled(states['KG-party-effects'] ?? true, activeFloor === 'KG'); west?.setLighting(Object.fromEntries(Object.entries(states).filter(([id]) => id.startsWith('west-')).map(([id, value]) => [id.slice(5), value])), activeFloor) }, updateAnimations(seconds) { party?.update(seconds); const westActive = west?.updateAnimations(seconds); return !!party || !!westActive }, setCladding(composition, tone, profile = 'boards', house = 'east') { surroundings?.setWoodTone(house, tone); if (house === 'west') { west?.setCladding(composition, tone, profile); return } facadeFinish.setComposition(composition, tone, profile); canopyFinish.setComposition(composition, tone, 'boards') }, toggleOpening(id) {
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
  }, setFinish(key, color, house = 'east') { if (house === 'west') { west?.setFinish(key, color); return } ({ facade, roof: roofMaterial, frame: frameMaterial })[key].color.set(color) }, setGroundOpacity(value) { groundMaterial.opacity = value; groundMaterial.transparent = value < 1; groundMaterial.depthWrite = value === 1 }, dispose() { if (surroundings) { group.remove(surroundings.neighborhood, surroundings.garden); surroundings.dispose() } if (west) { group.remove(west.group); west.dispose() } const geometries = new Set<THREE.BufferGeometry>(); group.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); if (object instanceof THREE.SpotLight || object instanceof THREE.PointLight) object.dispose() }); for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose(); for (const texture of textures) texture.dispose() } }
  model.setLighting({}, floorId)
  return model
}