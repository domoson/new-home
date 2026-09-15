import { house } from "./model"
import { partner } from './context'
import { distance, metres } from './measure'
import { rectCorners, siteParking } from './parking'
import type { SiteRect } from './parking'
import { terraceArea, terraceMain, terraceOutline } from './terrace'
import { contextAnnexes, contextBuildings, footprintPlacement, placementPoint } from './neighborhoodLayout'
import { directAnnexPoint, directNeighborPoint, directNeighbors } from './directNeighbors'
import { neighbor8, neighbor8GaragePoint, neighbor8Point } from './neighbor8'

export type SiteItem = { id: string; name: string; points: [number, number][]; color: string; details: string; width?: number; depth?: number; dimensionPoints?: [number, number][] }
const rectangle = (id: string, name: string, bounds: SiteRect, color: string, point = (x: number, z: number): [number, number] => [x, z]): SiteItem => ({ id, name, points: rectCorners(bounds).map(([x, z]) => point(x, z)), color, width: bounds.width, depth: bounds.depth, details: `${metres(bounds.width)} × ${metres(bounds.depth)}` })
export const neighborItems: SiteItem[] = [
  ...directNeighbors.flatMap(spec => [
    rectangle(`neighbor-${spec.number}`, `Nr. ${spec.number}`, { x: 0, z: 0, width: spec.width, depth: spec.depth }, '#c6cbc5', (east, south) => directNeighborPoint(spec, east, south)),
    ...(spec.annex.depth ? [rectangle(`neighbor-annex-${spec.number}`, `Anbau Nr. ${spec.number}`, spec.annex, '#d4d8d1', (east, south) => directAnnexPoint(spec, east, south))] : []),
  ]),
  rectangle('neighbor-8', 'Nr. 8', neighbor8.house, '#c6cbc5', neighbor8Point),
  rectangle('neighbor-annex-8', 'Garage Nr. 8', neighbor8.garage, '#d4d8d1', neighbor8GaragePoint),
  ...contextBuildings.map(spec => rectangle(`neighbor-${spec.id}`, `Nr. ${spec.id}`, { x: 0, z: 0, width: 1, depth: 1 }, '#c6cbc5', (east, south) => placementPoint(footprintPlacement(spec.points, 1, 1), east, south))),
  ...contextAnnexes.map((points, index) => rectangle(`neighbor-annex-context-${index}`, 'Nebengebaeude', { x: 0, z: 0, width: 1, depth: 1 }, '#d4d8d1', (east, south) => placementPoint(footprintPlacement(points, 1, 1), east, south))),
].map(item => {
  const width = distance({ x: item.points[0][0], z: item.points[0][1] }, { x: item.points[1][0], z: item.points[1][1] })
  const depth = distance({ x: item.points[1][0], z: item.points[1][1] }, { x: item.points[2][0], z: item.points[2][1] })
  return { ...item, width, depth, details: `ca. ${metres(width)} x ${metres(depth)} · schematische Umgebung, nicht vermessen` }
})

export const siteItems: SiteItem[] = [
  rectangle('house-east', 'Haus Ost', { x: 0, z: 0, width: house.width, depth: house.depth }, '#e9e7df'),
  rectangle('house-west', 'Haus West', partner, '#e9e7df'),
  ...(['east', 'west'] as const).map(side => {
    const point = (east: number, south: number): [number, number] => side === 'east' ? [east, south] : [-east, south + partner.z]
    return { ...rectangle(`terrace-${side}`, `Terrasse ${side === 'east' ? 'Ost' : 'West'}`, terraceMain, '#d7c5a6', point), points: terraceOutline.map(([east, south]) => point(east, south)), dimensionPoints: rectCorners(terraceMain).map(([east, south]) => point(east, south)), details: `5,00 m × 3,00 m + Rücklauf 0,75 m × 1,50 m · ${terraceArea.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m²` }
  }),
  ...siteParking.flatMap(({ side, carport, open, bins, binAccess, point, passagePoints, approach }) => {
    const house = side === 'east' ? 'Ost' : 'West'
    return [
      { id: `approach-${side}`, name: `Hausweg ${house}`, points: approach, color: '#dfe1d8', details: `0,90 m Anschlussbreite · ${metres(distance({ x: approach[0][0], z: approach[0][1] }, { x: approach[3][0], z: approach[3][1] }))} Länge` },
      { id: `path-${side}`, name: `Seitenweg ${house}`, points: passagePoints.map(([x, z]) => point(x, z)), color: '#dfe1d8', details: `0,90 m breit · ${metres(passagePoints[3][1] - passagePoints[0][1])} äußere Kante` },
      rectangle(`access-${side}`, `Tonnenzugang ${house}`, binAccess, '#dfe1d8', point),
      rectangle(`bins-${side}`, `Tonnen ${house}`, bins, '#b5c4bd', point),
      rectangle(`open-${side}`, `Stellplatz ${house}`, open, '#cbd6b5', point),
      { ...rectangle(`carport-${side}`, `Carport ${house}`, carport, '#c4cdcb', point), details: '3,25 m × 6,00 m · Pultdach 5° · Holz / beschichtetes Profilblech' },
    ]
  }),
]