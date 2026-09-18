import { house, lightWells, rect, roofHeight, roofWindows, roomArea, stairFor, stairSolids, storeyRise, wallSolids } from './model'
import type { Floor, Furniture, Rect } from './model'
import { terraceArea, terraceFurniture, terraceParts } from './terrace'
import { kitchenModules } from './kitchenStorage'

export type PlanPoint = { x: number; z: number }
export type Measurable = Rect & { label: string; details: string; footprint?: [number, number][] }
export const metres = (value: number) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m`
export const distance = (start: PlanPoint, end: PlanPoint) => Math.hypot(end.x - start.x, end.z - start.z)
export const contains = (bounds: Rect & { footprint?: [number, number][] }, point: PlanPoint) => {
  if (!bounds.footprint) return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.z >= bounds.z && point.z <= bounds.z + bounds.depth
  let inside = false
  bounds.footprint.forEach((start, index) => {
    const end = bounds.footprint![(index + 1) % bounds.footprint!.length]
    if ((start[1] > point.z) !== (end[1] > point.z) && point.x < (end[0] - start[0]) * (point.z - start[1]) / (end[1] - start[1]) + start[0]) inside = !inside
  })
  return inside
}
export const furnitureName = (item: Furniture) => ({ 'kitchen-tall': 'Hochschrank / Backofen', fridge: 'Einbaukühl-/Gefrierschrank', peninsula: 'Kochhalbinsel', kitchen: 'Spülenzeile', 'coffee-counter': 'Geräte- und Eckarbeitsplatte', 'kitchen-upper': 'Deckenhohe Hängeschränke', 'kitchen-scribe': 'Hochschrank-Abschlussblende', toaster: 'Toaster', sodastream: 'Wassersprudler', cookit: 'Cookit / Küchenmaschine', wardrobe: 'Garderobe', bookshelf: 'Bücherregal', sideboard: 'Sideboard', 'sofa-chaise': 'Chaiselongue', 'parents-bed': 'Elternbett', 'guest-bed': 'Gästebett', 'kitchen-sink': 'Spüle' }[item.id] ?? { bed: 'Bett', sofa: 'Sofa', chaise: 'Chaiselongue', bookcase: 'Regal', table: 'Tisch', chair: 'Stuhl', bench: 'Essbank', cabinet: 'Schrank', counter: 'Arbeitsplatte', sink: 'Waschbecken', wc: 'WC', shower: 'Dusche', bath: 'Badewanne', desk: 'Schreibtisch', tv: 'Fernseher', plant: 'Pflanze', machine: 'Haustechnik / Gerät', hob: 'Induktionskochfeld', espresso: 'Siebträgermaschine' }[item.kind])
export const furnitureMeasure = (item: Furniture): Measurable => ({ ...item, label: furnitureName(item), details: `Höhe ${metres(item.height)}${item.bottom ? ` · Aufstand ${metres(item.bottom)}` : ''}` })
export function planObjects(floor: Floor, furnished: boolean): Measurable[] {
  const objects: Measurable[] = [{ ...rect(-.22, 0, .22, house.depth), label: 'Nachbaranschluss (schematisch)', details: 'Keine vermessene Nachbarwand' }]
  if (floor.id === 'EG') {
    objects.push(...terraceParts.map((part, index) => ({ ...part, label: index ? 'Terrassenrücklauf' : 'Holzterrasse', details: `${terraceArea.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m² gesamt · Dielen 14,4 cm / Fuge 6 mm` })))
    if (furnished) objects.push(...terraceFurniture.map(furnitureMeasure))
  }
  if (floor.id === 'KG') objects.push(...lightWells.map(well => ({ ...well, label: 'Lichtschacht / Abdeckung', details: '100 × 50 cm Außenmaß · Ausführung ungeprüft' })))
  for (const room of floor.rooms) for (const part of room.parts) objects.push({ ...part, label: room.name + (room.parts.length > 1 ? ' · Teilfläche' : ''), details: `${roomArea(room, floor.id).floor.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m² gesamt · ` + (floor.id === 'DG' ? `Lichte Höhe ${metres(Math.min(roofHeight(part.z), roofHeight(part.z + part.depth)))} bis ${metres(roofHeight(Math.max(part.z, Math.min(5, part.z + part.depth))))}` : `Lichte Höhe ${metres(floor.height)}`) })
  objects.push({ ...stairFor(), label: 'Treppenkern', details: 'Ein durchgehender Lauf, zwei Viertelwendelungen · Antritt Nord, Austritt Süd' })
  objects.push(...stairSolids(storeyRise(floor.id)).map(solid => ({ ...solid, label: solid.id.startsWith('landing') ? 'Treppenpodest' : 'Treppenstufe', details: `Oberkante +${metres(solid.bottom + solid.height)} ab Antritt · Steigung ${metres(storeyRise(floor.id) / 16)}` })))
  for (const wall of floor.walls) {
    const exterior = { north: 'Nord', south: 'Süd', east: 'Ost', west: 'West' }[wall.id]
    for (const part of wallSolids(wall, floor.id === 'DG' ? roofHeight(5) : floor.height).filter(solid => solid.bottom === 0)) objects.push({ ...part, label: (exterior ? `Außenwand ${exterior}` : wall.id === 'installation' ? 'Installationsschacht' : 'Innenwand') + (wall.openings.length ? ' · Teilstück' : ''), details: `Stärke ${metres(wall.axis === 'x' ? wall.depth : wall.width)} · Gesamtlänge ${metres(wall.axis === 'x' ? wall.width : wall.depth)} · ${floor.id === 'DG' ? `Höhe ${metres(Math.min(roofHeight(part.z), roofHeight(part.z + part.depth)))} bis ${metres(roofHeight(Math.max(part.z, Math.min(5, part.z + part.depth))))}` : `Höhe ${metres(floor.height)}`}` })
    for (const opening of wall.openings) objects.push({ ...rect(wall.x + (wall.axis === 'x' ? opening.start : 0), wall.z + (wall.axis === 'z' ? opening.start : 0), wall.axis === 'x' ? opening.width : wall.width, wall.axis === 'z' ? opening.width : wall.depth), label: opening.id === 'terrace' ? 'Hebeschiebetür' : opening.kind === 'window' ? opening.id.includes('fixed') ? 'Festverglasung' : 'Fenster' : opening.kind === 'passage' ? 'Durchgang' : 'Tür', details: `Breite ${metres(opening.width)} · Höhe ${metres(opening.height)} · Brüstung ${metres(opening.sill)}` })
  }
  if (furnished) {
    for (const item of floor.furniture) {
      objects.push(furnitureMeasure(item))
      objects.push(...kitchenModules(item).map(module => ({ ...module, label: { dishwasher: 'Geschirrspüler', sink: 'Spülenunterschrank', drawers: 'Auszugsschrank', cupboard: 'Geschirrschrank' }[module.use], details: `Nennmaß ${metres(module.width)} × ${metres(module.depth)} · Einbau ungeprüft` })))
    }
  }
  if (floor.id === 'DG') objects.push(...roofWindows.map(window => ({ ...window, label: window.name, details: `Dachflächenmaß ${metres(window.width)} × ${metres(window.depth / Math.cos(35 * Math.PI / 180))} · Grundrissprojektion` })))
  return objects
}
export function snapPoint(point: PlanPoint, objects: (Rect & { footprint?: [number, number][] })[], tolerance: number, origin?: PlanPoint, axisLock = false): PlanPoint {
  if (axisLock && origin) return Math.abs(point.x - origin.x) > Math.abs(point.z - origin.z) ? { x: point.x, z: origin.z } : { x: origin.x, z: point.z }
  let nearest = point, minimum = tolerance
  for (const bounds of objects) for (const [east, south] of bounds.footprint ?? [[bounds.x, bounds.z], [bounds.x + bounds.width, bounds.z], [bounds.x + bounds.width, bounds.z + bounds.depth], [bounds.x, bounds.z + bounds.depth]]) {
    const corner = { x: east, z: south }, gap = distance(point, corner)
    if (gap < minimum) { minimum = gap; nearest = corner }
  }
  return nearest
}