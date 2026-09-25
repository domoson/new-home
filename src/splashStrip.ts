import { house, lightWells, makeFloor } from './model'
import { partner } from './context'
import type { SiteRect } from './parking'

export const splashStripWidth = .4
export const splashStripLevel = -.14
export const siteLightWells = [...lightWells, ...lightWells.map(well => ({ ...well, x: -well.x - well.width, z: well.z + partner.z }))]
export const siteEntrySteps = (['east', 'west'] as const).map(side => {
  const openings = makeFloor('EG', side).walls.find(wall => wall.id === 'east')!.openings.filter(opening => ['entrance', 'entrance-fixed'].includes(opening.id))
  const start = Math.min(...openings.map(opening => opening.start)) - .1
  const end = Math.max(...openings.map(opening => opening.start + opening.width)) + .1
  return { x: side === 'east' ? house.width : -house.width - .9, z: start + (side === 'east' ? 0 : partner.z), width: .9, depth: end - start }
})

const buildings = [{ x: 0, z: 0, width: house.width, depth: house.depth }, partner]
const envelopes = buildings.map(bounds => ({ x: bounds.x - splashStripWidth, z: bounds.z - splashStripWidth, width: bounds.width + 2 * splashStripWidth, depth: bounds.depth + 2 * splashStripWidth }))
const exclusions = [...buildings, ...siteLightWells, ...siteEntrySteps]
const bounds = [...envelopes, ...exclusions]
const eastings = [...new Set(bounds.flatMap(part => [part.x, part.x + part.width]))].sort((first, second) => first - second)
const southings = [...new Set(bounds.flatMap(part => [part.z, part.z + part.depth]))].sort((first, second) => first - second)
const contains = (part: SiteRect, east: number, south: number) => east > part.x && east < part.x + part.width && south > part.z && south < part.z + part.depth

export const splashStripParts: SiteRect[] = []
for (let row = 1; row < southings.length; row++) {
  const north = southings[row - 1], south = southings[row], strips: SiteRect[] = []
  for (let column = 1; column < eastings.length; column++) {
    const west = eastings[column - 1], east = eastings[column], centerEast = (west + east) / 2, centerSouth = (north + south) / 2
    if (east - west < 1e-8 || south - north < 1e-8 || !envelopes.some(part => contains(part, centerEast, centerSouth)) || exclusions.some(part => contains(part, centerEast, centerSouth))) continue
    const previous = strips.at(-1)
    if (previous && Math.abs(previous.x + previous.width - west) < 1e-8) previous.width = east - previous.x
    else strips.push({ x: west, z: north, width: east - west, depth: south - north })
  }
  for (const strip of strips) {
    const previous = splashStripParts.find(part => Math.abs(part.x - strip.x) < 1e-8 && Math.abs(part.width - strip.width) < 1e-8 && Math.abs(part.z + part.depth - strip.z) < 1e-8)
    if (previous) previous.depth += strip.depth
    else splashStripParts.push(strip)
  }
}