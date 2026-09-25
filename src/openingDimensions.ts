import type { Wall } from './model'

export type WallDimension = { start: number; end: number; kind: 'pier' } | { start: number; end: number; kind: 'opening'; height: number }

export function openingDimensions(wall: Wall): WallDimension[] {
  const length = wall.axis === 'x' ? wall.width : wall.depth
  const segments: WallDimension[] = []
  let position = 0
  for (const opening of [...wall.openings].sort((first, second) => first.start - second.start)) {
    if (opening.start < position - 1e-6 || opening.start + opening.width > length + 1e-6) throw new Error(`Invalid openings on wall ${wall.id}`)
    if (opening.start > position + 1e-6) segments.push({ start: position, end: opening.start, kind: 'pier' })
    segments.push({ start: opening.start, end: opening.start + opening.width, kind: 'opening', height: opening.height })
    position = opening.start + opening.width
  }
  if (position < length - 1e-6) segments.push({ start: position, end: length, kind: 'pier' })
  return segments
}