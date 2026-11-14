import { roofHeight } from './model'
import type { Floor, Opening, Wall, WindowEdit, WindowEdits } from './model'
import { raffstores } from './raffstore'
import { windowMullionStart, windowPanels, windowJoint } from './windowLayout'

export const editableWindow = (floor: Floor, wall: Wall, opening: Opening) => floor.id !== 'KG' && ['east', 'north', 'south'].includes(wall.id) && opening.kind === 'window' && !opening.infill && !opening.cornerGlazing && opening.id !== 'garden-fixed' && opening.id !== 'entrance-fixed'

export function windowDraft(opening: Opening): WindowEdit {
  const panels = windowPanels(opening), columns = opening.windowLayout?.columns ?? 1
  return {
    start: opening.start, width: opening.width, height: opening.height, sill: opening.sill,
    windowLayout: {
      columns, split: columns === 2 ? (windowMullionStart(opening) + windowJoint / 2) / opening.width : .5,
      lowerFixed: opening.windowLayout?.lowerFixed ?? 0,
      fields: Array.from({ length: columns }, (_, column) => {
        const panel = panels.find(panel => panel.column === column)!
        return { fixed: panel.fixed, hinge: panel.hinge }
      }),
    },
  }
}

export function dragWindow(opening: Opening, kind: 'from' | 'to' | 'bottom' | 'top' | 'move', along: number, height: number): WindowEdit {
  const draft = windowDraft(opening), horizontal = Math.round(along * 100) / 100, vertical = Math.round(height * 100) / 100
  if (kind === 'move') return { ...draft, start: draft.start + horizontal, sill: draft.sill + vertical }
  if (kind === 'from') return { ...draft, start: draft.start + horizontal, width: draft.width - horizontal }
  if (kind === 'to') return { ...draft, width: draft.width + horizontal }
  if (kind === 'bottom') return { ...draft, sill: draft.sill + vertical, height: draft.height - vertical }
  return { ...draft, height: draft.height + vertical }
}

export function windowEditError(floor: Floor, wall: Wall, opening: Opening): string {
  const values = [opening.start, opening.width, opening.height, opening.sill]
  if (!values.every(Number.isFinite)) return 'Bitte gültige Maße eingeben.'
  if (opening.width < .3 || opening.height < .3) return 'Breite und Höhe müssen mindestens 30 cm betragen.'
  const length = wall.axis === 'x' ? wall.width : wall.depth
  if (opening.start < 0 || opening.start + opening.width > length + 1e-6 || opening.sill < 0) return 'Das Fenster muss innerhalb der Wand liegen.'
  const north = wall.z + (wall.axis === 'z' ? opening.start : 0), south = north + (wall.axis === 'z' ? opening.width : wall.depth)
  const top = floor.id === 'DG' ? Math.min(floor.height, roofHeight(north), roofHeight(south)) : floor.height
  if (opening.sill + opening.height + .24 > top + 1e-6) return 'Zu wenig Platz unter Decke oder Dach für Fenster und Sonnenschutz (24 cm).'
  const overlap = wall.openings.find(other => other.id !== opening.id && opening.start < other.start + other.width - 1e-6 && opening.start + opening.width > other.start + 1e-6 && opening.sill < other.sill + other.height - 1e-6 && opening.sill + opening.height > other.sill + 1e-6)
  if (overlap) return 'Das Fenster überschneidet sich mit einer anderen Öffnung.'
  const lower = opening.windowLayout?.lowerFixed ?? 0
  if (!Number.isFinite(lower) || lower < 0 || lower > 0 && (lower < .2 || lower > opening.height - .25)) return 'Das Unterlicht benötigt mindestens 20 cm, das obere Feld mindestens 25 cm.'
  if (windowPanels(opening).some(panel => !Number.isFinite(panel.width) || panel.width < .18 || panel.height < .15)) return 'Die Aufteilung erzeugt ein zu schmales oder zu niedriges Feld.'
  const along = wall.axis === 'x' ? wall.x : wall.z
  const partition = floor.walls.find(other => !['east', 'west', 'north', 'south'].includes(other.id) && other.axis !== wall.axis && (other.height ?? floor.height) > opening.sill && (
    wall.axis === 'x' ? other.z <= wall.z + wall.depth + .001 && other.z + other.depth >= wall.z - .001 && other.x < along + opening.start + opening.width - .001 && other.x + other.width > along + opening.start + .001
      : other.x <= wall.x + wall.width + .001 && other.x + other.width >= wall.x - .001 && other.z < along + opening.start + opening.width - .001 && other.z + other.depth > along + opening.start + .001
  ))
  return partition ? 'Das Fenster trifft auf eine Innenwand oder Vorwand.' : ''
}

export function applyWindowEdits(floor: Floor, edits: WindowEdits): Floor {
  const changed: { wall: Wall; opening: Opening }[] = []
  for (const [key, edit] of Object.entries(edits)) {
    if (!key.startsWith(`${floor.id}-`)) continue
    const wall = floor.walls.find(wall => wall.openings.some(opening => `${floor.id}-${opening.id}` === key))
    const opening = wall?.openings.find(opening => `${floor.id}-${opening.id}` === key)
    if (!wall || !opening || !editableWindow(floor, wall, opening)) throw new Error('Dieses Fenster kann nicht bearbeitet werden.')
    const replacement: Opening = { ...opening, ...edit }
    wall.openings = wall.openings.map(current => current === opening ? replacement : current)
    changed.push({ wall, opening: replacement })
  }
  for (const { wall, opening } of changed) {
    const error = windowEditError(floor, wall, opening)
    if (error) throw new Error(`${floor.id}: ${error}`)
  }
  if (changed.length) {
    const recesses = raffstores(floor).map(blind => blind.box)
    for (const wall of floor.walls.filter(wall => ['east', 'west', 'north', 'south'].includes(wall.id))) wall.recesses = recesses
  }
  return floor
}