import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Massstabsfiguren sind schaltbar, bewegen sich und bleiben beim Ansichtswechsel erhalten', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  const visible = page.getByRole('checkbox', { name: 'Personen', exact: true })
  const moving = page.getByRole('checkbox', { name: 'Bewegung', exact: true })
  await expect(visible).not.toBeChecked()
  await expect(moving).toBeDisabled()
  await visible.check()
  await expect.poll(() => page.evaluate(() => window.__house?.people?.().visible)).toBe(true)
  const initial = await page.evaluate(() => window.__house!.people!().positions[0][2])
  await expect.poll(() => page.evaluate(() => window.__house!.people!().positions[0][2])).not.toBe(initial)
  await moving.uncheck()
  const stationary = await page.evaluate(() => window.__house!.people!().positions)
  await page.locator('.scene-settings summary').click()
  await page.locator('canvas').screenshot({ path: `test-results/${testInfo.project.name}-people-eg.png` })
  expect(await page.evaluate(() => window.__house!.people!().positions)).toEqual(stationary)
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.people?.().visible)).toBe(true)
  await page.locator('.scene-settings summary').click()
  await expect(moving).not.toBeChecked()
  await visible.uncheck()
  await expect.poll(() => page.evaluate(() => window.__house!.people!().visible)).toBe(false)
  await visible.check()
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.people?.().visible)).toBe(true)
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { createScalePeople } = await import('/src/scalePeople.ts')
    const { elevations } = await import('/src/model.ts')
    const canvas = document.createElement('canvas')
    canvas.id = 'people-preview'
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:10000'
    document.body.append(canvas)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(innerWidth, innerHeight)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#edf1eb')
    scene.add(new THREE.HemisphereLight('#ffffff', '#777766', 2.5))
    const light = new THREE.DirectionalLight('#ffffff', 2); light.position.set(3, 12, 8); scene.add(light)
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .05, 80)
    let model, people
    const render = (floor: string, shown: boolean, seconds: number, rotate = false) => {
      if (model) { scene.remove(model.group); model.dispose(); scene.remove(people.group); people.dispose() }
      model = buildScene(floor, false, false, true, true)
      const west = model.group.getObjectByName('house-west'); if (west) west.visible = false
      scene.add(model.group)
      people = createScalePeople([floor], true); people.set(shown, true); people.update(seconds); scene.add(people.group)
      const level = elevations[floor]
      const distance = innerWidth < 600 ? 17 : 13
      camera.position.set(rotate ? -3 : 10, level + distance, 13)
      camera.lookAt(3.45, level + .3, 5.4)
      renderer.render(scene, camera)
    }
    window.__peoplePreview = { render, dispose() { model.dispose(); people.dispose(); renderer.dispose(); canvas.remove() } }
    render('EG', false, 0)
  })
  const preview = page.locator('#people-preview')
  const empty = PNG.sync.read(await preview.screenshot())
  await page.evaluate(() => window.__peoplePreview.render('EG', true, 0))
  const occupied = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-people-EG-detail.png` }))
  const difference = (first: PNG, second: PNG) => {
    let changed = 0
    for (let offset = 0; offset < first.data.length; offset += 4) if (Math.abs(first.data[offset] - second.data[offset]) + Math.abs(first.data[offset + 1] - second.data[offset + 1]) + Math.abs(first.data[offset + 2] - second.data[offset + 2]) > 30) changed++
    return changed
  }
  expect(difference(empty, occupied)).toBeGreaterThan(100)
  await page.evaluate(() => window.__peoplePreview.render('EG', true, 3))
  expect(difference(occupied, PNG.sync.read(await preview.screenshot()))).toBeGreaterThan(20)
  for (const floor of ['OG', 'DG']) {
    await page.evaluate(floor => window.__peoplePreview.render(floor, true, 0), floor)
    const image = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-people-${floor}-detail.png` }))
    const colors = new Set<string>()
    for (let offset = 0; offset < image.data.length; offset += 32) colors.add(`${image.data[offset] >> 4},${image.data[offset + 1] >> 4},${image.data[offset + 2] >> 4}`)
    expect(colors.size).toBeGreaterThan(25)
  }
  await page.evaluate(() => window.__peoplePreview.render('OG', true, 0, true))
  await preview.screenshot({ path: `test-results/${testInfo.project.name}-people-OG-rotated.png` })
  await page.evaluate(() => { window.__peoplePreview.dispose(); delete window.__peoplePreview })
  expect(errors).toEqual([])
})

test('Reduzierte Bewegung laesst Massstabsfiguren still stehen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  await page.getByRole('checkbox', { name: 'Personen', exact: true }).check()
  const before = await page.evaluate(() => window.__house!.people!().positions)
  await page.locator('.scene-settings summary').click()
  await page.locator('canvas').screenshot()
  expect(await page.evaluate(() => window.__house!.people!().positions)).toEqual(before)
})