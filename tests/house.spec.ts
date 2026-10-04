import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'
import { readFile } from 'node:fs/promises'

test('PNG-Export aller Ansichten und SVG bleiben nutzbar', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function (this: HTMLCanvasElement, contextId: string, options?: Record<string, unknown>) {
      return original.call(this, contextId, contextId.includes('webgl') ? { ...options, preserveDrawingBuffer: false } : options)
    } })
  })
  await page.goto('/')
  const exportButton = page.getByRole('button', { name: 'Ansicht als PNG herunterladen' })
  const exportPng = async (name: string, plan: boolean) => {
    const pending = page.waitForEvent('download')
    await exportButton.click()
    const download = await pending
    expect(download.suggestedFilename()).toBe(`Hausentwurf-${name}.png`)
    const filename = `test-results/png-${testInfo.project.name}-${name}.png`
    await download.saveAs(filename)
    const image = PNG.sync.read(await readFile(filename))
    if (plan) expect(Math.max(image.width, image.height)).toBe(3200)
    else {
      const size = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }))
      expect([image.width, image.height]).toEqual([size.width, size.height])
    }
    const colors = new Set<string>()
    let dark = 0, transparent = 0
    for (let offset = 0; offset < image.data.length; offset += 64) {
      const red = image.data[offset], green = image.data[offset + 1], blue = image.data[offset + 2]
      colors.add(`${red >> 4},${green >> 4},${blue >> 4}`)
      if (image.data[offset + 3] !== 255) transparent++
      if (red < 200 && green < 200 && blue < 200) dark++
    }
    expect(colors.size).toBeGreaterThan(15)
    expect(dark).toBeGreaterThan(100)
    expect(transparent).toBe(0)
    await expect(exportButton).toBeEnabled()
    await expect(page.getByRole('alert')).toHaveCount(0)
    return image
  }
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await exportPng(floor, true)
  }
  await page.screenshot({ path: `test-results/png-${testInfo.project.name}-toolbar.png` })
  const bounds = (await page.locator('.drawing-controls').boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  const svgDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Plan herunterladen', exact: true }).click()
  expect((await svgDownload).suggestedFilename()).toBe('Hausentwurf-DG.svg')
  await page.getByRole('button', { name: 'Querschnitt', exact: true }).click()
  await exportPng('Schnitt', true)
  await page.getByRole('button', { name: 'Außenanlagen', exact: true }).click()
  await exportPng('Aussenanlagen', true)
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect(page.locator('.loading')).toHaveCount(0)
  await expect(page.locator('canvas')).toBeVisible()
  const before = await exportPng('EG-3D', false)
  const canvas = (await page.locator('canvas').boundingBox())!
  await page.mouse.move(canvas.x + canvas.width * .6, canvas.y + canvas.height * .5)
  await page.mouse.down()
  await page.mouse.move(canvas.x + canvas.width * .4, canvas.y + canvas.height * .55, { steps: 10 })
  await page.mouse.up()
  const after = await exportPng('EG-3D', false)
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 64) if (before.data[offset] !== after.data[offset]) changed++
  expect(changed).toBeGreaterThan(100)
  await page.screenshot({ path: `test-results/png-${testInfo.project.name}-3d-toolbar.png` })
  await page.getByRole('button', { name: 'Rundgang', exact: true }).click()
  await expect(page.locator('.loading')).toHaveCount(0)
  await expect(page.locator('canvas')).toBeVisible()
  await exportPng('EG-Rundgang', false)
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.route('**/*.woff2*', route => route.abort())
  await exportButton.click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(exportButton).toBeEnabled()
  await page.unroute('**/*.woff2*')
  await exportPng('EG', true)
})

test('Hauptentwurf, Maße und 3D für alle Geschosse', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'warn' && message.text().startsWith('THREE.')) errors.push(message.text()) })
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Doppelhausentwurf Ost' })).toBeVisible()
  await expect(page.locator('.floor-plan')).toContainText('7,00 m')
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect(page.locator('.floor-plan')).toBeVisible()
    await expect(page.locator('[data-stair="double-quarter-winder"] [data-step^="winder-"]')).toHaveCount(8)
    await expect(page.locator('[data-stair="double-quarter-winder"] [data-step^="north-"]')).toHaveCount(2)
    await expect(page.locator('[data-stair="double-quarter-winder"] [data-step^="middle-"]')).toHaveCount(3)
    await expect(page.locator('[data-stair="double-quarter-winder"] [data-step^="south-"]')).toHaveCount(2)
    if (floor === 'OG') {
      await expect(page.locator('.floor-plan')).toContainText('Kind Südost')
      await expect(page.locator('.floor-plan')).toContainText('Kind Nordost')
      await expect(page.locator('.floor-plan')).toContainText('Lesen / Abstellen')
    }
    if (floor === 'DG') {
      await expect(page.locator('[data-closed-eaves]')).toHaveCount(2)
      await expect(page.locator('.floor-plan')).toContainText('Gäste / Arbeit')
      await expect(page.locator('.floor-plan')).not.toContainText('Dachstauraum')
    }
    await page.screenshot({ path: `test-results/${testInfo.project.name}-${floor}-2d.png` })
    await page.getByRole('button', { name: '3D', exact: true }).click()
    await expect(page.locator('canvas')).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.__house?.meshes ?? 0)).toBeGreaterThan(60)
    await expect(page.locator('.loading')).toHaveCount(0)
    const canvas = page.locator('canvas')
    const image = PNG.sync.read(await canvas.screenshot())
    const colors = new Set<string>(); let darkPixels = 0
    for (let offset = 0; offset < image.data.length; offset += 16) { const red = image.data[offset], green = image.data[offset + 1], blue = image.data[offset + 2]; colors.add(`${red >> 4},${green >> 4},${blue >> 4}`); if (red < 200 && green < 200 && blue < 200) darkPixels++ }
    expect(colors.size).toBeGreaterThan(25)
    expect(darkPixels / (image.width * image.height / 4)).toBeGreaterThan(.01)
    await page.screenshot({ path: `test-results/${testInfo.project.name}-${floor}-3d.png` })
    await page.getByRole('button', { name: '2D', exact: true }).click()
  }
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await expect(page.locator('#variant')).toHaveCount(0)
  await expect(page.locator('.floor-plan')).not.toContainText('Speis')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect(page.locator('.loading')).toHaveCount(0)
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.meshes ?? 0)).toBeGreaterThan(300)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-house-roof.png` })
  await page.getByRole('button', { name: '2D', exact: true }).click()
  const originalView = await page.locator('.floor-plan').getAttribute('viewBox')
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click()
  await expect(page.locator('.floor-plan')).not.toHaveAttribute('viewBox', originalView!)
  await page.getByRole('button', { name: 'Ansicht zurücksetzen' }).click()
  await expect(page.locator('.floor-plan')).toHaveAttribute('viewBox', originalView!)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Plan herunterladen' }).click()
  expect((await download).suggestedFilename()).toBe('Hausentwurf-EG.svg')
  await page.reload()
  await expect(page.locator('#variant')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('Rundgang: Bewegung, Wandkollision und Türen', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.locator('.mode-tabs button').nth(2).click()
  await expect.poll(() => page.evaluate(() => window.__house?.mode)).toBe('walk')
  await page.locator('.scene-settings summary').click()
  await page.locator('.scene-settings summary').click()
  await page.evaluate(() => { window.__house!.teleport(3.95, 0, 6.3); window.__house!.look(Math.PI) })
  const before = await page.evaluate(() => window.__house!.position())
  const touch = testInfo.project.name === 'mobile' ? await page.context().newCDPSession(page) : null
  if (touch) {
    const joystick = (await page.getByRole('group', { name: 'Virtueller Joystick zum Gehen' }).boundingBox())!
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: joystick.x + joystick.width / 2, y: joystick.y + joystick.height / 4 }] })
  } else await page.keyboard.down('KeyW')
  await expect.poll(async () => (await page.evaluate(() => window.__house!.position())).z).toBeGreaterThan(before.z + .45)
  if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  else await page.keyboard.up('KeyW')
  await page.screenshot({ path: `test-results/${testInfo.project.name}-walk-EG.png` })
  await page.evaluate(() => { window.__house!.teleport(6, 0, .65); window.__house!.look(0) })
  await page.keyboard.down('KeyW')
  await expect.poll(async () => (await page.evaluate(() => window.__house!.position())).z).toBeLessThan(.64)
  await page.keyboard.up('KeyW')
  const blocked = await page.evaluate(() => window.__house!.position())
  expect(blocked.z).toBeGreaterThan(.6)
  expect(blocked.y).toBeGreaterThan(.85)
  await page.evaluate(() => { window.__house!.teleport(5.2, 0, 1.65) })
  expect(await page.evaluate(() => window.__house!.door())).toBe(true)
  await page.evaluate(() => { window.__house!.teleport(4.835, 0, 9.05); window.__house!.look(Math.PI) })
  expect(await page.evaluate(() => window.__house!.door())).toBe(true)
  await page.keyboard.down('KeyW')
  await expect.poll(async () => (await page.evaluate(() => window.__house!.position())).z).toBeGreaterThan(9.45)
  await page.keyboard.up('KeyW')
  expect((await page.evaluate(() => window.__house!.position())).z).toBeLessThan(9.58)
  await page.evaluate(() => window.__house!.teleport(4.835, 0, 9.05))
  expect(await page.evaluate(() => window.__house!.door())).toBe(true)
  await page.keyboard.down('KeyW')
  await expect.poll(async () => (await page.evaluate(() => window.__house!.position())).z).toBeGreaterThan(10.4)
  await page.keyboard.up('KeyW')
  expect((await page.evaluate(() => window.__house!.position())).y).toBeGreaterThan(.85)
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.position().y ?? 0)).toBeGreaterThan(3.8)
  for (const [east, south, target, axis, yaw, less] of [[2.88, 5.48, 1.7, 'z', 0, true], [2.88, 4.21, 5.1, 'x', -Math.PI / 2, false], [2.88, 7.3, 1.6, 'x', Math.PI / 2, true]] as const) {
    await page.evaluate(({east, south, yaw}) => { window.__house!.teleport(east, 2.95, south); window.__house!.look(yaw) }, {east, south, yaw})
    await page.keyboard.down('KeyW')
    await expect.poll(async () => {
      const value = (await page.evaluate(() => window.__house!.position()))[axis]
      return less ? value < target : value > target
    }).toBe(true)
    await page.keyboard.up('KeyW')
  }
  expect(await page.evaluate(() => window.__house!.snapshot().openings.some(opening => opening.id === 'OG-multifunction'))).toBe(true)
  await page.getByRole('button', { name: 'DG', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.position().y ?? 0)).toBeGreaterThan(6.7)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-walk-DG.png` })
})
