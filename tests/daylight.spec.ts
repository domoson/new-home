import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'

function brightness(buffer: Buffer) {
  const image = PNG.sync.read(buffer)
  let total = 0
  for (let offset = 0; offset < image.data.length; offset += 4) total += image.data[offset] * .2126 + image.data[offset + 1] * .7152 + image.data[offset + 2] * .0722
  return total / image.width / image.height
}

test('Window daylight lights rooms with every lamp off, without global interior fill', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  const comparisons = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { lightingCircuits, daylightLevels } = await import('/src/lighting.ts')
    const model = buildScene('EG', true, true, true)
    model.setLighting(Object.fromEntries(lightingCircuits.flatMap(circuit => [[circuit.id, false], [`west-${circuit.id}`, false]])), 'EG')
    const scene = new THREE.Scene(); scene.add(model.group, new THREE.HemisphereLight('#e5efff', '#7c8179', .12))
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(360, 360); renderer.toneMapping = THREE.ACESFilmicToneMapping
    const camera = new THREE.PerspectiveCamera(65, 1, .04, 100)
    const views = [
      { name: 'living-east', position: [3, 1.6, 7], target: [.4, 1.6, 7] },
      { name: 'living-west', position: [-3, 1.6, 8.2], target: [-.4, 1.6, 8.2] },
      { name: 'child', position: [3.7, 4.55, 7.5], target: [1, 4.55, 7.5] },
      { name: 'attic', position: [5.4, 7.5, 6.2], target: [3.8, 7.5, 7] },
      { name: 'pantry', position: [2.5, 1.6, 2.9], target: [1.56, 1.6, 2.9] },
      { name: 'basement', position: [3, -1.05, 2.8], target: [1, -1.05, 1] },
    ]
    const capture = () => { renderer.render(scene, camera); return renderer.domElement.toDataURL().split(',')[1] }
    const result = views.map(view => {
      camera.position.set(...view.position); camera.lookAt(...view.target)
      model.setDaylight(0); const before = capture()
      model.setDaylight(daylightLevels(.8).interior); const after = capture()
      model.setDaylight(daylightLevels(-.3).interior); const night = capture()
      return { name: view.name, before, after, night }
    })
    let activeLamps = 0
    model.group.traverse(object => { if (object instanceof THREE.Light && object.visible) activeLamps++ })
    model.dispose(); renderer.dispose()
    return { views: result, activeLamps }
  })
  expect(comparisons.activeLamps).toBe(0)
  for (const view of comparisons.views) {
    const before = Buffer.from(view.before, 'base64'), after = Buffer.from(view.after, 'base64'), night = Buffer.from(view.night, 'base64')
    const change = brightness(after) - brightness(before)
    if (view.name === 'pantry') expect(Math.abs(change)).toBeLessThan(1)
    else if (view.name === 'basement') expect(change).toBeLessThan(20)
    else expect(change).toBeGreaterThan(25)
    expect(Math.abs(brightness(night) - brightness(before))).toBeLessThan(1)
    await writeFile(`test-results/${testInfo.project.name}-daylight-${view.name}.png`, after)
    await writeFile(`test-results/${testInfo.project.name}-no-daylight-${view.name}.png`, before)
  }
  expect(errors).toEqual([])
})

test('Time control brings daylight indoors while room switches stay off', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Rundgang', exact: true }).click()
  await page.locator('.scene-settings summary').waitFor({ timeout: 45000 })
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Geschosslicht ausschalten' }).click()
  await page.locator('#sun-hour').fill('0')
  await page.locator('.scene-settings summary').click()
  const canvas = page.locator('canvas')
  const night = brightness(await canvas.screenshot())
  await page.locator('.scene-settings summary').click()
  await page.locator('#sun-hour').fill('14')
  await expect(page.getByRole('checkbox', { name: 'Wohnen / Kochen / Essen', exact: true })).not.toBeChecked()
  await page.locator('.scene-settings summary').click()
  const day = brightness(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-daylight-walk.png` }))
  expect(day).toBeGreaterThan(night + 40)
})