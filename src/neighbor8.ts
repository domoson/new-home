import { boundaryX, siteBoundary } from './context'

export const neighbor8 = {
  parcel: '74/5',
  number: 8,
  origin: { x: boundaryX(3.8, 1) + .3, z: 3.8 },
  angle: -Math.atan2(siteBoundary[2][0] - siteBoundary[1][0], siteBoundary[2][1] - siteBoundary[1][1]),
  house: { x: 3.2, z: 0, width: 9, depth: 9.5, eaves: 5.5 },
  garage: { x: 0, z: -.3, width: 3.2, depth: 10, height: 2.6 },
  roofPitch: 38,
  ground: -.14,
}

export function neighbor8Point(x: number, z: number): [number, number] {
  const { origin, angle } = neighbor8
  return [origin.x + Math.cos(angle) * x - Math.sin(angle) * z, origin.z + Math.sin(angle) * x + Math.cos(angle) * z]
}