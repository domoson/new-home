import * as SunCalc from 'suncalc'
import { house } from './model'

export const siteBoundary: [number, number][] = [[-10.056098883413, -1.667802356868], [10.250012281990, -4.480603334238], [13.648101413502, 20.791970540504], [-14.323750719705, 23.472546642384]]
export const siteLengths = [20.5, 25.5, 28.1, 25.5] as const
export const polygonArea = (points: [number, number][]) => Math.abs(points.reduce((sum, [east, south], index) => { const next = points[(index + 1) % points.length]; return sum + east * next[1] - south * next[0] }, 0)) / 2
export const siteArea = polygonArea(siteBoundary)
export function boundaryZ(east: number, side: 0 | 2) {
  const start = siteBoundary[side], end = siteBoundary[side + 1]
  return start[1] + (end[1] - start[1]) * (east - start[0]) / (end[0] - start[0])
}
export function boundaryX(south: number, side: 1 | 3) {
  const start = siteBoundary[side], end = siteBoundary[(side + 1) % 4]
  return start[0] + (end[0] - start[0]) * (south - start[1]) / (end[1] - start[1])
}
export const siteDivision: [number, number][] = [[0, boundaryZ(0, 0)], [0, boundaryZ(0, 2)]]
export const siteParcels = { west: [siteBoundary[0], siteDivision[0], siteDivision[1], siteBoundary[3]], east: [siteDivision[0], siteBoundary[1], siteBoundary[2], siteDivision[1]] }
export function boundaryDistance(point: [number, number], side: number) {
  const start = siteBoundary[side], end = siteBoundary[(side + 1) % 4], east = end[0] - start[0], south = end[1] - start[1]
  return (east * (point[1] - start[1]) - south * (point[0] - start[0])) / Math.hypot(east, south)
}
export const partner = { x: -house.width, z: .9, width: house.width, depth: house.depth }
export const finishes = {
  facade: [{ name: 'Kreideweiß', color: '#fafafa' }, { name: 'Lichtgrau', color: '#d3d7d6' }, { name: 'Salbeigrau', color: '#bfc9bd' }, { name: 'Muschelweiß', color: '#eeeae0' }, { name: 'Nebelblau', color: '#bdcdd3' }, { name: 'Mineralgrün', color: '#9eaea4' }, { name: 'Steingrau', color: '#b4b4b0' }, { name: 'Kohle', color: '#666b68' }],
  roof: [{ name: 'Graphit', color: '#424749' }, { name: 'Ziegelrot', color: '#99584c' }, { name: 'Zinkgrau', color: '#89928f' }, { name: 'Schwarz', color: '#252927' }, { name: 'Naturrot', color: '#b66b52' }, { name: 'Warmes Schiefergrau', color: '#747a78' }, { name: 'Basaltgrau', color: '#686f6e' }, { name: 'Kaffeebraun', color: '#5b493f' }, { name: 'Umbra', color: '#665247' }, { name: 'Mangan', color: '#4c4641' }],
  frame: [{ name: 'Weiß', color: '#f7f7f4' }, { name: 'Anthrazit', color: '#3b4243' }, { name: 'Eiche', color: '#b79a70' }, { name: 'Aluminium', color: '#a8b1b0' }, { name: 'Moosgrün', color: '#536b5d' }, { name: 'Bronze', color: '#8b7760' }],
} as const
export type FinishKey = keyof typeof finishes
export const facadeCompositions = [{ id: 'plaster', name: 'Putz durchgehend' }, { id: 'timber', name: 'Holzfassade ab EG' }, { id: 'upper', name: 'Putz + Holz OG und DG' }, { id: 'gable', name: 'Putz + Holzgiebelfeld' }, { id: 'entry', name: 'Putz + Holz am Eingang' }, { id: 'og', name: 'Nur OG in Holz' }, { id: 'og-entry', name: 'OG + Eingang in Holz' }, { id: 'panels', name: 'Vertikale Holzfelder' }] as const
export type FacadeComposition = typeof facadeCompositions[number]['id']
export const woodTones = [{ name: 'Lärche natur', color: '#b99e74' }, { name: 'Silbergrau', color: '#92968f' }, { name: 'Dunkel lasiert', color: '#514f48' }, { name: 'Eiche hell', color: '#d2bb91' }, { name: 'Thermoesche', color: '#88644c' }, { name: 'Zeder', color: '#b97b5b' }, { name: 'Gekälkt', color: '#ddd7c8' }, { name: 'Verkohlt', color: '#303330' }] as const
export const woodProfiles = [{ id: 'boards', name: 'Vertikale Bretter' }, { id: 'slats', name: 'Schmale Lamellen' }, { id: 'open-slats', name: 'Lamellenfelder auf Putz' }] as const
export type WoodProfile = typeof woodProfiles[number]['id']
export type HouseAppearance = { facade: string; roof: string; frame: string; composition: FacadeComposition; woodTone: number; woodProfile: WoodProfile }
export type SceneSettings = HouseAppearance & { hour: number; season: 'summer' | 'spring' | 'winter'; west: HouseAppearance; surroundings: boolean; landscaping: boolean; transparentGround: boolean; lights: Record<string, boolean>; lightingMode: 'room' | 'global'; carportRoof: 'metal' | 'green' }
export const initialAppearance: HouseAppearance = { facade: finishes.facade[3].color, roof: finishes.roof[0].color, frame: finishes.frame[2].color, composition: 'plaster', woodTone: 3, woodProfile: 'boards' }
export const initialSettings: SceneSettings = { ...initialAppearance, west: { ...initialAppearance, composition: 'plaster' }, hour: 14, season: 'summer', surroundings: true, landscaping: true, transparentGround: false, lights: {}, lightingMode: 'global', carportRoof: 'metal' }
export function sunPosition(hour: number, season: SceneSettings['season']) {
  const [month, day, offset] = { summer: [5, 21, 2], spring: [2, 20, 1], winter: [11, 21, 1] }[season]
  const date = new Date(Date.UTC(2026, month, day, 0, Math.round((hour - offset) * 60)))
  const position = SunCalc.getPosition(date, 49.593, 11.052)
  return { altitude: position.altitude * Math.PI / 180, azimuth: (position.azimuth - 180) * Math.PI / 180 }
}