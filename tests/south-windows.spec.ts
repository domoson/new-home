import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Osthaus: Suedskizze, Schiebefluegel und Terrassendurchgang', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await expect(page.locator('.floor-plan')).toBeVisible()
  await page.screenshot({ path: `test-results/${testInfo.project.name}-south-windows-plan.png` })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { housePlacement, houseEnvelope, elevations } = await import('/src/model.ts')
    const { createWalker, initializePhysics } = await import('/src/walk.ts')
    const model = buildScene('EG', false, true, true)
    const door = model.doors.find(opening => opening.id === 'EG-terrace')!
    const westDoor = model.doors.find(opening => opening.id === 'west-EG-terrace')!
    const frames: Record<string, { minX: number; maxX: number; minY: number; maxY: number }> = {}
    model.group.updateMatrixWorld(true)
    const eastHouse = model.group.getObjectByName('house-east')!
    for (const id of ['EG-garden-west-fixed', 'EG-terrace', 'EG-garden-fixed', 'OG-south-west', 'OG-south-east']) {
      const bounds = new THREE.Box3()
      eastHouse.traverse(object => { if (object.userData.windowFrame === id) bounds.union(new THREE.Box3().setFromObject(object)) })
      frames[id] = { minX: bounds.min.x - housePlacement.x, maxX: bounds.max.x - housePlacement.x, minY: bounds.min.y, maxY: bounds.max.y }
    }
    const fixedPane = eastHouse.getObjectByName('EG-garden-fixed-fixed-0')!
    const fixedBefore = new THREE.Box3().setFromObject(fixedPane)
    model.setOpening('EG-terrace', 0)
    const closed = new THREE.Box3().setFromObject(door.object)
    model.setOpening('EG-terrace', 1)
    const opened = new THREE.Box3().setFromObject(door.object)
    const fixedAfter = new THREE.Box3().setFromObject(fixedPane)

    await initializePhysics()
    const walkCamera = new THREE.PerspectiveCamera()
    walkCamera.rotation.y = Math.PI
    const walker = createWalker(model, walkCamera, new THREE.Vector3(3.65 + housePlacement.x, 0, 9.05 + housePlacement.z))
    walker.setOpening('EG-terrace', 0)
    walker.keys.add('KeyW')
    for (let tick = 0; tick < 55; tick++) walker.tick()
    const blocked = walker.position().z
    walker.teleport(new THREE.Vector3(3.65 + housePlacement.x, 0, 9.05 + housePlacement.z))
    walker.setOpening('EG-terrace', 1)
    for (let tick = 0; tick < 120 && walker.position().z < 11.2; tick++) walker.tick()
    const passed = walker.position().z
    walker.dispose()

    for (const name of ['house-west', 'neighborhood', 'landscaping', 'parking-area-east', 'parking-area-west']) {
      const object = model.group.getObjectByName(name)
      if (object) object.visible = false
    }
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#dce6e8')
    scene.add(model.group, new THREE.HemisphereLight('#ffffff', '#829181', 1.5))
    const sun = new THREE.DirectionalLight('#fff5e6', 2)
    sun.position.set(10, 18, 15); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    const previewWidth = Math.min(900, innerWidth - 16), previewHeight = Math.min(700, innerHeight - 24)
    renderer.setSize(previewWidth, previewHeight)
    renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.dataset.southWindowsPreview = 'true'
    renderer.domElement.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999'
    document.body.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(35, previewWidth / previewHeight, .05, 150)
    const envelope = houseEnvelope(), centerX = envelope.x + envelope.width / 2 + housePlacement.x
    const target = new THREE.Vector3(centerX, 4.8, 10.5)
    const distance = Math.max(11 / (2 * Math.tan(THREE.MathUtils.degToRad(17.5))), 8 / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * camera.aspect)) * 1.1
    camera.position.set(centerX, 4.8, target.z + distance)
    camera.lookAt(target)
    const render = (amount: number) => { model.setOpening('EG-terrace', amount); renderer.render(scene, camera) }
    const rotate = () => { camera.position.set(centerX + distance * .45, 7, target.z + distance); camera.lookAt(target); renderer.render(scene, camera) }
    const bounds = new THREE.Box3().setFromObject(eastHouse)
    const fit = () => {
      camera.updateMatrixWorld(true)
      return [bounds.min.x, bounds.max.x].every(east => [0, bounds.max.y].every(height => [bounds.min.z, bounds.max.z].every(south => {
        const projected = new THREE.Vector3(east, height, south).project(camera)
        return Math.abs(projected.x) < .94 && Math.abs(projected.y) < .94
      })))
    }
    for (let step = 0; step < 30 && !fit(); step++) { camera.position.sub(target).multiplyScalar(1.05).add(target); camera.lookAt(target) }
    const framed = [bounds.min.x, bounds.max.x].every(east => [0, bounds.max.y].every(height => [bounds.min.z, bounds.max.z].every(south => {
      const projected = new THREE.Vector3(east, height, south).project(camera)
      return Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1
    })))
    render(0)
    Object.assign(window, { southWindowsPreview: { render, rotate, renderer, model } })
    return { frames, framed, upperElevation: elevations.OG, fixedUnchanged: fixedBefore.equals(fixedAfter), blocked, passed, closedMin: closed.min.x - housePlacement.x, closedMax: closed.max.x - housePlacement.x, openedMin: opened.min.x - housePlacement.x, openedMax: opened.max.x - housePlacement.x, westWidth: westDoor.size.x, fixedIsOperable: model.doors.some(opening => opening.id.includes('garden-fixed')) }
  })
  expect(result.framed).toBe(true)
  expect(result.fixedUnchanged).toBe(true)
  expect(result.frames['EG-garden-west-fixed'].minX).toBeCloseTo(1.2)
  expect(result.frames['EG-garden-west-fixed'].maxX).toBeCloseTo(result.frames['EG-terrace'].minX)
  expect(result.frames['EG-terrace'].maxX).toBeCloseTo(result.frames['EG-garden-fixed'].minX)
  expect(result.frames['OG-south-west'].minX).toBeCloseTo(result.frames['EG-garden-west-fixed'].minX)
  expect(result.frames['OG-south-east'].maxX).toBeCloseTo(result.frames['EG-garden-fixed'].maxX)
  expect(result.frames['OG-south-east'].maxX - result.frames['OG-south-east'].minX).toBeCloseTo(1.3)
  expect(result.frames['OG-south-east'].minY - result.upperElevation).toBeCloseTo(.855)
  expect(result.frames['OG-south-east'].maxY).toBeCloseTo(result.frames['OG-south-west'].maxY)
  expect(result.fixedIsOperable).toBe(false)
  expect(result.closedMin).toBeCloseTo(2.305)
  expect(result.closedMax).toBeCloseTo(4.035)
  expect(result.openedMin).toBeCloseTo(4.035)
  expect(result.openedMax).toBeCloseTo(5.765)
  expect(result.westWidth).toBe(1.49)
  expect(result.blocked).toBeGreaterThan(10.2)
  expect(result.blocked).toBeLessThan(10.4)
  expect(result.passed).toBeGreaterThan(11.1)

  const canvas = page.locator('[data-south-windows-preview]')
  const closed = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-south-windows-closed.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < closed.data.length; offset += 16) colors.add(`${closed.data[offset] >> 4},${closed.data[offset + 1] >> 4},${closed.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.evaluate(() => (window as any).southWindowsPreview.render(1))
  const opened = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-south-windows-open.png` }))
  let changed = 0
  for (let offset = 0; offset < closed.data.length; offset += 4) if (Math.abs(closed.data[offset] - opened.data[offset]) > 8) changed++
  expect(changed).toBeGreaterThan(50)
  await page.evaluate(() => (window as any).southWindowsPreview.rotate())
  const rotated = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-south-windows-rotated.png` }))
  let rotatedPixels = 0
  for (let offset = 0; offset < opened.data.length; offset += 4) if (Math.abs(opened.data[offset] - rotated.data[offset]) > 8) rotatedPixels++
  expect(rotatedPixels).toBeGreaterThan(500)
  await page.evaluate(() => {
    const preview = (window as any).southWindowsPreview
    preview.model.dispose(); preview.renderer.dispose(); preview.renderer.domElement.remove()
    delete (window as any).southWindowsPreview
  })
  expect(errors).toEqual([])
})