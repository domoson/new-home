import type { Rect } from './model'
export type SectionAxis = 'NS' | 'EW'
export function sectionSpan(bounds: Rect & { footprint?: [number, number][] }, axis: SectionAxis, position: number): [number, number] | null {
  if (bounds.footprint) {
    const across = axis === 'NS' ? 0 : 1, along = axis === 'NS' ? 1 : 0, intersections: number[] = []
    bounds.footprint.forEach((start, index) => {
      const end = bounds.footprint![(index + 1) % bounds.footprint!.length]
      if ((start[across] <= position && end[across] > position) || (end[across] <= position && start[across] > position)) intersections.push(start[along] + (position - start[across]) / (end[across] - start[across]) * (end[along] - start[along]))
    })
    return intersections.length >= 2 ? [Math.min(...intersections), Math.max(...intersections)] : null
  }
  const across = axis === 'NS' ? bounds.x : bounds.z, thickness = axis === 'NS' ? bounds.width : bounds.depth
  if (position < across || position >= across + thickness) return null
  return axis === 'NS' ? [bounds.z, bounds.z + bounds.depth] : [bounds.x, bounds.x + bounds.width]
}