import { boundaryDistance, boundaryX, siteBoundary } from './context'
import { house } from './model'

export type SiteRect = { x: number; z: number; width: number; depth: number }
export const carportRoof = { pitch: 3, lowEdge: 2.5, thickness: .06 }
export const carportScreen = { depth: .06, width: .06, pitch: .1, base: -.04 }

export const rectCorners = ({ x, z, width, depth }: SiteRect): [number, number][] => [[x, z], [x + width, z], [x + width, z + depth], [x, z + depth]]

export const siteParking = (['east', 'west'] as const).map(side => {
  const angle = side === 'west' ? Math.atan2(siteBoundary[0][0] - siteBoundary[3][0], siteBoundary[3][1] - siteBoundary[0][1]) : -Math.atan2(siteBoundary[2][0] - siteBoundary[1][0], siteBoundary[2][1] - siteBoundary[1][1])
  const cosine = Math.cos(angle), sine = Math.sin(angle)
  const carportWidth = 3
  const origin = side === 'west' ? { x: boundaryX(12, 3) + .18 / cosine, z: 12 } : { x: boundaryX(12, 1) - (carportWidth + .18) / cosine, z: 12 }
  const point = (x: number, z: number): [number, number] => [origin.x + cosine * x - sine * z, origin.z + sine * x + cosine * z]
  const carport = { x: 0, z: 0, width: carportWidth, depth: 6 }
  {
    const clearance = Math.min(...rectCorners(carport).map(([x, z]) => boundaryDistance(point(x, z), 2)))
    const rate = boundaryDistance(point(0, 1), 2) - boundaryDistance(point(0, 0), 2)
    const shift = (3 - clearance) / rate
    origin.x -= sine * shift; origin.z += cosine * shift
  }
  const streetZ = (x: number) => {
    const distance = boundaryDistance(point(x, 0), 2)
    const rate = boundaryDistance(point(x, 1), 2) - distance
    return -distance / rate
  }
  const openX = side === 'east' ? -3.4 : 4.15
  const open = { x: openX, z: Math.min(streetZ(openX), streetZ(openX + 2.5)) - .45 - 5, width: 2.5, depth: 5 }
  const passage = { x: side === 'east' ? -.9 : carport.width, z: carport.z - 1.85, width: .9 }
  const gardenEdge = side === 'east' ? carport.x : carport.x + carport.width
  // Stall sits .125 m from the fence edge so the lamella side keeps .375 m for opening doors
  const covered = { x: carport.x + (side === 'east' ? .375 : .125), z: carport.z + .5, width: 2.5, depth: 5 }
  const bins = { x: carport.x + .5, z: carport.z - .95, width: 2.25, depth: .9 }
  const binAccess = { x: carport.x, z: carport.z - 1.85, width: carport.width, depth: .9 }
  const passagePoints: [number, number][] = [[passage.x, passage.z], [passage.x + passage.width, passage.z], [passage.x + passage.width, streetZ(passage.x + passage.width)], [passage.x, streetZ(passage.x)]]
  const entrance: [number, number] = side === 'east' ? [house.width + 1, 1.1] : [-house.width - 1, 2.3]
  const join = point(passage.x + passage.width / 2, passage.z)
  const approach: [number, number][] = [[entrance[0] - .45, entrance[1]], [entrance[0] + .45, entrance[1]], [join[0] + .45, join[1]], [join[0] - .45, join[1]]]
  return { side, carport, covered, open, passage, bins, binAccess, gardenEdge, angle, origin, point, streetZ, passagePoints, approach }
})

export function parkingEntrance(east: number) {
  return siteParking.some(({ carport, open, point, streetZ }) => {
    const edges = [carport.x, carport.x + carport.width, open.x, open.x + open.width].map(x => point(x, streetZ(x))[0])
    return east >= Math.min(...edges) - .1 && east <= Math.max(...edges) + .1
  })
}