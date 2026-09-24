import type { Floor, Rect } from './model'

export const raffstoreDetail = { boxHeight: .24, boxDepth: .16, setback: .06, slatDepth: .08, slatPitch: .07, stackPitch: .003, guideWidth: .025 }
export type Raffstore = { id: string; wallId: string; axis: 'x' | 'z'; x: number; z: number; width: number; sill: number; height: number; corner: boolean; sharedEndGuide: boolean; box: Rect & { bottom: number; height: number } }

export function raffstores(floor: Floor): Raffstore[] {
  if (floor.id === 'KG') return []
  return floor.walls.filter(wall => ['north', 'east', 'south'].includes(wall.id)).flatMap(wall => {
    const terrace = wall.openings.find(opening => opening.id === 'terrace')
    return wall.openings.filter(opening => opening.kind === 'window' && opening.id !== 'entrance-fixed' && !(terrace && opening.id === 'garden-fixed') || opening.id === 'terrace').map(opening => {
      const companion = opening.id === 'terrace' ? wall.openings.find(other => other.id === 'garden-fixed') : undefined
      const corner = !!(opening.cornerGlazing || companion?.cornerGlazing)
      const north = wall.id === 'north'
      const face = wall.axis === 'x' ? wall.z + (north ? 0 : wall.depth) : wall.x + wall.width
      const plane = face + (north ? raffstoreDetail.setback : -raffstoreDetail.setback)
      const start = (wall.axis === 'x' ? wall.x : wall.z) + opening.start
      const end = corner ? (wall.axis === 'z' ? wall.z + wall.depth : Math.max(...floor.walls.map(other => other.x + other.width))) - raffstoreDetail.setback : start + opening.width + (companion?.width ?? 0)
      const boxWidth = end - start + (corner ? raffstoreDetail.setback : 0)
      const boxFace = face - (north ? 0 : raffstoreDetail.boxDepth)
      const box = { x: wall.axis === 'x' ? start : boxFace, z: wall.axis === 'x' ? boxFace : start, width: wall.axis === 'x' ? boxWidth : raffstoreDetail.boxDepth, depth: wall.axis === 'x' ? raffstoreDetail.boxDepth : boxWidth, bottom: opening.sill + opening.height, height: raffstoreDetail.boxHeight }
      return { id: `${floor.id}-${opening.id}`, wallId: wall.id, axis: wall.axis, x: wall.axis === 'x' ? start : plane, z: wall.axis === 'z' ? start : plane, width: end - start, sill: opening.sill, height: opening.height, corner, sharedEndGuide: corner && wall.axis === 'x', box }
    })
  })
}