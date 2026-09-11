import { Matrix3, Matrix4, Vector3 } from 'three'
import { siteBoundary } from './context'

export type MapPoint = [number, number]
export const mapSiteBoundary: MapPoint[] = [[228, 286], [332, 258], [365, 385], [224, 416]]

function squareToQuad(points: MapPoint[]) {
  const [northwest, northeast, southeast, southwest] = points
  const deltaX = northwest[0] - northeast[0] + southeast[0] - southwest[0]
  const deltaZ = northwest[1] - northeast[1] + southeast[1] - southwest[1]
  const eastX = northeast[0] - southeast[0], westX = southwest[0] - southeast[0]
  const eastZ = northeast[1] - southeast[1], westZ = southwest[1] - southeast[1]
  const determinant = eastX * westZ - westX * eastZ
  const perspectiveX = (deltaX * westZ - westX * deltaZ) / determinant
  const perspectiveZ = (eastX * deltaZ - deltaX * eastZ) / determinant
  return new Matrix3().set(
    northeast[0] - northwest[0] + perspectiveX * northeast[0], southwest[0] - northwest[0] + perspectiveZ * southwest[0], northwest[0],
    northeast[1] - northwest[1] + perspectiveX * northeast[1], southwest[1] - northwest[1] + perspectiveZ * southwest[1], northwest[1],
    perspectiveX, perspectiveZ, 1,
  )
}

const registration = squareToQuad(siteBoundary).multiply(squareToQuad(mapSiteBoundary).invert())
export function mapPoint(point: MapPoint): MapPoint {
  const projected = new Vector3(point[0], point[1], 1).applyMatrix3(registration)
  return [projected.x / projected.z, projected.y / projected.z]
}

export const mapPolygon = (points: MapPoint[]) => points.map(mapPoint)

export const neighborFootprints = {
  12: [[120, 310], [185, 316], [180, 363], [116, 357]],
  50: [[258, 166], [322, 151], [334, 203], [271, 217]],
  52: [[393, 126], [450, 100], [471, 149], [415, 174]],
  8: [[363, 284], [417, 267], [431, 310], [377, 327]],
} satisfies Record<number, MapPoint[]>

export function footprintPlacement(points: MapPoint[], width: number, depth: number) {
  const [origin, east, , south] = mapPolygon(points)
  return {
    origin,
    east: [(east[0] - origin[0]) / width, (east[1] - origin[1]) / width] as MapPoint,
    south: [(south[0] - origin[0]) / depth, (south[1] - origin[1]) / depth] as MapPoint,
  }
}

export function placementPoint(placement: ReturnType<typeof footprintPlacement>, east: number, south: number): MapPoint {
  return [placement.origin[0] + placement.east[0] * east + placement.south[0] * south, placement.origin[1] + placement.east[1] * east + placement.south[1] * south]
}

export function placementMatrix(placement: ReturnType<typeof footprintPlacement>) {
  return new Matrix4().set(placement.east[0], 0, placement.south[0], placement.origin[0], 0, 1, 0, 0, placement.east[1], 0, placement.south[1], placement.origin[1], 0, 0, 0, 1)
}

export const neighborhoodRoads = [
  {
    id: 'hallerstrasse',
    north: mapPolygon([[0, 92], [98, 98], [230, 101], [302, 92], [362, 72], [430, 39], [479, 3], [547, -42], [616, -88]]),
    south: mapPolygon([[0, 132], [98, 139], [230, 140], [302, 134], [362, 111], [430, 77], [479, 47], [547, 0], [616, -46]]),
  },
  {
    id: 'an-der-roeth',
    north: mapPolygon([[0, 451], [67, 445], [224, 416], [365, 385], [519, 340], [616, 309]]),
    south: mapPolygon([[0, 488], [67, 486], [224, 458], [365, 423], [519, 381], [616, 358]]),
  },
]

export function streetBoundaryZ(east: number, northAccess: boolean) {
  const points = northAccess ? neighborhoodRoads[0].south : neighborhoodRoads[1].north
  return polylineZ(points, east)
}

export function polylineZ(points: MapPoint[], east: number) {
  const endIndex = points.findIndex((point, index) => index > 0 && point[0] >= east)
  const index = endIndex < 0 ? points.length - 2 : Math.max(0, endIndex - 1)
  const [start, end] = [points[index], points[index + 1]]
  return start[1] + (end[1] - start[1]) * (east - start[0]) / (end[0] - start[0])
}

export function drivewayEnd(point: (east: number, south: number) => MapPoint, east: number, northAccess: boolean) {
  let south = northAccess ? -5 : 20
  for (let iteration = 0; iteration < 8; iteration++) {
    const current = point(east, south), next = point(east, south + .01)
    const residual = current[1] - streetBoundaryZ(current[0], northAccess)
    const derivative = (next[1] - streetBoundaryZ(next[0], northAccess) - residual) / .01
    south -= residual / derivative
  }
  return south
}

export const neighborhoodParcels = [
  { id: '12', points: [[91,277],[228,286],[224,416],[67,445]] },
  { id: '48', points: [[98,139],[230,140],[228,286],[91,277]] },
  { id: '50', points: [[230,140],[362,111],[391,243],[228,286]] },
  { id: '52', points: [[362,111],[479,47],[545,168],[391,243]] },
  { id: '8', points: [[332,258],[425,226],[468,354],[365,385]] },
  { id: '6', points: [[425,226],[472,205],[518,342],[468,354]] },
  { id: '4', points: [[472,205],[521,182],[553,331],[518,342]] },
  { id: '2', points: [[521,182],[598,144],[650,298],[553,331]] },
  { id: '19', points: [[17,487],[65,486],[58,582],[12,582]] },
  { id: '17', points: [[65,486],[117,478],[106,582],[58,582]] },
  { id: '15', points: [[117,478],[170,469],[161,582],[106,582]] },
  { id: '13', points: [[170,469],[224,458],[219,582],[161,582]] },
  { id: '11b', points: [[224,458],[270,447],[269,582],[219,582]] },
  { id: '11a', points: [[270,447],[315,435],[315,582],[269,582]] },
  { id: '9b', points: [[315,435],[362,424],[356,575],[315,582]] },
  { id: '9a', points: [[362,424],[409,411],[407,566],[356,575]] },
  { id: '7', points: [[409,411],[519,381],[536,539],[407,566]] },
  { id: '5a', points: [[519,381],[575,365],[603,526],[536,539]] },
  { id: '5', points: [[575,365],[636,349],[660,516],[603,526]] },
].map(parcel => ({ ...parcel, points: mapPolygon(parcel.points as MapPoint[]) }))

export const contextBuildings = [
  { id: '48', points: [[138,165],[199,166],[199,219],[137,211]], height: 5.3, warm: true },
  { id: '6', points: [[455,252],[485,241],[502,297],[473,308]], height: 5.3, warm: false },
  { id: '4', points: [[485,241],[514,231],[533,288],[502,297]], height: 5.3, warm: false },
  { id: '2', points: [[552,225],[611,203],[628,246],[572,266]], height: 5.3, warm: false },
  { id: '19', points: [[31,515],[65,518],[63,565],[28,561]], height: 5.6, warm: true, pitch: 38, facade: '#edece5', roof: '#a66d5d', dormers: 0, skylights: 1 },
  { id: '17', points: [[65,518],[102,519],[99,567],[63,565]], height: 5.6, warm: true, pitch: 38, facade: '#edece5', roof: '#a66d5d', dormers: 0, skylights: 1 },
  { id: '15', points: [[134,502],[167,505],[164,550],[131,547]], height: 5.4, warm: false, pitch: 42, facade: '#eeeee8', roof: '#727b83', dormers: 1, skylights: 1 },
  { id: '13', points: [[167,505],[201,506],[198,551],[164,550]], height: 5.4, warm: false, pitch: 42, facade: '#eeeee8', roof: '#727b83', dormers: 1, skylights: 1 },
  { id: '11b', points: [[242,479],[273,480],[272,540],[241,539]], height: 5.6, warm: false, pitch: 40, facade: '#e8e9e3', roof: '#78818a', dormers: 0, skylights: 1 },
  { id: '11a', points: [[273,480],[303,481],[302,541],[272,540]], height: 5.6, warm: false, pitch: 40, facade: '#e8e9e3', roof: '#78818a', dormers: 0, skylights: 1 },
  { id: '9b', points: [[330,456],[360,457],[358,510],[328,509]], height: 5.1, warm: true, pitch: 30, facade: '#eeeee6', roof: '#a96754', dormers: 0, skylights: 0 },
  { id: '9a', points: [[360,457],[391,458],[389,511],[358,510]], height: 5.1, warm: true, pitch: 30, facade: '#eeeee6', roof: '#a96754', dormers: 0, skylights: 0 },
  { id: '7', points: [[444,427],[499,421],[505,472],[450,478]], height: 5.9, warm: false, pitch: 42, facade: '#f0f0e9', roof: '#79838c', dormers: 3, skylights: 2 },
  { id: '5a', points: [[544,400],[578,394],[588,451],[551,457]], height: 5.4, warm: false },
  { id: '5', points: [[578,394],[615,388],[625,445],[588,451]], height: 5.4, warm: false },
].map(building => ({ pitch: 35, facade: '#dddeda', roof: building.warm ? '#a78678' : '#838984', dormers: 0, skylights: 0, ...building, points: building.points as MapPoint[] }))

export const contextRoofRise = (depth: number, pitch: number) => depth / 2 * Math.tan(pitch * Math.PI / 180)

export const contextAnnexes = [
  [[210,197],[230,197],[228,242],[210,241]],
  [[113,519],[137,521],[134,568],[110,567]],
  [[201,516],[222,518],[219,554],[199,552]],
  [[222,508],[240,508],[240,546],[221,547]],
  [[303,467],[329,469],[328,516],[301,515]],
  [[396,452],[413,454],[411,489],[394,488]],
  [[511,467],[529,465],[533,501],[516,503]],
  [[523,395],[543,392],[549,441],[527,445]],
] as MapPoint[][]