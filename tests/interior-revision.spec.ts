import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Innenanschlag, begehbare Zimmer und passende Dachfenster', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { roofWindows, roofHeight } = await import('/src/model.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    const model = buildScene('DG', true, true, true)
    model.group.updateMatrixWorld(true)
    const entranceTips = ['EG-entrance', 'west-EG-entrance'].map(id => {
      const door = model.doors.find(door => door.id === id)!
      return door.center.clone().multiplyScalar(2).applyMatrix4(door.pivot.matrixWorld).x
    })
    const roofErrors = roofWindows.map(window => {
      const opening = model.doors.find(door => door.id === window.id)!
      const tip = new THREE.Vector3(0, -window.length, 0).applyMatrix4(opening.pivot.matrixWorld)
      const closedHeight = tip.y
      model.setOpening(window.id, 1)
      const openHeight = new THREE.Vector3(0, -window.length, 0).applyMatrix4(opening.pivot.matrixWorld).y
      model.setOpening(window.id, 0)
      return { height: tip.y - 5.9 - roofHeight(window.z), south: tip.z - window.z, drops: openHeight < closedHeight }
    })
    await initializePhysics()
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(3.8, 3.85, 6.15))
    const paths: number[] = []
    for (const sign of [1, -1]) for (const [height, start, end] of [[2.95, 5.35, 7.9], [5.9, 5.35, 6.1]]) {
      const offset = sign === 1 ? 0 : 1.2
      walker.teleport(new THREE.Vector3(sign * 3.2, height, start + offset)); camera.rotation.set(0, Math.PI, 0)
      walker.keys.add('KeyW')
      for (let frame = 0; frame < 160 && walker.position().z < end + offset; frame++) walker.tick()
      walker.keys.clear(); paths.push(walker.position().z - offset - end)
    }
    walker.dispose(); model.dispose()
    return { entranceTips, roofErrors, paths }
  })
  expect(result.entranceTips[0]).toBeLessThan(7.135)
  expect(result.entranceTips[1]).toBeGreaterThan(-7.135)
  for (const error of result.roofErrors) { expect(error.height).toBeCloseTo(0, 5); expect(error.south).toBeCloseTo(0, 5); expect(error.drops).toBe(true) }
  for (const gap of result.paths) expect(gap).toBeGreaterThanOrEqual(-.03)
})

test('Kinderpartyraum: Diskokugel, ruhige Farben und bewegte Lichtpunkte', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'KG', exact: true }).click()
  await expect(page.locator('[data-party-room]')).toHaveCount(1)
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('KG', false, false, true, false, false)
    const party = model.group.getObjectByName('kids-party-room')!, ball = party.getObjectByName('disco-ball')!
    const lights = party.children.filter(object => object.name === 'party-color-light')
    model.updateAnimations(0)
    const before = ball.rotation.y, intensity = lights.map(light => light.intensity)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dbe1df'); scene.add(model.group, new THREE.HemisphereLight('#ffffff', '#778476', 1.1))
    const camera = new THREE.PerspectiveCamera(65, 1, .05, 50); camera.position.set(5.1, -1.35, 9.3); camera.lookAt(3.4, -1.05, 7.05)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(360, 360)
    renderer.domElement.dataset.partyPreview = 'true'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999;width:360px;height:360px'; document.body.appendChild(renderer.domElement)
    renderer.render(scene, camera)
    const state = { model, renderer, scene, camera }
    Object.assign(window, { partyTest: state })
    model.updateAnimations(8)
    const result = { rotation: ball.rotation.y - before, lights: lights.length, colors: lights.map(light => light.color.getHexString()), steady: lights.every((light, index) => light.intensity === intensity[index]), dots: party.children.filter(object => object.name === 'party-light-spot').length }
    model.updateAnimations(0)
    return result
  })
  expect(result.rotation).toBeGreaterThan(1)
  expect(result.lights).toBe(3)
  expect(new Set(result.colors).size).toBe(3)
  expect(result.steady).toBe(true)
  expect(result.dots).toBe(24)
  const before = PNG.sync.read(await page.locator('[data-party-preview]').screenshot({ path: `test-results/${testInfo.project.name}-party-room.png` }))
  await page.evaluate(() => { const state = (window as any).partyTest; state.model.updateAnimations(8); state.renderer.render(state.scene, state.camera) })
  const after = PNG.sync.read(await page.locator('[data-party-preview]').screenshot())
  const colors = new Set<string>(); let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 4) {
    colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
    if (Math.abs(before.data[offset] - after.data[offset]) > 5) changed++
  }
  expect(colors.size).toBeGreaterThan(25)
  expect(changed).toBeGreaterThan(50)
  await page.evaluate(() => { const state = (window as any).partyTest; state.model.dispose(); state.renderer.dispose(); state.renderer.domElement.remove(); delete (window as any).partyTest })
})