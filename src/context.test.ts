import { expect, it } from 'vitest'
import { house } from './model'
import { boundaryDistance, exteriorStyleId, exteriorStyles, finishes, initialAppearance, initialSettings, partner, polygonArea, siteArea, siteBoundary, siteDivision, siteLengths, siteParcels, sunPosition } from './context'

it('ordnet Aussenstile den Menuefarben zu und erkennt individuelle Anpassungen', () => {
  expect(exteriorStyleId(initialAppearance)).toBe('silver-terracotta')
  expect(new Set(exteriorStyles.map(style => style.id)).size).toBe(exteriorStyles.length)
  for (const style of exteriorStyles) {
    const appearance = { ...initialAppearance, ...style.appearance }
    expect(exteriorStyleId(appearance)).toBe(style.id)
    expect(exteriorStyleId({ ...appearance, frameInside: '#123456' })).toBe(style.id)
    expect(exteriorStyleId({ ...appearance, facade: '#123456' })).toBe('custom')
    expect(style.appearance).not.toHaveProperty('frameInside')
    for (const key of ['facade', 'roof', 'roofTrim', 'entryDoor', 'frame'] as const) {
      expect(finishes[key].some(finish => finish.color === appearance[key])).toBe(true)
    }
  }
  expect(exteriorStyles[0].appearance).toMatchObject({ facade: '#eee8d8', frame: '#bcbdb7', roof: '#424749', roofTrim: '#c4c7c4', composition: 'plaster' })
  expect(exteriorStyles.map(style => style.name)).toEqual(['Kiesel & Creme', 'Bronze & Schiefer', 'Silber & Terrakotta', 'Graphit & Terrakotta', 'Eiche & Terrakotta', 'Bisheriger Entwurf'])
  const expected = [
    { frame: '#8b7760', entryDoor: '#8b7760', roof: '#353b43', roofTrim: '#3b4243' },
    { frame: '#bcbdb7', entryDoor: '#bcbdb7', roof: '#b66b52', roofTrim: '#c4c7c4' },
    { frame: '#3b4243', entryDoor: '#3b4243', roof: '#b66b52', roofTrim: '#3b4243' },
    { frame: '#b79a70', entryDoor: '#dfd6c2', roof: '#b66b52', roofTrim: '#b79a70' },
  ]
  expected.forEach((appearance, index) => expect(exteriorStyles[index + 1].appearance).toMatchObject({ ...appearance, composition: 'plaster' }))
})

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
  expect(initialSettings.interiorDoor).toBe(finishes.interiorDoor[1].color)
  for (const appearance of [initialSettings, initialSettings.west]) {
    expect(appearance.frame).toBe(finishes.frame[7].color)
    expect(appearance.facade).toBe(finishes.facade[3].color)
    expect(appearance.composition).toBe('plaster')
    expect(appearance.woodTone).toBe(3)
  }
})

it('orientiert die Sonne korrekt mit MEZ und MESZ', () => {
  const morning = sunPosition(8, 'summer'), noon = sunPosition(13.25, 'summer'), evening = sunPosition(19, 'summer')
  expect(-Math.sin(morning.azimuth)).toBeGreaterThan(.7)
  expect(Math.cos(noon.azimuth)).toBeGreaterThan(.99)
  expect(-Math.sin(evening.azimuth)).toBeLessThan(-.7)
  expect(noon.altitude * 180 / Math.PI).toBeGreaterThan(60)
  expect(noon.altitude * 180 / Math.PI).toBeLessThan(65)
  expect(sunPosition(12.25, 'winter').altitude * 180 / Math.PI).toBeLessThan(18)
  expect(sunPosition(18, 'winter').altitude).toBeLessThan(0)
})