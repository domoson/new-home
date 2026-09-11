import { footprintPlacement, neighborFootprints, placementPoint } from './neighborhoodLayout'

const placement = footprintPlacement(neighborFootprints[8], 9, 9.5)
placement.origin = placementPoint(placement, -3.2, 0)

export const neighbor8 = {
  parcel: '74/5',
  number: 8,
  placement,
  house: { x: 3.2, z: 0, width: 9, depth: 9.5, eaves: 5.5 },
  garage: { x: 0, z: -2.5, width: 3.2, depth: 12, height: 2.6 },
  roofPitch: 38,
  ground: -.14,
}

export function neighbor8Point(x: number, z: number): [number, number] {
  return placementPoint(neighbor8.placement, x, z)
}