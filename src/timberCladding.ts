import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { elevations, house, houseEnvelope, makeFloor, roofHeight, slabThickness } from './model'
import type { FloorId } from './model'
import { woodTones } from './context'
import type { FacadeComposition } from './context'

export const timberProfiles = {
  boards: { width: .135, pitch: .138, thickness: .022 },
  'board-batten': { width: .115, pitch: .13, thickness: .022 },
  rhombus: { width: .06, pitch: .072, thickness: .026 },
  slats: { width: .038, pitch: .053, thickness: .032 },
  horizontal: { width: .14, pitch: .143, thickness: .024 },
  'open-slats': { width: .038, pitch: .08, thickness: .032 },
} as const
export type TimberProfile = keyof typeof timberProfiles
export type WoodSurface = 'fresh' | 'oiled' | 'weathered'
export type WindowTimber = 'none' | 'reveals' | 'screen'
export type TimberOptions = { surface?: WoodSurface; windows?: WindowTimber }
type Point = [number, number]
type Face = 'east' | 'north' | 'south'
export type TimberPiece = { face: Face; plane: number; polygon: Point[]; back: number; thickness: number; slope: number; slopeOrigin?: number; board: number; kind: 'board' | 'batten' | 'backing' | 'reveal' | 'flashing' | 'screen'; horizontal: boolean }
type Bounds = { left: number; right: number; bottom: number; top: number }

function clip(polygon: Point[], distance: (point: Point) => number): Point[] {
  const result: Point[] = []
  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index], next = polygon[(index + 1) % polygon.length]
    const start = distance(current), end = distance(next)
    if (start >= -1e-9) result.push(current)
    if ((start < 0) !== (end < 0)) {
      const fraction = start / (start - end)
      result.push([current[0] + (next[0] - current[0]) * fraction, current[1] + (next[1] - current[1]) * fraction])
    }
  }
  return result
}
const rectangle = ({ left, right, bottom, top }: Bounds): Point[] => [[left, bottom], [right, bottom], [right, top], [left, top]]
function subtract(polygon: Point[], hole: Bounds): Point[][] {
  const left = clip(polygon, point => hole.left - point[0])
  const right = clip(polygon, point => point[0] - hole.right)
  const middle = clip(clip(polygon, point => point[0] - hole.left), point => hole.right - point[0])
  return [left, right, clip(middle, point => hole.bottom - point[1]), clip(middle, point => point[1] - hole.top)].filter(part => part.length >= 3 && Math.abs(THREE.ShapeUtils.area(part.map(point => new THREE.Vector2(...point)))) > 1e-8)
}

export function timberPieces(floors: FloorId[], composition: FacadeComposition, profile: TimberProfile, cut = false, side: 'east' | 'west' = 'east', windows: WindowTimber = 'none'): TimberPiece[] {
  if (composition === 'plaster') return []
  const pieces: TimberPiece[] = [], spec = timberProfiles[profile]
  const horizontal = profile === 'horizontal'
  for (const id of floors.filter(floor => floor !== 'KG')) {
    const floor = makeFloor(id, side), base = floor.elevation
    for (const face of ['east', 'north', 'south'] as const) {
      const wall = floor.walls.find(wall => wall.id === face)!
      const along = face === 'east' ? wall.z : wall.x
      const length = face === 'east' ? wall.depth : wall.width
      const plane = face === 'east' ? wall.x + wall.width : face === 'north' ? wall.z : wall.z + wall.depth
      const envelope = houseEnvelope()
      const front = .04 + spec.thickness + (profile === 'rhombus' ? .16 * spec.width : profile === 'board-batten' ? .02 : 0)
      const extent: Bounds = { left: face === 'east' ? along - .04 : envelope.x, right: face === 'east' ? along + length + .04 : envelope.x + envelope.width + front, bottom: Math.max(0, base - slabThickness(id)), top: base + (cut ? 1.05 : id === 'DG' ? roofHeight(house.depth / 2) : floor.height) }
      const regions: Bounds[] = []
      const upper = elevations.OG - slabThickness('OG'), attic = elevations.DG - slabThickness('DG')
      if (composition === 'timber') regions.push(extent)
      if (composition === 'upper') regions.push({ ...extent, bottom: Math.max(extent.bottom, upper) })
      if (composition === 'gable' && face === 'east') regions.push({ ...extent, bottom: Math.max(base, elevations.DG) })
      if (composition === 'og' || composition === 'og-entry') regions.push({ ...extent, bottom: Math.max(extent.bottom, upper), top: Math.min(extent.top, attic) })
      if ((composition === 'entry' || composition === 'og-entry') && face === 'east') regions.push({ left: .1, right: 1.9, bottom: 0, top: Math.min(2.7, extent.top) })
      if (composition === 'panels') regions.push({ ...extent, left: face === 'east' ? 2.7 : 4.2, right: face === 'east' ? 4.9 : 6.4 })
      const holes = wall.openings.map(opening => ({ left: along + opening.start - .012, right: along + opening.start + opening.width + .012, bottom: base + opening.sill - .012, top: base + opening.sill + opening.height + .012 }))
      const roofClip = (polygon: Point[]) => id !== 'DG' ? polygon : face === 'east'
        ? clip(clip(polygon, point => base + house.knee + (point[0] - house.north) * Math.tan(house.pitch * Math.PI / 180) - point[1]), point => base + house.knee + (house.south - point[0]) * Math.tan(house.pitch * Math.PI / 180) - point[1])
        : clip(polygon, point => base + roofHeight(plane) - point[1])
      for (const region of regions) {
        const bounds = { left: Math.max(extent.left, region.left), right: Math.min(extent.right, region.right), bottom: Math.max(extent.bottom, region.bottom), top: Math.min(extent.top, region.top) }
        if (bounds.top <= bounds.bottom || bounds.right <= bounds.left) continue
        const emit = (polygon: Point[], kind: TimberPiece['kind'], board: number, back: number, thickness: number, slope = 0) => {
          let parts = [roofClip(polygon)]
          for (const hole of holes) parts = parts.flatMap(part => subtract(part, hole))
          for (const part of parts.filter(part => part.length >= 3)) pieces.push({ face, plane, polygon: part, kind, board, back, thickness, slope, slopeOrigin: board * spec.pitch, horizontal })
        }
        emit(rectangle(bounds), 'backing', 0, .002, .003)
        const supportStart = horizontal ? bounds.left : bounds.bottom, supportEnd = horizontal ? bounds.right : bounds.top
        for (let position = Math.ceil(supportStart / .6) * .6 + .04; position < supportEnd; position += .6) {
          emit(rectangle(horizontal ? { ...bounds, left: position, right: Math.min(position + .04, supportEnd) } : { ...bounds, bottom: position, top: Math.min(position + .04, supportEnd) }), 'batten', 3, .02, .02)
        }
        if (profile === 'boards' || horizontal) emit(rectangle(bounds), 'batten', 0, .033, .007)
        emit(rectangle({ ...bounds, top: Math.min(bounds.bottom + .012, bounds.top) }), 'flashing', 0, .006, .074)
        const start = horizontal ? bounds.bottom : bounds.left, end = horizontal ? bounds.top : bounds.right
        for (let board = Math.floor(start / spec.pitch); board * spec.pitch < end; board++) {
          const lower = Math.max(start, board * spec.pitch), upper = Math.min(end, board * spec.pitch + spec.width)
          if (upper <= lower) continue
          emit(rectangle(horizontal ? { ...bounds, bottom: lower, top: upper } : { ...bounds, left: lower, right: upper }), 'board', board, .04, spec.thickness, profile === 'rhombus' ? .16 : horizontal ? -.055 : 0)
          if (profile === 'board-batten') {
            const center = board * spec.pitch + .1225
            const left = Math.max(bounds.left, center - .02), right = Math.min(bounds.right, center + .02)
            if (right > left) emit(rectangle({ ...bounds, left, right }), 'batten', board, .062, .02)
          }
        }
        for (const hole of holes) {
          if (hole.bottom < bounds.bottom || hole.top > bounds.top || hole.left < bounds.left || hole.right > bounds.right) continue
          const addDetail = (detail: Bounds, kind: TimberPiece['kind'], back: number, thickness: number) => pieces.push({ face, plane, polygon: rectangle(detail), kind, board: 0, back, thickness, slope: 0, horizontal: false })
          const inner = -.5 * (face === 'east' ? wall.width : wall.depth) + .045
          const lining = .016
          // 4 mm ragen in die Öffnung, damit keine Fläche mit Wand- oder Rahmenflächen zusammenfällt; Seiten liegen zwischen Bank und Sturz ohne Überlappung.
          for (const edge of [hole.left, hole.right - lining]) addDetail({ left: edge, right: edge + lining, bottom: hole.bottom + lining, top: hole.top - lining }, windows === 'none' ? 'flashing' : 'reveal', inner, .078 - inner)
          addDetail({ ...hole, top: hole.bottom + lining }, 'flashing', inner, .088 - inner)
          addDetail({ ...hole, bottom: hole.top - lining }, windows === 'none' ? 'flashing' : 'reveal', -.012, .09)
          if (windows === 'screen' && face === 'east' && id === 'OG' && hole.left < 5) {
            for (let position = hole.left + .07; position < hole.left + (hole.right - hole.left) * .28; position += .1) addDetail({ ...hole, left: position, right: position + .03 }, 'screen', .105, .04)
            for (const height of [hole.bottom + .05, hole.top - .07]) addDetail({ left: hole.left, right: hole.left + (hole.right - hole.left) * .28 + .03, bottom: height, top: height + .02 }, 'flashing', .085, .018)
          }
        }
      }
    }
  }
  return pieces
}

export function timberGeometry(piece: TimberPiece) {
  const points = piece.polygon.map(point => new THREE.Vector2(...point))
  const shape = new THREE.Shape(points)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: piece.thickness, bevelEnabled: false, steps: 1 })
  const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv')
  const origin = piece.slopeOrigin ?? Math.min(...piece.polygon.map(point => point[piece.horizontal ? 1 : 0]))
  for (let index = 0; index < positions.count; index++) {
    const along = positions.getX(index), height = positions.getY(index)
    const depth = positions.getZ(index) + piece.back + piece.slope * ((piece.horizontal ? height : along) - origin)
    uv.setXY(index, (piece.horizontal ? height : along) * 5 + piece.board * .173, (piece.horizontal ? along : height) / 3 + piece.board * .317)
    if (piece.face === 'east') positions.setXYZ(index, piece.plane + depth, height, along)
    else positions.setXYZ(index, along, height, piece.plane + (piece.face === 'north' ? -depth : depth))
  }
  if (piece.face === 'east' || piece.face === 'north') {
    for (const attribute of Object.values(geometry.attributes)) {
      for (let index = 0; index < attribute.count; index += 3) {
        for (let component = 0; component < attribute.itemSize; component++) {
          const first = attribute.getComponent(index, component)
          attribute.setComponent(index, component, attribute.getComponent(index + 2, component))
          attribute.setComponent(index + 2, component, first)
        }
      }
    }
  }
  geometry.computeVertexNormals()
  return geometry
}

function grainTexture(strength = 1, knotCount = 5) {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 1024
  const context = canvas.getContext('2d')!
  let seed = 6317
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  context.fillStyle = '#eeeeee'; context.fillRect(0, 0, 256, 1024)
  const knots = Array.from({ length: knotCount }, () => ({ across: random() * 256, height: random() * 1024, radius: 2 + random() * 4 }))
  for (let line = 0; line < 480; line++) {
    const across = random() * 256
    context.strokeStyle = `rgba(75,65,55,${(.035 + random() * .13) * strength})`
    context.lineWidth = .3 + random() * 1.1
    context.beginPath()
    for (let height = 0; height <= 1024; height += 8) {
      const warp = knots.reduce((sum, knot) => sum + Math.sign(across - knot.across) * 12 * Math.exp(-(((height - knot.height) / 65) ** 2) - ((across - knot.across) / 30) ** 2), 0)
      const position = across + Math.sin(height / 130 + across) * 1.7 + warp
      if (height === 0) context.moveTo(position, height); else context.lineTo(position, height)
    }
    context.stroke()
  }
  for (const knot of knots) {
    for (let ring = 5; ring >= 1; ring--) {
      context.strokeStyle = `rgba(85,65,45,${.08 + (5 - ring) * .025})`
      context.beginPath(); context.ellipse(knot.across, knot.height, knot.radius + ring * 1.6, knot.radius * 2 + ring * 4, .06, 0, Math.PI * 2); context.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8
  return texture
}

export function createTimberCladding(floors: FloorId[], cut: boolean, side: 'east' | 'west') {
  const group = new THREE.Group(); group.name = 'timber-cladding'
  const textures = [grainTexture(), grainTexture(.6, 3), grainTexture(1.3, 4), grainTexture(.75, 3)]
  const texture = textures[0]
  const wood = Array.from({ length: 12 }, () => new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: .00045, roughness: .82 }))
  const backing = new THREE.MeshStandardMaterial({ color: '#464944', roughness: 1 })
  const metal = new THREE.MeshStandardMaterial({ color: '#a5aaa0', roughness: .6, metalness: .25 })
  const materials = [...wood, backing, metal]
  let currentGeometry = ''
  const clear = () => {
    group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
    group.clear()
  }
  return {
    group, materials,
    set(composition: FacadeComposition, tone: number, profile: TimberProfile, options: TimberOptions = {}) {
      const surface = options.surface ?? 'fresh', windows = options.windows ?? 'none'
      const baseColor = new THREE.Color(woodTones[tone]?.color ?? woodTones[0].color)
      if (surface === 'weathered') baseColor.lerp(new THREE.Color('#969b94'), .91)
      if (surface === 'oiled') baseColor.multiplyScalar(.86)
      for (const [index, material] of wood.entries()) {
        const variation = Math.sin(index * 17.13) * .025
        material.color.copy(baseColor).offsetHSL(variation * .1, variation * .35, variation)
        material.map = material.bumpMap = textures[tone === 8 ? 1 : tone === 9 ? 2 : tone === 10 ? 3 : 0]
        material.roughness = surface === 'oiled' ? .6 : surface === 'weathered' ? .94 : .82
        material.bumpScale = tone === 8 || tone === 10 ? .0003 : .0006
      }
      const key = `${composition}:${profile}:${windows}`
      if (key === currentGeometry) return
      currentGeometry = key; clear()
      const pieces = timberPieces(floors, composition, profile, cut, side, windows)
      const batches = new Map<number, THREE.BufferGeometry[]>()
      for (const piece of pieces) {
        const material = piece.kind === 'backing' ? 12 : piece.kind === 'flashing' ? 13 : ((piece.board * 7) % 12 + 12) % 12
        const batch = batches.get(material) ?? []
        batch.push(timberGeometry(piece)); batches.set(material, batch)
      }
      for (const [index, batch] of batches) {
        const geometry = mergeGeometries(batch)
        for (const part of batch) part.dispose()
        const mesh = new THREE.Mesh(geometry, materials[index])
        mesh.name = index === 12 ? 'timber-backing' : index === 13 ? 'timber-flashing' : `timber-boards-${index}`
        mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
      }
      group.userData = { profile, composition, windows, pieces: pieces.length, boards: pieces.filter(piece => piece.kind === 'board' || piece.kind === 'batten').length }
      group.updateMatrixWorld(true)
    },
    dispose() { clear(); for (const texture of textures) texture.dispose(); for (const material of materials) material.dispose() },
  }
}