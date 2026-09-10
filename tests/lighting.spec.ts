import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'
import { writeFile } from 'node:fs/promises'

const luminance = (buffer: Buffer) => {
  const image = PNG.sync.read(buffer); let total = 0
  for (let offset = 0; offset < image.data.length; offset += 4) total += image.data[offset] * .2126 + image.data[offset + 1] * .7152 + image.data[offset + 2] * .0722
  return total / (image.width * image.height)
}

test('Kellerlicht reagiert im Rundgang auch nach globalem Modus', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: 'KG', exact: true }).click()
  await page.getByRole('button', { name: 'Rundgang', exact: true }).click()
  await page.locator('.scene-settings summary').waitFor({ timeout: 45000 })
  await page.evaluate(() => window.__house!.look(0))
  await page.locator('.scene-settings summary').click()
  await page.locator('#sun-hour').fill('0')
  await page.getByRole('button', { name: 'Geschosslicht ausschalten' }).click()
  await page.locator('.scene-settings summary').click()
  const canvas = page.locator('canvas')
  const dark = luminance(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-basement-off.png` }))
  await page.locator('.scene-settings summary').click()
  await page.getByRole('checkbox', { name: 'Technik', exact: true }).check()
  await page.locator('.scene-settings summary').click()
  const lit = luminance(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-basement-on.png` }))
  expect(lit).toBeGreaterThan(dark + 20)
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Global', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Technik', exact: true }).uncheck()
  await expect(page.getByRole('button', { name: 'Raumlicht', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('.scene-settings summary').click()
  await expect.poll(async () => Math.abs(luminance(await canvas.screenshot()) - dark)).toBeLessThan(3)
  expect(errors).toEqual([])
})

test('Raumlicht nachts sichtbar, getrennt schaltbar und beim Wechsel gespeichert', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: 'Rundgang', exact: true }).click()
  await expect(page.locator('.loading')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => !!window.__house)).toBe(true)
  await page.locator('.scene-settings summary').click()
  await expect(page.getByRole('button', { name: 'Global', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#sun-hour').fill('0')
  await page.getByRole('button', { name: 'Geschosslicht ausschalten' }).click()
  await page.locator('.scene-settings summary').click()
  const canvas = page.locator('canvas')
  const dark = luminance(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-lights-off.png` }))
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Global', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  await expect.poll(async () => luminance(await canvas.screenshot())).toBeGreaterThan(dark + 20)
  await canvas.screenshot({ path: `test-results/${testInfo.project.name}-lights-global.png` })
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Raumlicht', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  await expect.poll(async () => Math.abs(luminance(await canvas.screenshot()) - dark)).toBeLessThan(2)
  await page.locator('.scene-settings summary').click()
  await page.getByRole('checkbox', { name: 'Wohnen / Kochen / Essen', exact: true }).check()
  await page.locator('.scene-settings summary').click()
  await expect.poll(async () => luminance(await canvas.screenshot())).toBeGreaterThan(dark + 12)
  await canvas.screenshot({ path: `test-results/${testInfo.project.name}-lights-on.png` })
  await page.locator('.scene-settings summary').click()
  await page.locator('#light-house').selectOption('west')
  await expect(page.getByRole('checkbox', { name: 'Wohnen / Kochen / Essen', exact: true })).not.toBeChecked()
  await page.locator('#light-house').selectOption('east')
  await expect(page.getByRole('checkbox', { name: 'Wohnen / Kochen / Essen', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Global', exact: true }).click()
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await expect(page.locator('.loading')).toHaveCount(0)
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await expect(page.locator('.loading')).toHaveCount(0)
  await page.locator('.scene-settings summary').click()
  await expect(page.getByRole('button', { name: 'Global', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Raumlicht', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Wohnen / Kochen / Essen', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Geschosslicht einschalten' }).click()
  const checks = page.getByRole('group', { name: 'Raumbeleuchtung' }).getByRole('checkbox')
  for (const checkbox of await checks.all()) await expect(checkbox).toBeChecked()
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-lighting-controls.png` })
  expect(errors).toEqual([])
})

test('Reflexionslicht erreicht die Decke und Podestlicht beleuchtet die Treppe', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  const images = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { lightingCircuits } = await import('/src/lighting.ts')
    const model = buildScene('EG', true, true, true)
    const scene = new THREE.Scene(); scene.add(model.group, new THREE.HemisphereLight('#e5efff', '#7c8179', .035))
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(360, 360); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1
    const camera = new THREE.PerspectiveCamera(60, 1, .04, 100)
    const states = Object.fromEntries(lightingCircuits.flatMap(circuit => [[circuit.id, false], [`west-${circuit.id}`, false]]))
    const capture = () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png').split(',')[1] }
    camera.position.set(5, 1.55, 7); camera.lookAt(5, 2.65, 7.05)
    model.setLighting(states, 'EG'); const ceilingOff = capture()
    states['EG-living'] = true; model.setLighting(states, 'EG'); const ceilingOn = capture()
    states['EG-living'] = false
    camera.position.set(3.1, 1.6, 4.05); camera.lookAt(.85, 1.8, 4.7)
    model.setLighting(states, 'EG'); const stairsOff = capture()
    states['EG-stairs'] = true; model.setLighting(states, 'EG'); const stairsOn = capture()
    model.dispose(); renderer.dispose()
    return { ceilingOff, ceilingOn, stairsOff, stairsOn }
  })
  expect(luminance(Buffer.from(images.ceilingOn, 'base64'))).toBeGreaterThan(luminance(Buffer.from(images.ceilingOff, 'base64')) + 25)
  expect(luminance(Buffer.from(images.stairsOn, 'base64'))).toBeGreaterThan(luminance(Buffer.from(images.stairsOff, 'base64')) + 10)
  for (const [name, image] of Object.entries(images)) await writeFile(`test-results/${testInfo.project.name}-${name}.png`, Buffer.from(image, 'base64'))
  expect(errors).toEqual([])
})

test('Diffuses Tageslicht hellt Aussenflaechen auf, nicht Innenraum oder Keller', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  const comparisons = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { createOutdoorLighting } = await import('/src/outdoorLighting.ts')
    const { lightingCircuits, daylightLevels } = await import('/src/lighting.ts')
    const model = buildScene('EG', true, true, true)
    model.setLighting(Object.fromEntries(lightingCircuits.flatMap(circuit => [[circuit.id, false], [`west-${circuit.id}`, false]])), 'EG')
    const outdoor = createOutdoorLighting(model.group)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dce7eb')
    scene.add(model.group, new THREE.HemisphereLight('#e5efff', '#7c8179', .12))
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(360, 360); renderer.toneMapping = THREE.ACESFilmicToneMapping
    const camera = new THREE.PerspectiveCamera(55, 1, .04, 150)
    const views = [
      { name: 'east-exterior', position: [19, 7, 16], target: [3, 4, 5] },
      { name: 'west-exterior', position: [-19, 7, -8], target: [-3, 4, 5] },
      { name: 'neighbor-exterior', position: [27, 7, 19], target: [18, 4, 8] },
      { name: 'inside', position: [3, 1.6, 7], target: [.4, 1.6, 7] },
      { name: 'west-inside', position: [-3, 1.6, 8.2], target: [-.4, 1.6, 8.2] },
      { name: 'basement', position: [3, -1.05, 2.8], target: [1, -1.05, 1] },
    ]
    const result = views.map(view => {
      camera.position.set(...view.position); camera.lookAt(...view.target)
      outdoor.update(0); renderer.render(scene, camera); const before = renderer.domElement.toDataURL().split(',')[1]
      outdoor.update(daylightLevels(.8).exterior); renderer.render(scene, camera); const after = renderer.domElement.toDataURL().split(',')[1]
      return { name: view.name, before, after }
    })
    model.dispose(); renderer.dispose()
    return result
  })
  for (const comparison of comparisons) {
    const before = Buffer.from(comparison.before, 'base64'), after = Buffer.from(comparison.after, 'base64')
    const change = luminance(after) - luminance(before)
    if (comparison.name.endsWith('exterior')) expect(change).toBeGreaterThan(15)
    else expect(Math.abs(change)).toBeLessThan(1)
    await writeFile(`test-results/${testInfo.project.name}-${comparison.name}-sky.png`, after)
    await writeFile(`test-results/${testInfo.project.name}-${comparison.name}-no-sky.png`, before)
  }
  expect(errors).toEqual([])
})

test('Alle Geschosse mit Deckenlicht und separat abschaltbarem Partylicht', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await page.getByRole('button', { name: '3D', exact: true }).click()
    await expect(page.locator('.loading')).toHaveCount(0, { timeout: 45000 })
    await page.locator('.scene-settings summary').click()
    await page.locator('#sun-hour').fill('0')
    await page.getByRole('button', { name: 'Geschosslicht einschalten' }).click()
    await page.locator('#light-house').selectOption('west')
    await page.getByRole('button', { name: 'Geschosslicht einschalten' }).click()
    await page.locator('.scene-settings summary').click()
    const image = PNG.sync.read(await page.locator('canvas').screenshot({ path: `test-results/${testInfo.project.name}-lighting-${floor}.png` }))
    const colors = new Set<string>()
    for (let offset = 0; offset < image.data.length; offset += 16) colors.add(`${image.data[offset] >> 4},${image.data[offset + 1] >> 4},${image.data[offset + 2] >> 4}`)
    expect(colors.size).toBeGreaterThan(25)
    if (floor === 'KG') {
      await page.locator('.scene-settings summary').click()
      await page.getByRole('checkbox', { name: 'Partylicht', exact: true }).uncheck()
      await expect(page.getByRole('checkbox', { name: 'Kinderpartyraum', exact: true })).toBeChecked()
      await page.locator('.scene-settings summary').click()
    }
  }
  expect(errors).toEqual([])
})