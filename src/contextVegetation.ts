import { Matrix3, Vector3 } from 'three'
import { mapPoint, neighborFootprints } from './neighborhoodLayout'
import type { MapPoint } from './neighborhoodLayout'

export const aerialTreeAnchors = [
  { image: [257, 309], map: neighborFootprints[12][0] },
  { image: [457, 139], map: neighborFootprints[50][0] },
  { image: [578, 305], map: neighborFootprints[8][0] },
] satisfies { image: MapPoint; map: MapPoint }[]

const basis = ([first, second, third]: MapPoint[]) => new Matrix3().set(first[0], second[0], third[0], first[1], second[1], third[1], 1, 1, 1)
const registration = basis(aerialTreeAnchors.map(anchor => anchor.map)).multiply(basis(aerialTreeAnchors.map(anchor => anchor.image)).invert())

export function aerialTreePoint(point: MapPoint): MapPoint {
  const mapped = new Vector3(...point, 1).applyMatrix3(registration)
  return mapPoint([mapped.x, mapped.y])
}

type Crown = { id: string; image: MapPoint; radius: MapPoint; height: number; tone?: 'copper' | 'dark'; low?: boolean }

export const aerialCrowns: Crown[] = [
  { id: 'west-beech', image: [393, 272], radius: [39, 43], height: 11, tone: 'copper' },
  { id: 'west-rear-tall', image: [271, 254], radius: [26, 40], height: 12 },
  { id: 'west-rear-1', image: [317, 274], radius: [25, 25], height: 8 },
  { id: 'west-rear-2', image: [220, 237], radius: [23, 24], height: 8, tone: 'dark' },
  { id: 'west-rear-3', image: [172, 246], radius: [21, 21], height: 7 },
  { id: 'west-rear-4', image: [130, 213], radius: [27, 20], height: 8, tone: 'dark' },
  { id: 'west-rear-5', image: [78, 220], radius: [24, 25], height: 8 },
  { id: 'west-side-tall', image: [206, 392], radius: [21, 33], height: 12, tone: 'dark' },
  { id: 'west-side-1', image: [227, 332], radius: [16, 30], height: 10, tone: 'dark' },
  { id: 'west-front-1', image: [255, 429], radius: [24, 22], height: 8 },
  { id: 'west-front-2', image: [308, 460], radius: [22, 24], height: 9 },
  { id: 'west-front-4', image: [201, 471], radius: [21, 17], height: 6, tone: 'copper' },
  { id: 'north-belt-1', image: [440, 273], radius: [17, 12], height: 4, low: true },
  { id: 'north-belt-2', image: [469, 269], radius: [17, 12], height: 4, low: true },
  { id: 'north-belt-3', image: [500, 266], radius: [18, 13], height: 4.5, low: true },
  { id: 'north-belt-4', image: [531, 263], radius: [18, 12], height: 4, low: true },
  { id: 'north-belt-5', image: [562, 260], radius: [19, 14], height: 5, low: true },
  { id: 'north-belt-6', image: [596, 252], radius: [20, 15], height: 5, low: true },
  { id: 'north-belt-7', image: [632, 245], radius: [22, 19], height: 7 },
  { id: 'north-garden', image: [458, 235], radius: [20, 16], height: 5, low: true },
  { id: 'north-east-1', image: [672, 225], radius: [22, 24], height: 8, tone: 'dark' },
  { id: 'north-east-2', image: [712, 226], radius: [23, 19], height: 7 },
  { id: 'north-east-3', image: [748, 203], radius: [24, 24], height: 9 },
  { id: 'north-east-4', image: [769, 162], radius: [23, 29], height: 10 },
  { id: 'north-east-5', image: [800, 118], radius: [25, 31], height: 10 },
  { id: 'north-street', image: [626, 103], radius: [28, 32], height: 12, tone: 'dark' },
  { id: 'east-8-front-1', image: [615, 406], radius: [15, 16], height: 5 },
  { id: 'east-8-front-2', image: [653, 398], radius: [14, 15], height: 5 },
  { id: 'east-8-side', image: [679, 360], radius: [12, 22], height: 6, low: true },
  { id: 'east-6-front', image: [735, 379], radius: [15, 20], height: 5, low: true },
  { id: 'east-4-front', image: [782, 367], radius: [16, 19], height: 5, low: true },
  { id: 'east-2-side', image: [953, 322], radius: [24, 32], height: 9 },
  { id: 'south-11-front', image: [399, 524], radius: [13, 15], height: 4, low: true },
  { id: 'south-9-front', image: [520, 505], radius: [18, 18], height: 6 },
  { id: 'south-9-front-2', image: [553, 490], radius: [15, 12], height: 4, low: true },
  { id: 'south-7-front', image: [732, 482], radius: [16, 17], height: 6 },
  { id: 'south-7-west', image: [632, 567], radius: [23, 28], height: 8 },
  { id: 'south-19-rear', image: [146, 685], radius: [25, 25], height: 8 },
  { id: 'south-15-rear', image: [247, 686], radius: [24, 26], height: 8 },
  { id: 'south-13-rear', image: [350, 690], radius: [25, 24], height: 7 },
  { id: 'south-11-rear-1', image: [440, 675], radius: [27, 28], height: 8 },
  { id: 'south-11-rear-2', image: [490, 660], radius: [28, 26], height: 9 },
  { id: 'south-9-rear', image: [580, 677], radius: [28, 28], height: 9 },
  { id: 'south-7-rear-1', image: [644, 627], radius: [25, 28], height: 9 },
  { id: 'south-7-rear-2', image: [704, 642], radius: [27, 29], height: 9 },
  { id: 'south-5-rear-1', image: [783, 609], radius: [25, 23], height: 8 },
  { id: 'south-5-rear-2', image: [843, 627], radius: [27, 25], height: 9 },
  { id: 'south-5-rear-3', image: [936, 610], radius: [30, 33], height: 10 },
]

export const contextVegetation = aerialCrowns.map(crown => {
  const center = aerialTreePoint(crown.image)
  const east = aerialTreePoint([crown.image[0] + crown.radius[0], crown.image[1]])
  const south = aerialTreePoint([crown.image[0], crown.image[1] + crown.radius[1]])
  return { ...crown, center, eastRadius: Math.hypot(east[0] - center[0], east[1] - center[1]), southRadius: Math.hypot(south[0] - center[0], south[1] - center[1]), angle: -Math.atan2(east[1] - center[1], east[0] - center[0]) }
})