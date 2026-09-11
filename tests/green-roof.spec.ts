import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Carport-Gruendach: Pflanzenaufbau, Umschaltung und Detailansicht', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect(page.locator('.loading')).toHaveCount(0)
  const select = page.locator('#carport-roof')
  const choose = async (value: string) => {
    await page.locator('.scene-settings summary').click()
    await select.selectOption(value)
    await expect(select).toHaveValue(value)
    await page.locator('.scene-settings summary').click()
  }
  const canvas = page.locator('.scene-container canvas')
  await choose('metal')
  const before = PNG.sync.read(await canvas.screenshot())
  await choose('green')
  await expect.poll(async () => {
    const after = PNG.sync.read(await canvas.screenshot())
    let changed = 0
    for (let offset = 0; offset < before.data.length; offset += 4) if (Math.abs(before.data[offset] - after.data[offset]) + Math.abs(before.data[offset + 1] - after.data[offset + 1]) > 20) changed++
    return changed
  }).toBeGreaterThan(50)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-green-roof-site.png` })
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { createSurroundings } = await import('/src/surroundings.ts')
    const model = createSurroundings(), colliderCount = model.colliders.length
    const states = (green: boolean) => ['east', 'west'].every(side => {
      const structure = model.garden.getObjectByName(`carport-${side}`)!
      return structure.getObjectByName('carport-green-roof')!.visible === green && structure.children.filter(object => object.name === 'carport-roof-rib').every(object => object.visible !== green)
    })
    const initial = states(false)
    model.setCarportRoof('green'); const planted = states(true)
    model.setCarportRoof('metal'); const restored = states(false)
    model.setCarportRoof('green'); const repeated = states(true)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e3e7e8')
    const structure = model.garden.getObjectByName('carport-east')!
    scene.add(structure)
    scene.add(new THREE.HemisphereLight('#ffffff', '#827b63', 2.4))
    const sun = new THREE.DirectionalLight('#fff6e5', 3); sun.position.set(-3, 10, 4); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(1)
    renderer.domElement.id = 'green-roof-detail'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999;width:100%;height:100%'
    document.body.append(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .1, 100)
    const target = new THREE.Vector3(1.625, 1.8, 3)
    const direction = new THREE.Vector3(6, 6.5, 9).normalize()
    camera.position.copy(target).addScaledVector(direction, innerWidth < 600 ? 24 : 13)
    camera.lookAt(target); renderer.render(scene, camera)
    const screenshot = renderer.domElement.toDataURL()
    camera.position.x += 1; camera.lookAt(target); renderer.render(scene, camera)
    const moved = renderer.domElement.toDataURL() !== screenshot
    structure.updateWorldMatrix(true, true)
    const bounds = new THREE.Box3().setFromObject(structure)
    camera.updateMatrixWorld()
    const framed = [bounds.min.x, bounds.max.x].every(east => [bounds.min.y, bounds.max.y].every(height => [bounds.min.z, bounds.max.z].every(south => {
      const projected = new THREE.Vector3(east, height, south).project(camera)
      return Math.abs(projected.x) < .95 && Math.abs(projected.y) < .95
    })))
    const colliderUnchanged = model.colliders.length === colliderCount
    model.garden.add(structure); model.dispose(); renderer.dispose()
    return { initial, planted, restored, repeated, colliderUnchanged, moved, framed }
  })
  expect(Object.values(result).every(Boolean)).toBe(true)
  const detail = PNG.sync.read(await page.locator('#green-roof-detail').screenshot())
  let greenPixels = 0
  for (let offset = 0; offset < detail.data.length; offset += 4) if (detail.data[offset + 1] > detail.data[offset] * 1.08 && detail.data[offset + 1] > detail.data[offset + 2] * 1.12) greenPixels++
  expect(greenPixels).toBeGreaterThan(500)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-green-roof-detail.png` })
  expect(errors).toEqual([])
})