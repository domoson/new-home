import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Sommerrasen zeigt trockene Halme und gruene Restflaechen statt einer Vollfarbe', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('EG', false, true, false)
    const ground = model.group.getObjectByName('site-ground')
    const texture = ground.material.map
    const neighborLawns = model.group.getObjectByName('neighborhood').children.filter(object => object.name.startsWith('neighbor-parcel-') && object.name !== 'neighbor-parcel-boundary')
    const contextLawn = model.group.getObjectByName('context-ground').material.map
    const street = model.group.getObjectByName('neighborhood').children.find(object => object.name.startsWith('street-'))
    const surroundings = { lawns: neighborLawns.length, sameTexture: neighborLawns.every(object => object.material.map === contextLawn), lawnName: contextLawn.name, streetTexture: street.material.map.name, hedge: model.group.getObjectByName('division-hedge').material.color.getHexString() }
    const pixels = texture.image.getContext('2d').getImageData(0, 0, 512, 512).data
    let dry = 0, green = 0, darkest = 255, lightest = 0
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset] > pixels[offset + 1] + 5) dry++
      if (pixels[offset + 1] > pixels[offset]) green++
      darkest = Math.min(darkest, pixels[offset]); lightest = Math.max(lightest, pixels[offset])
    }
    const transparent = () => ({ opacity: ground.material.opacity, depthWrite: ground.material.depthWrite })
    model.setGroundOpacity(.2); const basement = transparent(); model.setGroundOpacity(1)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dce6e8'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#8c8b72', 1.3))
    const sun = new THREE.DirectionalLight('#fff7e9', 3); sun.position.set(10, 25, 15); scene.add(sun)
    const width = Math.min(innerWidth, 1000), height = Math.min(innerHeight, 760)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(width, height); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25
    renderer.domElement.dataset.lawnPreview = 'true'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999'; document.body.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(45, width / height, .05, 200)
    camera.position.set(4, 2.3, 18); camera.lookAt(2, -.2, 13); renderer.render(scene, camera)
    window.__neighborRotate = () => { camera.position.set(width < 500 ? 30 : 23, 24, 38); camera.lookAt(0, 0, 10); renderer.render(scene, camera) }
    window.__neighborCleanup = () => { renderer.domElement.remove(); renderer.dispose(); model.dispose(); delete window.__neighborRotate }
    return { dry: dry / (512 * 512), green: green / (512 * 512), darkest, lightest, name: texture.name, repeat: texture.repeat.toArray(), roughness: ground.material.roughness, basement, restored: transparent(), surroundings }
  })
  expect(result.name).toBe('summer-lawn')
  expect(result.surroundings.lawns).toBeGreaterThan(10)
  expect(result.surroundings.sameTexture).toBe(true)
  expect(result.surroundings.lawnName).toBe('summer-lawn')
  expect(result.surroundings.streetTexture).not.toBe('summer-lawn')
  expect(result.surroundings.hedge).toBe('546333')
  expect(result.repeat).toEqual([.125, .125])
  expect(result.dry).toBeGreaterThan(.4)
  expect(result.green).toBeGreaterThan(.02)
  expect(result.lightest - result.darkest).toBeGreaterThan(50)
  expect(result.roughness).toBe(1)
  expect(result.basement).toEqual({ opacity: .2, depthWrite: false })
  expect(result.restored).toEqual({ opacity: 1, depthWrite: true })
  const preview = page.locator('[data-lawn-preview]')
  const before = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-summer-lawn-detail.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 16) colors.add(`${before.data[offset]},${before.data[offset + 1]},${before.data[offset + 2]}`)
  expect(colors.size).toBeGreaterThan(200)
  await page.evaluate(() => window.__neighborRotate?.())
  const after = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-summer-lawn-overview.png` }))
  expect(Buffer.compare(before.data, after.data)).not.toBe(0)
  await page.evaluate(() => window.__neighborCleanup?.())
  expect(errors).toEqual([])
})

test('Luftbildbestand: Gesamtansicht von oben und aus Sueden', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('EG', false, true, false)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#edf1ed'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#9da894', 2))
    const sun = new THREE.DirectionalLight('#ffffff', 3); sun.position.set(10, 50, 35); scene.add(sun)
    const width = Math.min(innerWidth, 1000), height = Math.min(innerHeight, 800), aspect = width / height
    const halfHeight = Math.max(55, 55 / aspect)
    const camera = new THREE.OrthographicCamera(-halfHeight * aspect, halfHeight * aspect, halfHeight, -halfHeight, .1, 400)
    camera.position.set(0, 150, 6); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 6)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(width, height)
    renderer.domElement.dataset.vegetationOverview = 'true'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999'; document.body.appendChild(renderer.domElement)
    renderer.render(scene, camera)
    window.__neighborRotate = () => { camera.up.set(0, 1, 0); camera.position.set(0, 90, 105); camera.lookAt(0, 0, 6); renderer.render(scene, camera) }
    window.__neighborCleanup = () => { renderer.domElement.remove(); renderer.dispose(); model.dispose(); delete window.__neighborRotate }
  })
  const preview = page.locator('[data-vegetation-overview]')
  const before = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-vegetation-overhead.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 16) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.evaluate(() => window.__neighborRotate?.())
  const after = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-vegetation-south.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 8) changed++
  expect(changed).toBeGreaterThan(1000)
  await page.evaluate(() => window.__neighborCleanup?.())
})

test('Umgebungsbaeume: gegliederte Kronen, keine Kugelbaeume im Garten und sichtbares Laub', async ({ page }, testInfo) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { boundaryDistance } = await import('/src/context.ts')
    const { contextVegetation } = await import('/src/contextVegetation.ts')
    const model = buildScene('EG', false, true, false)
    const neighborhood = model.group.getObjectByName('neighborhood')!, garden = model.group.getObjectByName('landscaping')!
    model.group.updateMatrixWorld(true)
    const trees = [], leaves = []
    neighborhood.traverse(object => {
      if (object.name === 'context-tree' || object.name === 'detailed-copper-beech') trees.push(object)
      if (object.name === 'context-tree-foliage') leaves.push(object)
    })
    const inside = trees.filter(tree => {
      const point = tree.getWorldPosition(new THREE.Vector3())
      return [0, 1, 2, 3].every(side => boundaryDistance([point.x, point.z], side) > 0)
    }).length
    const gardenCrowns = garden.children.filter(object => object.isMesh && object.geometry.type === 'IcosahedronGeometry')
    const placementErrors = contextVegetation.filter(spec => {
      const tree = trees.find(tree => tree.userData.aerialCrown === spec.id)
      if (!tree) return true
      const position = tree.getWorldPosition(new THREE.Vector3())
      return Math.hypot(position.x - spec.center[0], position.z - spec.center[1]) > .00001
    }).map(spec => spec.id)
    const beech = neighborhood.getObjectByName('detailed-copper-beech')!
    const bounds = new THREE.Box3().setFromObject(beech), center = bounds.getCenter(new THREE.Vector3())
    const width = Math.min(innerWidth, 900), height = Math.min(innerHeight, 720)
    const camera = new THREE.PerspectiveCamera(45, width / height, .1, 300)
    const distance = width < 500 ? 1.4 : 1
    camera.position.copy(center).add(new THREE.Vector3(12, 12, 24).multiplyScalar(distance)); camera.lookAt(center)
    camera.updateMatrixWorld()
    const framed = [bounds.min.x, bounds.max.x].every(east => [bounds.min.y, bounds.max.y].every(up => [bounds.min.z, bounds.max.z].every(south => {
      const point = new THREE.Vector3(east, up, south).project(camera)
      return Math.abs(point.x) < .95 && Math.abs(point.y) < .95 && point.z > -1 && point.z < 1
    })))
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#edf1ed'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#9da894', 2))
    const sun = new THREE.DirectionalLight('#ffffff', 3); sun.position.set(10, 50, 35); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(width, height)
    renderer.domElement.dataset.treePreview = 'true'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999'; document.body.appendChild(renderer.domElement)
    renderer.render(scene, camera)
    window.__neighborRotate = () => { leaves.forEach(leaf => { leaf.visible = false }); renderer.render(scene, camera) }
    window.__neighborCleanup = () => { renderer.domElement.remove(); renderer.dispose(); model.dispose(); delete window.__neighborRotate }
    return { inside, count: trees.length, leaves: leaves.length, framed, placementErrors, gardenHeights: gardenCrowns.map(crown => crown.position.y), gardenColors: gardenCrowns.map(crown => crown.material.color.getHexString()), gardenCrowns: gardenCrowns.length, gardenHasNewTrees: !!garden.getObjectByName('context-tree'), instances: leaves.every(leaf => leaf.isInstancedMesh && leaf.count === 56) }
  })
  expect(result.inside).toBe(0)
  expect(result.count).toBe(63)
  expect(result.placementErrors).toEqual([])
  expect(result.gardenHeights).toEqual([])
  expect(result.gardenColors).toEqual([])
  expect(result.leaves).toBe(result.count)
  expect(result.instances).toBe(true)
  expect(result.framed).toBe(true)
  expect(result.gardenCrowns).toBe(0)
  expect(result.gardenHasNewTrees).toBe(false)
  const preview = page.locator('[data-tree-preview]')
  const before = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-context-trees.png` }))
  await page.evaluate(() => window.__neighborRotate?.())
  const after = PNG.sync.read(await preview.screenshot())
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 4) if (Math.abs(before.data[offset] - after.data[offset]) + Math.abs(before.data[offset + 1] - after.data[offset + 1]) + Math.abs(before.data[offset + 2] - after.data[offset + 2]) > 30) changed++
  expect(changed).toBeGreaterThan(1500)
  await page.evaluate(() => window.__neighborCleanup?.())
})