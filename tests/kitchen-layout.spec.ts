import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'

test('Inselunterschraenke fuellen die Platte mit freier Hockernische', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('[data-furniture="peninsula"] [data-kitchen-module]')).toHaveCount(6)
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor } = await import('/src/model.ts')
    const { kitchenModules } = await import('/src/kitchenStorage.ts')
    const model = buildScene('EG', false, false, true), island = makeFloor('EG').furniture.find(item => item.id === 'peninsula')
    model.group.updateMatrixWorld(true)
    const boxes = model.colliders.map(collider => new THREE.Box3().setFromCenterAndSize(collider.position, collider.size))
    const modules = kitchenModules(island).map(module => {
      const body = model.group.getObjectByName(`${module.id}-base`), front = model.group.getObjectByName(`kitchen-module-${module.id}`)
      const bounds = new THREE.Box3().setFromObject(body), center = new THREE.Vector3(module.x + module.width / 2, .45, module.z + module.depth / 2)
      return { id: module.id, front: front.userData.kitchenModule.front, filled: bounds.containsPoint(center), collides: boxes.some(box => box.containsPoint(center)), height: bounds.max.y, x: bounds.min.x, z: bounds.min.z }
    })
    const niche = []
    for (const east of [4.4, 4.65, 4.95, 5.25, 5.5]) for (const south of [5.61, 5.75, 5.84]) niche.push(!boxes.some(box => box.containsPoint(new THREE.Vector3(east, .45, south))))
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e5ebe7')
    scene.add(model.group, new THREE.HemisphereLight('#ffffff', '#b8b8ac', 2))
    const light = new THREE.DirectionalLight('#ffffff', 2.5); light.position.set(4, 8, 7); scene.add(light)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    const width = innerWidth > 600 ? 1200 : 390, height = innerWidth > 600 ? 850 : 720
    renderer.setSize(width, height)
    const camera = new THREE.PerspectiveCamera(innerWidth > 600 ? 60 : 80, width / height, .03, 80)
    const captures = [
      { name: 'south-west', position: [3.15, 1.6, 7.4], target: [5, .65, 5.45] },
      { name: 'stools', position: [5.2, 1.25, 7.6], target: [4.95, .6, 5.65] },
      { name: 'cooking', position: [4.8, 1.5, 3.75], target: [5.1, .65, 5.45] },
    ].map(view => {
      camera.position.set(...view.position); camera.lookAt(...view.target); renderer.render(scene, camera)
      return { name: view.name, image: renderer.domElement.toDataURL().split(',')[1] }
    })
    model.dispose(); renderer.dispose()
    return { modules, niche, captures }
  })
  expect(result.modules).toHaveLength(6)
  for (const module of result.modules) {
    expect(module.filled, module.id).toBe(true)
    expect(module.collides, module.id).toBe(true)
    expect(module.height).toBeCloseTo(.89)
  }
  expect(result.modules.filter(module => module.front === 'west')).toHaveLength(2)
  expect(result.modules.filter(module => module.front === 'south')).toHaveLength(2)
  expect(result.niche.every(Boolean)).toBe(true)
  const images = []
  for (const capture of result.captures) {
    const buffer = Buffer.from(capture.image, 'base64'), image = PNG.sync.read(buffer), colors = new Set<number>()
    for (let offset = 0; offset < image.data.length; offset += 16) colors.add((image.data[offset] >> 4) * 256 + (image.data[offset + 1] >> 4) * 16 + (image.data[offset + 2] >> 4))
    expect(colors.size).toBeGreaterThan(30)
    await writeFile(`test-results/${testInfo.project.name}-island-${capture.name}.png`, buffer)
    images.push(image)
  }
  let changed = 0
  for (let offset = 0; offset < images[0].data.length; offset += 16) if (Math.abs(images[0].data[offset] - images[1].data[offset]) > 30) changed++
  expect(changed).toBeGreaterThan(200)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

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