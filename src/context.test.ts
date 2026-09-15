import { expect, it } from 'vitest'
import { house } from './model'
import { boundaryDistance, finishes, initialSettings, partner, polygonArea, siteArea, siteBoundary, siteDivision, siteLengths, siteParcels, sunPosition } from './context'

it('rekonstruiert die vier Grenzlaengen und eine flaechengleiche Nord-Sued-Teilung', () => {
  for (const [index, point] of siteBoundary.entries()) {
    const next = siteBoundary[(index + 1) % 4]
    expect(Math.hypot(next[0] - point[0], next[1] - point[1])).toBeCloseTo(siteLengths[index], 8)
  }
  expect(siteArea).toBeCloseTo(607.2641, 4)
  expect(polygonArea(siteParcels.west)).toBeCloseTo(siteArea / 2, 8)
  expect(polygonArea(siteParcels.east)).toBeCloseTo(siteArea / 2, 8)
  expect(siteDivision.every(point => point[0] === 0)).toBe(true)
  expect(boundaryDistance(siteDivision[0], 0)).toBeCloseTo(0)
  expect(boundaryDistance(siteDivision[1], 2)).toBeCloseTo(0)
})

it('haelt beide Hauskoerper mindestens drei Meter von Nord-, Ost- und Westgrenze entfernt', () => {
  for (const building of [{x: 0, z: 0, width: house.width, depth: house.depth}, partner]) {
    for (const east of [building.x, building.x + building.width]) for (const south of [building.z, building.z + building.depth]) {
      for (const side of [0, 1, 3]) expect(boundaryDistance([east, south], side)).toBeGreaterThanOrEqual(3 - .000001)
    }
  }
  expect(partner.width).toBe(house.width)
  expect(boundaryDistance([partner.x, partner.z], 3)).toBeGreaterThan(3)
})

it('verwendet die gewuenschten Farbdefaults fuer beide Haushaelften', () => {
  for (const appearance of [initialSettings, initialSettings.west]) {
    expect(appearance.frame).toBe(finishes.frame[2].color)
    expect(appearance.facade).toBe(finishes.facade[3].color)
    expect(appearance.composition).toBe('plaster')
    expect(appearance.woodTone).toBe(3)
  }
})

it('orientiert die Sonne in Buckenhof korrekt mit MEZ und MESZ', () => {
  const morning = sunPosition(8, 'summer'), noon = sunPosition(13.25, 'summer'), evening = sunPosition(19, 'summer')
  expect(-Math.sin(morning.azimuth)).toBeGreaterThan(.7)
  expect(Math.cos(noon.azimuth)).toBeGreaterThan(.99)
  expect(-Math.sin(evening.azimuth)).toBeLessThan(-.7)
  expect(noon.altitude * 180 / Math.PI).toBeGreaterThan(60)
  expect(noon.altitude * 180 / Math.PI).toBeLessThan(65)
  expect(sunPosition(12.25, 'winter').altitude * 180 / Math.PI).toBeLessThan(18)
  expect(sunPosition(18, 'winter').altitude).toBeLessThan(0)
})