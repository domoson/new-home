import { atticWallThickness, basementWindow, construction, elevations, house, houseEnvelope, interiorWallThickness, rect, stair, standardDoor } from './model'
import type { Floor, FloorId, Furniture, Opening, Rect, Room, Wall } from './model'
import { kitchenFurniture } from './kitchenLayout'
import { raffstores } from './raffstore'

const opening = (id: string, start: number, width = .86, kind: Opening['kind'] = 'door', sill = 0, height = 2.11): Opening => ({ id, start, width, kind, sill, height, ...(kind === 'door' && id !== 'terrace' && height >= 2 ? standardDoor : {}) })
const windowOpening = (id: string, start: number, width: number, sill = .9, height = 1.25): Opening => ({ ...opening(id, start, width, 'window', sill, height), windowLayout: { columns: width >= 1.5 ? 2 : 1, ...(sill === 0 && !id.includes('fixed') ? { lowerFixed: .7 } : {}) } })
const wallBase = (id: string, axis: Wall['axis'], x: number, z: number, length: number, openings: Opening[] = [], thickness = interiorWallThickness): Wall => ({ id, axis, ...rect(x, z, axis === 'x' ? length : thickness, axis === 'z' ? length : thickness), openings })
const item = (id: string, kind: Furniture['kind'], x: number, z: number, width: number, depth: number, height: number, angle = 0): Furniture => ({ id, kind, x, z, width, depth, height, angle })
const room = (id: string, name: string, parts: Rect[], spawn: [number, number], color = '#e9e7d6', note = 'Aus dem Anbieterplan rekonstruiert; lichte Geometrie, keine Ausführungsplanung.'): Room => ({ id, name, parts, spawn, color, note })

export const offeredAreas: Record<FloorId, Record<string, [number, number]>> = {
  KG: { bath: [22.13, 0], 'child-north': [5.47, 0], 'child-south': [29.35, 0], hall: [6.56, 0] },
  EG: { wc: [4.52, 4.39], hall: [8.95, 8.68], kitchen: [13.06, 12.67], pantry: [3.28, 3.19], living: [29.35, 28.47] },
  OG: { bath: [10.75, 10.43], hall: [3.42, 3.31], 'child-north': [15.99, 15.51], 'child-south': [15.99, 15.51], bedroom: [13.06, 12.67] },
  DG: { store: [6.14, 2.35], office: [17.91, 15.43], hall: [2.76, 2.67], bedroom: [19.51, 17.73] },
}

export const referenceAreas: Partial<Record<FloorId, Record<string, number>>> = {
  KG: { bath: 19.85, hall: 6.16, 'child-north': 6.48, 'child-south': 28.4 },
  EG: { wc: 4.19, hall: 8.91, living: 42.66 },
  OG: { bath: 10.7, hall: 3.92, 'child-north': 18.85, 'child-south': 18.8, store: 2.45 },
  DG: { office: 17.22, hall: 2.11, bedroom: 21.04 },
}

function upperHallDivider(partition = interiorWallThickness): number {
  return stair.x + stair.width + partition + 1.05
}

function upperChildrenDivider(): number {
  return 7.04
}

function shell(id: FloorId): Wall[] {
  const north: Opening[] = id === 'KG' ? [windowOpening('well-plant', 1.2 - house.west, basementWindow.width, 1.35, basementWindow.height)] : id === 'EG' ? [windowOpening('wc-window', .6 - house.west, .6, 1.52, 1), { ...windowOpening('hall-window-fixed', 4.2 - house.west, 1.8, 2.02, .5), windowLayout: { columns: 1 } }] : id === 'OG' ? [windowOpening('bath-window', 1.2 - house.west, 1.8, 1.27, 1), windowOpening('child-north-window', 4.2 - house.west, 1.8, 1.02, 1.25)] : []
  const east: Opening[] = id === 'KG' ? [windowOpening('well-hobby', 6, basementWindow.width, 1.35, basementWindow.height)] : id === 'EG' ? [windowOpening('entrance-fixed', .3, .4, 0, 2.25), { ...opening('entrance', .7), width: 1.1, height: 2.25, swing: 'reverse' }, { ...windowOpening('kitchen-east-window', 3.6, 2.1, 1.52, 1), windowLayout: { columns: 2, ventilationSide: 'start' } }, windowOpening('living-corner-fixed', 9, 1.2, 0, 2.52)] : id === 'OG' ? [{ ...windowOpening('east-north', 3.6, 1.2, 0, 2.27), windowLayout: { columns: 1, lowerFixed: .9 } }] : [{ ...windowOpening('gable-office', 3.6, 1.2, 0, 2.27), windowLayout: { columns: 1, lowerFixed: .9 } }, { ...windowOpening('gable-parents', 5.7, 1.2, 0, 2.27), windowLayout: { columns: 1, lowerFixed: .9 } }]
  const terraceWidth = 2.8, terraceLeaf = terraceWidth / 2
  const terraceStart = 3.8 - house.west
  const south: Opening[] = id === 'KG' ? [windowOpening('well-hobby-south', 1.35 - house.west, basementWindow.width, 1.35, basementWindow.height)] : id === 'EG' ? [windowOpening('garden-west-fixed', 1.2 - house.west, 1.2, 0, 2.52), opening('terrace', terraceStart, terraceLeaf, 'door', 0, 2.52), { ...windowOpening('garden-fixed', terraceStart + terraceLeaf, terraceLeaf, 0, 2.52), windowLayout: { columns: 1 } }] : id === 'OG' ? [{ ...windowOpening('south-west', 1.2 - house.west, 1.2, 0, 2.27), windowLayout: { columns: 1, lowerFixed: .9 } }, windowOpening('south-east', 4.5 - house.west, 1.8, 1.02, 1.25)] : []
  if (id === 'EG') for (const glazed of [...east, ...south].filter(opening => opening.kind === 'window' && opening.sill === 0)) glazed.windowLayout = { columns: glazed.windowLayout!.columns }
  if (id !== 'KG') for (const glazed of [...north, ...east, ...south].filter(opening => opening.kind === 'window' && opening.width >= 1.5 && !opening.id.includes('fixed'))) glazed.windowLayout = { ...glazed.windowLayout!, ventilationWidth: .6 }
  const envelope = houseEnvelope()
  return [wallBase('west', 'z', envelope.x, envelope.z, envelope.depth, [], construction.partyWall), wallBase('east', 'z', house.east, envelope.z, envelope.depth, east.map(opening => ({ ...opening, start: opening.start - envelope.z })), construction.exteriorWall), wallBase('north', 'x', house.west, envelope.z, house.east - house.west, north, construction.exteriorWall), wallBase('south', 'x', house.west, house.south, house.east - house.west, south, construction.exteriorWall)]
}

export function buildProviderFloor(id: FloorId, side: 'east' | 'west'): Floor {
  const floor: Floor = { id, name: { KG: 'Kellergeschoss', EG: 'Erdgeschoss', OG: 'Obergeschoss', DG: 'Dachgeschoss' }[id], elevation: elevations[id], height: id === 'KG' ? construction.basementClearHeight : construction.clearHeight, rooms: [], walls: shell(id), furniture: [] }
  const recesses = raffstores(floor).map(blind => blind.box)
  for (const wall of floor.walls) wall.recesses = recesses
  if (side === 'west') return floor
  const west = house.west, east = house.east, north = house.north, south = house.south
  const partition = id === 'DG' ? atticWallThickness : interiorWallThickness
  const wall = (wallId: string, axis: Wall['axis'], x: number, z: number, length: number, openings: Opening[] = [], thickness = partition) => wallBase(wallId, axis, x, z, length, openings, thickness)
  const stairEast = stair.x + stair.width, hallWest = stairEast + partition, upperNorth = stair.z - partition, lowerSouth = stair.end + partition
  if (id !== 'KG') floor.walls.push(wall('stair-north', 'x', west, upperNorth, stair.width), wall('stair-south', 'x', west, stair.end, stair.width))
  if (id === 'EG') {
    const bathEast = 2.15, nicheWest = 1.4, nicheNorth = 1.85, screenWest = 3.39, kitchenWall = 2.5 - partition
    const showerWidth = nicheWest - partition - west
    floor.walls.push({ ...wall('guest-shower-door', 'x', west, upperNorth - 1.16, showerWidth, [{ id: 'shower', kind: 'door', start: 0, width: showerWidth, sill: 0, height: 2.1, frame: .04, glazed: true, swing: 'reverse' }], .04), height: 2.1 })
    floor.walls.push(wall('wc-east', 'z', bathEast, north, nicheNorth - north, [{ ...opening('wc', .6, .85), swing: 'reverse' }]), wall('wc-niche-north', 'x', nicheWest - partition, nicheNorth, bathEast - nicheWest + partition), wall('wc-niche-return', 'z', nicheWest - partition, nicheNorth + partition, upperNorth - nicheNorth - partition), wall('kitchen-north', 'x', screenWest, kitchenWall, east - screenWest), wall('stair-south-extension', 'x', stairEast, stair.end, 2.65 - stairEast), { ...wall('wc-installation-north', 'x', west, north, bathEast - west, [], .08), height: 1.2 })
    floor.rooms = [room('wc', 'Dusche / WC', [rect(west, north + .08, bathEast - west, nicheNorth - north - .08), rect(west, nicheNorth, nicheWest - partition - west, upperNorth - nicheNorth)], [1.1, 1.4], '#d8e8ea'), room('hall', 'Flur / Diele', [rect(bathEast + partition, north, east - bathEast - partition, kitchenWall - north)], [3.9, 1.25], '#e5e2d7'), room('living', 'Wohnen / Essen / Kochen', [rect(bathEast + partition, kitchenWall, screenWest - bathEast - partition, partition), rect(bathEast + partition, 2.5, east - bathEast - partition, upperNorth - 2.5), rect(hallWest, upperNorth, east - hallWest, stair.end - upperNorth), rect(2.65, stair.end, east - 2.65, partition), rect(west, lowerSouth, east - west, south - lowerSouth)], [3.6, 7.1], '#eee8cf', 'Haas-Skizze: offene U-Küche östlich der Treppe, Essplatz im Südosten und Wohnecke im Südwesten. Nicht bemaßte Innenwände und Möbel angenähert.')]
    floor.walls.push(wall('basement-entry', 'z', stairEast, upperNorth, 1.11, [opening('basement-stair', .19)]))
    floor.rooms.find(room => room.id === 'hall')!.tileParts = [...floor.rooms.find(room => room.id === 'hall')!.parts]
    floor.furniture = [...kitchenFurniture(floor.height), { ...item('guest-shower', 'shower', .32, upperNorth - 1.12, showerWidth - .04, 1.08, .04, Math.PI), concealedFittings: true }, { ...item('guest-wc', 'wc', .57, .39, .5, .65, .43), concealedFittings: true }, { ...item('guest-sink', 'sink', 1.42, .39, .55, .45, .85), concealedFittings: true },
      { ...item('cleaning-storage', 'cabinet', nicheWest, nicheNorth + partition, bathEast + partition - nicheWest, upperNorth - nicheNorth - partition, floor.height), front: 'east' },
      { ...item('entry-coats', 'coat-rack', 3.45, north, 1.7, .1, .18), bottom: 1.5 },
      { ...item('wardrobe', 'cabinet', 3.45, kitchenWall - .6, 2.1, .6, floor.height), front: 'north' },
      item('sideboard', 'cabinet', .55, lowerSouth + .2, 1.8, .45, .6), item('tv', 'tv', .77, lowerSouth, 1.3, .08, 1.45), item('dining', 'table', 5.2, 7.75, .9, 1.8, .75), item('dining-bench', 'bench', 6.15, 7.75, .4, 1.8, .85), item('sofa', 'sofa', .4, 9.05, 2.8, .95, .8, Math.PI), item('sofa-chaise', 'sofa', .4, 7.2, .95, 1.85, .8, -Math.PI / 2), { ...item('coffee', 'table', 1.5, 8.05, .9, .9, .35), shape: 'round', color: '#ffffff' }, ...[7.9, 8.5, 9.1].map((south, index) => item(`dining-chair-${index}`, 'chair', 4.5, south, .43, .43, .8, -Math.PI / 2)), ...[4.55, 5.25].map((east, index) => ({ ...item(`kitchen-stool-${index}`, 'chair', east, 5.86, .43, .4, .68), seatHeight: .65 }))]
  } else if (id === 'KG') {
    const divider = 3.25
    floor.walls.push(wall('bath-south', 'x', west, upperNorth, east - west, [{ ...opening('bath', 1.95), swing: 'reverse' }]), wall('east-divider', 'z', divider, stair.z, stair.depth, [opening('child-north', .55)]), wall('store-north', 'x', west, stair.end, east - west, [opening('child-south', 1.95)]))
    floor.rooms = [room('bath', 'Technik / Lager', [rect(west, north, east - west, upperNorth - north)], [3.7, 2.1], '#e4e7e8'), room('child-north', 'Keller', [rect(divider + partition, stair.z, east - divider - partition, stair.depth)], [4.9, 4.7], '#e4e7e8'), room('child-south', 'Keller / Hobby', [rect(west, lowerSouth, east - west, south - lowerSouth)], [3.5, 8.1], '#e4e7e8'), room('hall', 'Kellerflur', [rect(west, stair.z, divider - west, stair.depth)], [2.85, 4.65], '#eeeee8', 'Einschließlich Treppengrundfläche; keine Wohnfläche.')]
    floor.furniture = [item('heat-pump', 'machine', .45, .45, .75, .75, 1.8), item('tank', 'machine', 2.4, .45, .7, .7, 1.7), item('washer', 'machine', 4.85, .45, .62, .62, .88), item('dryer', 'machine', 5.55, .45, .62, .62, .88), item('utility-shelf', 'bookcase', .4, upperNorth - 1.4, .4, 1.3, 2), item('cellar-shelf', 'bookcase', east - .45, stair.z + .1, .35, 1.8, 2), item('hobby-table', 'table', 4.9, 7.7, 1.3, .7, .75), item('hobby-sofa', 'sofa', .45, south - .9, 2, .8, .8)]
  } else if (id === 'OG') {
    const divider = upperHallDivider(partition), childWest = divider + partition, bathEast = 3.8, hallEnd = upperChildrenDivider(), storeSouth = hallEnd
    const wetEast = west + 1.2 + .04, screenThickness = .15, screenEast = wetEast + screenThickness, screenNorth = 1.05, screenSouth = 2.4, serviceNorth = 1.7, serviceDepth = .15, vanityDepth = .5, sinkWidth = .6
    floor.walls.push({ ...wall('bath-shower-door', 'z', wetEast, screenSouth, upperNorth - screenSouth, [{ id: 'shower', kind: 'door', start: 0, width: upperNorth - screenSouth, sill: 0, height: 2.1, frame: .04, hinge: 'end', glazed: true, swing: 'reverse' }], screenThickness), height: 2.1 })
    floor.walls.push(wall('bath-south', 'x', stairEast, upperNorth, bathEast + partition - stairEast, [{ ...opening('bath', .225, .85), hinge: 'end' }]), wall('bath-east', 'z', bathEast, north, upperNorth - north), wall('east-divider', 'z', divider, stair.z, hallEnd - stair.z, [{ ...opening('child-north', .5, .85), hinge: 'end' }]), wall('children-divider', 'x', childWest, hallEnd, east - childWest), wall('bedroom-north', 'x', stairEast, hallEnd, childWest - stairEast, [{ ...opening('child-south', .225, .85), hinge: 'end', swing: 'reverse' }]), wall('store-east', 'z', stairEast, lowerSouth, storeSouth - lowerSouth, [{ ...opening('store', .1, .85), swing: 'reverse' }]), wall('store-south', 'x', west, storeSouth, stair.width), wall('bath-installation', 'x', west, serviceNorth, wetEast - west, [], serviceDepth), wall('bath-screen', 'z', wetEast, screenNorth, screenSouth - screenNorth, [], screenThickness))
    floor.rooms = [room('bath', 'Bad', [rect(west, north, wetEast - west, serviceNorth - north), rect(west, serviceNorth + serviceDepth, wetEast - west, upperNorth - serviceNorth - serviceDepth), rect(wetEast, north, screenThickness, screenNorth - north), rect(wetEast, screenSouth, screenThickness, upperNorth - screenSouth), rect(screenEast, north, bathEast - screenEast, upperNorth - north)], [2.6, 2.8], '#d8e8ea', 'T-Bad mit verbreiterter Dusche 120 x 141 cm im Südwesten. T-Schirm, Glastür und Waschtisch 24 cm nach Osten versetzt; WC im verbreiterten Nordwestbereich zentriert. Einzelwaschtisch 135 x 50 cm mit 60-cm-Becken, je 37,5 cm Seitenablage, 10 cm hinter dem Becken und Spiegelschrank 120 x 70 x 16 cm. Beide T-Wände 242 cm hoch, darüber 35 cm offen. Duschöffnung 90 cm mit 210 cm hoher Glastür, geöffnet über 80 cm frei; darüber 67 cm offen. WC-Zugang 75 cm, Gang zur Wanne 101 cm. Wanne 180 x 80 cm, Eingang und Nordlichtband unverändert. Befestigung, Abdichtung und Anschlüsse fachlich ungeprüft.'), room('child-north', 'Kind Nord', [rect(bathEast + partition, north, east - bathEast - partition, stair.z - north), rect(childWest, stair.z, east - childWest, hallEnd - stair.z)], [5.05, 4.9], '#e9ecd9'), room('child-south', 'Kind Süd', [rect(west, hallEnd + partition, east - west, south - hallEnd - partition)], [2.7, 8.4], '#e9ecd9'), room('hall', 'Flur', [rect(hallWest, stair.z, divider - hallWest, hallEnd - stair.z)], [(hallWest + divider) / 2, 5.2], '#eeeee8'), room('store', 'Abstellraum', [rect(west, lowerSouth, stairEast - west, storeSouth - lowerSouth)], [1.25, 6.45])]
    floor.furniture = [item('bath-tub', 'bath', bathEast - .8, .35, .8, 1.8, .6), { ...item('bath-shower', 'shower', west + .02, serviceNorth + serviceDepth + .02, wetEast - west - .04, upperNorth - serviceNorth - serviceDepth - .04, .04), concealedFittings: true }, { ...item('bath-wc', 'wc', (west + wetEast) / 2 - .25, serviceNorth - .66, .5, .65, .43, Math.PI), concealedFittings: true }, { ...item('bath-vanity', 'cabinet', screenEast, screenNorth, vanityDepth, screenSouth - screenNorth, .67), front: 'east' }, { ...item('bath-sink', 'sink', screenEast + .1, (screenNorth + screenSouth - sinkWidth) / 2, vanityDepth - .1, sinkWidth, .85, -Math.PI / 2), concealedFittings: true }, { ...item('bath-mirror-cabinet', 'cabinet', screenEast, screenNorth + .075, .16, 1.2, .7), bottom: 1.15, front: 'east' }, item('bed-north', 'bed', bathEast + partition + .05, .45, 1, 2, .52), item('desk-north', 'desk', 5.95, 2.55, .6, 1.4, .75), item('desk-chair-north', 'chair', 5.32, 3.02, .48, .48, .82), { ...item('wardrobe-north', 'cabinet', childWest + .05, 5.1, .6, 2, 2.3), front: 'east' }, item('bed-south', 'bed', .45, hallEnd + partition + .2, 1, 2, .52), item('desk-south', 'desk', 2.15, 9.55, 1.4, .6, .75), item('desk-chair-south', 'chair', 2.6, 8.9, .48, .48, .82), { ...item('wardrobe-south', 'cabinet', 4.35, hallEnd + partition, 2, .6, 2.3), front: 'south' }, item('store-shelf', 'bookcase', .35, 5.75, .35, 1, 2)]
  } else {
    const usableNorth = 1.6, kneeSouth = house.depth - usableNorth, divider = upperHallDivider(partition), officeEnd = 5.2, hallEnd = stair.end
    floor.walls.push(wall('knee-north', 'x', west, usableNorth - partition, east - west), wall('knee-south', 'x', west, kneeSouth, east - west), wall('hall-north', 'x', stairEast, upperNorth, divider + partition - stairEast), wall('office-west', 'z', divider, stair.z, officeEnd - stair.z, [{ ...opening('attic-office', .08, .85), hinge: 'end' }]), wall('office-entry', 'x', divider, officeEnd, east - divider), wall('parents-entry-south', 'x', stairEast, hallEnd, divider + partition - stairEast, [opening('attic-parents-south', partition, .85)]), wall('bedroom-west', 'z', divider, officeEnd + partition, hallEnd - officeEnd - partition))
    floor.rooms = [room('office', 'Schlafen / Ankleide', [rect(west, usableNorth, east - west, upperNorth - usableNorth), rect(divider + partition, upperNorth, east - divider - partition, officeEnd - upperNorth)], [4.9, 4.15], '#e4e8e2'), room('hall', 'Flur', [rect(hallWest, stair.z, divider - hallWest, hallEnd - stair.z)], [2.85, 4.8], '#eeeee8'), room('bedroom', 'Büro / Gäste', [rect(divider + partition, officeEnd + partition, east - divider - partition, lowerSouth - officeEnd - partition), rect(west, lowerSouth, east - west, kneeSouth - lowerSouth)], [3.3, 6.8])]
    floor.furniture = [
      item('guest-bed', 'bed', 4.2, 1.7, 1.8, 2, .52), item('parents-low', 'cabinet', 3.7, 1.65, .45, .4, .45), item('parents-low-east', 'cabinet', 6.05, 1.65, .45, .4, .45),
      { ...item('office-storage', 'cabinet', .35, usableNorth + .02, 2, .4, .8), front: 'south' }, item('office-plant-west', 'plant', 2.45, usableNorth + .05, .4, .4, 1),
      { ...item('parents-north-storage', 'cabinet', .35, upperNorth - .45, 2.55, .43, 2.2), front: 'north' },
      { ...item('office-south-storage', 'cabinet', 3.55, officeEnd - .62, 1.8, .6, 2.2), front: 'north' },
      item('office-desk', 'desk', .35, 6.6, 1.6, .7, .75, Math.PI), item('office-chair', 'chair', .91, 5.95, .48, .48, .85),
      { ...item('parents-cabinet', 'cabinet', 3.55, officeEnd + partition + .02, 1.7, .4, 1.1), front: 'south' },
      item('parents-bed', 'bed', 4.3, kneeSouth - 2.05, 1.6, 2, .52, Math.PI),
      { ...item('dressing-low', 'cabinet', .35, kneeSouth - .47, 2.3, .45, .8), front: 'north' }, item('office-plant-east', 'plant', 2.5, kneeSouth - .9, .4, .4, 1),
    ]
  }
  if (id === 'EG') for (const item of floor.furniture) if (item.id === 'dining' || item.id.startsWith('dining-')) item.z -= .35
  if (id === 'EG') for (const [index, stool] of floor.furniture.filter(item => item.id.startsWith('kitchen-stool')).entries()) stool.x = 4.435 + index * .6
  if (id === 'OG') {
    floor.rooms.find(room => room.id === 'bath')!.note = 'Haas-Skizze: Bad im Nordwesten mit WC, Dusche im Südwesten, Einzelwaschtisch am Schirm und Wanne im Nordosten. Östliche Raumtrennwand bei x = 3,80 m, Nordfenster 180 × 100 cm mit 127 cm Brüstung. Innenwände, Vorwände, Sanitäranschlüsse und Glastür sind angenähert; keine Ausführungs- oder Herstellerplanung.'
    const northDesk = floor.furniture.find(item => item.id === 'desk-north')!
    Object.assign(northDesk, { x: 4.2, z: .35, width: 1.4, depth: .6, angle: 0 })
    Object.assign(floor.furniture.find(item => item.id === 'desk-chair-north')!, { x: 4.66, z: 1.12, angle: Math.PI })
    Object.assign(floor.furniture.find(item => item.id === 'bed-north')!, { x: 5.55, z: upperChildrenDivider() - 2.05, angle: Math.PI })
    floor.furniture.find(item => item.id === 'desk-south')!.x = 4.7
    floor.furniture.find(item => item.id === 'desk-south')!.angle = Math.PI
    floor.furniture.find(item => item.id === 'desk-chair-south')!.x = 5.16
    for (const wall of floor.walls) if (['bath-installation', 'bath-screen'].includes(wall.id)) wall.height = floor.height - .35
    Object.assign(floor.furniture.find(item => item.id === 'wardrobe-north')!, { x: upperHallDivider(partition) + partition + .05, z: 5.05, depth: 1.9 })
    floor.furniture.find(item => item.id === 'store-shelf')!.z = lowerSouth + .05
    floor.furniture.find(item => item.id === 'store-shelf')!.depth = floor.walls.find(wall => wall.id === 'store-south')!.z - lowerSouth - .08
  }
  for (const chair of floor.furniture.filter(item => ['play-chair', 'office-chair'].includes(item.id))) chair.angle = chair.id === 'office-chair' ? 0 : -Math.PI / 2
  return floor
}