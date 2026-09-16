import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'

test('Kitchen devices, ceiling cupboards and moving windows fit both houses', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor } = await import('/src/model.ts')
    const { createRoomLighting } = await import('/src/lighting.ts')
    const model = buildScene('EG', true, true, true)
    const ids = ['fridge', 'kitchen-tall', 'kitchen-upper', 'toaster', 'sodastream', 'cookit', 'espresso']
    const errors: string[] = [], counts: Record<string, number> = {}, windowHits: string[] = []
    model.group.updateMatrixWorld(true)
    for (const sign of [1, -1]) for (const id of ids) {
      const item = makeFloor('EG').furniture.find(item => item.id === id)!
      const bounds = new THREE.Box3(), parts: typeof THREE.Object3D[] = []
      model.group.traverse(object => {
        if (!(object instanceof THREE.Mesh) || object.userData.furniture !== id) return
        const box = new THREE.Box3().setFromObject(object)
        if ((box.min.x + box.max.x > 0 ? 1 : -1) !== sign) return
        parts.push(object); bounds.union(box)
      })
      counts[`${sign}-${id}`] = parts.length
      const minX = sign > 0 ? bounds.min.x : -bounds.max.x, maxX = sign > 0 ? bounds.max.x : -bounds.min.x
      const north = bounds.min.z - (sign > 0 ? 0 : 1.2), south = bounds.max.z - (sign > 0 ? 0 : 1.2)
      if (minX < item.x - .03 || maxX > item.x + item.width + .03 || north < item.z - .03 || south > item.z + item.depth + .03 || bounds.min.y < (item.bottom ?? 0) - .01 || bounds.max.y > (item.bottom ?? 0) + item.height + .03) errors.push(`${sign}-${id}`)
    }
    for (const id of ['EG-kitchen-window', 'west-EG-kitchen-window']) {
      const opening = model.doors.find(door => door.id === id)!
      if (!opening) { errors.push(`missing ${id}`); continue }
      for (let step = 0; step <= 20; step++) {
        model.setOpening(id, step / 20); model.group.updateMatrixWorld(true)
        const leaf = new THREE.Box3().setFromObject(opening.pivot)
        model.group.traverse(object => {
          if (!(object instanceof THREE.Mesh) || !['kitchen-upper', 'kitchen-sink', 'cookit', 'espresso', 'toaster', 'sodastream'].includes(object.userData.furniture)) return
          if (leaf.intersectsBox(new THREE.Box3().setFromObject(object))) windowHits.push(`${id}/${step}/${object.userData.furniture}`)
        })
      }
    }
    model.setLighting({ 'EG-living': true, 'west-EG-living': false }, 'EG')
    const taskLights: { x: number; on: boolean }[] = []
    model.group.traverse(object => { if (object instanceof THREE.SpotLight && object.name === 'EG-kitchen-task-source') taskLights.push({ x: object.getWorldPosition(new THREE.Vector3()).x, on: object.visible }) })
    model.setLighting({ 'EG-living': false, 'west-EG-living': false }, 'EG')
    let taskOff = true
    model.group.traverse(object => { if (object.name === 'EG-kitchen-task-source' && object.visible) taskOff = false })
    const materials: typeof THREE.Material[] = [], unfurnished = createRoomLighting(['EG'], materials, false)
    const floatingLight = !!unfurnished.group.getObjectByName('kitchen-task-light')
    unfurnished.group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); if (object instanceof THREE.SpotLight) object.dispose() })
    materials.forEach(material => material.dispose()); model.dispose()
    return { errors, counts, windowHits, taskLights, taskOff, floatingLight }
  })
  expect(result.errors).toEqual([])
  expect(result.windowHits).toEqual([])
  expect(Object.keys(result.counts)).toHaveLength(14)
  for (const [id, count] of Object.entries(result.counts)) expect(count, id).toBeGreaterThan(3)
  expect(result.taskLights).toHaveLength(2)
  for (const light of result.taskLights) expect(light.on).toBe(light.x > 0)
  expect(result.taskOff).toBe(true)
  expect(result.floatingLight).toBe(false)
})

test('Kitchen closeups remain nonblank and framed on desktop and mobile', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  for (const id of ['kitchen-upper', 'toaster', 'sodastream', 'cookit', 'espresso']) await expect(page.locator(`[data-furniture="${id}"]`)).toHaveCount(1)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-kitchen-plan.png` })
  const captures = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('EG', false, false, true)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e5ebe7')
    scene.add(model.group, new THREE.HemisphereLight('#ffffff', '#b8b8ac', .8))
    model.setDaylight(.45); model.setLighting({ 'EG-living': false }, 'EG')
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    const wide = innerWidth > 600, width = wide ? 1200 : 390, height = wide ? 850 : 650
    renderer.setSize(width, height); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
    const camera = new THREE.PerspectiveCamera(wide ? 65 : 82, width / height, .03, 80)
    const views = [
      { name: 'corner', position: [3.55, 2.2, 5.05], target: [5.55, 1.38, 3.3] },
      { name: 'living', position: [4.4, 1.7, 7.15], target: [5.25, 1.4, 3.95] },
      { name: 'devices', position: [5.05, 1.75, 4.1], target: [5.96, 1.27, 3.04] },
    ]
    const images = views.map(view => {
      camera.position.set(...view.position); camera.lookAt(...view.target); renderer.render(scene, camera)
      return { name: view.name, image: renderer.domElement.toDataURL().split(',')[1] }
    })
    model.dispose(); renderer.dispose()
    return images
  })
  for (const capture of captures) {
    const buffer = Buffer.from(capture.image, 'base64'), png = PNG.sync.read(buffer), colors = new Set<number>()
    for (let index = 0; index < png.data.length; index += 32) colors.add((png.data[index] >> 4) * 256 + (png.data[index + 1] >> 4) * 16 + (png.data[index + 2] >> 4))
    expect(colors.size).toBeGreaterThan(30)
    await writeFile(`test-results/${testInfo.project.name}-kitchen-${capture.name}.png`, buffer)
  }
  expect(captures[0].image).not.toBe(captures[1].image)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})