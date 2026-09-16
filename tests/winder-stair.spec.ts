import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Nordversetzte U-Wendeltreppe und Zimmerzugaenge sind beidseitig begehbar', async ({ page }) => {
  await page.goto('/')
  const results = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { stairWalkingLine } = await import('/src/winderStair.ts')
    const { elevations, floorIds, storeyRise, makeFloor, stair } = await import('/src/model.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    await initializePhysics()
    const model = buildScene('EG', true, true, true)
    model.group.updateMatrixWorld(true)
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(3.7, 0, 1.6))
    const results = []
    for (const sign of [1, -1]) for (const id of floorIds.filter(id => id !== 'DG')) for (const descending of [false, true]) {
      const base = elevations[id], rise = storeyRise(id)
      const offset = sign === 1 ? 0 : 1.2
      const route = stairWalkingLine(rise).map(([east, height, south]) => [sign * east, base + height, south + offset])
      if (descending) route.reverse()
      walker.teleport(new THREE.Vector3(...route[0]))
      let blocked = null
      for (const [east, , south] of route.slice(1)) {
        let frames = 0
        while (Math.hypot(walker.position().x - east, walker.position().z - south) > .045 && frames++ < 240) {
          const position = walker.position()
          camera.lookAt(east, camera.position.y, south)
          walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
          if (!Number.isFinite(position.y)) throw new Error('Invalid stair position')
        }
        if (frames >= 240) { blocked = { east, south, position: walker.position() }; break }
      }
      for (let frame = 0; frame < 20; frame++) walker.tick()
      results.push({ sign, base, descending, blocked, height: walker.position().y - .9, expected: descending ? base : base + rise })
    }
    let approachBlocked = false
    const hallEast = stair.x + stair.width + .6, upper = stair.end - stair.runWidth / 2, lower = stair.z + stair.runWidth / 2
    const accessRoutes = [
      [elevations.EG, [[3.3, 1.2], [3.3, lower], [hallEast, lower]]],
      [elevations.EG, [[3.3, 1.1], [2.1, 1.1], [1.35, 1.3], [.85, 1.45], [.85, 2.5]]],
      [elevations.EG, [[3.3, lower], [3.3, 2.45], [2.2, 2.45]]],
      [elevations.EG, [[3.3, 1.25], [5.7, 1.25], [7.9, 1.25]]],
      [elevations.EG, [[5.7, 1.25], [5.9, 1.45], [5.15, 1.45], [4.3, 1.2], [3.3, 1.2], [3.3, 3.7], [4.3, 3.7], [4.9, 3.7], [5.5, 3.7], [5.5, 4.1], [5.65, 4.75], [5.2, 4.9], [4.5, 4.9], [3.3, 4.9], [3.3, 6.85]]],
      [elevations.EG, [[3.3, 3.4], [3.3, 6.85], [5.5, 6.85], [3.8, 6.85], [3.99, 7.6], [3.35, 7.6], [3.35, 8.5]]],
      [elevations.EG, [[3.3, lower], [3.3, 6.85], [3.35, 7.6], [3.35, 9.1], [4.55, 9.1], [4.55, 9.8], [4.82, 10.5]]],
      [elevations.OG, [[hallEast, upper], [hallEast, 3.6], [4.15, 3.6], [4.15, 1.85], [2.85, 1.85]]],
      [elevations.OG, [[hallEast, upper], [hallEast, 4.75], [4.4, 4.75], [5.1, 4.75], [5.1, 2.5]]],
      [elevations.OG, [[hallEast, upper], [hallEast, 7.45], [4.4, 7.45], [4.4, 8]]],
      [elevations.OG, [[hallEast, upper], [hallEast, 6.61], [1.15, 6.61], [1.15, 7.1]]],
      [elevations.KG, [[hallEast, upper], [hallEast, 1.1]]],
      [elevations.KG, [[hallEast, upper], [hallEast, 4.35], [5, 4.35]]],
      [elevations.KG, [[hallEast, upper], [hallEast, 6.6], [3.85, 7.7]]],
      [elevations.DG, [[hallEast, upper], [hallEast, 3.6], [4.4, 3.6], [4.4, 3.5]]],
      [elevations.DG, [[hallEast, upper], [hallEast, 6.6], [3.4, 6.6], [3.4, 7.3], [1.55, 7.3], [1.55, 7.65]]],
    ] as const
    const blockedRoutes = []
    for (const sign of [1, -1]) for (const [base, points] of accessRoutes) {
      const offset = sign === 1 ? 0 : 1.2
      walker.teleport(new THREE.Vector3(sign * points[0][0], base, points[0][1] + offset))
      for (const [localEast, localSouth] of points.slice(1)) {
      const westTerraceApproach = base === elevations.EG && sign === -1 && localSouth >= 9.1 && (localEast === 4.82 || localEast === 4.55)
      const east = sign * (westTerraceApproach ? 4 : localEast), south = localSouth + offset
      let frames = 0
      while (Math.hypot(walker.position().x - east, walker.position().z - south) > .045 && frames++ < 240) {
        camera.lookAt(east, camera.position.y, south); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
      }
      if (frames >= 240) { approachBlocked = true; blockedRoutes.push({ sign, base, east, south, position: walker.position() }); break }
      if (Math.abs(walker.position().y - .9 - base) > .12) { approachBlocked = true; blockedRoutes.push({ sign, base, east, south, position: walker.position() }); break }
      }
    }
    const stairDoors = floorIds.flatMap(id => makeFloor(id).walls.flatMap(wall => wall.openings)).filter(opening => opening.id.startsWith('stair-') && opening.kind === 'door')
    const guards: string[] = []
    model.group.traverse(object => { if (object.name.endsWith('stair-eye-guard')) guards.push(object.name) })
    walker.dispose(); model.dispose()
    return { results, approachBlocked, blockedRoutes, stairDoors, guards }
  })
  expect(results.approachBlocked, JSON.stringify(results)).toBe(false)
  expect(results.stairDoors).toEqual([])
  expect(results.guards).toHaveLength(6)
  for (const result of results.results) {
    expect(result.blocked, JSON.stringify(result)).toBeNull()
    expect(result.height, JSON.stringify(result)).toBeCloseTo(result.expected, 1)
  }
})

test('Alle Grundrisse zeigen Wendelstufen und den nördlichen Antritt', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect(page.locator('[data-stair="half-turn-winder"] polygon')).toHaveCount(15)
    await expect(page.locator('[data-step^="winder"]')).toHaveCount(8)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const scale = await page.locator('.floor-plan').evaluate(svg => {
      const matrix = (svg as SVGSVGElement).getScreenCTM()!
      return [Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d)]
    })
    expect(scale[0]).toBeCloseTo(scale[1])
    await page.screenshot({ path: `test-results/${testInfo.project.name}-winder-plan-${floor}.png` })
  }
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').waitFor({ timeout: 45000 })
  const canvas = page.locator('canvas')
  const before = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-winder-model.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 32) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5)
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .6, { steps: 10 }); await page.mouse.up()
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-winder-model-rotated.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 10) changed++
  expect(changed).toBeGreaterThan(100)
  expect(errors).toEqual([])
})

test('U-Kueche zeigt erreichbare Fronten in beiden Haushälften', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await expect(page.locator('[data-kitchen-module]')).toHaveCount(8)
  await expect(page.locator('[data-kitchen-module][data-front="north"]')).toHaveCount(2)
  await expect(page.locator('[data-kitchen-module="dishwasher"]')).toHaveCount(1)
  await expect(page.locator('[data-furniture="pantry-cabinet"]')).toHaveCount(0)
  await expect(page.locator('[data-furniture="kitchen-upper"]')).toHaveCount(1)
  await expect(page.locator('[data-tall-front="south"]')).toHaveCount(2)
  await expect(page.locator('[data-bench-back="north"]')).toHaveCount(1)
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor } = await import('/src/model.ts')
    const { moduleFront } = await import('/src/kitchenStorage.ts')
    const model = buildScene('EG', true, true, true)
    model.group.updateMatrixWorld(true)
    const counts = { modules: 0, dishwasher: 0, wardrobe: 0, ovens: 0 }
    const ovenBounds: number[][] = [], wardrobeBounds: number[][] = [], moduleBounds: number[][] = [], benchBounds: number[][] = [], tallBounds: number[][] = []
    model.group.traverse(object => {
      if (object.name.startsWith('kitchen-front-') || object.name === 'dining-bench-back') {
        const bounds = new THREE.Box3().setFromObject(object)
        const values = [bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z, bounds.min.z - (bounds.max.x < 0 ? 1.2 : 0)]
        if (object.name === 'dining-bench-back') benchBounds.push(values)
        else tallBounds.push(values)
      }
      if (object.userData.kitchenModule) {
        counts.modules++
        const module = object.userData.kitchenModule
        if (module.use === 'dishwasher') counts.dishwasher++
        const bounds = new THREE.Box3().setFromObject(object), westHouse = bounds.max.x < 0
        const minX = westHouse ? -bounds.max.x : bounds.min.x, maxX = westHouse ? -bounds.min.x : bounds.max.x
        const expected = moduleFront(module)
        moduleBounds.push([maxX - minX - expected.width, bounds.max.z - bounds.min.z - expected.depth, minX - expected.x, bounds.min.z - (westHouse ? 1.2 : 0) - expected.z])
      }
      if (object.name === 'kitchen-oven') {
        counts.ovens++
        const bounds = new THREE.Box3().setFromObject(object)
        ovenBounds.push([Math.min(Math.abs(bounds.min.x), Math.abs(bounds.max.x)), Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)), bounds.min.z - (bounds.max.x < 0 ? 1.2 : 0), bounds.max.z - (bounds.max.x < 0 ? 1.2 : 0)])
      }
      if (object.name === 'entry-wardrobe-front') {
        counts.wardrobe++
        const bounds = new THREE.Box3().setFromObject(object)
        wardrobeBounds.push([bounds.min.z - (bounds.max.x < 0 ? 1.2 : 0), bounds.max.z - (bounds.max.x < 0 ? 1.2 : 0)])
      }
    })
    const cabinet = makeFloor('EG').furniture.find(item => item.id === 'kitchen-tall')!
    model.dispose()
    return { counts, ovenBounds, wardrobeBounds, cabinet, moduleBounds, benchBounds, tallBounds }
  })
  expect(result.counts).toEqual({ modules: 16, dishwasher: 2, wardrobe: 4, ovens: 2 })
  for (const [west, east, north, south] of result.ovenBounds) {
    expect(west).toBeGreaterThan(result.cabinet.x)
    expect(east).toBeLessThan(result.cabinet.x + result.cabinet.width)
    expect(north).toBeCloseTo(result.cabinet.z + result.cabinet.depth - .022)
    expect(south - north).toBeCloseTo(.02)
  }
  expect(result.tallBounds).toHaveLength(4)
  for (const [width, depth, north] of result.tallBounds) {
    expect(width).toBeCloseTo(.592)
    expect(depth).toBeCloseTo(.02)
    expect(north).toBeCloseTo(3.174)
  }
  expect(result.benchBounds).toHaveLength(2)
  for (const [width, depth, north] of result.benchBounds) {
    expect(width).toBeCloseTo(2)
    expect(depth).toBeCloseTo(.07)
    expect(north).toBeCloseTo(7.3)
  }
  for (const errors of result.moduleBounds) for (const error of errors) expect(error).toBeCloseTo(0)
  for (const [north, south] of result.wardrobeBounds) {
    expect(north).toBeCloseTo(1.81)
    expect(south).toBeLessThan(1.85)
  }
})