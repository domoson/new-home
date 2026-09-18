import { winderCore, winderSteps } from './winderStair'
import type { StairPoint } from './winderStair'
import { buildProviderFloor } from './providerPlan'

export type FloorId = 'KG' | 'EG' | 'OG' | 'DG'
export type Rect = { x: number; z: number; width: number; depth: number }
export type Room = { id: string; name: string; parts: Rect[]; color: string; note: string; spawn: [number, number] }
export type Opening = { start: number; width: number; sill: number; height: number; kind: 'door' | 'window' | 'passage'; id: string; hinge?: 'end'; swing?: 'reverse'; windowLayout?: { columns: 1 | 2; lowerFixed?: number } }
export type Wall = Rect & { id: string; axis: 'x' | 'z'; openings: Opening[]; height?: number }
export type Furniture = Rect & { id: string; kind: 'bed' | 'sofa' | 'chaise' | 'bookcase' | 'table' | 'chair' | 'bench' | 'cabinet' | 'counter' | 'sink' | 'wc' | 'shower' | 'bath' | 'desk' | 'tv' | 'plant' | 'machine' | 'hob' | 'espresso'; height: number; bottom?: number; angle?: number; color?: string; concealedFittings?: boolean }
export type Floor = { id: FloorId; name: string; elevation: number; height: number; rooms: Room[]; walls: Wall[]; furniture: Furniture[] }
export const construction = { exteriorWall: .3, clearHeight: 2.77, basementClearHeight: 2.25, timberFloor: .2, basementCeiling: .2, foundationPackage: .2, roofNormal: .24, ridgeCapAllowance: .07, terrain: -.2 }
export const house = { width: 6.6, depth: 11.4, west: .3, east: 6.3, north: .3, south: 11.1, pitch: 35, knee: .5 }
export const stair = winderCore
export const interiorWallThickness = .125
export const stairFor = () => stair
export const floorIds: FloorId[] = ['KG', 'EG', 'OG', 'DG']
export const elevations: Record<FloorId, number> = { KG: -(construction.basementClearHeight + construction.basementCeiling), EG: 0, OG: construction.clearHeight + construction.timberFloor, DG: 2 * (construction.clearHeight + construction.timberFloor) }
export const slabThickness = (id: FloorId) => id === 'KG' ? construction.foundationPackage : id === 'EG' ? construction.basementCeiling : construction.timberFloor
export const storeyRise = (id: FloorId) => id === 'KG' ? elevations.EG - elevations.KG : elevations.OG - elevations.EG
export const rect = (x: number, z: number, width: number, depth: number): Rect => ({ x, z, width, depth })
export const stairRecess = rect(stair.x + stair.turnSize, stair.z + stair.runWidth, stair.width - stair.turnSize, stair.depth - 2 * stair.runWidth)
export const stairOpeningParts = [rect(stair.x, stair.z, stair.width, stair.depth)]
export const basementWindow = { width: .9, height: .75, southGap: 1.35 }
export const lightWellSize = { width: 1.3, depth: .5 }
const wellOverhang = (lightWellSize.width - basementWindow.width) / 2
export const lightWells = [rect(house.width, house.depth - basementWindow.southGap - basementWindow.width - wellOverhang, lightWellSize.depth, lightWellSize.width), rect(house.west + .9 - wellOverhang, -lightWellSize.depth, lightWellSize.width, lightWellSize.depth)]
export const roofWindows: (Rect & { id: string; name: string; length: number })[] = []
export function roofPanels(): Rect[] {
  return [rect(-.1, -.25, house.width + .35, house.depth / 2 + .25), rect(-.1, house.depth / 2, house.width + .35, house.depth / 2 + .25)]
}
export const area = (parts: Rect[]) => parts.reduce((sum, part) => sum + part.width * part.depth, 0)
export const roofHeight = (south: number) => house.knee + Math.min(south - house.north, house.south - south) * Math.tan(house.pitch * Math.PI / 180)
export const roofVerticalThickness = construction.roofNormal / Math.cos(house.pitch * Math.PI / 180)
export const roofInnerElevation = (south: number) => elevations.DG + roofHeight(south)
export const roofOuterElevation = (south: number) => roofInnerElevation(south) + roofVerticalThickness
export const ridgeElevations = { inside: roofInnerElevation(house.depth / 2), roofSurface: roofOuterElevation(house.depth / 2), outside: roofOuterElevation(house.depth / 2) + construction.ridgeCapAllowance }
export const heightLine = (height: number) => house.north + (height - house.knee) / Math.tan(house.pitch * Math.PI / 180)
export const atticCeiling = { height: 2.77, thickness: .24 }
export const ceilingHeight = (south: number) => Math.min(roofHeight(south), atticCeiling.height)
export function atticCeilingPanels(): Rect[] {
  const edge = heightLine(atticCeiling.height), full = heightLine(atticCeiling.height + atticCeiling.thickness)
  return [rect(house.west, edge, house.east - house.west, full - edge), rect(house.west, full, house.east - house.west, house.depth - 2 * full), rect(house.west, house.depth - full, house.east - house.west, full - edge)]
}
export function roomArea(room: Room, floor: FloorId) {
  const gross = area(room.parts)
  if (floor === 'KG') return { floor: gross, living: 0 }
  if (floor !== 'DG') return { floor: gross, living: gross * .97 }
  const band = (height: number) => room.parts.reduce((sum, part) => sum + part.width * Math.max(0, Math.min(part.z + part.depth, house.depth - heightLine(height)) - Math.max(part.z, heightLine(height))), 0)
  return { floor: gross, living: (band(1) + band(2)) / 2 * .97 }
}
export function makeFloor(id: FloorId, houseSide: 'east' | 'west' = 'east'): Floor {
  return buildProviderFloor(id, houseSide)
}
export type Solid = Rect & { bottom: number; height: number; kind: 'wall' | 'stair' | 'floor' | 'rail'; id: string; footprint?: StairPoint[] }
export function wallSolids(wallData: Wall, height: number): Solid[] {
  height = Math.min(height, wallData.height ?? height)
  const length = wallData.axis === 'x' ? wallData.width : wallData.depth
  const cuts = [0, length, ...wallData.openings.flatMap(open => [open.start, open.start + open.width])].sort((left, right) => left - right)
  const parts: Solid[] = []
  for (let index = 0; index < cuts.length - 1; index++) {
    const start = cuts[index], end = cuts[index + 1]
    if (end - start < .00001) continue
    const opening = wallData.openings.find(open => (start + end) / 2 > open.start && (start + end) / 2 < open.start + open.width)
    const base = wallData.axis === 'x' ? rect(wallData.x + start, wallData.z, end - start, wallData.depth) : rect(wallData.x, wallData.z + start, wallData.width, end - start)
    for (const [bottom, top] of opening ? [[0, opening.sill], [opening.sill + opening.height, height]] : [[0, height]]) if (top > bottom) parts.push({ ...base, id: wallData.id, bottom, height: top - bottom, kind: 'wall' })
  }
  return parts
}
export function stairSolids(rise: number): Solid[] {
  return winderSteps(rise).map(step => {
    const east = step.footprint.map(point => point[0]), south = step.footprint.map(point => point[1])
    return { ...rect(Math.min(...east), Math.min(...south), Math.max(...east) - Math.min(...east), Math.max(...south) - Math.min(...south)), footprint: step.footprint, bottom: step.height - .2, height: .2, kind: 'stair', id: step.id }
  })
}
export function floorSlabs(id: FloorId): Rect[] {
  if (id === 'KG') return [rect(0, 0, house.width, house.depth)]
  const core = stairFor()
  return [rect(0, 0, house.width, core.z), rect(0, core.z, core.x, core.depth), rect(core.x + core.width, core.z, house.width - core.x - core.width, core.depth), rect(0, core.end, house.width, house.depth - core.end)]
}
export function stairGuards(rise: number): Solid[] {
  return winderSteps(rise).map(step => {
    const [start, end] = step.inner, length = Math.hypot(end[0] - start[0], end[1] - start[1])
    const offset = [(end[1] - start[1]) / length * .015, -(end[0] - start[0]) / length * .015]
    const footprint: StairPoint[] = [[start[0] + offset[0], start[1] + offset[1]], [end[0] + offset[0], end[1] + offset[1]], [end[0] - offset[0], end[1] - offset[1]], [start[0] - offset[0], start[1] - offset[1]]]
    const east = footprint.map(point => point[0]), south = footprint.map(point => point[1])
    return { ...rect(Math.min(...east), Math.min(...south), Math.max(...east) - Math.min(...east), Math.max(...south) - Math.min(...south)), footprint, bottom: step.height, height: .95, kind: 'rail', id: `guard-${step.id}` }
  })
}
export const format = (value: number) => value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export function stairHandrails(rise: number): { from: [number, number, number]; to: [number, number, number] }[] {
  return winderSteps(rise).map(step => ({ from: [step.inner[0][0], step.height + .97, step.inner[0][1]], to: [step.inner[1][0], step.height + .97, step.inner[1][1]] }))
}
