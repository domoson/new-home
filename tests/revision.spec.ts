import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { PNG } from 'pngjs'
import { floorIds, floorSlabs } from '../src/model'
import { walkStair } from './walkStair'

async function chooseEast(page: Page) {
  await page.goto('/')
  await expect(page.locator('#variant')).toHaveCount(0)
}

test('Hauptentwurf: alle Plaene, weisse Decken, Fenster, Farben und Sonnenstand', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'warn' && message.text().startsWith('THREE.')) errors.push(message.text()) })
  await chooseEast(page)
  for (const floor of ['EG', 'OG', 'DG', 'KG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await page.screenshot({ path: `test-results/${testInfo.project.name}-C-${floor}-plan.png` })
    await page.getByRole('button', { name: '3D', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.__house?.meshes ?? 0)).toBeGreaterThan(60)
    await expect(page.locator('.loading')).toHaveCount(0)
    const image = PNG.sync.read(await page.locator('canvas').screenshot())
    const colors = new Set<string>()
    for (let offset = 0; offset < image.data.length; offset += 16) colors.add(`${image.data[offset] >> 4},${image.data[offset + 1] >> 4},${image.data[offset + 2] >> 4}`)
    expect(colors.size).toBeGreaterThan(25)
    await page.screenshot({ path: `test-results/${testInfo.project.name}-C-${floor}-3d.png` })
    await page.getByRole('button', { name: '2D', exact: true }).click()
  }
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.snapshot().site)).toBe(true)
  const snapshot = await page.evaluate(() => window.__house!.snapshot())
  const closedSkylight = snapshot.openings.find(opening => opening.id === 'DG-office-west-skylight')!
  expect(closedSkylight.tip[2]).toBeCloseTo(1.9)
  expect(closedSkylight.tip[1]).toBeCloseTo(5.9 + .5 + (1.9 - .365) * Math.tan(35 * Math.PI / 180))
  const slabBounds = floorIds.flatMap(id => floorSlabs(id))
  for (const [index, slab] of snapshot.slabs.entries()) {
    expect(slab.colors[3]).toBe('ffffff')
    expect(slab.maps).toEqual([false, false, !slab.name.startsWith('KG'), false, false, false])
    expect(slab.colors[0]).toBe(slabBounds[index].width < 1 ? 'ffffff' : 'eeeae0')
  }
  expect(snapshot.openings.some(opening => opening.id === 'EG-living')).toBe(false)
  const camera = await page.evaluate(() => ({ ...window.__house!.position() }))
  await page.locator('.scene-settings summary').click()
  await page.getByLabel('Tür / Fenster', { exact: true }).selectOption('EG-kitchen-window')
  await page.getByRole('button', { name: 'Ausgewählte Öffnung öffnen' }).click()
  await expect.poll(() => page.evaluate(() => window.__house!.snapshot().openings.find(opening => opening.id === 'EG-kitchen-window')!.open)).toBe(true)
  await page.getByRole('button', { name: 'Ausgewählte Öffnung schließen' }).click()
  await page.getByLabel('Tür / Fenster', { exact: true }).selectOption('DG-office-west-skylight')
  await page.getByRole('button', { name: 'Ausgewählte Öffnung öffnen' }).click()
  const skylight = await page.evaluate(() => window.__house!.snapshot().openings.find(opening => opening.id === 'DG-office-west-skylight')!)
  expect(skylight.rotation).not.toEqual(snapshot.openings.find(opening => opening.id === 'DG-office-west-skylight')!.rotation)
  expect(skylight.tip[1]).toBeLessThan(closedSkylight.tip[1])
  await page.getByRole('button', { name: 'Fassade Lichtgrau', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house!.snapshot().slabs[0].colors[0])).toBe('d3d7d6')
  expect(await page.evaluate(() => window.__house!.snapshot().slabs[0].colors[3])).toBe('ffffff')
  await page.getByRole('button', { name: 'Dach Ziegelrot', exact: true }).click()
  await page.getByRole('button', { name: 'Fensterrahmen Anthrazit', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  const before = PNG.sync.read(await page.locator('canvas').screenshot())
  await page.locator('.scene-settings summary').click()
  await page.locator('#sun-hour').focus()
  await page.locator('#sun-hour').press('Home')
  await page.locator('#sun-hour').press('ArrowRight')
  expect(await page.evaluate(() => window.__house!.snapshot().sun)).not.toEqual(snapshot.sun)
  await page.locator('.scene-settings summary').click()
  const after = PNG.sync.read(await page.locator('canvas').screenshot())
  let different = 0
  for (let offset = 0; offset < before.data.length; offset += 4) if (Math.abs(before.data[offset] - after.data[offset]) > 8) different++
  expect(different / (before.width * before.height)).toBeGreaterThan(.01)
  const position = await page.evaluate(() => ({ ...window.__house!.position() }))
  for (const axis of ['x', 'y', 'z'] as const) expect(position[axis]).toBeCloseTo(camera[axis], 8)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-C-site-morning.png` })
  await page.locator('.scene-settings summary').click()
  await page.getByLabel('Gelände transparent', { exact: true }).check()
  await page.screenshot({ path: `test-results/${testInfo.project.name}-scene-settings.png` })
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('Innenwände mit Schallschutzstärke und Parkett in den Fluren', async ({ page }) => {
  await chooseEast(page)
  const probe = await page.evaluate(async () => {
    const { buildScene } = await import('/src/scene.ts')
    const { floorIds, interiorWallThickness, makeFloor } = await import('/src/model.ts')
    const walls = floorIds.flatMap(id => makeFloor(id).walls.filter(wall => !['west', 'east', 'north', 'south', 'installation'].includes(wall.id)).map(wall => Math.min(wall.width, wall.depth)))
    const floors = floorIds.map(id => {
      const model = buildScene(id, false, false, false, false, false)
      const materials: { room: string; map: boolean }[] = []
      model.group.traverse(object => {
        if (!object.userData.floorRoom) return
        const material = object.material as { map?: unknown }
        materials.push({ room: object.userData.floorRoom, map: !!material.map })
      })
      model.dispose()
      return { id, hallParquet: materials.filter(floor => floor.room === 'hall').every(floor => floor.map), bathroomTiled: materials.filter(floor => ['wc', 'bath'].includes(floor.room)).every(floor => !floor.map) }
    })
    return { walls, floors, interiorWallThickness }
  })
  expect(probe.walls.every(thickness => Math.abs(thickness - probe.interiorWallThickness) < .000001)).toBe(true)
  expect(probe.floors.filter(floor => floor.id !== 'EG').every(floor => floor.hallParquet)).toBe(true)
  expect(probe.floors.find(floor => floor.id === 'EG')!.hallParquet).toBe(false)
  expect(probe.floors.every(floor => floor.bathroomTiled)).toBe(true)
})

test('Regale: 3D-Abmessungen entsprechen flachen und niedrigen Regalen', async ({ page }) => {
  await page.goto('/')
  const bounds = await page.evaluate(async () => {
    const { buildScene } = await import('/src/scene.ts')
    const { floorIds, makeFloor } = await import('/src/model.ts')
    const { Box3 } = await import('/node_modules/.vite/deps/three.js')
    return floorIds.flatMap(id => {
      const floor = makeFloor(id), model = buildScene(id, false, false, true, false, false)
      model.group.updateMatrixWorld(true)
      const result = floor.furniture.filter(item => item.kind === 'bookcase').map(item => {
        const bounds = new Box3()
        model.group.traverse(object => { if (object.userData.furniture === item.id) bounds.union(new Box3().setFromObject(object)) })
        return { id: item.id, actual: [...bounds.min.toArray(), ...bounds.max.toArray()], expected: [item.x, floor.elevation, item.z, item.x + item.width, floor.elevation + item.height, item.z + item.depth] }
      })
      model.dispose()
      return result
    })
  })
  expect(bounds.some(item => item.id === 'shared-shelf')).toBe(true)
  expect(bounds.some(item => item.id === 'dressing-divider')).toBe(false)
  for (const item of bounds) for (const [index, coordinate] of item.actual.entries()) expect(coordinate, item.id).toBeCloseTo(item.expected[index], 5)
})

test('OG-Badtuer schwenkt nach innen und bleibt von Sanitaerobjekten frei', async ({ page }) => {
  await page.goto('/')
  const probe = await page.evaluate(async () => {
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor } = await import('/src/model.ts')
    const { Box3, Vector3 } = await import('/node_modules/.vite/deps/three.js')
    const floor = makeFloor('OG'), model = buildScene('OG', false, false, true, false, false)
    const door = model.doors.find(door => door.id === 'OG-bath')!
    const wall = floor.walls.find(wall => wall.openings.some(opening => opening.id === 'bath'))!
    const fixtures = floor.furniture.filter(item => item.id.startsWith('bath-')).map(item => new Box3(new Vector3(item.x, floor.elevation, item.z), new Vector3(item.x + item.width, floor.elevation + item.height, item.z + item.depth)))
    const samples = Array.from({ length: 21 }, (_, index) => {
      model.setOpening('OG-bath', index / 20)
      model.group.updateMatrixWorld(true)
      const bounds = new Box3().setFromObject(door.object)
      return { minX: bounds.min.x, maxX: bounds.max.x, collision: fixtures.some(fixture => bounds.intersectsBox(fixture)) }
    })
    model.dispose()
    return { samples, wallX: wall.x, hallX: wall.x + wall.width }
  })
  expect(probe.samples.every(sample => !sample.collision && sample.maxX <= probe.hallX)).toBe(true)
  expect(probe.samples.at(-1)!.minX).toBeLessThan(probe.wallX - .75)
})

test('Osttreppe: alle drei Verbindungen auf und ab sowie offene Tueren', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Identische Treppenphysik; mobile Eingabe separat geprueft.')
  test.setTimeout(180_000)
  await chooseEast(page)
  await page.getByRole('button', { name: 'Rundgang', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.mode)).toBe('walk')
  const walkTo = async (yaw: number, axis: 'x' | 'z', target: number, less: boolean) => {
    await page.evaluate(yaw => window.__house!.look(yaw), yaw)
    await page.keyboard.down('KeyW')
    try { await page.waitForFunction(({ axis, target, less }) => { const value = window.__house!.position()[axis]; return less ? value < target : value > target }, { axis, target, less }, { timeout: 15_000, polling: 'raf' }) } finally { await page.keyboard.up('KeyW') }
  }
  for (const [floor, base, rise] of [['KG', -2.7, 2.7], ['EG', 0, 2.95], ['OG', 2.95, 2.95]] as const) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.__house?.mode)).toBe('walk')
    await walkStair(page, base, rise)
    expect((await page.evaluate(() => window.__house!.position())).y).toBeGreaterThan(base + rise + .85)
    await walkStair(page, base, rise, 1, true)
    expect((await page.evaluate(() => window.__house!.position())).y).toBeLessThan(base + 1)
  }
  await page.evaluate(() => window.__house!.teleport(3.85, 0, 2.95))
  await walkTo(Math.PI / 2, 'x', 2.4, true)
  await page.evaluate(() => window.__house!.teleport(3.1, 0, 1.65))
  await walkTo(Math.PI / 2, 'x', .9, true)
  await walkTo(Math.PI, 'z', 2.9, false)
  await page.evaluate(() => window.__house!.teleport(3.2, -2.7, 4.05))
  await walkTo(0, 'z', 2.8, true)
  await page.evaluate(() => window.__house!.teleport(3.85, -2.7, 4.25))
  await walkTo(-Math.PI / 2, 'x', 5.3, false)
  await page.evaluate(() => window.__house!.teleport(3.2, -2.7, 5.35))
  await walkTo(Math.PI, 'z', 6.3, false)
  await page.evaluate(() => window.__house!.teleport(3.85, 2.95, 4.3))
  await walkTo(-Math.PI / 2, 'x', 5.3, false)
  await page.evaluate(() => window.__house!.teleport(3.85, 2.95, 2.95))
  await walkTo(Math.PI / 2, 'x', 2.2, true)
  await page.evaluate(() => window.__house!.teleport(3.85, 2.95, 5.03))
  await walkTo(Math.PI, 'z', 5.85, false)
  await walkTo(-Math.PI / 2, 'x', 5.65, false)
  await walkTo(Math.PI, 'z', 7.4, false)
  await walkTo(-Math.PI / 2, 'x', 6.1, false)
  await page.evaluate(() => window.__house!.teleport(3.2, 2.95, 5.35))
  await walkTo(Math.PI, 'z', 7.15, false)
  await page.evaluate(() => window.__house!.teleport(3.2, 5.9, 4.05))
  await walkTo(0, 'z', 3, true)
  await walkTo(-Math.PI / 2, 'x', 4.8, false)
  await walkTo(Math.PI, 'z', 4.15, false)
  await walkTo(-Math.PI / 2, 'x', 6, false)
  expect((await page.evaluate(() => window.__house!.position())).y).toBeGreaterThan(6.7)
  await page.evaluate(() => window.__house!.teleport(3.2, 5.9, 5.35))
  await walkTo(Math.PI, 'z', 6.1, false)
  await walkTo(Math.PI / 2, 'x', 2.98, true)
  await walkTo(Math.PI, 'z', 7.3, false)
  await page.evaluate(() => window.__house!.teleport(4.3, 0, 9.05))
  await walkTo(Math.PI, 'z', 10.4, false)
})