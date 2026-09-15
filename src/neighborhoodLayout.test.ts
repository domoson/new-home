import { describe, expect, it } from 'vitest'
import { boundaryDistance, siteBoundary } from './context'
import { contextBuildings, contextRoofRise, drivewayEnd, footprintPlacement, mapPoint, mapPolygon, mapSiteBoundary, neighborFootprints, neighborhoodParcels, neighborhoodRoads, placementPoint, streetBoundaryZ } from './neighborhoodLayout'
import { directNeighborPoint, directNeighbors } from './directNeighbors'
import { neighbor8Point } from './neighbor8'

describe('Umfeld als angenaeherte Lagebasis', () => {
  it('passt die vier Grundstuecksecken ein, ohne die Bestandsmasse zu aendern', () => {
    mapSiteBoundary.forEach((point, index) => {
      const result = mapPoint(point)
      expect(result[0]).toBeCloseTo(siteBoundary[index][0], 8)
      expect(result[1]).toBeCloseTo(siteBoundary[index][1], 8)
    })
  })

  it('legt die direkten Hauskoerper ausserhalb des eigenen Grundstuecks ab', () => {
    for (const points of Object.values(neighborFootprints)) {
      const placement = footprintPlacement(points, 9, 9)
      for (const [east, south] of [[0, 0], [9, 0], [9, 9], [0, 9]]) {
        const point = placementPoint(placement, east, south)
        expect([0, 1, 2, 3].some(side => boundaryDistance(point, side) < 0)).toBe(true)
      }
      expect(placementPoint(placement, 0, 0)).toEqual(mapPoint(points[0]))
      expect(placement.east[0] * placement.south[1] - placement.east[1] * placement.south[0]).toBeGreaterThan(0)
    }
  })

  it('bewahrt die eigene Suedgrenze als noerdliche Strassenkante', () => {
    for (const point of [siteBoundary[2], siteBoundary[3]]) expect(streetBoundaryZ(point[0], false)).toBeCloseTo(point[1], 8)
    expect(neighborhoodRoads[0].north.length).toBeGreaterThan(4)
    expect(neighborhoodParcels.find(parcel => parcel.id === '8')!.points[0]).toEqual(mapPoint(mapSiteBoundary[1]))
  })

  it('schliesst direkte Zufahrten an den richtigen Strassenrand an', () => {
    for (const spec of directNeighbors) for (const east of [0, spec.width, spec.annex.x]) {
      const point = (east: number, south: number) => directNeighborPoint(spec, east, south)
      const end = point(east, drivewayEnd(point, east, spec.northAccess))
      expect(end[1]).toBeCloseTo(streetBoundaryZ(end[0], spec.northAccess), 6)
    }
    const end = neighbor8Point(0, drivewayEnd(neighbor8Point, 0, false))
    expect(end[1]).toBeCloseTo(streetBoundaryZ(end[0], false), 6)
  })

  it('stellt die gegenueberliegenden Doppelhaeuser ohne kuenstliche Luecken dar', () => {
    for (const [westId, eastId] of [['19', '17'], ['15', '13'], ['11b', '11a'], ['9b', '9a'], ['5a', '5']]) {
      const west = mapPolygon(contextBuildings.find(building => building.id === westId)!.points)
      const east = mapPolygon(contextBuildings.find(building => building.id === eastId)!.points)
      expect(west[1]).toEqual(east[0])
      expect(west[2]).toEqual(east[3])
    }
    expect(contextBuildings.some(building => building.id === '10')).toBe(false)
    for (const building of contextBuildings.filter(building => Number.parseInt(building.id) % 2 === 1)) {
      for (const point of mapPolygon(building.points)) expect(boundaryDistance(point, 2)).toBeLessThan(-7)
    }
  })

  it('differenziert die gegenueberliegenden Dachhoehen und Farben nach dem Schraegluftbild', () => {
    const red = contextBuildings.find(building => building.id === '9a')!
    const grey = contextBuildings.find(building => building.id === '11a')!
    const taller = contextBuildings.find(building => building.id === '7')!
    expect(red.roof).not.toBe(grey.roof)
    expect(contextRoofRise(10, red.pitch)).toBeLessThan(contextRoofRise(10, grey.pitch))
    expect(taller.height).toBeGreaterThan(red.height)
    expect(taller.dormers).toBe(3)
    for (const [westId, eastId] of [['19', '17'], ['15', '13'], ['11b', '11a'], ['9b', '9a']]) {
      const west = contextBuildings.find(building => building.id === westId)!, east = contextBuildings.find(building => building.id === eastId)!
      expect([west.height, west.pitch, west.roof, west.facade]).toEqual([east.height, east.pitch, east.roof, east.facade])
    }
  })
})