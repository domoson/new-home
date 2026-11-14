import * as THREE from 'three'
import { area, makeFloor, roofWindows, stairOpeningParts } from './model'
import type { FloorId, Rect, WindowEdits } from './model'

export function roomDaylight(floorId: FloorId, houseSide: 'east' | 'west' = 'east', windows?: WindowEdits) {
  const floor = makeFloor(floorId, houseSide, windows)
  const apertures = floor.walls.filter(wall => ['east', 'north', 'south'].includes(wall.id)).flatMap(wall => wall.openings.filter(opening => !opening.infill && (opening.kind === 'window' || opening.id === 'terrace' || opening.id.startsWith('garden-door'))).map(opening => ({
    east: wall.axis === 'x' ? wall.x + opening.start + opening.width / 2 : wall.x - .2,
    south: wall.axis === 'z' ? wall.z + opening.start + opening.width / 2 : wall.id === 'north' ? wall.z + wall.depth + .2 : wall.z - .2,
    area: opening.width * opening.height,
  })))
  if (floorId === 'DG') for (const window of roofWindows) apertures.push({ east: window.x + window.width / 2, south: window.z + window.depth / 2, area: window.width * window.length })
  const rooms = [...floor.rooms, { id: 'stairs', parts: stairOpeningParts }]
  const contains = (parts: Rect[], east: number, south: number) => parts.some(part => east >= part.x && east <= part.x + part.width && south >= part.z && south <= part.z + part.depth)
  return rooms.map(room => {
    const windows = apertures.filter(window => contains(room.parts, window.east, window.south))
    const glazing = windows.reduce((total, window) => total + window.area, 0)
    const center = new THREE.Vector2()
    for (const window of windows) center.addScaledVector(new THREE.Vector2(window.east, window.south), window.area / glazing)
    return { id: `${floorId}-${room.id}`, glazing, center, strength: Math.min(1.25, glazing / area(room.parts) * 4) * (floorId === 'KG' ? .08 : 1) }
  })
}