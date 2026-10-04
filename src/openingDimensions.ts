import { roofWindows } from './model'
import type { Floor, Opening, Wall } from './model'
import { windowPanels } from './windowLayout'

export type OpeningLabel = { id: string; side: 'north' | 'east' | 'south'; x: number; z: number; title: string; size: string; detail?: string; execution: string[] }
const centimetres = (value: number) => (value * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })
const openingSize = (width: number, height: number) => `${centimetres(width)} \u00d7 ${centimetres(height)} cm`

function windowExecution(opening: Opening): string[] {
  const panels = windowPanels(opening)
  const operable = panels.filter(panel => !panel.fixed)
  if (!operable.length) return ['nicht \u00f6ffenbar']
  const fixedFields = panels.filter(panel => panel.fixed && !operable.some(leaf => leaf.column === panel.column))
  return [
    `${operable.length} \u00d6ffnungsfl\u00fcgel${fixedFields.length ? ` + ${fixedFields.length === 1 ? 'Festfeld' : `${fixedFields.length} Festfelder`}` : ''}`,
    ...(opening.windowLayout?.lowerFixed ? [`Unterlicht fest bis ${centimetres(opening.windowLayout.lowerFixed)} cm`] : []),
  ]
}

export function openingLabels(floor: Floor): OpeningLabel[] {
  const labels: OpeningLabel[] = floor.walls.filter(wall => ['north', 'east', 'south'].includes(wall.id)).flatMap(wall => {
    const terrace = wall.openings.find(opening => opening.id === 'terrace')
    return wall.openings.filter(opening => opening.kind === 'window' && !(terrace && opening.id === 'garden-fixed') || opening.id === 'terrace').map(opening => {
      const fixed = opening.id === 'terrace' ? wall.openings.find(other => other.id === 'garden-fixed') : undefined
      const width = opening.width + (fixed?.width ?? 0)
      return {
        id: opening.id, side: wall.id as OpeningLabel['side'],
        x: wall.x + (wall.axis === 'x' ? opening.start + width / 2 : wall.width),
        z: wall.z + (wall.axis === 'z' ? opening.start + width / 2 : wall.id === 'north' ? 0 : wall.depth),
        title: opening.id === 'terrace' ? 'Hebeschiebet\u00fcr' : opening.id.includes('fixed') ? 'Festverglasung' : 'Fenster',
        size: openingSize(width, opening.height),
        execution: opening.id === 'terrace' ? [`1 Schiebefl\u00fcgel${fixed ? ' + Festfeld' : ''}`] : windowExecution(opening),
        ...(fixed ? { detail: `Fl\u00fcgel ${centimetres(opening.width)} + Festfeld ${centimetres(fixed.width)} cm` } : {}),
      }
    })
  })
  if (floor.id === 'DG') labels.push(...roofWindows.map(window => ({ id: window.id, side: window.id.includes('north') ? 'north' as const : 'south' as const, x: window.x + window.width / 2, z: window.z + window.depth / 2, title: window.name, size: openingSize(window.width, window.length), execution: ['Schwingfl\u00fcgel'] })))
  return labels
}

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