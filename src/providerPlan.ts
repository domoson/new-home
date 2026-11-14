import { basement, basementEnvelope, basementWindow, construction, elevations, house, houseEnvelope, interiorWallThickness, rect, stair, standardDoor } from './model'
import type { Floor, FloorId, Furniture, Opening, Rect, Room, Wall } from './model'
import { kitchenFurniture } from './kitchenLayout'
import { raffstores } from './raffstore'

const opening = (id: string, start: number, width = standardDoor.width, kind: Opening['kind'] = 'door', sill = 0, height = 2.11): Opening => ({ id, start, width, kind, sill, height, ...(kind === 'door' && id !== 'terrace' && height >= 2 ? { ...standardDoor, width, height } : {}) })
const windowOpening = (id: string, start: number, width: number, sill = .93, height = 1.23): Opening => ({ ...opening(id, start, width, 'window', sill, height), windowLayout: { columns: width >= 1.5 ? 2 : 1 } })
const wall = (id: string, axis: Wall['axis'], x: number, z: number, length: number, openings: Opening[] = [], thickness = interiorWallThickness): Wall => ({ id, axis, ...rect(x, z, axis === 'x' ? length : thickness, axis === 'z' ? length : thickness), openings })
const item = (id: string, kind: Furniture['kind'], x: number, z: number, width: number, depth: number, height: number, angle = 0): Furniture => ({ id, kind, x, z, width, depth, height, angle })
const room = (id: string, name: string, parts: Rect[], spawn: [number, number], color = '#e9e7d6', note = 'Nach Wolf-Planung vom 13.11.2026 (M 1:100) rekonstruiert; keine Ausführungsplanung.'): Room => ({ id, name, parts, spawn, color, note })

export const offeredAreas: Record<FloorId, Record<string, [number, number]>> = {
  KG: { bath: [22.13, 0], hall: [3.54, 0], store: [5.53, 0], 'child-south': [25.71, 0] },
  EG: { wc: [5.07, 5.07], pantry: [1.63, 1.63], entry: [10.35, 10.35], living: [39.18, 39.18] },
  OG: { bath: [12.6, 12.6], hall: [5.14, 5.14], 'child-north': [18.16, 18.16], store: [2.82, 2.82], 'child-south': [16.01, 16.01] },
  DG: { bedroom: [20.43, 16.06], hall: [3.07, 3.07], office: [20.32, 15.95] },
}

export const referenceAreas: Partial<Record<FloorId, Record<string, number>>> = {
  KG: { bath: 22.13, hall: 3.54, store: 5.53, 'child-south': 25.71 },
  EG: { wc: 5.07, pantry: 1.63, entry: 10.35, living: 39.18 },
  OG: { bath: 12.6, hall: 5.14, 'child-north': 18.16, store: 2.82, 'child-south': 16.01 },
  DG: { bedroom: 16.06, hall: 3.07, office: 15.95 },
}

function shell(id: FloorId): Wall[] {
  const envelope = id === 'KG' ? basementEnvelope() : houseEnvelope()
  const westInner = id === 'KG' ? basement.west : house.west
  const eastInner = id === 'KG' ? basement.east : house.east
  const southInner = id === 'KG' ? basement.south : id === 'EG' ? house.depth - construction.southWallEG : house.south
  const wallThickness = id === 'KG' ? construction.basementWall : construction.exteriorWall
  const southThickness = id === 'KG' ? construction.basementWall : id === 'EG' ? construction.southWallEG : construction.exteriorWall
  const fixedWindow = (name: string, start: number): Opening => ({ ...windowOpening(name, start, 1.105, 0, 2.16), windowLayout: { columns: 1, fixed: true } })
  const underlightDoorWindow = (name: string, start: number, hinge: 'start' | 'end'): Opening => ({ ...windowOpening(name, start, 1.105, 0, 2.16), windowLayout: { columns: 1, lowerFixed: .9, fields: [{ fixed: false, hinge }] } })
  const splitWindow = (name: string, start: number, operableSide: 'start' | 'end'): Opening => ({
    ...windowOpening(name, start, 1.73, .93, 1.23),
    windowLayout: {
      columns: 2,
      split: .5,
      fields: operableSide === 'start'
        ? [{ fixed: false, hinge: 'start' }, { fixed: true, hinge: 'end' }]
        : [{ fixed: true, hinge: 'start' }, { fixed: false, hinge: 'end' }],
    },
  })
  const north: Opening[] = id === 'KG'
    ? [{ ...windowOpening('well-plant', 1.28 - westInner, basementWindow.width, basementWindow.sill, basementWindow.height), windowLayout: { columns: 2, fixed: false } }]
    : id === 'EG'
      ? [
        { ...windowOpening('wc-window', .65 - westInner, .605, .93, 1.23), windowLayout: { columns: 1, fields: [{ fixed: false, hinge: 'start' }] } },
        { ...windowOpening('hall-window-fixed', 4.735 - westInner, 1.73, 1.43, .73), windowLayout: { columns: 2, fixed: false } },
      ]
      : id === 'OG'
        ? [splitWindow('bath-window', 1.45 - westInner, 'end'), splitWindow('child-north-window', 4.735 - westInner, 'start')]
        : []
  const east: Opening[] = id === 'KG'
    ? [{ ...windowOpening('well-hobby', 6.72, basementWindow.width, basementWindow.sill, basementWindow.height), windowLayout: { columns: 2, fixed: false } }]
    : id === 'EG'
      ? [
        { ...windowOpening('entrance-fixed', .45, .635, 0, 2.16), windowLayout: { columns: 1, fixed: true } },
        { ...opening('entrance', 1.085, 1.1, 'door', 0, 2.16), hinge: 'end', swing: 'reverse' },
        { ...windowOpening('kitchen-east-window', 3.68, 1.98, .93, 1.23), windowLayout: { columns: 2, fixed: false, lowerFixed: .38 } },
        fixedWindow('living-corner-fixed', 9.05),
      ]
      : id === 'OG'
        ? [underlightDoorWindow('east-north', 3.68, 'end')]
        : [underlightDoorWindow('gable-office', 3.68, 'start'), underlightDoorWindow('gable-parents', 5.915, 'end')]
  const terraceStart = 3.57 - westInner, terraceLeaf = 1.49
  const south: Opening[] = id === 'KG'
    ? [{ ...windowOpening('well-hobby-south', 1.285 - westInner, basementWindow.width, basementWindow.sill, basementWindow.height), windowLayout: { columns: 2, fixed: false } }]
    : id === 'EG'
      ? [
        fixedWindow('garden-west-fixed', 1.255 - westInner),
        opening('terrace', terraceStart, terraceLeaf, 'door', 0, 2.16),
        { ...windowOpening('garden-fixed', terraceStart + terraceLeaf, terraceLeaf, 0, 2.16), windowLayout: { columns: 1, fixed: true } },
      ]
      : id === 'OG'
        ? [underlightDoorWindow('south-west', 1.255 - westInner, 'start'), splitWindow('south-east', 4.82 - westInner, 'start')]
        : []
  return [
    wall('west', 'z', envelope.x, envelope.z, envelope.depth, [], wallThickness),
    wall('east', 'z', eastInner, envelope.z, envelope.depth, east.map(entry => ({ ...entry, start: entry.start - envelope.z })), wallThickness),
    wall('north', 'x', westInner, envelope.z, eastInner - westInner, north, wallThickness),
    wall('south', 'x', westInner, southInner, eastInner - westInner, south, southThickness),
  ]
}

export function buildProviderFloor(id: FloorId, side: 'east' | 'west'): Floor {
  const clearHeight = id === 'KG' ? construction.basementClearHeight : id === 'EG' ? construction.clearHeight : id === 'OG' ? construction.upperClearHeight : construction.atticClearHeight
  const floor: Floor = { id, name: { KG: 'Kellergeschoss', EG: 'Erdgeschoss', OG: 'Obergeschoss', DG: 'Dachgeschoss' }[id], elevation: elevations[id], height: clearHeight, rooms: [], walls: shell(id), furniture: [] }
  const recesses = raffstores(floor).map(blind => blind.box)
  for (const current of floor.walls) current.recesses = recesses
  if (side === 'west') return floor
  const west = house.west, east = house.east, north = house.north, south = house.south, partition = interiorWallThickness
  const stairEast = stair.x + stair.width
  if (id === 'KG') {
    const cellarWest = basement.west, cellarEast = basement.east, cellarNorth = basement.north, cellarSouth = basement.south, bearing = .2
    const kellerDivider = 4.07
    floor.walls.push(
      wall('bath-south', 'x', cellarWest, stair.z - bearing, cellarEast - cellarWest, [opening('bath', 3.085 - cellarWest)], bearing),
      wall('store-north', 'x', cellarWest, stair.end, cellarEast - cellarWest, [opening('child-south', 3.08 - cellarWest)], bearing),
      wall('keller-divider', 'z', kellerDivider, stair.z, stair.depth, [opening('store', 4.465 - stair.z)], bearing),
    )
    floor.rooms = [
      room('bath', 'HWR / Technik / Lager', [rect(cellarWest, cellarNorth, cellarEast - cellarWest, stair.z - bearing - cellarNorth)], [2.95, 2.05], '#e4e7e8', 'Großer Technik-, Hauswirtschafts- und Lagerraum (22,13 m² laut Wolf-Plan) über die volle Kellerbreite im Norden mit Wärmepumpe, Speicher, Waschmaschine, Trockner, Ausgussbecken und Lichtschachtfenster 100 × 75 cm (BRH 168 cm).'),
      room('hall', 'Flur', [rect(stairEast, stair.z, kellerDivider - stairEast, stair.depth)], [3.25, 5.05], '#eeeee8', 'Zentraler Kellerflur (3,54 m² laut Wolf-Plan) östlich der 16-stufigen halbgewendelten Treppe mit direkter Erschließung aller drei Kellerräume.'),
      room('store', 'Keller 2', [rect(kellerDivider + bearing, stair.z, cellarEast - kellerDivider - bearing, stair.depth)], [5.35, 5.05], '#e8eae4', 'Abgetrennter Vorrats- und Lagerkeller im Osten (5,53 m² laut Wolf-Plan), innenliegend ohne eigenes Fenster.'),
      room('child-south', 'Keller / Hobby', [rect(cellarWest, stair.end + bearing, cellarEast - cellarWest, cellarSouth - stair.end - bearing)], [2.8, 8.2], '#e4e7e8', 'Großer Hobby- und Mehrzweckkeller im Süden (25,71 m² laut Wolf-Plan) mit zwei Lichtschachtfenstern (Ost und Süd, je 100 × 75 cm, BRH 168 cm) für Über-Eck-Belichtung und Querlüftung.'),
    ]
    floor.furniture = [
      item('heat-pump', 'machine', 5.8, .48, .75, .75, 1.8),
      item('tank', 'machine', 4.95, .48, .7, .7, 1.7),
      item('washer', 'machine', .52, .48, .62, .62, .88),
      item('dryer', 'machine', 1.2, .48, .62, .62, .88),
      item('utility-shelf', 'bookcase', .42, 1.75, .42, 1.65, 2),
      item('cellar-shelf', 'bookcase', cellarEast - .46, stair.z + .14, .4, 1.9, 2, Math.PI),
      item('hobby-shelf', 'bookcase', .42, 6.6, .4, 2, 2),
      item('storage-shelf', 'bookcase', 4.6, 6.45, 1.8, .42, 2),
      item('hobby-table', 'table', 1.85, 8.2, 1.5, .75, .75),
      item('hobby-sofa', 'sofa', 4.55, cellarSouth - .95, 2, .85, .8, Math.PI),
    ]
  } else if (id === 'EG') {
    const southInner = house.depth - construction.southWallEG
    const bathEast = 2.4725, nicheWest = 1.35, nicheNorth = 2.125, stairNorth = 3.75, kitchenWest = 3.7025, kitchenNorth = 2.8475, stairSouthEnd = 3.3475
    const showerWidth = nicheWest - west
    floor.walls.push(
      wall('stair-north', 'x', west, stairNorth, stairEast + partition - west, [], stair.z - stairNorth),
      wall('stair-south', 'x', west, stair.end, stairSouthEnd - west, [], partition),
      wall('basement-entry', 'z', 2.5125, stair.z, 1.165, [opening('basement-stair', .135, .765)], .135),
      { ...wall('wc-installation-north', 'x', west, north, bathEast - west, [], .16), height: .9 },
      wall('wc-east', 'z', bathEast, north, nicheNorth - north, [{ ...opening('wc', 1.113 - north), hinge: 'end', swing: 'reverse' }]),
      wall('wc-niche-north', 'x', nicheWest, nicheNorth, bathEast + partition - nicheWest),
      wall('wc-niche-return', 'z', nicheWest, nicheNorth + partition, stairNorth - nicheNorth - partition),
      { ...wall('guest-shower-door', 'x', west, 2.75, showerWidth, [{ id: 'shower', kind: 'door', start: 0, width: showerWidth, sill: 0, height: 2.1, frame: .04, glazed: true, swing: 'reverse' }], .04), height: 2.1 },
      wall('kitchen-north', 'x', kitchenWest, kitchenNorth, east - kitchenWest),
    )
    floor.rooms = [
      room('wc', 'DU Bad', [rect(west, north + .16, bathEast - west, nicheNorth - north - .16), rect(west, nicheNorth, showerWidth, stairNorth - nicheNorth)], [1.15, 1.45], '#d8e8ea', 'Duschbad im Nordwesten (5,07 m² laut Wolf-Plan) mit bodengleicher Dusche in der Südwestnische, WC und Waschtisch an 16-cm-Vorwand sowie Fenster 60,5 × 123 cm (BRH 93 cm).'),
      room('pantry', 'Einbauschrank', [rect(nicheWest + partition, nicheNorth + partition, bathEast + partition - nicheWest - partition, stairNorth - nicheNorth - partition)], [2.1, 3.0], '#e6e3d8', 'Offene Garderoben- und Einbauschranknische (1,63 m² laut Wolf-Plan) mit 1,12 m Tiefe und 1,45 m Breite direkt gegenüber der Diele.'),
      room('entry', 'Diele', [rect(bathEast + partition, north, east - bathEast - partition, kitchenNorth - north), rect(bathEast + partition, kitchenNorth, kitchenWest - bathEast - partition, .083)], [4.5, 1.6], '#e5e2d7', 'Großzügige Diele (10,35 m² laut Wolf-Plan) mit Haustüranlage 173,5 × 216 cm (verglastes Seitenteil 63,5 cm + Tür 110 cm) und zweiflügeligem Nordfenster 173 × 73 cm (BRH 143 cm).'),
      room('living', 'Wohnen / Essen / Küche', [
        rect(bathEast + partition, kitchenNorth + .083, kitchenWest - bathEast - partition, 5.13 - kitchenNorth - .083),
        rect(stairEast, 5.13, kitchenWest - stairEast, stair.end - 5.13),
        rect(kitchenWest, kitchenNorth + partition, east - kitchenWest, stair.end - kitchenNorth - partition),
        rect(stairSouthEnd, stair.end, east - stairSouthEnd, partition),
        rect(west, stair.end + partition, east - west, southInner - stair.end - partition),
      ], [3.6, 7.3], '#eee8cf', 'Offener Koch-, Ess- und Wohnbereich (39,18 m² laut Wolf-Plan). EG-Südwand mit 39 cm Wandstärke für integrierte Raffstorekästen (HST 298 × 216 cm + Festelement 110,5 × 216 cm); Ost-Eckfenster 110,5 × 216 cm und Küchenfenster 198 × 123 cm (DKF mit Unterlicht).'),
    ]
    floor.rooms.find(entry => entry.id === 'entry')!.tileParts = [rect(bathEast + partition, north, east - bathEast - partition, kitchenNorth - north)]
    floor.furniture = [
      ...kitchenFurniture(floor.height),
      { ...item('guest-shower', 'shower', west + .02, 2.79, showerWidth - .04, stairNorth - 2.81, .04, Math.PI), concealedFittings: true },
      { ...item('guest-wc', 'wc', .68, north + .16, .5, .62, .43), concealedFittings: true },
      { ...item('guest-sink', 'sink', 1.52, north + .16, .6, .45, .85), concealedFittings: true },
      { ...item('cleaning-storage', 'cabinet', nicheWest + partition, nicheNorth + partition, .6, stairNorth - nicheNorth - partition, 2.35), front: 'east' },
      { ...item('entry-coats', 'coat-rack', 4.65, north + .02, 1.6, .1, .18), bottom: 1.55 },
      item('entry-bench', 'bench', 4.8, north + .06, 1.5, .42, .46),
      item('sideboard', 'cabinet', 1.45, stair.end + partition + .06, 1.75, .44, .58),
      item('tv', 'tv', 1.68, stair.end + partition, 1.3, .08, 1.42),
      item('dining', 'table', 5.05, 7.65, .95, 1.85, .75),
      item('dining-bench', 'bench', 6.18, 7.65, .44, 1.85, .85),
      item('sofa', 'sofa', .46, 9.15, 2.65, .95, .8, Math.PI),
      item('sofa-chaise', 'sofa', .46, 7.35, .95, 1.8, .8, -Math.PI / 2),
      { ...item('coffee', 'table', 1.6, 8.15, .85, .85, .36), shape: 'round', color: '#ffffff' },
      ...[7.8, 8.4, 9.0].map((chairSouth, index) => item(`dining-chair-${index}`, 'chair', 4.42, chairSouth, .43, .43, .8, -Math.PI / 2)),
      ...[4.85, 5.45].map((stoolEast, index) => ({ ...item(`kitchen-stool-${index}`, 'chair', stoolEast, 6.38, .43, .4, .68), seatHeight: .65 })),
    ]
  } else if (id === 'OG') {
    const bathSouth = 3.75, bathEast = 4.2375, bearing = .215, divider = 3.9275, childWest = divider + partition, hallEnd = 7.675
    const wetEast = 1.35, screenThickness = .2125, screenEast = wetEast + screenThickness, screenNorth = 1.25, screenSouth = 2.85, serviceNorth = 1.955, serviceDepth = .295, vanityDepth = .5, sinkWidth = .65
    floor.walls.push(
      wall('bath-south', 'x', west, bathSouth, bathEast + bearing - west, [{ ...opening('bath', 2.798 - west), hinge: 'end' }], bearing),
      wall('bath-east', 'z', bathEast, north, bathSouth - north, [], bearing),
      { ...wall('bath-installation', 'x', west, serviceNorth, wetEast - west, [], serviceDepth), height: 2.2 },
      { ...wall('bath-screen', 'z', wetEast, screenNorth, screenSouth - screenNorth, [], screenThickness), height: 2.2 },
      wall('east-divider', 'z', divider, stair.z, hallEnd - stair.z, [{ ...opening('child-north', 4.47 - stair.z), hinge: 'end' }]),
      wall('stair-south', 'x', west, stair.end, stairEast + partition - west),
      wall('store-east', 'z', 2.4725, stair.end + partition, hallEnd - stair.end - partition, [{ ...opening('store', 6.452 - stair.end - partition), swing: 'reverse' }]),
      wall('children-divider', 'x', west, hallEnd, east - west, [{ ...opening('child-south', 2.798 - west), hinge: 'end', swing: 'reverse' }]),
    )
    floor.rooms = [
      room('bath', 'Bad', [
        rect(west, north, wetEast - west, serviceNorth - north),
        rect(west, serviceNorth + serviceDepth, wetEast - west, bathSouth - serviceNorth - serviceDepth),
        rect(wetEast, north, screenThickness, screenNorth - north),
        rect(wetEast, screenSouth, screenThickness, bathSouth - screenSouth),
        rect(screenEast, north, bathEast - screenEast, bathSouth - north),
      ], [2.7, 2.8], '#d8e8ea', 'Familienbad mit T-Wand-Lösung (12,60 m² laut Wolf-Plan): bodengleiche Dusche im Nordwesten, WC in der Südwestnische, Doppelwaschtisch an der 1,60 m breiten T-Wand und Badewanne im Nordosten; Fenster 173 × 123 cm (DKF einflüglig + Festteil, BRH 93 cm).'),
      room('child-north', 'Kind 1', [rect(bathEast + bearing, north, east - bathEast - bearing, stair.z - north), rect(childWest, stair.z, east - childWest, hallEnd - stair.z)], [5.15, 4.9], '#e9ecd9', 'Nordöstliches Kinderzimmer (18,16 m² laut Wolf-Plan) mit Nordfenster 173 × 123 cm (BRH 93 cm) und bodentiefer Ost-Fenstertür 110,5 × 216 cm mit 90 cm festem Unterlicht.'),
      room('hall', 'Flur', [rect(stairEast, stair.z, divider - stairEast, stair.depth), rect(2.6475, stair.end, divider - 2.6475, hallEnd - stair.end)], [3.25, 5.4], '#eeeee8', 'Obergeschoss-Flur (5,14 m² laut Wolf-Plan) zur zentralen Erschließung von Bad, Kind 1, Kind 2 und Abstellraum.'),
      room('store', 'Abstellraum', [rect(west, stair.end + partition, 2.4725 - west, hallEnd - stair.end - partition)], [1.35, 6.95], '#e9e7d6', 'Separater Abstellraum südlich der Treppe (2,82 m² laut Wolf-Plan).'),
      room('child-south', 'Kind 2', [rect(west, hallEnd + partition, east - west, south - hallEnd - partition)], [2.75, 9.0], '#e9ecd9', 'Südliches Kinderzimmer über die gesamte Hausbreite (16,01 m² laut Wolf-Plan; 6,405 m breit × 2,50 m tief) mit bodentiefer Südwest-Fenstertür 110,5 × 216 cm (Unterlicht) und Südost-Fenster 173 × 123 cm (BRH 93 cm).'),
    ]
    floor.furniture = [
      item('bath-tub', 'bath', bathEast - .84, .42, .8, 1.8, .6),
      { ...item('bath-shower', 'shower', west + .02, north + .02, wetEast - west - .04, serviceNorth - north - .04, .04), concealedFittings: true },
      { ...item('bath-wc', 'wc', west + .02, 2.72, .65, .5, .43, Math.PI / 2), concealedFittings: true },
      { ...item('bath-vanity', 'cabinet', screenEast, screenNorth + .1, vanityDepth, 1.4, .67), front: 'east' },
      { ...item('bath-sink', 'sink', screenEast + .08, (screenNorth + screenSouth - sinkWidth) / 2, vanityDepth - .08, sinkWidth, .85, -Math.PI / 2), concealedFittings: true },
      { ...item('bath-mirror-cabinet', 'cabinet', screenEast, screenNorth + .2, .16, 1.2, .7), bottom: 1.15, front: 'east' },
      item('bed-north', 'bed', 5.65, hallEnd - 2.08, 1, 2, .52, Math.PI),
      item('desk-north', 'desk', 5.05, north + .05, 1.4, .62, .75),
      item('desk-chair-north', 'chair', 5.5, 1.15, .48, .48, .82, Math.PI),
      { ...item('wardrobe-north', 'cabinet', childWest + .05, 5.55, .6, 2, 2.25), front: 'east' },
      item('bed-south', 'bed', .48, hallEnd + partition + .12, 2, 1, .52, Math.PI / 2),
      item('desk-south', 'desk', 5.05, south - .66, 1.4, .62, .75, Math.PI),
      item('desk-chair-south', 'chair', 5.5, south - 1.38, .48, .48, .82),
      { ...item('wardrobe-south', 'cabinet', 4.15, hallEnd + partition + .04, 1.8, .6, 2.25), front: 'south' },
      item('store-shelf', 'bookcase', west + .06, stair.end + partition + .08, .38, 1.16, 2),
    ]
  } else {
    const kneeThickness = .115, usableNorth = 1.3825, usableSouth = 9.3175, divider = 3.9275, roomWest = divider + partition, stairNorth = 3.79, northRoomEnd = 5.675
    floor.walls.push(
      wall('knee-north', 'x', west, usableNorth - kneeThickness, east - west, [], kneeThickness),
      wall('knee-south', 'x', west, usableSouth, east - west, [], kneeThickness),
      wall('stair-north', 'x', west, stairNorth, divider - west),
      wall('office-west', 'z', divider, stairNorth, northRoomEnd - stairNorth, [{ ...opening('attic-office', 4.128 - stairNorth), hinge: 'end' }]),
      wall('office-entry', 'x', divider, northRoomEnd, east - divider),
      wall('bedroom-west', 'z', divider, northRoomEnd + partition, stair.end - northRoomEnd - partition),
      wall('parents-entry-south', 'x', west, stair.end, roomWest - west, [opening('attic-parents-south', 2.786 - west)]),
      { ...wall('stair-guard-east', 'z', stairEast, 5.13, stair.end - 5.13, [], .135), height: 1 },
    )
    floor.rooms = [
      room('bedroom', 'Schlafen / Ankleide', [rect(west, usableNorth, east - west, stairNorth - usableNorth), rect(roomWest, stairNorth, east - roomWest, northRoomEnd - stairNorth)], [4.95, 4.4], '#e9e7d6', 'Elternschlafzimmer mit Ankleidebereich im Norden (20,43 m² Grundfläche / 16,06 m² Wohnfläche laut Wolf-Plan; Kniestock 20 cm über DG-FFB, geschlossener Luftraum 1 mit 5,89 m² nördlich der Abseitenwand). Dachflächenfenster 94 × 118 cm und Ost-Fenstertür 110,5 × 216 cm.'),
      room('hall', 'Flur', [rect(stairEast, stair.z, divider - stairEast, 5.13 - stair.z), rect(stairEast + .135, 5.13, divider - stairEast - .135, stair.end - 5.13)], [3.25, 4.7], '#eeeee8', 'Dachgeschoss-Flur (3,07 m² laut Wolf-Plan) mit 1,00 m hoher Brüstungswand am Treppenauge.'),
      room('office', 'Gast / Arbeiten', [rect(roomWest, northRoomEnd + partition, east - roomWest, stair.end + partition - northRoomEnd - partition), rect(west, stair.end + partition, east - west, usableSouth - stair.end - partition)], [3.4, 7.2], '#e4e8e2', 'Arbeits- und Gästezimmer im Süden (20,32 m² Grundfläche / 15,95 m² Wohnfläche laut Wolf-Plan; geschlossener Luftraum 2 mit 5,89 m² südlich der Abseitenwand). Dachflächenfenster 94 × 118 cm und Ost-Fenstertür 110,5 × 216 cm.'),
    ]
    floor.furniture = [
      item('parents-bed', 'bed', .48, 1.82, 2, 1.8, .52, Math.PI / 2),
      item('parents-low', 'cabinet', .48, 1.4, .45, .4, .58),
      { ...item('parents-north-storage', 'cabinet', 5.02, northRoomEnd - .64, 1.65, .6, 2.2, Math.PI), front: 'north' },
      item('dressing-low', 'cabinet', 2.8, usableNorth + .05, 2.2, .45, .82),
      item('office-desk', 'desk', 4.95, 7.25, 1.5, .72, .75, Math.PI),
      item('office-chair', 'chair', 5.45, 6.52, .48, .48, .85),
      item('office-shelf', 'bookcase', .48, stair.end + partition + .06, 1.85, .42, 2.1),
      item('guest-bed', 'bed', .48, usableSouth - 1.95, 2, 1, .52, Math.PI / 2),
      item('office-plant-east', 'plant', 6.15, 8.7, .4, .4, .85),
    ]
  }
  return floor
}