import { winderCore, winderSteps } from './winderStair'
import type { StairPoint } from './winderStair'

export type FloorId = 'KG' | 'EG' | 'OG' | 'DG'
export type Rect = { x: number; z: number; width: number; depth: number }
export type Room = { id: string; name: string; parts: Rect[]; color: string; note: string; spawn: [number, number] }
export type Opening = { start: number; width: number; sill: number; height: number; kind: 'door' | 'window' | 'passage'; id: string; hinge?: 'end'; swing?: 'reverse' }
export type Wall = Rect & { id: string; axis: 'x' | 'z'; openings: Opening[] }
export type Furniture = Rect & { id: string; kind: 'bed' | 'sofa' | 'chaise' | 'bookcase' | 'table' | 'chair' | 'bench' | 'cabinet' | 'counter' | 'sink' | 'wc' | 'shower' | 'bath' | 'desk' | 'tv' | 'plant' | 'machine' | 'hob' | 'espresso'; height: number; bottom?: number; angle?: number; color?: string }
export type Floor = { id: FloorId; name: string; elevation: number; height: number; rooms: Room[]; walls: Wall[]; furniture: Furniture[] }
export const house = { width: 7, depth: 10, west: .4, east: 6.635, north: .365, south: 9.635, pitch: 35, knee: .5 }
export const stair = winderCore
export const interiorWallThickness = .16
export const stairFor = () => stair
export const floorIds: FloorId[] = ['KG', 'EG', 'OG', 'DG']
export const elevations: Record<FloorId, number> = { KG: -2.7, EG: 0, OG: 2.95, DG: 5.9 }
export const rect = (x: number, z: number, width: number, depth: number): Rect => ({ x, z, width, depth })
export const stairRecess = rect(stair.x + 1.2, stair.z + stair.runWidth, stair.width - 1.2, stair.depth - 2 * stair.runWidth)
export const stairOpeningParts = [rect(stair.x, stair.z, stair.width, stair.runWidth), rect(stair.x, stairRecess.z, 1.2, stairRecess.depth), rect(stair.x, stair.end - stair.runWidth, stair.width, stair.runWidth)]
export const lightWells = [rect(house.width, 3, .5, 1), rect(house.width, 7.1, .5, 1), rect(1.5, -.5, 1, .5)]
const skylight = (id: string, name: string, x: number, z: number, width: number, length: number) => ({ id, name, length, ...rect(x, z, width, length * Math.cos(house.pitch * Math.PI / 180)) })
export const roofWindows = [skylight('DG-office-west-skylight', 'Dachfenster Gäste / Arbeit', .8, 1.9, 1.14, 1.4), skylight('DG-stair-skylight', 'Dachfenster Treppenhaus', .6, 3.55, .78, 1.18), skylight('DG-parents-west-skylight', 'Dachfenster Eltern', 1.05, 6.6, 1.14, 1.4)]
export function roofPanels(): Rect[] {
  const cuts = [...new Set([-.1, house.width + .25, ...roofWindows.flatMap(window => [window.x, window.x + window.width])])].sort((first, second) => first - second)
  return cuts.slice(0, -1).flatMap((start, index) => {
    const end = cuts[index + 1], openings = roofWindows.filter(window => start >= window.x && end <= window.x + window.width)
    const rows = [...new Set([-.25, 5, 10.25, ...openings.flatMap(window => [window.z, window.z + window.depth])])].sort((first, second) => first - second)
    return rows.slice(0, -1).flatMap((north, row) => openings.some(window => north >= window.z && rows[row + 1] <= window.z + window.depth) ? [] : [rect(start, north, end - start, rows[row + 1] - north)])
  })
}
export const area = (parts: Rect[]) => parts.reduce((sum, part) => sum + part.width * part.depth, 0)
export const roofHeight = (south: number) => house.knee + Math.max(0, Math.min(south - house.north, house.south - south)) * Math.tan(house.pitch * Math.PI / 180)
export const heightLine = (height: number) => house.north + (height - house.knee) / Math.tan(house.pitch * Math.PI / 180)
export function roomArea(room: Room, floor: FloorId) {
  const gross = area(room.parts)
  if (floor === 'KG') return { floor: gross, living: 0 }
  if (floor !== 'DG') return { floor: gross, living: gross }
  const band = (height: number) => room.parts.reduce((sum, part) => sum + part.width * Math.max(0, Math.min(part.z + part.depth, 10 - heightLine(height)) - Math.max(part.z, heightLine(height))), 0)
  return { floor: gross, living: (band(1) + band(2)) / 2 }
}
const room = (id: string, name: string, parts: Rect[], color: string, note: string, spawn: [number, number]): Room => ({ id, name, parts, color, note, spawn })
const wall = (id: string, axis: 'x' | 'z', x: number, z: number, length: number, thickness = interiorWallThickness, openings: Opening[] = []): Wall => ({ id, axis, ...rect(x, z, axis === 'x' ? length : thickness, axis === 'z' ? length : thickness), openings })
const door = (id: string, start: number, width = .9, height = 2.1): Opening => ({ id, start, width, height, sill: 0, kind: 'door' })
const windowOpening = (id: string, start: number, width: number, sill = .9, height = 1.35): Opening => ({ id, start, width, height, sill, kind: 'window' })
const furniture = (id: string, kind: Furniture['kind'], x: number, z: number, width: number, depth: number, height: number, angle = 0): Furniture => ({ id, kind, ...rect(x, z, width, depth), height, angle })
const colors = { living: '#ece4d2', wet: '#d7e6e6', hall: '#eceeeb', child: '#dde8d9', work: '#e2e0ec', utility: '#e3e5e6' }

function shell(id: FloorId): Wall[] {
  if (id === 'KG') return [wall('west', 'z', 0, 0, 10, .4), wall('east', 'z', house.east, 0, 10, .365, [windowOpening('well-laundry', 3.0, 1, 1.5, .65), windowOpening('well-hobby', 7.1, 1, 1.5, .65)]), wall('north', 'x', .4, 0, (house.east - house.west), .365, [windowOpening('well-plant', 1.1, 1, 1.5, .65)]), wall('south', 'x', .4, 9.635, (house.east - house.west), .365)]
  const north = id === 'DG' ? [] : id === 'EG' ? [windowOpening('wc-window', .65, .9, 1.4, .7)] : [windowOpening('north-west', 1.2, 1.6), windowOpening('north-east', 4.75, 1.6)]
  const east = id === 'EG' ? [windowOpening('entrance-fixed', .6, .35, 0, 2.1), { ...door('entrance', 1.1, 1), swing: 'reverse' as const }, windowOpening('kitchen-window', 3.7, 1.7, 1.15, 1.1)] : id === 'DG' ? [windowOpening('gable-office', 4.2, 1.6, .9, 1.3)] : [windowOpening('east-north', 1.3, 1.5), windowOpening('east-south', 6.9, 1.6)]
  const south = id === 'DG' ? [] : id === 'EG' ? [windowOpening('garden-fixed', .7, 2, .1, 2.25), door('terrace', 3.2, 1.5, 2.35), windowOpening('terrace-fixed', 4.7, 1.5, 0, 2.35)] : [windowOpening('south-east', 4.4, 1.6), windowOpening('south-west', 1.1, 1.6, 1.2, 1.05)]
  return [wall('west', 'z', 0, 0, 10, .4), wall('east', 'z', house.east, 0, 10, .365, east), wall('north', 'x', .4, 0, (house.east - house.west), .365, north.map(open => ({ ...open, start: open.start - .4 }))), wall('south', 'x', .4, 9.635, (house.east - house.west), .365, south.map(open => ({ ...open, start: open.start - .4 })))]
}

export function makeFloor(id: FloorId): Floor {
  const floor: Floor = { id, name: { KG: 'Nutzkeller', EG: 'Erdgeschoss', OG: 'Obergeschoss', DG: 'Dachgeschoss' }[id], elevation: elevations[id], height: id === 'KG' ? 2.4 : 2.65, rooms: [], walls: [], furniture: [] }
  buildMainFloor(floor)
  return floor
}
function buildMainFloor(floor: Floor) {
  const hallWest = stair.x + stair.width + interiorWallThickness
  const stairWallStart = stair.z - interiorWallThickness
  const stairEast = stair.x + stair.width
  const eastDividerWest = hallWest + stair.arrivalDepth
  const childRoomWest = eastDividerWest + interiorWallThickness
  const southRoomStart = stair.end + interiorWallThickness
  floor.walls = [...shell(floor.id), wall('stair-north', 'x', .4, stairWallStart, stair.width), wall('stair-south', 'x', .4, stair.end, stair.width), wall('stair-east', 'z', stairEast, stairWallStart, stair.runWidth + interiorWallThickness, interiorWallThickness, [{ ...door('stair-lower', interiorWallThickness, stair.runWidth, 2.65), kind: 'passage' }]), wall('stair-east-south', 'z', stairEast, stair.end - stair.runWidth, stair.runWidth + interiorWallThickness, interiorWallThickness, [{ ...door('stair-upper', 0, stair.runWidth, 2.65), kind: 'passage' }]), wall('stair-recess-north', 'x', stairRecess.x, stairRecess.z, stairRecess.width + interiorWallThickness), wall('stair-recess-back', 'z', stairRecess.x, stairRecess.z + interiorWallThickness, stairRecess.depth - 2 * interiorWallThickness), wall('stair-recess-south', 'x', stairRecess.x, stairRecess.z + stairRecess.depth - interiorWallThickness, stairRecess.width + interiorWallThickness)]
  const recessRoom = rect(stairRecess.x + interiorWallThickness, stairRecess.z + interiorWallThickness, stairRecess.width, stairRecess.depth - 2 * interiorWallThickness)
  const hallParts = [rect(hallWest, stair.z, stair.arrivalDepth, stair.end - stair.z), recessRoom]
  const hall = room('hall', 'Flur', hallParts, colors.hall, '95 cm lichter Verteiler neben der Westtreppe. Zwei Viertelwendelungen mit geradem Mittelstück, An- und Austritt nach Osten; kein zusätzliches Süd-Podest. Ausführung ungeprüft.', [hallWest + stair.arrivalDepth / 2, stair.end - .5])
  if (floor.id === 'EG') {
    floor.walls.push(wall('wc-east', 'z', 2.58, .365, stairWallStart - .365, interiorWallThickness, [{ ...door('wc', .8), swing: 'reverse' }]), wall('wc-south', 'x', stairEast, stairWallStart, 2.74 - stairEast), wall('hall-south', 'x', 2.74, stairWallStart, house.east - 2.74, interiorWallThickness, [{ ...door('living', .06, 1.05), kind: 'passage' }]))
    floor.rooms = [room('wc', 'Dusch-WC', [rect(.4, .365, 2.18, stairWallStart - .365)], colors.wet, 'Kompaktes Dusch-WC mit 90 x 90 cm Dusche, WC und Waschtisch. Treppenantritt südöstlich neben dem Bad; Sanitärführung ungeprüft.', [1.5, 1.65]), room('hall', 'Diele', [rect(2.74, .365, house.east - 2.74, stairWallStart - .365)], colors.hall, '1,80 m Garderobe, Sitzbank und türhohes Seitenlicht. Zugang zur Westtreppe hinter dem verkleinerten Dusch-WC.', [5.5, 1.55]), room('living', 'Wohnen / Kochen / Essen', [rect(hallWest, stair.z, house.east - hallWest, southRoomStart - stair.z), rect(.4, southRoomStart, house.east - .4, house.south - southRoomStart)], colors.living, 'Offener Familienbereich mit Bestandssofa, Ostwandbank und 180-cm-Esstisch. Der östliche Treppenaustritt bleibt frei; Halbinsel 240 x 100 cm und Vorratshochschrank.', [3.25, 6.35])]
    floor.furniture = [furniture('guest-shower', 'shower', .45, 2.05, .9, .9, .06), furniture('guest-wc', 'wc', 1.5, .43, .65, .7, .43), furniture('guest-sink', 'sink', .45, .43, .55, .5, .85), furniture('wardrobe', 'cabinet', 2.8, .39, 1.8, .6, 2.4), furniture('bench', 'cabinet', 4.6, .39, .8, .6, .45), furniture('coffee', 'table', 1.15, 7.9, .9, .5, .35), furniture('sideboard', 'cabinet', .42, 7.65, .45, 1.8, .6), furniture('tv', 'tv', .41, 8.15, .08, 1.3, 1.65), { ...furniture('bookshelf', 'bookcase', .43, southRoomStart, 2.12, .4, 2.12), color: '#fafafa' }, furniture('plant', 'plant', 6.1, 9.1, .45, .45, 1.2)]
    floor.furniture.push(furniture('fridge', 'cabinet', 6.035, 2.325, .6, .6, 2.55), furniture('kitchen-tall', 'cabinet', 4.235, 2.325, 1.2, .6, 2.55), furniture('pantry-cabinet', 'cabinet', 5.435, 2.325, .6, .6, 2.55), furniture('kitchen', 'counter', 6.035, 3, .6, 1.55, .92), furniture('peninsula', 'counter', 4.235, 4.55, 2.4, 1, .92), furniture('kitchen-sink', 'sink', 6.07, 3.25, .52, .6, .95), { ...furniture('induction', 'hob', 4.6, 4.77, .8, .52, .025), bottom: .92 }, { ...furniture('espresso', 'espresso', 5.8, 5.1, .38, .4, .4), bottom: .92 })
    floor.furniture.push(furniture('sofa', 'sofa', 2.7, 7, .8, 2.5, .8, Math.PI / 2), furniture('sofa-chaise', 'chaise', 1.8, 8.7, .9, .8, .48), furniture('dining', 'table', 5.1, 7, .9, 1.8, .75), furniture('dining-bench', 'bench', house.east - .5, 6.9, .5, 2, .85))
    for (const south of [7, 7.65, 8.3]) floor.furniture.push(furniture(`dining-chair-${south}`, 'chair', 4.48, south, .43, .43, .8, -Math.PI / 2))
    floor.furniture.find(item => item.id === 'guest-shower')!.z = .43
    floor.furniture.find(item => item.id === 'guest-sink')!.z = 1.6
    const bookshelf = floor.furniture.find(item => item.id === 'bookshelf')!
    bookshelf.x = .43; bookshelf.z = southRoomStart + .02; bookshelf.width = 2.12; bookshelf.depth = .4
    for (const item of floor.furniture.filter(item => ['fridge', 'kitchen-tall', 'pantry-cabinet'].includes(item.id))) item.z = stair.z
    const counter = floor.furniture.find(item => item.id === 'kitchen')!
    counter.z = 3.45; counter.depth = 1.1
    floor.furniture.find(item => item.id === 'kitchen-sink')!.z = 3.5
    floor.rooms.find(room => room.id === 'living')!.parts.push(recessRoom)
    return
  }
  if (floor.id === 'KG') {
    floor.walls.push(wall('north-divider', 'z', 3.5, .365, stairWallStart - .365), wall('bath-south', 'x', stairEast, stairWallStart, 3.66 - stairEast, interiorWallThickness, [{ ...door('bath', .17), hinge: 'end' }]), wall('east-divider', 'z', eastDividerWest, stair.z, stair.depth, interiorWallThickness, [door('child-north', 1.4)]), wall('store-north', 'x', stairEast, stair.end, house.east - stairEast, interiorWallThickness, [{ ...door('child-south', .17), hinge: 'end' }]))
    floor.rooms = [room('bath', 'Technik', [rect(.4, .365, 3.1, stairWallStart - .365)], colors.utility, 'Kompakter Technikraum im Norden. Wartungsflächen und Geräteauswahl sind fachlich zu prüfen.', [2.3, 1.65]), room('child-north', 'Waschen / Lager', [rect(3.66, .365, house.east - 3.66, stair.z - .365), rect(childRoomWest, stair.z, house.east - childRoomWest, stair.end - stair.z)], colors.utility, 'Wäsche und Lagerung im Osten mit Lichtschacht und eigenem Flurzugang.', [4.8, 4.3]), room('child-south', 'Hobby', [rect(.4, southRoomStart, (house.east - house.west), house.south - southRoomStart)], colors.child, 'Südlicher Hobbyraum mit freiem Treppenaustritt.', [3.85, 7.3]), hall]
    floor.furniture = [furniture('heat-pump', 'machine', .55, .5, .75, .75, 1.8), furniture('tank', 'machine', 1.6, .5, .7, .7, 1.7), furniture('distribution', 'cabinet', 3.3, .7, .4, 1.3, 1.9), furniture('washer', 'machine', 5.95, .6, .62, .62, .88), furniture('dryer', 'machine', 5.95, 1.25, .62, .62, .88), furniture('laundry', 'counter', 4.1, .4, 1.6, .6, .9), furniture('laundry-shelf', 'cabinet', 4.05, 1.3, .4, 1.8, 2.2)]
    const party = floor.rooms.find(room => room.id === 'child-south')!
    party.name = 'Kinderpartyraum'
    party.note = 'Freie Tanz- und Spielfläche mit Diskokugel und ruhigen bunten Lichtern ohne Stroboskop. Sitzbank, niedriger Snacktisch und Spielzeugregal am Rand; Eingang und Lichtschacht frei.'
    floor.furniture.push(furniture('party-sofa', 'sofa', .55, 8.65, 2, .8, .65), furniture('party-snack', 'table', 5.2, 8.5, 1.2, .65, .55), furniture('party-stool', 'chair', 5.35, 7.75, .4, .4, .5), furniture('party-storage', 'bookcase', .5, 5.8, .35, 1.3, .8))
    floor.furniture.find(item => item.id === 'party-storage')!.z = 7.3
    floor.furniture.find(item => item.id === 'distribution')!.x = .45
    floor.furniture.find(item => item.id === 'distribution')!.z = 1.3
    return
  }
  if (floor.id === 'OG') {
    const roomDivider = 3.74, eastRoomStart = roomDivider + interiorWallThickness, sharedEast = 3.13, childrenSplit = 5.2, hallEnd = 6.28, sharedStart = hallEnd + interiorWallThickness
    hall.parts[0].depth = hallEnd - stair.z
    floor.walls.push(wall('north-divider', 'z', roomDivider, house.north, stairWallStart - house.north), wall('bath-south', 'x', stairEast, stairWallStart, eastRoomStart - stairEast, interiorWallThickness, [{ ...door('bath', .17), hinge: 'end' }]), wall('east-divider', 'z', eastDividerWest, stair.z, hallEnd - stair.z, interiorWallThickness, [door('child-north', .96), door('child-south', 2.58)]), wall('children-divider', 'x', childRoomWest, childrenSplit, house.east - childRoomWest), wall('shared-east', 'z', sharedEast, sharedStart, house.south - sharedStart), wall('store-north', 'x', stairEast, hallEnd, childRoomWest - stairEast, interiorWallThickness, [{ ...door('multifunction', .17), hinge: 'end' }]), wall('hall-west-south', 'z', stairEast, stair.end + interiorWallThickness, hallEnd - stair.end - interiorWallThickness))
    const northWindow = floor.walls.find(wall => wall.id === 'north')!.openings.find(opening => opening.id === 'north-west')!
    northWindow.sill = 1.2; northWindow.height = 1.05
    const southWindow = floor.walls.find(wall => wall.id === 'south')!.openings.find(opening => opening.id === 'south-west')!
    southWindow.sill = .9; southWindow.height = 1.35
    floor.walls.find(wall => wall.id === 'south')!.openings.find(opening => opening.id === 'south-east')!.start = 4.4 - house.west
    floor.rooms = [
      room('bath', 'Familienbad', [rect(house.west, house.north, roomDivider - house.west, stairWallStart - house.north)], colors.wet, 'Nordbad mit 3,34 x 2,275 m, Wanne, 100-cm-Dusche und Waschplatz. Über dem EG-WC; Leitungsführung ungeprüft.', [2.85, 1.8]),
      room('child-north', 'Kind Nordost', [rect(eastRoomStart, house.north, house.east - eastRoomStart, stair.z - house.north), rect(childRoomWest, stair.z, house.east - childRoomWest, childrenSplit - stair.z)], colors.child, '14,1 m² mit breiterem Arbeitsbereich im Nordosten. Bett, 140-cm-Schreibtisch und 180-cm-Schrank; eigener Flurzugang.', [4.4, 4.3]),
      room('child-south', 'Kind Südost', [rect(childRoomWest, childrenSplit + interiorWallThickness, house.east - childRoomWest, sharedStart - childrenSplit - interiorWallThickness), rect(sharedEast + interiorWallThickness, sharedStart, house.east - sharedEast - interiorWallThickness, house.south - sharedStart)], colors.child, '14,0 m² mit breiter südlicher Hauptfläche und kurzem Eingangsbereich. Bett, 140-cm-Schreibtisch und 180-cm-Schrank; eigene Ost- und Südfenster.', [4.4, 7.2]),
      room('multifunction', 'Lesen / Abstellen', [rect(.4, southRoomStart, stairEast - .4, sharedStart - southRoomStart), rect(.4, sharedStart, sharedEast - .4, house.south - sharedStart)], colors.work, 'Separater Raum mit Südfenster, Sitzbank und flachem Regal. Mehr Tiefe durch die kürzere Treppe, mit kurzer Eingangsnische; eigener Zugang direkt vom Verteiler.', [1.8, 7.6]),
      hall,
    ]
    floor.furniture = [furniture('bath-tub', 'bath', .5, .43, 1.8, .8, .6), furniture('bath-shower', 'shower', .45, 1.58, 1, 1, .04), furniture('bath-wc', 'wc', 2.5, .43, .65, .6, .43), furniture('bath-sink', 'sink', 3.45, .5, .5, 1.1, .88), furniture('bed-north', 'bed', 5.65, 3.2, .9, 2, .52), furniture('desk-north', 'desk', 4.8, .42, 1.4, .6, .75), furniture('desk-chair-north', 'chair', 5.25, 1.6, .48, .48, .82), furniture('wardrobe-north', 'cabinet', 3.35, 2.85, 1.8, .6, 2.25), furniture('bed-south', 'bed', 5.65, 7.3, .9, 2, .52), furniture('desk-south', 'desk', 3.35, 9, 1.4, .6, .75), furniture('desk-chair-south', 'chair', 3.8, 8.15, .48, .48, .82), furniture('wardrobe-south', 'cabinet', 4.5, 5.51, 1.8, .6, 2.25), furniture('shared-bench', 'bench', .45, 7.5, .45, 1.35, .85), furniture('shared-shelf', 'bookcase', 2.78, 8.5, .3, 1, .9)]
    const northWardrobe = floor.furniture.find(item => item.id === 'wardrobe-north')!
    northWardrobe.x = 3.95; northWardrobe.z = .4; northWardrobe.width = .6; northWardrobe.depth = 1.8
    floor.furniture.find(item => item.id === 'bath-sink')!.x = 3.19
    floor.furniture.find(item => item.id === 'bed-north')!.z = 3.15
    floor.furniture.find(item => item.id === 'desk-north')!.x = 4.95
    return
  }
  if (floor.id === 'DG') {
    const north = heightLine(1.2) + interiorWallThickness, south = 10 - north
    const dgRoomWest = childRoomWest
    const officeEnd = 3.9
    floor.walls.push(wall('knee-north', 'x', .4, heightLine(1.2), (house.east - house.west)), wall('knee-south', 'x', .4, south, (house.east - house.west)), wall('office-entry', 'x', hallWest, officeEnd, house.east - hallWest, interiorWallThickness, [door('attic-office', .015)]), wall('bedroom-west', 'z', eastDividerWest, officeEnd + interiorWallThickness, southRoomStart - officeEnd - interiorWallThickness), wall('parents-entry-south', 'x', stairEast, stair.end, childRoomWest - stairEast, interiorWallThickness, [{ ...door('attic-parents-south', .17), hinge: 'end', swing: 'reverse' }]))
    hall.parts = [rect(hallWest, officeEnd + interiorWallThickness, stair.arrivalDepth, stair.end - officeEnd - interiorWallThickness), recessRoom]
    floor.walls.find(wall => wall.id === 'east')!.openings = [windowOpening('gable-office-north', 2.8, .98, .9, 1.18), windowOpening('gable-office', 4.95, .98, .9, 1.18)]
    floor.rooms = [room('office', 'Gäste / Arbeit', [rect(.4, north, house.east - .4, stairWallStart - north), rect(hallWest, stairWallStart, house.east - hallWest, officeEnd - stairWallStart)], colors.work, 'Arbeits- und Gästebereich mit 140-x-200-cm-Liegefläche, 140-cm-Schreibtisch und eigenem Zugang vom kurzen Treppenverteiler.', [3.6, 3.5]), room('bedroom', 'Eltern / Ankleide', [rect(dgRoomWest, officeEnd + interiorWallThickness, house.east - dgRoomWest, southRoomStart - officeEnd - interiorWallThickness), rect(.4, southRoomStart, house.east - .4, south - southRoomStart)], colors.living, 'Elternbereich mit 180-x-200-cm-Bett am Ostgiebel und südwestlicher Ankleide. Kein zusätzliches Süd-Podest; Zugang unabhängig vom Gästezimmer.', [2.65, 7.2]), hall]
    floor.furniture = [furniture('parents-bed', 'bed', 4.6, 4.8, 2, 1.8, .52, Math.PI / 2), furniture('parents-cabinet', 'cabinet', 3.4, 4.11, 1.8, .6, 1.9), furniture('dressing-low', 'cabinet', .55, 6.75, .6, 1.4, 1.2), furniture('parents-low', 'cabinet', 4.15, 7.85, 2.4, .5, .8), furniture('office-desk', 'desk', .65, 1.65, 1.4, .6, .75), furniture('office-chair', 'chair', 2.25, 2.25, .48, .48, .85), furniture('guest-bed', 'bed', 4.5, 1.65, 2, 1.4, .48, Math.PI / 2), furniture('office-storage', 'cabinet', 3.35, 1.65, .65, .45, 1.25)]
    const desk = floor.furniture.find(item => item.id === 'office-desk')!
    desk.x = 2.25
    const chair = floor.furniture.find(item => item.id === 'office-chair')!
    chair.x = 2.8; chair.z = 2.52
    const storage = floor.furniture.find(item => item.id === 'office-storage')!
    storage.x = .65; storage.width = 1.2
    floor.furniture.find(item => item.id === 'parents-cabinet')!.x = 3.6
    return
  }
}

export type Solid = Rect & { bottom: number; height: number; kind: 'wall' | 'stair' | 'floor' | 'rail'; id: string; footprint?: StairPoint[] }
export function wallSolids(wallData: Wall, height: number): Solid[] {
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
    return { ...rect(Math.min(...east), Math.min(...south), Math.max(...east) - Math.min(...east), Math.max(...south) - Math.min(...south)), footprint: step.footprint, bottom: step.height - rise / stair.risers - .12, height: rise / stair.risers + .12, kind: 'stair', id: step.id }
  })
}
export function floorSlabs(id: FloorId): Rect[] {
  if (id === 'KG') return [rect(0, 0, house.width, house.depth)]
  const core = stairFor()
  return [rect(0, 0, house.width, core.z), rect(0, core.z, core.x, core.depth), rect(core.x + core.width, core.z, house.width - core.x - core.width, core.depth), rect(0, core.end, house.width, house.depth - core.end), stairRecess]
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