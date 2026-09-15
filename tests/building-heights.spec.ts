import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Schnitt zeigt neue FFB, Dachpakete und getrennte First- und Gelaendekoten', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Querschnitt', exact: true }).click()
  const section = page.getByRole('img', { name: 'Gebäudeschnitt Nord–Süd' })
  for (const text of ['-2,74 m', '+3,00 m', '+6,00 m', 'First außen (OK Firstabschluss) +10,232 m', 'First innen (UK Verkleidung) +9,735 m', 'Höhe über Gelände 10,432 m', 'Holzdecken 35 cm', 'Kellerdecke 34 cm']) await expect(section).toContainText(text)
  await expect(section.locator('[data-terrain]')).toHaveAttribute('y1', '0.2')
  await expect(section.locator('title').filter({ hasText: 'Dachpaket 0,35 m normal / 0,427 m vertikal' }).first()).toBeAttached()
  const clipped = await section.evaluate(svg => {
    const bounds = svg.getBoundingClientRect()
    return [...svg.querySelectorAll('text')].filter(text => {
      const rect = text.getBoundingClientRect()
      return rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1
    }).map(text => text.textContent)
  })
  expect(clipped).toEqual([])
  const obscured = await section.evaluate(svg => {
    const controls = svg.parentElement!.querySelector('.section-options')!.getBoundingClientRect()
    return [...svg.querySelectorAll('text')].filter(text => {
      const bounds = text.getBoundingClientRect()
      return bounds.left < controls.right && bounds.right > controls.left && bounds.top < controls.bottom && bounds.bottom > controls.top
    }).map(text => text.textContent)
  })
  expect(obscured).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-building-section.png` })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Plan herunterladen' }).click()
  expect((await downloadPromise).suggestedFilename()).toContain('Schnitt')
  await page.getByLabel('Schnittachse', { exact: true }).selectOption('EW')
  await page.locator('#section-position').evaluate(element => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, '5')
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.getByRole('img', { name: 'Gebäudeschnitt West–Ost' })).toContainText('DG lichte Höhe 3,735 m')
  await page.getByRole('button', { name: 'Planungsannahmen', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('3 m sind keine Freigabe')
  await expect(page.getByRole('dialog')).toContainText('3,22 m an der Traufe')
})

test('3D-Bauteile und alle Treppenlaeufe verwenden dieselben neuen Hoehen', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const geometry = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { elevations, floorIds, slabThickness, storeyRise, roofInnerElevation, roofVerticalThickness, ridgeElevations } = await import('/src/model.ts')
    const { stairWalkingLine } = await import('/src/winderStair.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    await initializePhysics()
    const model = buildScene('EG', true, true, false)
    model.group.updateMatrixWorld(true)
    const mismatches: string[] = []
    const check = (actual: number, expected: number, label: string) => { if (Math.abs(actual - expected) > 1e-5) mismatches.push(`${label}: ${actual} != ${expected}`) }
    let roofPanels = 0, ridgeCaps = 0, slabs = 0
    model.group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const floorId = floorIds.find(id => object.name === `${id}-slab`)
      const bounds = new THREE.Box3().setFromObject(object)
      if (floorId) {
        slabs++
        check(bounds.max.y, elevations[floorId], `${object.name} top`)
        check(bounds.min.y, elevations[floorId] - slabThickness(floorId), `${object.name} bottom`)
      }
      if (object.name === 'main-ridge-cap') { ridgeCaps++; check(bounds.max.y, ridgeElevations.outside, 'ridge cap') }
      if (object.name === 'main-roof-panel') {
        roofPanels++
        const vertices = object.geometry.getAttribute('position')
        for (let index = 0; index < vertices.count; index++) {
          const point = new THREE.Vector3().fromBufferAttribute(vertices, index).applyMatrix4(object.matrixWorld)
          const south = point.z - (object.matrixWorld.determinant() < 0 ? 1.2 : 0)
          const bottom = roofInnerElevation(south)
          if (Math.min(Math.abs(point.y - bottom), Math.abs(point.y - bottom - roofVerticalThickness)) > 1e-5) mismatches.push('roof vertex mismatch')
        }
      }
      if (object.name === 'site-ground') check(bounds.max.y, -.2, 'terrain')
    })
    const camera = new THREE.PerspectiveCamera()
    const walker = createWalker(model, camera, new THREE.Vector3(3, 0, 1.6))
    const routes = []
    for (const sign of [1, -1]) for (const id of floorIds.filter(id => id !== 'DG')) for (const descending of [false, true]) {
      const base = elevations[id], rise = storeyRise(id)
      const route = stairWalkingLine(rise).map(([east, height, south]) => [sign * east, base + height, south + (sign === 1 ? 0 : 1.2)])
      if (descending) route.reverse()
      walker.teleport(new THREE.Vector3(...route[0]))
      let blocked = false
      for (const [east, , south] of route.slice(1)) {
        let frames = 0
        while (Math.hypot(walker.position().x - east, walker.position().z - south) > .045 && frames++ < 240) {
          camera.lookAt(east, camera.position.y, south)
          walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
        }
        if (frames >= 240) { blocked = true; break }
      }
      for (let frame = 0; frame < 20; frame++) walker.tick()
      routes.push({ sign, id, descending, blocked, actual: walker.position().y - .9, expected: descending ? base : base + rise })
    }
    walker.dispose(); model.dispose()
    return { mismatches, roofPanels, ridgeCaps, slabs, routes }
  })
  expect(geometry.mismatches).toEqual([])
  expect(geometry.roofPanels).toBeGreaterThan(4)
  expect(geometry.ridgeCaps).toBe(2)
  expect(geometry.slabs).toBeGreaterThan(8)
  for (const route of geometry.routes) {
    expect(route.blocked, JSON.stringify(route)).toBe(false)
    expect(route.actual, JSON.stringify(route)).toBeCloseTo(route.expected, 1)
  }
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').waitFor({ timeout: 45000 })
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.snapshot().site)).toBe(true)
  const canvas = page.locator('canvas')
  const before = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-building-roof.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 32) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5)
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .6, { steps: 10 }); await page.mouse.up()
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-building-roof-rotated.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 10) changed++
  expect(changed).toBeGreaterThan(100)
  expect(errors).toEqual([])
})