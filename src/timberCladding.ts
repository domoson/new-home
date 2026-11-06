import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { elevations, entryCanopy, house, houseEnvelope, makeFloor, roofFacadeRise, roofHeight, slabThickness } from './model'
import type { FloorId } from './model'
import { woodTones } from './context'
import type { FacadeComposition } from './context'

export const timberProfiles = {
  boards: { width: .135, pitch: .138, thickness: .022 },
  'board-batten': { width: .115, pitch: .13, thickness: .022 },
  rhombus: { width: .06, pitch: .072, thickness: .026 },
  slats: { width: .038, pitch: .053, thickness: .032 },
  horizontal: { width: .14, pitch: .143, thickness: .024 },
  shiplap: { width: .19, pitch: .174, thickness: .024 },
  'variable-width': { width: .19, pitch: .432, thickness: .024 },
  grooved: { width: .19, pitch: .193, thickness: .024 },
  bevelled: { width: .135, pitch: .14, thickness: .028 },
  'alternating-depth': { width: .075, pitch: .14, thickness: .04 },
  'open-slats': { width: .038, pitch: .08, thickness: .032 },
} as const
export type TimberProfile = keyof typeof timberProfiles
export type WoodSurface = 'fresh' | 'oiled' | 'weathered'
export type WindowTimber = 'none' | 'reveals' | 'screen'
export type TimberArea = { id: string; face: 'east' | 'north' | 'south'; floor: 'EG' | 'OG' | 'DG'; from: number; to: number; bottom: number; top: number; material: 'wood' | 'plaster'; enabled?: boolean }
export type TimberOptions = { surface?: WoodSurface; windows?: WindowTimber; areas?: TimberArea[] }
export const timberStoreyJoint = { height: .04, projection: .018, gap: .006 } as const
type Point = [number, number]
type Face = 'east' | 'north' | 'south'
export type TimberPiece = { face: Face; plane: number; polygon: Point[]; back: number; thickness: number; slope: number; frontSlope?: number; slopeOrigin?: number; board: number; kind: 'board' | 'batten' | 'backing' | 'reveal' | 'flashing' | 'storey-joint' | 'screen'; horizontal: boolean }
type Bounds = { left: number; right: number; bottom: number; top: number }
type BoardSection = { start: number; end: number; back: number; thickness: number; slope: number; frontSlope: number; origin: number; board: number; kind: 'board' | 'batten' }

export function timberBoardSections(profile: TimberProfile, start: number, end: number): BoardSection[] {
  const spec = timberProfiles[profile], sections: BoardSection[] = []
  for (let repeat = Math.floor((start - spec.width) / spec.pitch); repeat * spec.pitch < end; repeat++) {
    const origin = repeat * spec.pitch
    const add = (left: number, right: number, thickness: number, back = 0, frontSlope = 0, board = repeat, kind: BoardSection['kind'] = 'board', slope = 0) => {
      const lower = Math.max(start, origin + left), upper = Math.min(end, origin + right)
      if (upper > lower + 1e-8) sections.push({ start: lower, end: upper, back, thickness, slope, frontSlope, origin: origin + left, board, kind })
    }
    if (profile === 'shiplap') {
      add(0, .018, .01); add(.018, .174, .024); add(.174, .19, .012, .012)
    } else if (profile === 'variable-width') {
      add(0, .09, .024, 0, 0, repeat * 3)
      add(.094, .234, .024, 0, 0, repeat * 3 + 1)
      add(.238, .428, .024, 0, 0, repeat * 3 + 2)
    } else if (profile === 'grooved') {
      let left = 0
      for (const center of [.0475, .095, .1425]) {
        add(left, center - .003, .024)
        add(center - .003, center - .001, .024, 0, -1.5)
        add(center - .001, center + .001, .021)
        add(center + .001, center + .003, .021, 0, 1.5)
        left = center + .003
      }
      add(left, spec.width, .024)
    } else if (profile === 'bevelled') {
      add(0, .018, .01, 0, 1)
      add(.018, .117, .028)
      add(.117, .135, .028, 0, -1)
    } else if (profile === 'alternating-depth') {
      add(0, .045, .024, 0, 0, repeat * 2)
      add(.055, .13, .04, 0, 0, repeat * 2 + 1)
    } else {
      add(0, spec.width, spec.thickness, 0, 0, repeat, 'board', profile === 'rhombus' ? .16 : profile === 'horizontal' ? -.055 : 0)
      if (profile === 'board-batten') add(.1025, .1425, .02, .022, 0, repeat, 'batten')
    }
  }
  return sections
}

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

function areaBounds(area: TimberArea, extent: Bounds): Bounds {
  const percent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) / 100
  return { left: extent.left + percent(area.from) * (extent.right - extent.left), right: extent.left + percent(area.to) * (extent.right - extent.left), bottom: extent.bottom + percent(area.bottom) * (extent.top - extent.bottom), top: extent.bottom + percent(area.top) * (extent.top - extent.bottom) }
}

function coverageBounds(areas: TimberArea[], extent: Bounds): Bounds[] {
  const result: Bounds[] = []
  const valid = areas.filter(area => area.enabled !== false).map(area => ({ material: area.material, bounds: areaBounds(area, extent) })).filter(({ bounds }) => bounds.right > bounds.left && bounds.top > bounds.bottom)
  const boundsOf = (polygon: Point[]): Bounds => ({ left: Math.min(...polygon.map(point => point[0])), right: Math.max(...polygon.map(point => point[0])), bottom: Math.min(...polygon.map(point => point[1])), top: Math.max(...polygon.map(point => point[1])) })
  for (const { bounds } of valid.filter(area => area.material === 'wood')) {
    let parts = [rectangle(bounds)]
    for (const previous of result) parts = parts.flatMap(part => subtract(part, previous))
    result.push(...parts.map(boundsOf))
  }
  let parts = result.map(rectangle)
  for (const { bounds } of valid.filter(area => area.material === 'plaster')) parts = parts.flatMap(part => subtract(part, bounds))
  return parts.map(boundsOf)
}

function presetRegions(composition: FacadeComposition, face: TimberArea['face'], extent: Bounds, base: number): Bounds[] {
  const regions: Bounds[] = [], upper = elevations.OG - slabThickness('OG'), attic = elevations.DG - slabThickness('DG')
  if (composition === 'timber' || composition === 'custom') regions.push(extent)
  if (composition === 'upper') regions.push({ ...extent, bottom: Math.max(extent.bottom, upper) })
  if (composition === 'gable' && face === 'east') regions.push({ ...extent, bottom: Math.max(base, elevations.DG) })
  if (composition === 'og' || composition === 'og-entry') regions.push({ ...extent, bottom: Math.max(extent.bottom, upper), top: Math.min(extent.top, attic) })
  if ((composition === 'entry' || composition === 'og-entry') && face === 'east') regions.push({ left: .1, right: 1.9, bottom: 0, top: Math.min(2.7, extent.top) })
  if (composition === 'panels') regions.push({ ...extent, left: face === 'east' ? 2.7 : 4.2, right: face === 'east' ? 4.9 : 6.4 })
  return regions
}

export function timberPresetAreas(composition: FacadeComposition, profile: TimberProfile): TimberArea[] {
  const result: TimberArea[] = [], envelope = houseEnvelope(), spec = timberProfiles[profile]
  const front = .04 + spec.thickness + (profile === 'rhombus' ? .16 * spec.width : profile === 'board-batten' ? .02 : 0)
  for (const floorId of ['EG', 'OG', 'DG'] as const) {
    const floor = makeFloor(floorId)
    for (const face of ['east', 'north', 'south'] as const) {
      const roofTop = face === 'east' ? roofHeight(house.depth / 2) : roofHeight(face === 'north' ? envelope.z : envelope.z + envelope.depth) - .1 * Math.tan(house.pitch * Math.PI / 180)
      const extent = { left: face === 'east' ? envelope.z - .04 : envelope.x, right: face === 'east' ? envelope.z + envelope.depth + .04 : envelope.x + envelope.width + front, bottom: Math.max(0, floor.elevation - slabThickness(floorId)), top: floor.elevation + (floorId === 'DG' ? roofTop + roofFacadeRise : floor.height) }
      for (const [index, region] of presetRegions(composition, face, extent, floor.elevation).entries()) {
        const from = Math.max(0, (region.left - extent.left) / (extent.right - extent.left) * 100), to = Math.min(100, (region.right - extent.left) / (extent.right - extent.left) * 100)
        const bottom = Math.max(0, (region.bottom - extent.bottom) / (extent.top - extent.bottom) * 100), top = Math.min(100, (region.top - extent.bottom) / (extent.top - extent.bottom) * 100)
        if (to > from && top > bottom) result.push({ id: `${floorId}-${face}-${index}`, floor: floorId, face, from, to, bottom, top, material: 'wood' })
      }
    }
  }
  return result
}

export function timberPieces(floors: FloorId[], composition: FacadeComposition, profile: TimberProfile, cut = false, side: 'east' | 'west' = 'east', windows: WindowTimber = 'none', areas: TimberArea[] = []): TimberPiece[] {
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
      const extent: Bounds = { left: face === 'east' ? along - .04 : envelope.x, right: face === 'east' ? along + length + .04 : envelope.x + envelope.width + front, bottom: Math.max(0, base - slabThickness(id)), top: base + (cut ? 1.05 : id === 'DG' ? roofHeight(house.depth / 2) + roofFacadeRise : floor.height) }
      const regions = presetRegions(composition, face, extent, base)
      const roofTop = face === 'east' ? roofHeight(house.depth / 2) : roofHeight(plane) - .1 * Math.tan(house.pitch * Math.PI / 180)
      const fullExtent = { ...extent, top: base + (id === 'DG' ? roofTop + roofFacadeRise : floor.height) }
      const coverage = composition === 'custom' ? coverageBounds(areas.filter(area => area.face === face && area.floor === id), fullExtent) : undefined
      if (coverage && coverage.length === 0) continue
      const cover = (polygon: Point[]) => coverage ? coverage.map(bounds => clip(clip(clip(clip(polygon, point => point[0] - bounds.left), point => bounds.right - point[0]), point => point[1] - bounds.bottom), point => bounds.top - point[1])).filter(part => part.length >= 3 && Math.abs(THREE.ShapeUtils.area(part.map(point => new THREE.Vector2(...point)))) > 1e-8) : [polygon]
      const holes = wall.openings.map(opening => ({ left: along + opening.start - .012, right: along + opening.start + opening.width + .012, bottom: base + opening.sill - .012, top: base + opening.sill + opening.height + .012 }))
      const roofClip = (polygon: Point[]) => id !== 'DG' ? polygon : face === 'east'
        ? clip(clip(polygon, point => base + house.knee + roofFacadeRise + (point[0] - house.north) * Math.tan(house.pitch * Math.PI / 180) - point[1]), point => base + house.knee + roofFacadeRise + (house.south - point[0]) * Math.tan(house.pitch * Math.PI / 180) - point[1])
        : clip(polygon, point => base + roofHeight(plane) + roofFacadeRise - .1 * Math.tan(house.pitch * Math.PI / 180) - point[1])
      for (const region of regions) {
        const bounds = { left: Math.max(extent.left, region.left), right: Math.min(extent.right, region.right), bottom: Math.max(extent.bottom, region.bottom), top: Math.min(extent.top, region.top) }
        if (bounds.top <= bounds.bottom || bounds.right <= bounds.left) continue
        const emit = (polygon: Point[], kind: TimberPiece['kind'], board: number, back: number, thickness: number, slope = 0, slopeOrigin = board * spec.pitch, frontSlope = 0) => {
          if (kind === 'board' || kind === 'batten') polygon = clip(polygon, point => point[1] - bounds.bottom - timberStoreyJoint.height - timberStoreyJoint.gap)
          let parts = [roofClip(polygon)]
          for (const hole of holes) parts = parts.flatMap(part => subtract(part, hole))
          for (const part of parts.flatMap(cover).filter(part => part.length >= 3)) pieces.push({ face, plane, polygon: part, kind, board, back, thickness, slope, slopeOrigin, frontSlope, horizontal })
        }
        emit(rectangle(bounds), 'backing', 0, .002, .003)
        const supportStart = horizontal ? bounds.left : bounds.bottom, supportEnd = horizontal ? bounds.right : bounds.top
        for (let position = Math.ceil(supportStart / .6) * .6 + .04; position < supportEnd; position += .6) {
          emit(rectangle(horizontal ? { ...bounds, left: position, right: Math.min(position + .04, supportEnd) } : { ...bounds, bottom: position, top: Math.min(position + .04, supportEnd) }), 'batten', 3, .02, .02)
        }
        if (profile === 'boards' || horizontal) emit(rectangle(bounds), 'batten', 0, .033, .007)
        const jointFront = front + timberStoreyJoint.projection
        const jointBounds = {
          ...bounds,
          left: face === 'east' && bounds.left === extent.left ? along - jointFront : bounds.left,
          right: bounds.right === extent.right ? face === 'east' ? along + length + jointFront : envelope.x + envelope.width + .006 : bounds.right,
          top: Math.min(bounds.bottom + timberStoreyJoint.height, bounds.top),
        }
        emit(rectangle(jointBounds), 'storey-joint', 0, .006, jointFront - .006)
        const start = horizontal ? bounds.bottom : bounds.left, end = horizontal ? bounds.top : bounds.right
        for (const section of timberBoardSections(profile, start, end)) {
          emit(rectangle(horizontal ? { ...bounds, bottom: section.start, top: section.end } : { ...bounds, left: section.start, right: section.end }), section.kind, section.board, .04 + section.back, section.thickness, section.slope, section.origin, section.frontSlope)
        }
        for (const hole of holes) {
          if (hole.bottom < bounds.bottom || hole.top > bounds.top || hole.left < bounds.left || hole.right > bounds.right) continue
          const addDetail = (detail: Bounds, kind: TimberPiece['kind'], back: number, thickness: number) => {
            for (const polygon of cover(rectangle(detail))) pieces.push({ face, plane, polygon, kind, board: 0, back, thickness, slope: 0, horizontal: false })
          }
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
    const offset = (piece.horizontal ? height : along) - origin
    const depth = positions.getZ(index) + piece.back + piece.slope * offset + positions.getZ(index) / piece.thickness * (piece.frontSlope ?? 0) * offset
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

export function canopyTimberGeometry(canopy: ReturnType<typeof entryCanopy>, profile: TimberProfile) {
  const horizontal = profile === 'horizontal'
  const panels = [
    { width: canopy.width, height: canopy.bottom + canopy.height, position: [canopy.x + canopy.width, 0, canopy.z], rotation: [0, Math.PI, 0] },
    { width: canopy.width, height: canopy.bottom - .003, position: [canopy.x, 0, canopy.z + canopy.sideThickness], rotation: [0, 0, 0] },
    { width: canopy.sideThickness, height: canopy.bottom, position: [canopy.x + canopy.width, 0, canopy.z + canopy.sideThickness], rotation: [0, Math.PI / 2, 0] },
    { width: canopy.width, height: canopy.depth, position: [canopy.x, canopy.bottom + canopy.height, canopy.z + canopy.depth], rotation: [-Math.PI / 2, 0, 0] },
    { width: canopy.width, height: canopy.depth - canopy.sideThickness - .003, position: [canopy.x, canopy.bottom, canopy.z + canopy.sideThickness + .003], rotation: [Math.PI / 2, 0, 0] },
    { width: canopy.depth, height: canopy.height, position: [canopy.x + canopy.width, canopy.bottom, canopy.z + canopy.depth], rotation: [0, Math.PI / 2, 0] },
    { width: canopy.width, height: canopy.height, position: [canopy.x, canopy.bottom, canopy.z + canopy.depth], rotation: [0, 0, 0] },
  ]
  const batches = new Map<number, THREE.BufferGeometry[]>()
  for (const panel of panels) {
    const transform = new THREE.Matrix4().compose(new THREE.Vector3(...panel.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...panel.rotation)), new THREE.Vector3(1, 1, 1))
    const length = horizontal ? panel.height : panel.width
    for (const section of timberBoardSections(profile, 0, length)) {
      const polygon = rectangle(horizontal ? { left: 0, right: panel.width, bottom: section.start, top: section.end } : { left: section.start, right: section.end, bottom: 0, top: panel.height })
      const geometry = timberGeometry({ face: 'south', plane: 0, polygon, back: .002 + section.back, thickness: section.thickness, slope: section.slope, frontSlope: section.frontSlope, slopeOrigin: section.origin, board: section.board, kind: section.kind, horizontal })
      geometry.applyMatrix4(transform)
      const material = ((section.board * 7) % 12 + 12) % 12
      const batch = batches.get(material) ?? []
      batch.push(geometry); batches.set(material, batch)
    }
  }
  return [...batches].map(([material, batch]) => {
    const geometry = mergeGeometries(batch)
    for (const part of batch) part.dispose()
    return { material, geometry }
  })
}

export function createTimberCladding(floors: FloorId[], cut: boolean, side: 'east' | 'west', canopy?: ReturnType<typeof entryCanopy>) {
  const group = new THREE.Group(); group.name = 'timber-cladding'
  const canopyGroup = new THREE.Group(); canopyGroup.name = 'entry-canopy-cladding'
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
    canopyGroup.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
    canopyGroup.clear()
  }
  return {
    group, canopyGroup, materials,
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
      const key = `${composition}:${profile}:${windows}:${composition === 'custom' ? JSON.stringify(options.areas ?? []) : ''}`
      if (key === currentGeometry) return
      currentGeometry = key; clear()
      if (canopy) {
        for (const { material, geometry } of canopyTimberGeometry(canopy, profile)) {
          const mesh = new THREE.Mesh(geometry, materials[material])
          mesh.name = `entry-canopy-boards-${material}`; mesh.castShadow = true; mesh.receiveShadow = true
          canopyGroup.add(mesh)
        }
        canopyGroup.userData.profile = profile
      }
      const pieces = timberPieces(floors, composition, profile, cut, side, windows, options.areas)
      const batches = new Map<number, THREE.BufferGeometry[]>()
      for (const piece of pieces) {
        const material = piece.kind === 'backing' ? 12 : piece.kind === 'flashing' || piece.kind === 'storey-joint' ? 13 : ((piece.board * 7) % 12 + 12) % 12
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