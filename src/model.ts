import { winderCore, winderSteps } from './winderStair'
import type { StairPoint } from './winderStair'

export type FloorId = 'KG' | 'EG' | 'OG' | 'DG'
export type Rect = { x: number; z: number; width: number; depth: number }
export type Room = { id: string; name: string; parts: Rect[]; color: string; note: string; spawn: [number, number] }
export type Opening = { start: number; width: number; sill: number; height: number; kind: 'door' | 'window' | 'passage'; id: string; hinge?: 'end'; swing?: 'reverse' }
export type Wall = Rect & { id: string; axis: 'x' | 'z'; openings: Opening[] }
export type Furniture = Rect & { id: string; kind: 'bed' | 'sofa' | 'chaise' | 'bookcase' | 'table' | 'chair' | 'bench' | 'cabinet' | 'counter' | 'sink' | 'wc' | 'shower' | 'bath' | 'desk' | 'tv' | 'plant' | 'machine' | 'hob' | 'espresso'; height: number; bottom?: number; angle?: number; color?: string }
export type Floor = { id: FloorId; name: string; elevation: number; height: number; rooms: Room[]; walls: Wall[]; furniture: Furniture[] }
export const construction = { exteriorWall: .38, clearHeight: 2.65, basementClearHeight: 2.4, timberFloor: .35, basementCeiling: .34, foundationPackage: .3, roofNormal: .35, ridgeCapAllowance: .07, terrain: -.2 }
export const house = { width: 7, depth: 10, west: .4, east: 7 - construction.exteriorWall, north: construction.exteriorWall, south: 10 - construction.exteriorWall, pitch: 35, knee: .5 }
export const stair = winderCore
export const interiorWallThickness = .16
export const stairFor = () => stair
export const floorIds: FloorId[] = ['KG', 'EG', 'OG', 'DG']
export const elevations: Record<FloorId, number> = { KG: -(construction.basementClearHeight + construction.basementCeiling), EG: 0, OG: construction.clearHeight + construction.timberFloor, DG: 2 * (construction.clearHeight + construction.timberFloor) }
export const slabThickness = (id: FloorId) => id === 'KG' ? construction.foundationPackage : id === 'EG' ? construction.basementCeiling : construction.timberFloor
export const storeyRise = (id: FloorId) => id === 'KG' ? elevations.EG - elevations.KG : elevations.OG - elevations.EG
export const rect = (x: number, z: number, width: number, depth: number): Rect => ({ x, z, width, depth })
export const stairRecess = rect(stair.x + stair.turnSize, stair.z + stair.runWidth, stair.width - stair.turnSize, stair.depth - 2 * stair.runWidth)
export const stairOpeningParts = [rect(stair.x, stair.z, stair.width, stair.depth)]
export const lightWells = [rect(house.width, 3, .5, 1), rect(house.width, 7.1, .5, 1), rect(1.5, -.5, 1, .5)]
const skylight = (id: string, name: string, x: number, z: number, width: number, length: number) => ({ id, name, length, ...rect(x, z, width, length * Math.cos(house.pitch * Math.PI / 180)) })
export const roofWindows = [skylight('DG-office-west-skylight', 'Dachfenster Gäste / Arbeit', (house.width - 1.14) / 2, 1.55, 1.14, 1.4), skylight('DG-parents-west-skylight', 'Dachfenster Eltern', (house.width - 1.14) / 2, 6.6, 1.14, 1.4)]
export function roofPanels(): Rect[] {
  const cuts = [...new Set([-.1, house.width + .25, ...roofWindows.flatMap(window => [window.x, window.x + window.width])])].sort((first, second) => first - second)
  return cuts.slice(0, -1).flatMap((start, index) => {
    const end = cuts[index + 1], openings = roofWindows.filter(window => start >= window.x && end <= window.x + window.width)
    const rows = [...new Set([-.25, 5, 10.25, ...openings.flatMap(window => [window.z, window.z + window.depth])])].sort((first, second) => first - second)
    return rows.slice(0, -1).flatMap((north, row) => openings.some(window => north >= window.z && rows[row + 1] <= window.z + window.depth) ? [] : [rect(start, north, end - start, rows[row + 1] - north)])
  })
}
export const area = (parts: Rect[]) => parts.reduce((sum, part) => sum + part.width * part.depth, 0)
export const roofHeight = (south: number) => house.knee + Math.min(south - house.north, house.south - south) * Math.tan(house.pitch * Math.PI / 180)
export const roofVerticalThickness = construction.roofNormal / Math.cos(house.pitch * Math.PI / 180)
export const roofInnerElevation = (south: number) => elevations.DG + roofHeight(south)
export const roofOuterElevation = (south: number) => roofInnerElevation(south) + roofVerticalThickness
export const ridgeElevations = { inside: roofInnerElevation(house.depth / 2), roofSurface: roofOuterElevation(house.depth / 2), outside: roofOuterElevation(house.depth / 2) + construction.ridgeCapAllowance }
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
  if (id === 'KG') return [wall('west', 'z', 0, 0, 10, house.west), wall('east', 'z', house.east, 0, 10, construction.exteriorWall, [windowOpening('well-laundry', 3.0, 1, 1.5, .65), windowOpening('well-hobby', 7.1, 1, 1.5, .65)]), wall('north', 'x', house.west, 0, house.east - house.west, construction.exteriorWall, [windowOpening('well-plant', 1.1, 1, 1.5, .65)]), wall('south', 'x', house.west, house.south, house.east - house.west, construction.exteriorWall)]
  const north = id === 'DG' ? [] : id === 'EG' ? [windowOpening('wc-window', .65, .9, 1.4, .7)] : [windowOpening('north-west', 1.2, 1.6), windowOpening('north-east', 4.75, 1.6)]
  const east = id === 'EG' ? [windowOpening('entrance-fixed', .6, .35, 0, 2.1), { ...door('entrance', 1.1, 1), swing: 'reverse' as const }, windowOpening('kitchen-window', 3.7, 1.7, 1.15, 1.1)] : id === 'DG' ? [windowOpening('gable-office', 4.2, 1.6, .9, 1.3)] : [windowOpening('east-north', 1.3, 1.5), windowOpening('east-south', 6.9, 1.6)]
  const south = id === 'DG' ? [] : id === 'EG' ? [windowOpening('garden-fixed', .7, 2, .1, 2.25), door('terrace', 3.2, 1.5, 2.35), windowOpening('terrace-fixed', 4.7, 1.5, 0, 2.35)] : [windowOpening('south-east', 4.4, 1.6), windowOpening('south-west', 1.1, 1.6, 1.2, 1.05)]
  return [wall('west', 'z', 0, 0, 10, house.west), wall('east', 'z', house.east, 0, 10, construction.exteriorWall, east), wall('north', 'x', house.west, 0, house.east - house.west, construction.exteriorWall, north.map(open => ({ ...open, start: open.start - house.west }))), wall('south', 'x', house.west, house.south, house.east - house.west, construction.exteriorWall, south.map(open => ({ ...open, start: open.start - house.west })))]
}

export function makeFloor(id: FloorId, houseSide: 'east' | 'west' = 'east'): Floor {
  const floor: Floor = { id, name: { KG: 'Nutzkeller', EG: 'Erdgeschoss', OG: 'Obergeschoss', DG: 'Dachgeschoss' }[id], elevation: elevations[id], height: id === 'KG' ? construction.basementClearHeight : construction.clearHeight, rooms: [], walls: [], furniture: [] }
  buildMainFloor(floor)
  if (id === 'EG' && houseSide === 'east') {
    floor.walls.find(wall => wall.id === 'south')!.openings = [
      windowOpening('garden-fixed', 2.6 - house.west, 1.05, 0, 2.35),
      door('terrace', house.east - 2.4 - house.west, 1.2, 2.35),
      windowOpening('terrace-fixed', house.east - 1.2 - house.west, 1.2, 0, 2.35),
    ]
    floor.walls.find(wall => wall.id === 'east')!.openings.push(windowOpening('corner-fixed', house.south - .7, .7, 0, 2.35))
  }
  return floor
}
function buildMainFloor(floor: Floor) {
  const hallWest = stair.x + stair.width + interiorWallThickness
  const stairWallStart = stair.z - interiorWallThickness
  const stairEast = stair.x + stair.width
  const eastDividerWest = hallWest + stair.arrivalDepth
  const childRoomWest = eastDividerWest + interiorWallThickness
  const southRoomStart = stair.end + interiorWallThickness
  floor.walls = [...shell(floor.id), wall('stair-north', 'x', .4, stairWallStart, stair.width), wall('stair-south', 'x', .4, stair.end, stair.width), wall('stair-east', 'z', stairEast, stairWallStart, stair.runWidth + interiorWallThickness, interiorWallThickness, [{ ...door('stair-lower', interiorWallThickness, stair.runWidth, 2.65), kind: 'passage' }]), wall('stair-east-south', 'z', stairEast, stair.end - stair.runWidth, stair.runWidth + interiorWallThickness, interiorWallThickness, [{ ...door('stair-upper', 0, stair.runWidth, 2.65), kind: 'passage' }])]
  const hallParts = [rect(hallWest, stair.z, stair.arrivalDepth, stair.end - stair.z)]
  const hall = room('hall', 'Flur', hallParts, colors.hall, '95 cm lichter Verteiler neben der U-Wendeltreppe, 80 cm nördlich der Hausmitte. Offenes Treppenauge ohne Zwischenwände oder Einbauschrank; An- und Austritt nach Osten. Ausführung ungeprüft.', [hallWest + stair.arrivalDepth / 2, stair.end - .5])
  if (floor.id === 'EG') {
    const kitchenNorth = 1.95, entranceEnd = kitchenNorth - interiorWallThickness
    const stepEast = house.east - 1.2, stepWest = stepEast - interiorWallThickness, shiftedNorth = kitchenNorth + .6
    const showerEast = house.west + .9, pantryWest = showerEast + interiorWallThickness
    floor.walls.push(wall('wc-niche-back', 'z', showerEast, entranceEnd, stairWallStart - entranceEnd), wall('wc-niche-south', 'x', showerEast, entranceEnd, hallWest - showerEast), wall('wc-east', 'z', stairEast, house.north, entranceEnd - house.north, interiorWallThickness, [{ ...door('wc', .27), hinge: 'end', swing: 'reverse' }]), wall('hall-south', 'x', hallWest, entranceEnd, house.east - hallWest, interiorWallThickness, [{ ...door('living', 0, 1.3, floor.height), kind: 'passage' }]))
    floor.walls.find(wall => wall.id === 'hall-south')!.width = stepWest - hallWest
    floor.walls.push(wall('kitchen-step', 'z', stepWest, entranceEnd, .6 + interiorWallThickness), wall('entry-wardrobe-back', 'x', stepEast, entranceEnd + .6, 1.2))
    const eastWall = floor.walls.find(wall => wall.id === 'east')!
    eastWall.openings.find(opening => opening.id === 'entrance')!.start = .75
    eastWall.openings.find(opening => opening.id === 'entrance-fixed')!.start = .39
    eastWall.openings.find(opening => opening.id === 'kitchen-window')!.start -= .5
    floor.rooms = [room('wc', 'Dusch-WC', [rect(.4, house.north, stairEast - .4, stairWallStart - house.north)], colors.wet, 'Dusch-WC in der Flucht der Treppenwand, mit 90 x 90 cm Dusche, WC und Waschtisch. Sanitärführung ungeprüft.', [1.5, 1.65]), room('hall', 'Diele', [rect(hallWest, house.north, house.east - hallWest, stairWallStart - house.north), rect(hallWest, stairWallStart, 1.8, interiorWallThickness)], colors.hall, '1,80 m Garderobe, Sitzbank und türhohes Seitenlicht. Zur Küche 1,80 m breit und bis zur Decke offen.', [5.5, 1.55]), room('living', 'Wohnen / Kochen / Essen', [rect(hallWest, stair.z, house.east - hallWest, southRoomStart - stair.z), rect(.4, southRoomStart, house.east - .4, house.south - southRoomStart)], colors.living, 'Offener Familienbereich mit Bestandssofa, Ostwandbank und 180-cm-Esstisch. Der östliche Treppenaustritt bleibt frei; Halbinsel 240 x 100 cm und Vorratshochschrank.', [3.25, 6.35])]
    floor.furniture = [furniture('guest-shower', 'shower', .45, 2.05, .9, .9, .06), furniture('guest-wc', 'wc', 1.5, .43, .65, .7, .43), furniture('guest-sink', 'sink', .45, .43, .55, .5, .85), furniture('wardrobe', 'cabinet', 2.8, .39, 1.8, .6, 2.4), furniture('bench', 'cabinet', 4.6, .39, .8, .6, .45), furniture('coffee', 'table', 1.6, 7.9, .9, .5, .35), furniture('sideboard', 'cabinet', .65, 9.025, 1.8, .45, .6), furniture('tv', 'tv', .9, 9.395, 1.3, .08, 1.65, Math.PI / 2), { ...furniture('bookshelf', 'bookcase', .43, southRoomStart, 2.12, .4, 2.12), color: '#fafafa' }, furniture('plant', 'plant', 6.1, 9.1, .45, .45, 1.2)]
    floor.furniture.push(furniture('fridge', 'cabinet', house.east - .6, 2.325, .6, .6, 2.55), furniture('kitchen-tall', 'cabinet', house.east - 2.4, 2.325, 1.2, .6, 2.55), furniture('pantry-cabinet', 'cabinet', house.east - 1.2, 2.325, .6, .6, 2.55), furniture('kitchen', 'counter', house.east - .6, 3, .6, 1.55, .92), furniture('peninsula', 'counter', house.east - 2.4, 4.55, 2.4, 1, .92), furniture('kitchen-sink', 'sink', house.east - .565, 3.25, .52, .6, .95), { ...furniture('induction', 'hob', 4.6, 4.77, .8, .52, .025), bottom: .92 }, { ...furniture('espresso', 'espresso', 5.8, 5.1, .38, .4, .4), bottom: .92 })
    floor.furniture.push(furniture('sofa', 'sofa', .48, 6.64, 2.5, .8, .8), furniture('sofa-chaise', 'chaise', .48, 7.44, .8, .9, .48), furniture('dining', 'table', 5.1, 7, .9, 1.8, .75), furniture('dining-bench', 'bench', house.east - .5, house.south - 2.735, .5, 2, .85))
    for (const south of [7, 7.65, 8.3]) floor.furniture.push(furniture(`dining-chair-${south}`, 'chair', 4.48, south, .43, .43, .8, -Math.PI / 2))
    const shower = floor.furniture.find(item => item.id === 'guest-shower')!
    shower.x = house.west; shower.z = stairWallStart - .9
    const guestWc = floor.furniture.find(item => item.id === 'guest-wc')!
    guestWc.x = .45; guestWc.z = .43; guestWc.width = .6
    const sink = floor.furniture.find(item => item.id === 'guest-sink')!
    sink.x = 1.15; sink.z = .43
    const cloakroom = floor.rooms.find(room => room.id === 'wc')!
    cloakroom.parts = [rect(house.west, house.north, stairEast - house.west, entranceEnd - house.north), rect(house.west, entranceEnd, .9, stairWallStart - entranceEnd)]
    cloakroom.note = 'Dusch-WC mit nördlichem Eingang aus der Diele. Dusche exakt 90 x 90 cm im Südwesten an Haustrennwand und Treppe, WC und Waschbecken im Norden. Tür öffnet nach innen. Sanitärführung ungeprüft.'
    cloakroom.spawn = [1.35, 1.4]
    const wardrobe = floor.furniture.find(item => item.id === 'wardrobe')!
    wardrobe.x = stepEast + .02; wardrobe.z = entranceEnd + .02; wardrobe.width = 1.16; wardrobe.depth = .56; wardrobe.angle = Math.PI
    floor.furniture.push(furniture('pantry-shelf', 'bookcase', pantryWest + .025, kitchenNorth + .025, .25, stairWallStart - kitchenNorth - .05, 2.1))
    for (const item of floor.furniture.filter(item => ['sofa', 'sofa-chaise', 'coffee'].includes(item.id))) item.z += .29
    const bookshelf = floor.furniture.find(item => item.id === 'bookshelf')!
    bookshelf.x = .48; bookshelf.z = southRoomStart + .02; bookshelf.width = 2.12; bookshelf.depth = .4
    floor.furniture = floor.furniture.filter(item => item.id !== 'pantry-cabinet')
    const fridge = floor.furniture.find(item => item.id === 'fridge')!
    fridge.x = 3.98; fridge.z = kitchenNorth
    const counter = floor.furniture.find(item => item.id === 'kitchen')!
    counter.z = shiftedNorth + .6; counter.depth = 1.3
    floor.furniture.find(item => item.id === 'kitchen-sink')!.z = 3.8
    const peninsula = floor.furniture.find(item => item.id === 'peninsula')!
    peninsula.x = 3.96; peninsula.z = 4.45; peninsula.width = house.east - peninsula.x
    const induction = floor.furniture.find(item => item.id === 'induction')!
    induction.x = 5.1; induction.z = peninsula.z + .22
    const espresso = floor.furniture.find(item => item.id === 'espresso')!
    espresso.x = stepEast + .08; espresso.z = shiftedNorth + .1
    floor.furniture.splice(floor.furniture.indexOf(espresso), 0, furniture('coffee-counter', 'counter', stepEast, shiftedNorth, 1.2, .6, .92))
    const tallCabinet = floor.furniture.find(item => item.id === 'kitchen-tall')!
    tallCabinet.x = fridge.x + .6; tallCabinet.z = kitchenNorth; tallCabinet.width = .6
    const entrance = floor.rooms.find(room => room.id === 'hall')!
    entrance.parts = [rect(hallWest, house.north, house.east - hallWest, entranceEnd - house.north), rect(hallWest, entranceEnd, 1.3, interiorWallThickness), rect(stepEast, entranceEnd, 1.2, .6)]
    entrance.spawn = [5.5, 1.35]
    entrance.note = '120 x 60 cm Garderobennische direkt am Eingang, mit 116 x 56 cm Schrank und Front zur Diele. Alte Nordwand-Garderobe entfernt, Sitzbank bleibt. Küche über den 130 cm breiten deckenhohen Durchgang erreichbar. Tür- und Schrankausführung ungeprüft.'
    const living = floor.rooms.find(room => room.id === 'living')!
    living.parts[0] = rect(hallWest, shiftedNorth, house.east - hallWest, southRoomStart - shiftedNorth)
    living.parts.push(rect(hallWest, kitchenNorth, stepWest - hallWest, shiftedNorth - kitchenNorth))
    living.note = 'Gestufte Küche: zwei 60-cm-Hochschränke auf der Nordlinie, 120-cm-Kaffeezeile 60 cm südlicher. Halbinsel 266 x 100 cm um 40 cm nach Süden versetzt, mit beidseitigem Stauraum und 114 cm Vorbereitungsfläche links vom Kochfeld. Arbeitsgang mindestens 130 cm; Eckbereiche und Geräteplanung ungeprüft.'
    floor.rooms.push(room('pantry', 'Vorratsnische', [rect(pantryWest, kitchenNorth, hallWest - pantryWest, stairWallStart - kitchenNorth)], colors.utility, 'Offene Vorratsnische rechts neben der Dusche, etwa 120 x 99 cm. 25 cm tiefes Regal an der Westwand, Zugang von der Küche. Keine abgeschlossene oder belüftete Speisekammer; Ausführung ungeprüft.', [2.2, 2.45]))
    return
  }
  if (floor.id === 'KG') {
    floor.walls.push(wall('bath-south', 'x', stairEast, stairWallStart, house.east - stairEast, interiorWallThickness, [{ ...door('bath', .17), hinge: 'end' }]), wall('east-divider', 'z', eastDividerWest, stair.z, stair.depth, interiorWallThickness, [door('child-north', .8)]), wall('store-north', 'x', stairEast, stair.end, house.east - stairEast, interiorWallThickness, [{ ...door('child-south', .17), hinge: 'end' }]))
    floor.rooms = [room('bath', 'Technik', [rect(house.west, house.north, house.east - house.west, stairWallStart - house.north)], colors.utility, 'Technik über die gesamte Nordbreite. Geräte, Wartungsflächen und Leitungsführung sind fachlich zu prüfen.', [2.85, 1.65]), room('child-north', 'Waschen / Lager', [rect(childRoomWest, stair.z, house.east - childRoomWest, stair.end - stair.z)], colors.utility, 'Kompaktes Rechteck östlich der Treppe mit Lichtschacht und eigenem Flurzugang.', [4.8, 4.3]), room('child-south', 'Hobby', [rect(.4, southRoomStart, (house.east - house.west), house.south - southRoomStart)], colors.child, 'Südlicher Hobbyraum mit freiem Treppenaustritt.', [3.85, 7.3]), hall]
    floor.furniture = [furniture('heat-pump', 'machine', .55, .5, .75, .75, 1.8), furniture('tank', 'machine', 1.6, .5, .7, .7, 1.7), furniture('distribution', 'cabinet', .45, 1.4, 1.3, .4, 1.9), furniture('washer', 'machine', 5.95, 2.55, .62, .62, .88), furniture('dryer', 'machine', 5.95, 3.2, .62, .62, .88), furniture('laundry', 'counter', 3.65, 2.5, 1.8, .6, .9), furniture('laundry-shelf', 'cabinet', 4.1, 5.15, 1.8, .4, 2.2)]
    const party = floor.rooms.find(room => room.id === 'child-south')!
    party.name = 'Kinderpartyraum'
    party.note = 'Freie Tanz- und Spielfläche mit Diskokugel und ruhigen bunten Lichtern ohne Stroboskop. Sitzbank, niedriger Snacktisch und Spielzeugregal am Rand; Eingang und Lichtschacht frei.'
    floor.furniture.push(furniture('party-sofa', 'sofa', .55, 8.65, 2, .8, .65), furniture('party-snack', 'table', 5.2, 8.5, 1.2, .65, .55), furniture('party-stool', 'chair', 5.35, 7.75, .4, .4, .5), furniture('party-storage', 'bookcase', .5, 5.8, .35, 1.3, .8))
    floor.furniture.find(item => item.id === 'party-storage')!.z = 7.3
    floor.furniture.find(item => item.id === 'laundry-shelf')!.z = stair.end - .45
    floor.furniture.find(item => item.id === 'washer')!.z = stair.z + .05
    floor.furniture.find(item => item.id === 'dryer')!.z = stair.z + .7
    const laundry = floor.furniture.find(item => item.id === 'laundry')!
    laundry.x = childRoomWest + .05; laundry.z = stair.z + .05
    floor.rooms.find(room => room.id === 'child-north')!.spawn = [4.8, stair.z + 1.2]
    return
  }
  if (floor.id === 'OG') {
    const roomDivider = 4.6, eastRoomStart = roomDivider + interiorWallThickness, bathEnd = stair.z + 1, hallEnd = 6.96, southStart = hallEnd + interiorWallThickness, readingEnd = 7.65
    hall.parts[0].depth = hallEnd - stair.z
    floor.walls.push(wall('north-divider', 'z', roomDivider, house.north, bathEnd - house.north), wall('bath-south', 'x', stairEast, stairWallStart, childRoomWest - stairEast), wall('bath-east-return', 'x', eastDividerWest, bathEnd, eastRoomStart - eastDividerWest), wall('east-divider', 'z', eastDividerWest, stair.z, hallEnd - stair.z, interiorWallThickness, [{ ...door('bath', .05), hinge: 'end' }, door('child-north', 1.2)]), wall('children-divider', 'x', childRoomWest, hallEnd, house.east - childRoomWest), wall('store-north', 'x', stairEast, hallEnd, childRoomWest - stairEast, interiorWallThickness, [door('child-south', .17)]), wall('reading-east', 'z', stairEast, southStart, readingEnd - southStart), wall('reading-south', 'x', house.west, readingEnd, hallWest - house.west))
    const northWindow = floor.walls.find(wall => wall.id === 'north')!.openings.find(opening => opening.id === 'north-west')!
    northWindow.sill = 1.2; northWindow.height = 1.05
    const southWindow = floor.walls.find(wall => wall.id === 'south')!.openings.find(opening => opening.id === 'south-west')!
    southWindow.sill = .9; southWindow.height = 1.35
    floor.walls.find(wall => wall.id === 'south')!.openings.find(opening => opening.id === 'south-east')!.start = 4.4 - house.west
    floor.rooms = [
      room('bath', 'Familienbad', [rect(house.west, house.north, roomDivider - house.west, stairWallStart - house.north), rect(childRoomWest, stairWallStart, roomDivider - childRoomWest, bathEnd - stairWallStart)], colors.wet, 'Nordbad mit Wanne längs an der Westwand, Dusche, WC und Waschplatz im Norden. Verbreiterte östliche Eingangsnische. Leitungsführung ungeprüft.', [2.85, 1.8]),
      room('child-north', 'Kind Nordost', [rect(eastRoomStart, house.north, house.east - eastRoomStart, bathEnd + interiorWallThickness - house.north), rect(childRoomWest, bathEnd + interiorWallThickness, house.east - childRoomWest, hallEnd - bathEnd - interiorWallThickness)], colors.child, 'Verbreiterte Hauptfläche und nördliche Arbeitsnische. Schrank an der Südwand, freier Weg vom Eingang zum Schreibtisch.', [4.8, 5.7]),
      room('child-south', 'Kind Süd', [rect(hallWest, southStart, house.east - hallWest, house.south - southStart), rect(house.west, readingEnd + interiorWallThickness, hallWest - house.west, house.south - readingEnd - interiorWallThickness)], colors.child, 'Breitere Hauptfläche und südwestliche Schreibtischnische. Eigener Flurzugang, Ost- und Südfenster.', [4.4, 8]),
      room('multifunction', 'Offene Leseecke', [rect(house.west, southRoomStart, stairEast - house.west, readingEnd - southRoomStart), rect(stairEast, southRoomStart, interiorWallThickness, hallEnd - southRoomStart)], colors.work, 'Kleine offene Lese- und Abstellnische am gemeinsamen Verteiler zwischen den Zimmerzugängen, ohne eigene Tür. Indirektes Tageslicht, kein eigenständiger Aufenthaltsraum.', [1.5, 6.6]),
      hall,
    ]
    floor.furniture = [furniture('bath-tub', 'bath', .45, .43, .8, 1.8, .6), furniture('bath-shower', 'shower', 1.45, .43, 1, 1, .04), furniture('bath-wc', 'wc', 2.65, .43, .65, .7, .43), furniture('bath-sink', 'sink', 3.4, .43, 1.1, .5, .88), furniture('bed-north', 'bed', 5.65, 4.4, .9, 2, .52), furniture('desk-north', 'desk', 4.95, .42, 1.4, .6, .75), furniture('desk-chair-north', 'chair', 5.4, 1.6, .48, .48, .82), furniture('wardrobe-north', 'cabinet', 3.65, 6.08, 1.8, .6, 2.25), furniture('bed-south', 'bed', 5.65, 7.3, .9, 2, .52), furniture('desk-south', 'desk', .65, 9, 1.4, .6, .75), furniture('desk-chair-south', 'chair', 1.1, 8.5, .48, .48, .82), furniture('wardrobe-south', 'cabinet', .48, 7.85, 1.8, .6, 2.25), furniture('shared-bench', 'bench', 1.78, 6.75, .45, .85, .85), furniture('shared-shelf', 'bookcase', .48, 5.82, .3, 1.2, .9)]
    floor.furniture.find(item => item.id === 'wardrobe-north')!.x = childRoomWest + .05
    floor.furniture.find(item => item.id === 'wardrobe-north')!.width = 1.6
    const readingBench = floor.furniture.find(item => item.id === 'shared-bench')!
    readingBench.x = stairEast - .9; readingBench.z = 7.16; readingBench.width = .85; readingBench.depth = .45
    floor.furniture.find(item => item.id === 'shared-shelf')!.z = southRoomStart + .03
    return
  }
  if (floor.id === 'DG') {
    const north = heightLine(1.2) + interiorWallThickness, south = 10 - north
    const dgRoomWest = childRoomWest
    const officeEnd = house.depth / 2 - interiorWallThickness / 2
    const hallStart = stair.z
    hall.parts[0] = rect(hallWest, hallStart, stair.arrivalDepth, stair.end - hallStart)
    hall.note = '95 cm breiter Verteiler mit unabhängigen Zimmerzugängen und offenem Treppenauge mit Geländer.'
    floor.walls.find(wall => wall.id === 'stair-east')!.openings = []
    floor.walls.push(wall('knee-north', 'x', .4, heightLine(1.2), (house.east - house.west)), wall('knee-south', 'x', .4, south, (house.east - house.west)), wall('hall-north', 'x', hallWest, hallStart - interiorWallThickness, childRoomWest - hallWest), wall('office-west', 'z', eastDividerWest, hallStart, officeEnd - hallStart, interiorWallThickness, [{ ...door('attic-office', .05), hinge: 'end' }]), wall('office-entry', 'x', eastDividerWest, officeEnd, house.east - eastDividerWest), wall('bedroom-west', 'z', eastDividerWest, officeEnd + interiorWallThickness, southRoomStart - officeEnd - interiorWallThickness), wall('parents-entry-south', 'x', stairEast, stair.end, childRoomWest - stairEast, interiorWallThickness, [{ ...door('attic-parents-south', .17), hinge: 'end', swing: 'reverse' }]))
    floor.walls.find(wall => wall.id === 'east')!.openings = [windowOpening('gable-office-north', 3, .98, .9, 1.18), windowOpening('gable-office', 5.5, .98, .9, 1.18)]
    floor.rooms = [room('office', 'Gäste / Arbeit', [rect(.4, north, house.east - .4, stairWallStart - north), rect(childRoomWest, stairWallStart, house.east - childRoomWest, officeEnd - stairWallStart)], colors.work, 'Breite Arbeits- und Gästezone am Ostgiebel, niedriger Stauraum im Nordwesten. Trennwand auf der Firstlinie, eigener Zugang vom Verteiler.', [4.25, 4.55]), room('bedroom', 'Eltern / Ankleide', [rect(dgRoomWest, officeEnd + interiorWallThickness, house.east - dgRoomWest, southRoomStart - officeEnd - interiorWallThickness), rect(.4, southRoomStart, house.east - .4, south - southRoomStart)], colors.living, 'Elternbereich südlich der Firstwand mit Kopfteil zur Firstwand und breiter südwestlicher Ankleide. Zugang unabhängig vom Gästezimmer.', [2.85, 7.2]), hall]
    floor.furniture = [furniture('parents-bed', 'bed', 4.2, 5.15, 1.8, 2, .52), furniture('parents-cabinet', 'cabinet', .55, 6.15, 2.1, .6, 1.9), furniture('dressing-low', 'cabinet', .55, 7, .6, 1.3, 1.2), furniture('parents-low', 'cabinet', 4.15, 7.85, 2.4, .5, .8), furniture('office-desk', 'desk', 4.95, 4.25, 1.4, .6, .75), furniture('office-chair', 'chair', 5.35, 3.7, .48, .48, .85), furniture('guest-bed', 'bed', 4.6, 1.65, 2, 1.4, .48, Math.PI / 2), furniture('office-storage', 'cabinet', .65, 1.65, 1.2, .45, 1.25)]
    floor.furniture.find(item => item.id === 'parents-cabinet')!.z = southRoomStart + .05
    floor.rooms.find(room => room.id === 'bedroom')!.note += ' In dieser Testvariante nur 43 cm zwischen westlicher Bettkante und Trennwand, 62 cm zur Ostwand; westlicher Bettzugang eingeschränkt.'
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