import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Osthaus: Suedostecke, Schiebefluegel und Terrassendurchgang', async ({ page }, testInfo) => {
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
    const { createWalker, initializePhysics } = await import('/src/walk.ts')
    const model = buildScene('EG', false, false, true)
    const door = model.doors.find(opening => opening.id === 'EG-terrace')!
    const westDoor = model.doors.find(opening => opening.id === 'west-EG-terrace')!
    const cornerPanes: { minX: number; minZ: number; maxZ: number; height: number }[] = []
    model.group.updateMatrixWorld(true)
    model.group.traverse(object => {
      if (!object.userData.glazing) return
      const bounds = new THREE.Box3().setFromObject(object)
      if (bounds.min.x > 6.7 && bounds.min.z > 8.9) cornerPanes.push({ minX: bounds.min.x, minZ: bounds.min.z, maxZ: bounds.max.z, height: bounds.max.y - bounds.min.y })
    })
    model.setOpening('EG-terrace', 0)
    const closed = new THREE.Box3().setFromObject(door.object)
    model.setOpening('EG-terrace', 1)
    const opened = new THREE.Box3().setFromObject(door.object)

    await initializePhysics()
    const walkCamera = new THREE.PerspectiveCamera()
    walkCamera.rotation.y = Math.PI
    const walker = createWalker(model, walkCamera, new THREE.Vector3(4.835, 0, 9.05))
    walker.setOpening('EG-terrace', 0)
    walker.keys.add('KeyW')
    for (let tick = 0; tick < 55; tick++) walker.tick()
    const blocked = walker.position().z
    walker.teleport(new THREE.Vector3(4.835, 0, 9.05))
    walker.setOpening('EG-terrace', 1)
    for (let tick = 0; tick < 70 && walker.position().z < 10.5; tick++) walker.tick()
    const passed = walker.position().z
    walker.dispose()

    for (const name of ['house-west', 'neighborhood', 'landscaping']) {
      const object = model.group.getObjectByName(name)
      if (object) object.visible = false
    }
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#dce6e8')
    scene.add(model.group, new THREE.HemisphereLight('#ffffff', '#829181', 1.5))
    const sun = new THREE.DirectionalLight('#fff5e6', 2)
    sun.position.set(10, 18, 15); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(Math.min(900, innerWidth - 16), 500)
    renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.dataset.southWindowsPreview = 'true'
    renderer.domElement.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999'
    document.body.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(45, renderer.domElement.width / 500, .05, 100)
    camera.position.set(innerWidth < 600 ? 14 : 11, 6, innerWidth < 600 ? 24 : 18)
    camera.lookAt(3.8, 1.1, 8.6)
    const render = (amount: number) => { model.setOpening('EG-terrace', amount); renderer.render(scene, camera) }
    render(0)
    Object.assign(window, { southWindowsPreview: { render, renderer, model } })
    return { cornerPanes, blocked, passed, closedMin: closed.min.x, closedMax: closed.max.x, openedMin: opened.min.x, openedMax: opened.max.x, westWidth: westDoor.size.x, westX: westDoor.position.x, fixedIsOperable: model.doors.some(opening => opening.id.includes('corner-fixed')) }
  })
  expect(result.cornerPanes).toHaveLength(1)
  expect(result.cornerPanes[0].minZ).toBeCloseTo(8.935)
  expect(result.cornerPanes[0].maxZ).toBeCloseTo(9.635)
  expect(result.cornerPanes[0].height).toBeCloseTo(2.35)
  expect(result.fixedIsOperable).toBe(false)
  expect(result.closedMin).toBeCloseTo(4.235)
  expect(result.closedMax).toBeCloseTo(5.435)
  expect(result.openedMin).toBeCloseTo(5.435)
  expect(result.openedMax).toBeCloseTo(6.635)
  expect(result.westWidth).toBe(1.5)
  expect(result.westX).toBeCloseTo(3.2)
  expect(result.blocked).toBeGreaterThan(9.45)
  expect(result.blocked).toBeLessThan(9.58)
  expect(result.passed).toBeGreaterThan(10.4)

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
  await page.evaluate(() => {
    const preview = (window as any).southWindowsPreview
    preview.model.dispose(); preview.renderer.dispose(); preview.renderer.domElement.remove()
    delete (window as any).southWindowsPreview
  })
  expect(errors).toEqual([])
})