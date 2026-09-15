import { construction, elevations, house } from './model'
import { partner } from './context'

export type SetbackPoint = [number, number]
export type SetbackParameters = { width: number; depth: number; wall: number; attic: number; knee: number; pitch: number; roofNormal: number; ridgeAllowance: number; terrain: number; partnerOffset: number }
export type SetbackFace = { id: string; name: string; points: SetbackPoint[]; wall: SetbackPoint[]; outer: SetbackPoint[]; minimum: number; maximum: number }
export const currentSetbackParameters = (): SetbackParameters => ({ width: house.width, depth: house.depth, wall: construction.exteriorWall, attic: elevations.DG, knee: house.knee, pitch: house.pitch, roofNormal: construction.roofNormal, ridgeAllowance: construction.ridgeCapAllowance, terrain: construction.terrain, partnerOffset: partner.z })

export function houseSetbacks(side: 'east' | 'west', parameters = currentSetbackParameters()) {
  const { width, depth, wall, attic, knee, pitch, roofNormal, ridgeAllowance, terrain, partnerOffset } = parameters
  if (Object.values(parameters).some(value => !Number.isFinite(value)) || width <= 0 || depth <= 2 * wall || wall < 0 || roofNormal < 0 || ridgeAllowance < 0 || pitch < 0 || pitch >= 90) throw new Error('Invalid setback parameters')
  const slope = Math.tan(pitch * Math.PI / 180)
  const roofAt = (south: number) => attic + knee + (Math.min(south, depth - south) - wall) * slope + roofNormal / Math.cos(pitch * Math.PI / 180)
  const eaves = roofAt(0), ridge = roofAt(depth / 2) + ridgeAllowance
  const traufDepth = Math.max(3, .4 * (eaves - terrain + (ridge - eaves) * (pitch <= 70 ? 1 / 3 : 1)))
  const gableRaw = (south: number) => .4 * (roofAt(south) + ridgeAllowance - terrain)
  const transform = ([east, south]: SetbackPoint): SetbackPoint => side === 'east' ? [east, south] : [-east, south + partnerOffset]
  const faces: SetbackFace[] = []
  const add = (id: string, name: string, wallPoints: SetbackPoint[], normal: SetbackPoint, depths: number[]) => {
    const wall = wallPoints.map(transform)
    const outer = wallPoints.map(([east, south], index) => transform([east + normal[0] * depths[index], south + normal[1] * depths[index]]))
    faces.push({ id, name, wall, outer, points: [...wall, ...outer.toReversed()], minimum: Math.min(...depths), maximum: Math.max(...depths) })
  }
  add('north', 'Nordtraufe', [[0, 0], [width, 0]], [0, -1], [traufDepth, traufDepth])
  add('south', 'Südtraufe', [[0, depth], [width, depth]], [0, 1], [traufDepth, traufDepth])
  const gable = (id: string, name: string, east: number, start: number, end: number, direction: number) => {
    if (end <= start) return
    const breaks = [...new Set([start, end, ...[depth / 2].filter(value => value > start && value < end)])].sort((first, second) => first - second)
    const crossings = breaks.slice(1).flatMap((last, index) => {
      const first = breaks[index], low = gableRaw(first), high = gableRaw(last)
      return (low - 3) * (high - 3) < 0 ? [first + (3 - low) / (high - low) * (last - first)] : []
    })
    const samples = [...breaks, ...crossings].sort((first, second) => first - second)
    add(id, name, samples.map(south => [east, south]), [direction, 0], samples.map(south => Math.max(3, gableRaw(south))))
  }
  gable('gable', side === 'east' ? 'Ostgiebel' : 'Westgiebel', width, 0, depth, 1)
  const otherStart = side === 'east' ? partnerOffset : -partnerOffset
  const sharedStart = Math.max(0, otherStart), sharedEnd = Math.min(depth, otherStart + depth)
  if (sharedStart < sharedEnd) {
    gable('return-north', 'Versatz Nord', 0, 0, sharedStart, -1)
    gable('return-south', 'Versatz Süd', 0, sharedEnd, depth, -1)
  } else gable('return', 'Freier innerer Giebel', 0, 0, depth, -1)
  return { faces, sharedWall: sharedStart < sharedEnd ? [transform([0, sharedStart]), transform([0, sharedEnd])] : [], eaves, ridge, terrain }
}