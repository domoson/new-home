import { winderCore, winderSteps } from './winderStair'
import type { StairPoint } from './winderStair'

export type FloorId = 'KG' | 'EG' | 'OG' | 'DG'
export type Rect = { x: number; z: number; width: number; depth: number }
export type Room = { id: string; name: string; parts: Rect[]; color: string; note: string; spawn: [number, number] }
export type Opening = { start: number; width: number; sill: number; height: number; kind: 'door' | 'window' | 'passage'; id: string; hinge?: 'end'; swing?: 'reverse' }
export type Wall = Rect & { id: string; axis: 'x' | 'z'; openings: Opening[] }
export type Furniture = Rect & { id: string; kind: 'bed' | 'sofa' | 'chaise' | 'bookcase' | 'table' | 'chair' | 'bench' | 'cabinet' | 'counter' | 'sink' | 'wc' | 'shower' | 'bath' | 'desk' | 'tv' | 'plant' | 'machine' | 'hob' | 'espresso'; height: number; bottom?: number; angle?: number; color?: string }
export type Floor = { id: FloorId; name: string; elevation: number; height: number; rooms: Room[]; walls: Wall[]; furniture: Furniture[] }
export const house = { width: 7.5, depth: 10, west: .4, east: 7.135, north: .365, south: 9.635, pitch: 35, knee: .5 }
export const stair = winderCore
export const interiorWallThickness = .16
export const stairFor = () => stair
export const floorIds: FloorId[] = ['KG', 'EG', 'OG', 'DG']
export const elevations: Record<FloorId, number> = { KG: -2.7, EG: 0, OG: 2.95, DG: 5.9 }
export const rect = (x: number, z: number, width: number, depth: number): Rect => ({ x, z, width, depth })
export const lightWells = [rect(7.5, 3, .5, 1), rect(7.5, 7.1, .5, 1), rect(1.5, -.5, 1, .5)]
const skylight = (id: string, name: string, x: number, z: number, width: number, length: number) => ({ id, name, length, ...rect(x, z, width, length * Math.cos(house.pitch * Math.PI / 180)) })
export const roofWindows = [skylight('DG-office-west-skylight', 'Dachfenster Gäste / Arbeit', .8, 1.9, 1.14, 1.4), skylight('DG-stair-skylight', 'Dachfenster Treppenhaus', 1.4, 3.55, .78, 1.18), skylight('DG-parents-west-skylight', 'Dachfenster Eltern', 1.05, 6.6, 1.14, 1.4)]
export function roofPanels(): Rect[] {
  const cuts = [...new Set([-.1, 7.75, ...roofWindows.flatMap(window => [window.x, window.x + window.width])])].sort((first, second) => first - second)
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
  if (id === 'KG') return [wall('west', 'z', 0, 0, 10, .4), wall('east', 'z', 7.135, 0, 10, .365, [windowOpening('well-laundry', 3.0, 1, 1.5, .65), windowOpening('well-hobby', 7.1, 1, 1.5, .65)]), wall('north', 'x', .4, 0, 6.735, .365, [windowOpening('well-plant', 1.1, 1, 1.5, .65)]), wall('south', 'x', .4, 9.635, 6.735, .365)]
  const north = id === 'DG' ? [] : id === 'EG' ? [windowOpening('wc-window', .65, .9, 1.4, .7)] : [windowOpening('north-west', 1.2, 1.6), windowOpening('north-east', 4.75, 1.6)]
  const east = id === 'EG' ? [windowOpening('entrance-fixed', .6, .35, 0, 2.1), { ...door('entrance', 1.1, 1), swing: 'reverse' as const }, windowOpening('kitchen-window', 3.7, 1.7, 1.15, 1.1)] : id === 'DG' ? [windowOpening('gable-office', 4.2, 1.6, .9, 1.3)] : [windowOpening('east-north', 1.3, 1.5), windowOpening('east-south', 6.9, 1.6)]
  const south = id === 'DG' ? [] : id === 'EG' ? [windowOpening('garden-fixed', .8, 2, .1, 2.25), door('terrace', 3.6, 1.5, 2.35), windowOpening('terrace-fixed', 5.1, 1.5, 0, 2.35)] : [windowOpening('south-east', 4.8, 1.6), windowOpening('south-west', 1.1, 1.1)]
  return [wall('west', 'z', 0, 0, 10, .4), wall('east', 'z', 7.135, 0, 10, .365, east), wall('north', 'x', .4, 0, 6.735, .365, north.map(open => ({ ...open, start: open.start - .4 }))), wall('south', 'x', .4, 9.635, 6.735, .365, south.map(open => ({ ...open, start: open.start - .4 })))]
}

export function makeFloor(id: FloorId): Floor {
  const floor: Floor = { id, name: { KG: 'Nutzkeller', EG: 'Erdgeschoss', OG: 'Obergeschoss', DG: 'Dachgeschoss' }[id], elevation: elevations[id], height: id === 'KG' ? 2.4 : 2.65, rooms: [], walls: [], furniture: [] }
  buildMainFloor(floor)
  return floor
}
function buildMainFloor(floor: Floor) {
  const hallWest = stair.x + stair.width + interiorWallThickness
  const stairWallStart = stair.z - interiorWallThickness
  const stairWallLength = stair.depth + interiorWallThickness * 2
  const stairEast = stair.x + stair.width
  const eastDividerWest = hallWest + stair.arrivalDepth
  const childRoomWest = eastDividerWest + interiorWallThickness
  const southRoomStart = stair.end + interiorWallThickness
  floor.walls = [...shell(floor.id), wall('stair-north', 'x', .4, stairWallStart, stair.width), wall('stair-south', 'x', .4, stair.end, stair.width), wall('stair-east', 'z', stairEast, stairWallStart, stairWallLength, interiorWallThickness, [{ ...door('stair-lower', interiorWallThickness, stair.runWidth, 2.65), kind: 'passage' }, { ...door('stair-upper', stair.end - stair.runWidth - stairWallStart, stair.runWidth, 2.65), kind: 'passage' }])]
  const hallParts = [rect(hallWest, stair.z, stair.arrivalDepth, stair.end - stair.z)]
  const hall = room('hall', 'Flur', hallParts, colors.hall, '1,62 m breiter Flur mit Eichenparkett. Einläufige, zweimal viertelgewendelte Treppe: Antritt im Norden zur Diele, Austritt im Süden. Kein Zwischenpodest.', [hallWest + stair.arrivalDepth / 2, 4.3])
  if (floor.id === 'EG') {
    const entranceWest = 2.28 + interiorWallThickness, showerEast = 1.4
    const pantryEast = 3.19, kitchenPassageWest = pantryEast + interiorWallThickness
    floor.walls.push(wall('wc-east', 'z', 2.28, .365, 1.8, interiorWallThickness, [door('wc', .8)]), wall('wc-south', 'x', showerEast, 2.165, entranceWest - showerEast), wall('shower-niche-east', 'z', showerEast, 2.165, stairWallStart - 2.165), wall('hall-south', 'x', entranceWest, 2.165, house.east - entranceWest, interiorWallThickness, [{ ...door('living', hallWest - entranceWest, 1.05), kind: 'passage' }]), wall('pantry-east', 'z', stairEast, 2.325, stairWallStart - 2.325, interiorWallThickness, [{ ...door('pantry', .11), kind: 'passage' }]))
    floor.rooms = [room('wc', 'Dusch-WC', [rect(.4, .365, 1.88, 1.8), rect(.4, 2.165, 1, stairWallStart - 2.165)], colors.wet, 'L-förmiges Gästebad: 90 x 90 cm Dusche in einer eigenen südlichen Nische, WC und Waschtisch im breiteren Hauptbereich. Ohne eingeplanten Installationsschacht.', [1.7, 1.65]), room('pantry', 'Speis', [rect(showerEast + interiorWallThickness, 2.325, stairEast - showerEast - interiorWallThickness, stairWallStart - 2.325)], colors.utility, 'Kleine Speis in der Nische neben der Dusche, mit flachen Regalen und offenem 90-cm-Zugang von der Küche. Die Türfrage bleibt offen.', [2.6, 2.95]), room('hall', 'Diele', [rect(entranceWest, .365, house.east - entranceWest, 1.8)], colors.hall, 'Etwas breitere Diele mit 1,80 m Garderobe, Bank und türhohem Seitenlicht. Fliesen bleiben im Eingangsbereich.', [5.8, 1.55]), room('living', 'Wohnen / Kochen / Essen', [rect(hallWest, 2.325, house.east - hallWest, stairWallStart - 2.325), rect(hallWest, stairWallStart, house.east - hallWest, southRoomStart - stairWallStart), rect(.4, southRoomStart, 6.735, house.south - southRoomStart)], colors.living, 'Wohnbereich südlich der versetzten Treppe, mit offener Küche und Speis. Bestandssofa und Ostwandbank bleiben erhalten.', [3.9, 6])]
    floor.furniture = [furniture('guest-shower', 'shower', .45, 2.39, .9, .9, .06), furniture('guest-wc', 'wc', 1.5, .43, .65, .7, .43), furniture('guest-sink', 'sink', .45, .43, .55, .5, .85), furniture('wardrobe', 'cabinet', 2.5, .39, 1.8, .6, 2.4), furniture('bench', 'cabinet', 4.3, .39, .8, .6, .45), furniture('coffee', 'table', 1.3, 7.9, .9, .5, .35), furniture('sideboard', 'cabinet', .42, 7.65, .45, 1.8, .6), furniture('tv', 'tv', .41, 8.15, .08, 1.3, 1.65), { ...furniture('bookshelf', 'bookcase', .43, stair.end + interiorWallThickness, 2.12, .4, 2.12), color: '#fafafa' }, furniture('plant', 'plant', 6.45, 9.1, .45, .45, 1.2)]
    floor.furniture.push(furniture('fridge', 'cabinet', 6.535, 2.165 + interiorWallThickness, .6, .6, 2.55), furniture('kitchen-tall', 'cabinet', 4.45, 2.165 + interiorWallThickness, 1.8, .6, 2.55), furniture('kitchen', 'counter', 6.535, 3, .6, 1.55, .92), furniture('peninsula', 'counter', 4.435, 4.55, 2.7, 1, .92), furniture('kitchen-sink', 'sink', 6.57, 3.25, .52, .6, .95), { ...furniture('induction', 'hob', 4.8, 4.77, .8, .52, .025), bottom: .92 }, { ...furniture('espresso', 'espresso', 5.8, 5.1, .38, .4, .4), bottom: .92 })
    floor.furniture.push(furniture('sofa', 'sofa', 2.8, 7, .8, 2.5, .8, Math.PI / 2), furniture('sofa-chaise', 'chaise', 1.9, 8.7, .9, .8, .48), furniture('dining', 'table', 5.6, 7, .9, 1.8, .75), furniture('dining-bench', 'bench', 6.635, 6.9, .5, 2, .85))
    floor.walls.find(wall => wall.id === 'pantry-east')!.x = pantryEast
    floor.walls.find(wall => wall.id === 'hall-south')!.openings[0].start = kitchenPassageWest - entranceWest
    floor.rooms.find(room => room.id === 'pantry')!.parts[0].width = pantryEast - showerEast - interiorWallThickness
    Object.assign(floor.rooms.find(room => room.id === 'living')!.parts[0], { x: kitchenPassageWest, width: house.east - kitchenPassageWest })
    floor.furniture.push(furniture('pantry-shelf-west', 'bookcase', 1.61, 2.7, .3, .65, 2.1), furniture('pantry-shelf-north', 'bookcase', 1.61, 2.35, 1.4, .3, 2.1))
    for (const south of [7, 7.65, 8.3]) floor.furniture.push(furniture(`dining-chair-${south}`, 'chair', 4.98, south, .43, .43, .8, -Math.PI / 2))
    return
  }
  if (floor.id === 'KG') {
    floor.walls.push(wall('north-divider', 'z', eastDividerWest, .365, stairWallStart - .365), wall('bath-south', 'x', stairEast, stairWallStart, childRoomWest - stairEast, interiorWallThickness, [door('bath', .17)]), wall('east-divider', 'z', eastDividerWest, stairWallStart, southRoomStart - stairWallStart, interiorWallThickness, [door('child-north', .36)]), wall('store-north', 'x', stairEast, stair.end, house.east - stairEast, interiorWallThickness, [door('child-south', .17)]))
    floor.rooms = [room('bath', 'Technik', [rect(.4, .365, eastDividerWest - .4, stairWallStart - .365)], colors.utility, 'Technikraum mit geradem Zuschnitt und Platz für Wartung. Ein Installationsschacht ist vorerst nicht eingeplant.', [3, 2.8]), room('child-north', 'Waschen / Lager', [rect(childRoomWest, .365, house.east - childRoomWest, stair.end - .365)], colors.utility, 'Ein gemeinsamer Raum für Wäsche, Vorräte und Lagerung mit Lichtschacht im Osten.', [5.3, 4.3]), room('child-south', 'Hobby', [rect(.4, southRoomStart, 6.735, house.south - southRoomStart)], colors.child, 'Durchgehender rechteckiger Hobbyraum über die gesamte südliche Hausbreite, ohne zusätzlichen Abstellraum.', [3.85, 6.3]), hall]
    floor.furniture = [furniture('heat-pump', 'machine', .55, .5, .75, .75, 1.8), furniture('tank', 'machine', 1.6, .5, .7, .7, 1.7), furniture('distribution', 'cabinet', 3.85, .7, .4, 1.3, 1.9), furniture('washer', 'machine', 6.45, .6, .62, .62, .88), furniture('dryer', 'machine', 6.45, 1.25, .62, .62, .88), furniture('laundry', 'counter', 4.6, .4, 1.6, .6, .9), furniture('laundry-shelf', 'cabinet', 4.57, 1.3, .4, 1.8, 2.2), furniture('hobby-table', 'table', 5, 7.1, 1.6, .8, .75)]
    const party = floor.rooms.find(room => room.id === 'child-south')!
    party.name = 'Kinderpartyraum'
    party.note = 'Freie Tanz- und Spielfläche mit Diskokugel und ruhigen bunten Lichtern ohne Stroboskop. Sitzbank, niedriger Snacktisch und Spielzeugregal am Rand; Eingang und Lichtschacht frei.'
    floor.furniture = floor.furniture.filter(item => item.id !== 'hobby-table')
    floor.furniture.push(furniture('party-sofa', 'sofa', .55, 8.65, 2, .8, .65), furniture('party-snack', 'table', 5.7, 8.5, 1.2, .65, .55), furniture('party-stool', 'chair', 5.85, 7.75, .4, .4, .5), furniture('party-storage', 'bookcase', .5, 5.8, .35, 1.3, .8))
    floor.furniture.find(item => item.id === 'party-storage')!.z = southRoomStart + .05
    return
  }
  if (floor.id === 'OG') {
    const bathEast = 3, northChildWest = bathEast + interiorWallThickness
    const southEntry = 6.3, southChildEast = 4.9, sharedWest = southChildEast + interiorWallThickness
    const sharedNorth = southEntry - .9, northChildEnd = sharedNorth - interiorWallThickness
    hall.parts = [rect(northChildWest, 2.46, eastDividerWest - northChildWest, stairWallStart - 2.46), rect(hallWest, stairWallStart, stair.arrivalDepth, southRoomStart - stairWallStart), rect(hallWest, southRoomStart, southChildEast - hallWest, southEntry - southRoomStart), rect(eastDividerWest, sharedNorth, southChildEast - eastDividerWest, southRoomStart - sharedNorth)]
    floor.walls.push(wall('north-divider', 'z', bathEast, .365, stairWallStart - .365, interiorWallThickness, [{ ...door('bath', 2.135), swing: 'reverse' }]), wall('north-room-step', 'x', northChildWest, 2.3, childRoomWest - northChildWest), wall('east-divider', 'z', eastDividerWest, 2.3, stair.end - 2.3, interiorWallThickness, [door('child-north', 1.55)]), wall('child-divider', 'x', eastDividerWest, stair.end, house.east - eastDividerWest), wall('south-child-entry-west', 'z', stairEast, southRoomStart, southEntry + interiorWallThickness - southRoomStart), wall('store-north', 'x', stairEast, southEntry, sharedWest - stairEast, interiorWallThickness, [door('child-south', .17)]), wall('shared-west', 'z', southChildEast, stair.end, house.south - stair.end, interiorWallThickness, [{ ...door('multifunction', interiorWallThickness, .9, 2.65), kind: 'passage' }]))
    const southWall = floor.walls.find(wall => wall.id === 'south')!
    floor.walls.find(wall => wall.id === 'east-divider')!.depth = northChildEnd - 2.3
    floor.walls.find(wall => wall.id === 'child-divider')!.z = northChildEnd
    const sharedWall = floor.walls.find(wall => wall.id === 'shared-west')!
    Object.assign(sharedWall, { z: northChildEnd, depth: house.south - northChildEnd })
    Object.assign(southWall.openings.find(opening => opening.id === 'south-west')!, { width: 1.6 })
    Object.assign(southWall.openings.find(opening => opening.id === 'south-east')!, { start: 5.4 - .4, width: 1.3 })
    floor.rooms = [
      room('bath', 'Familienbad', [rect(.4, .365, bathEast - .4, stairWallStart - .365)], colors.wet, 'Kompaktes Bad mit 2,60 x 3,08 m, ohne Schacht und ohne Zugangsnische. Die Tür öffnet nach innen ins Bad.', [2.4, 2.95]),
      room('child-north', 'Kind Nord', [rect(northChildWest, .365, house.east - northChildWest, 2.3 - .365), rect(childRoomWest, 2.3, house.east - childRoomWest, stair.end - 2.3)], colors.child, 'Breitere nördliche Schlafzone, Arbeitsplatz im Osten und eigener Zugang. L-Zuschnitt am Flur, kein Durchgangszimmer.', [5.2, 4.3]),
      room('child-south', 'Kind Süd', [rect(.4, southEntry + interiorWallThickness, southChildEast - .4, house.south - southEntry - interiorWallThickness), rect(.4, southRoomStart, stair.width, southEntry + interiorWallThickness - southRoomStart)], colors.child, 'Tieferes Kinderzimmer mit 4,50 x 2,94 m Hauptbereich und breiter Garderobennische im Nordwesten. Eigenes Südfenster und eigener Zugang; kein langer Querstreifen mehr.', [3.85, 7.05]),
      room('multifunction', 'Lesen / Spielen', [rect(sharedWest, southRoomStart, house.east - sharedWest, house.south - southRoomStart)], colors.work, 'Zusammenhängende gemeinsame Lese- und Spielzone an der Südostfassade, 2,08 x 4,00 m. Arbeitsplatz, Sitzbank und Ost-/Südfenster; eigener offener Zugang vom Flur, keine Erschließung durch ein Kinderzimmer.', [5.6, 7.4]),
      hall,
    ]
    floor.furniture = [furniture('bath-tub', 'bath', .5, .47, 1.8, .8, .6), furniture('bath-shower', 'shower', .45, 2.39, 1, 1, .04), furniture('bath-wc', 'wc', .7, 1.4, .65, .6, .43), furniture('bath-sink', 'sink', 2.45, 1.1, .5, 1.1, .88), furniture('bed-north', 'bed', 3.55, .55, 2, .9, .52, Math.PI / 2), furniture('desk-north', 'desk', 6.49, 2, .6, 1.4, .75), furniture('desk-chair-north', 'chair', 5.83, 2.45, .48, .48, .82), furniture('wardrobe-north', 'cabinet', 5.15, 4.83, 1.8, .6, 2.25), furniture('bed-south', 'bed', .55, 6.95, .9, 2, .52), furniture('desk-south', 'desk', 4.25, 7.2, .6, 1.4, .75), furniture('desk-chair-south', 'chair', 3.59, 7.65, .48, .48, .82), furniture('wardrobe-south', 'cabinet', .45, 5.69, 2.6, .6, 2.25), furniture('wardrobe-south-2', 'cabinet', 2.95, 9, 1.8, .6, 2.25), furniture('shared-desk', 'desk', 5.11, 8.985, 1.4, .6, .75), furniture('shared-chair', 'chair', 5.35, 8.2, .48, .48, .82), furniture('shared-bench', 'bench', 6.635, 7.2, .45, 1.4, .85), furniture('shared-shelf', 'bookcase', 6.785, 5.69, .3, 1.1, .9)]
    floor.furniture = floor.furniture.filter(item => item.id !== 'wardrobe-south-2').map(item => item.id === 'desk-south' ? { ...item, ...rect(2, 8.985, 1.4, .6) } : item.id === 'desk-chair-south' ? { ...item, ...rect(2.45, 8.15, .48, .48) } : item.id === 'wardrobe-south' ? { ...item, width: 1.8 } : item)
    floor.furniture.find(item => item.id === 'wardrobe-south')!.z = southRoomStart + .05
    floor.furniture.find(item => item.id === 'wardrobe-north')!.z = northChildEnd - .65
    floor.furniture.find(item => item.id === 'shared-shelf')!.z = sharedNorth + .05
    floor.rooms.find(room => room.id === 'child-north')!.parts[1].depth = northChildEnd - 2.3
    Object.assign(floor.rooms.find(room => room.id === 'multifunction')!.parts[0], { z: sharedNorth, depth: house.south - sharedNorth })
    floor.rooms.find(room => room.id === 'child-south')!.note = 'Rund 15,4 m² wie Kind Nord. Hauptbereich 4,50 x 3,18 m mit Garderobennische im Nordwesten, eigenem Südfenster und Zugang vom Flur.'
    floor.rooms.find(room => room.id === 'multifunction')!.note = 'Gemeinsame Lese- und Spielzone an der Südostfassade, 2,08 x 4,24 m. Arbeitsplatz, Sitzbank und Ost-/Südfenster; eigener 90-cm-Zugang vom Flur, kein Durchgang durch ein Kinderzimmer.'
    return
  }
  if (floor.id === 'DG') {
    const north = heightLine(1.2) + interiorWallThickness, south = 10 - north
    const dgRoomWest = childRoomWest
    const officeEnd = 4.7
    floor.walls.push(wall('knee-north', 'x', .4, heightLine(1.2), 6.735), wall('knee-south', 'x', .4, south, 6.735), wall('office-entry', 'x', stairEast, stairWallStart, dgRoomWest - stairEast, interiorWallThickness, [door('attic-office', .17)]), wall('office-south', 'x', dgRoomWest, officeEnd, house.east - dgRoomWest), wall('bedroom-west', 'z', eastDividerWest, stairWallStart, southRoomStart - stairWallStart))
    const parentsEntry = stair.end
    floor.walls.find(wall => wall.id === 'bedroom-west')!.depth = parentsEntry + interiorWallThickness - stairWallStart
    floor.walls.push(wall('parents-entry-south', 'x', stairEast, parentsEntry, eastDividerWest - stairEast, interiorWallThickness, [{ ...door('attic-parents-south', .17), hinge: 'end' }]))
    hall.parts = [rect(hallWest, stair.z, stair.arrivalDepth, stair.depth)]
    hall.spawn = [hallWest + stair.arrivalDepth / 2, stair.end - .45]
    floor.walls.find(wall => wall.id === 'east')!.openings = [windowOpening('gable-office-north', 3.3, .98, .9, 1.18), windowOpening('gable-office', 4.95, .98, .9, 1.18)]
    floor.rooms = [room('office', 'Gäste / Arbeit', [rect(.4, north, 6.735, stairWallStart - north), rect(dgRoomWest, stairWallStart, house.east - dgRoomWest, officeEnd - stairWallStart)], colors.work, 'Nordzimmer mit 160 x 200 cm Doppelbett, Schreibtisch, Stauraum und Dachfenster. Zugang direkt vom oberen Treppenaustritt; ohne Schachtabzug.', [3.85, 3]), room('bedroom', 'Eltern / Ankleide', [rect(dgRoomWest, officeEnd + interiorWallThickness, house.east - dgRoomWest, southRoomStart - officeEnd - interiorWallThickness), rect(.4, southRoomStart, 6.735, south - southRoomStart)], colors.living, 'Schlafen am Ostgiebel, Ankleideschränke im Südwesten. Freie Raummitte ohne Raumteilerregal; Zugang vom südlichen Flurende.', [3.85, 6]), hall]
    floor.furniture = [furniture('parents-bed', 'bed', 5.125, 5.05, 2, 1.8, .52, Math.PI / 2), furniture('parents-cabinet', 'cabinet', .55, 5.9, 2.1, .6, 1.9), furniture('dressing-low', 'cabinet', .55, 6.75, .6, 1.4, 1.2), furniture('parents-low', 'cabinet', 4.6, 7.85, 2.4, .5, .8), furniture('office-desk', 'desk', .8, 1.7, 1.4, .6, .75), furniture('office-chair', 'chair', 1.25, 2.6, .48, .48, .85), furniture('guest-bed', 'bed', 5.125, 1.65, 1.6, 2, .48), furniture('office-storage', 'cabinet', 2.65, 1.65, 1.2, .45, 1.25)]
    const parents = floor.rooms.find(room => room.id === 'bedroom')!
    floor.furniture.find(item => item.id === 'parents-cabinet')!.z = southRoomStart + .05
    parents.parts = [rect(dgRoomWest, officeEnd + interiorWallThickness, house.east - dgRoomWest, southRoomStart - officeEnd - interiorWallThickness), rect(.4, southRoomStart, 6.735, south - southRoomStart)]
    parents.note = 'Zugang direkt südlich des oberen Treppenaustritts. Schlafen am Ostgiebel, Ankleide im Südwesten; ein südliches Dachfenster und ein Giebelfenster. Der breitere Flur reduziert die Zimmerfläche auf rund 19,8 m².'
    floor.rooms.find(room => room.id === 'office')!.note = 'Gäste- und Arbeitszimmer mit einem nördlichen Dachfenster und eigenem Ostgiebelfenster. Doppelbett, Schreibtisch und kompakter Stauraum.'
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
  if (id === 'KG') return [rect(0, 0, 7.5, 10)]
  const core = stairFor()
  return [rect(0, 0, 7.5, core.z), rect(0, core.z, core.x, core.depth), rect(core.x + core.width, core.z, 7.5 - core.x - core.width, core.depth), rect(0, core.end, 7.5, 10 - core.end)]
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