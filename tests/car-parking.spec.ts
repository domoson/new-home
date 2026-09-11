import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

for (const reducedMotion of [false, true]) test(`Leon faehrt per Klick rueckwaerts auf die Strasse und wieder hinein${reducedMotion ? ' ohne Animation' : ''}`, async ({ page }, testInfo) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!window.__house?.vehicle?.())).toBe(true)
  const expected = await page.evaluate(async () => {
    const { siteParking } = await import('/src/parking.ts')
    const parking = siteParking.find(placement => placement.side === 'east')!
    return parking.streetZ(1.625) + 3.9
  })
  const clickCar = async () => {
    const screen = await page.evaluate(() => window.__house!.vehicle!()!.screen)
    const canvas = (await page.locator('canvas').boundingBox())!
    const point = { x: canvas.x + (screen[0] + 1) * canvas.width / 2, y: canvas.y + (1 - screen[1]) * canvas.height / 2 }
    expect(point.x).toBeGreaterThan(canvas.x); expect(point.x).toBeLessThan(canvas.x + canvas.width)
    expect(point.y).toBeGreaterThan(canvas.y); expect(point.y).toBeLessThan(canvas.y + canvas.height)
    if (testInfo.project.name === 'mobile') await page.touchscreen.tap(point.x, point.y)
    else await page.mouse.click(point.x, point.y)
  }
  const before = PNG.sync.read(await page.locator('canvas').screenshot())
  await clickCar()
  await expect.poll(() => page.evaluate(() => window.__house!.vehicle!()!.position[2])).toBeGreaterThan(3.2)
  await expect.poll(() => page.evaluate(() => window.__house!.vehicle!()!.position[2]), { timeout: 45000 }).toBeCloseTo(expected, 4)
  const outside = PNG.sync.read(await page.locator('canvas').screenshot({ path: `test-results/${testInfo.project.name}-car-outside${reducedMotion ? '-reduced' : ''}.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 4) if (Math.abs(before.data[offset] - outside.data[offset]) > 10) changed++
  expect(changed).toBeGreaterThan(30)
  await clickCar()
  await expect.poll(() => page.evaluate(() => window.__house!.vehicle!()!.position[2]), { timeout: 45000 }).toBeCloseTo(3, 4)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-car-returned${reducedMotion ? '-reduced' : ''}.png` })
})

test('Auto bleibt beim Ausparken in der Einfahrt und endet auf der Fahrbahn', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { boundaryZ } = await import('/src/context.ts')
    const { siteParking } = await import('/src/parking.ts')
    const model = buildScene('EG', false, true, true), car = model.group.getObjectByName('seat-leon-st-grey')!
    model.group.updateMatrixWorld(true)
    const placement = siteParking.find(placement => placement.side === 'east')!
    model.activateVehicle(car.children[0])
    const corners = [[-.9955, -2.321], [.9955, -2.321], [.9955, 2.321], [-.9955, 2.321]]
    let clear = true
    for (let frame = 0; frame < 1500; frame++) {
      if (!model.updateVehicle(1 / 60)) break
      for (const [east, south] of corners) {
        const point = car.localToWorld(new THREE.Vector3(east, 0, south)), local = car.parent!.worldToLocal(point.clone())
        if (local.z < placement.streetZ(local.x)) clear &&= local.x > .16 && local.x < 3.09
      }
    }
    const offsets = corners.map(([east, south]) => { const point = car.localToWorld(new THREE.Vector3(east, 0, south)); return point.z - boundaryZ(point.x, 2) })
    const outside = car.position.z
    model.activateVehicle(car.children[0]); model.updateVehicle(0, true)
    const parked = car.position.toArray(); model.dispose()
    return { clear, offsets, outside, parked }
  })
  expect(result.clear).toBe(true)
  expect(Math.min(...result.offsets)).toBeGreaterThan(1.1)
  expect(Math.max(...result.offsets)).toBeLessThan(6.7)
  expect(result.outside).toBeGreaterThan(10)
  expect(result.parked).toEqual([1.625, -.1, 3])
})