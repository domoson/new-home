import { expect, test } from '@playwright/test'
import type { Mesh, MeshStandardMaterial } from 'three'
import { PNG } from 'pngjs'

test('Traufstreifen: Kies und freie Lichtschächte in Außenanlagen und 3D', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Außenanlagen', exact: true }).click()
  await expect(page.locator('[data-splash-strip] path')).toHaveCount(1)
  await expect(page.locator('[data-site-light-well]')).toHaveCount(4)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-splash-strip-plan.png` })
  const result = await page.evaluate(async () => {
    const scenePath = '/src/scene.ts', stripPath = '/src/splashStrip.ts', threePath = '/node_modules/.vite/deps/three.js'
    const { buildScene } = await import(scenePath), { splashStripParts, splashStripLevel } = await import(stripPath), THREE = await import(threePath)
    const model = buildScene('EG', false, true, false)
    const garden = model.group.getObjectByName('landscaping'), strip = garden.getObjectByName('splash-strip')
    model.group.updateMatrixWorld(true)
    const boundsMatch = strip.children.every((mesh: Mesh, index: number) => {
      const bounds = new THREE.Box3().setFromObject(mesh), part = splashStripParts[index]
      return Math.abs(bounds.min.x - part.x) < 1e-5 && Math.abs(bounds.max.x - part.x - part.width) < 1e-5 && Math.abs(bounds.min.z - part.z) < 1e-5 && Math.abs(bounds.max.z - part.z - part.depth) < 1e-5 && Math.abs(bounds.min.y - splashStripLevel) < 1e-5 && Math.abs(bounds.max.y - splashStripLevel) < 1e-5
    })
    const material = strip.children[0].material, texture = material.map
    const texturePixels = texture.image.getContext('2d').getImageData(0, 0, 256, 256).data
    const shades = new Set<number>()
    for (let offset = 0; offset < texturePixels.length; offset += 4) shades.add(texturePixels[offset])
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e8ece8'); scene.add(model.group)
    model.group.getObjectByName('neighborhood').visible = false
    scene.add(new THREE.HemisphereLight('#ffffff', '#8c8b72', 1.5))
    const sun = new THREE.DirectionalLight('#fff7ef', 2.5); sun.position.set(10, 25, 15); scene.add(sun)
    const width = Math.min(innerWidth, 1000), height = Math.min(innerHeight, 760)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(width, height); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15
    renderer.domElement.dataset.stripPreview = 'true'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999'; document.body.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(45, width / height, .05, 200)
    camera.position.set(8.8, 2.8, 10.8); camera.lookAt(7.1, -.1, 8.9); renderer.render(scene, camera)
    Object.assign(window, {
      __stripHide: () => { strip.visible = false; renderer.render(scene, camera) },
      __stripRotate: () => { strip.visible = true; camera.position.set(width < 500 ? 34 : 23, 24, width < 500 ? 39 : 30); camera.lookAt(0, 1, 5); renderer.render(scene, camera) },
      __stripCleanup: () => { renderer.domElement.remove(); renderer.dispose(); model.dispose() },
    })
    return { boundsMatch, count: strip.children.length, expectedCount: splashStripParts.length, texture: texture.name, shades: shades.size, roughness: material.roughness, inGarden: strip.parent === garden }
  })
  expect(result.boundsMatch).toBe(true)
  expect(result.count).toBe(result.expectedCount)
  expect(result.texture).toBe('splash-strip-gravel')
  expect(result.shades).toBeGreaterThan(5)
  expect(result.roughness).toBe(1)
  expect(result.inGarden).toBe(true)
  const preview = page.locator('[data-strip-preview]')
  const detail = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-splash-strip-detail.png` }))
  await page.evaluate(() => window.__stripHide())
  const without = PNG.sync.read(await preview.screenshot())
  let changed = 0
  for (let offset = 0; offset < detail.data.length; offset += 4) if (Math.abs(detail.data[offset] - without.data[offset]) > 8) changed++
  expect(changed).toBeGreaterThan(100)
  await page.evaluate(() => window.__stripRotate())
  const overview = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-splash-strip-overview.png` }))
  expect(Buffer.compare(detail.data, overview.data)).not.toBe(0)
  const colors = new Set<string>()
  for (let offset = 0; offset < overview.data.length; offset += 16) colors.add(`${overview.data[offset] >> 4},${overview.data[offset + 1] >> 4},${overview.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.evaluate(() => window.__stripCleanup())
  expect(errors).toEqual([])
})

test('Grundstuecksgrenzen, Garten und deckende kollidierende Tueren', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', {name: '3D', exact: true}).click()
  await page.getByRole('button', {name: 'Dach', exact: true}).click()
  await expect.poll(() => page.evaluate(() => window.__house?.snapshot().site)).toBe(true)
  const probe = await page.evaluate(async () => {
    const scenePath = '/src/scene.ts', contextPath = '/src/context.ts', walkPath = '/src/walk.ts', threePath = '/node_modules/.vite/deps/three.js'
    const {buildScene} = await import(scenePath), {boundaryDistance, boundaryZ} = await import(contextPath), {initializePhysics, createWalker} = await import(walkPath), THREE = await import(threePath)
    const model = buildScene('EG', true, true, false)
    const doors = model.doors.filter((door: {kind: string}) => door.kind === 'door')
    const opaque = doors.filter((door: {id: string}) => !door.id.endsWith('EG-terrace')).every((door: {object: Mesh}) => {
      const material = door.object.material as MeshStandardMaterial
      return material.opacity === 1 && !material.transparent && material.depthWrite
    })
    const terrace = doors.find((door: {id: string}) => door.id === 'EG-terrace')?.object as Mesh | undefined
    const terraceMaterial = terrace?.material as MeshStandardMaterial | undefined
    const terraceGlass = terrace?.userData.glazing === true && terraceMaterial?.transparent === true && terraceMaterial.opacity < 1 && terraceMaterial.depthWrite === false
    const garden = model.group.getObjectByName('landscaping')
    model.group.updateMatrixWorld(true)
    const deckBounds: { min: number[]; max: number[]; area: number }[] = []
    model.group.traverse((object: Mesh) => {
      if (!object.isMesh || !object.name.endsWith('terrace-base')) return
      const bounds = new THREE.Box3().setFromObject(object), size = bounds.getSize(new THREE.Vector3())
      deckBounds.push({ min: bounds.min.toArray(), max: bounds.max.toArray(), area: size.x * size.z })
    })
    const hedges = garden.children.filter((mesh: Mesh) => mesh.name === 'division-hedge').map((mesh: Mesh) => new THREE.Box3().setFromObject(mesh))
    const gardenMeshes: Mesh[] = []
    garden.traverse((object: Mesh) => { if (object.isMesh && object.name !== 'boundary-fence') gardenMeshes.push(object) })
    const outside = gardenMeshes.flatMap((mesh: Mesh) => {
      const positions = mesh.geometry.getAttribute('position')
      const distances = Array.from({length: positions.count}, (_, index) => {
        const point = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld)
        return Math.min(...[0, 1, 2, 3].map(side => boundaryDistance([point.x, point.z], side)))
      })
      return Math.min(...distances) < -.02 ? [{name: mesh.name, distance: Math.min(...distances)}] : []
    })
    await initializePhysics()
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(5.9, 0, 1.6))
    const movements = []
    for (const side of [1, -1]) {
      const south = side === 1 ? 1.6 : 2.8, id = `${side === 1 ? '' : 'west-'}EG-entrance`
      walker.teleport(new THREE.Vector3(side * 5.2, 0, south))
      const closed = walker.setOpening(id, 0)
      camera.rotation.set(0, -side * Math.PI / 2, 0, 'YXZ')
      walker.keys.add('KeyW'); for (let frame = 0; frame < 100; frame++) walker.tick(); walker.keys.clear()
      const blocked = side * walker.position().x
      walker.teleport(new THREE.Vector3(side * 5.2, 0, south))
      const opened = walker.setOpening(id, 1)
      camera.rotation.set(0, -side * Math.PI / 2, 0, 'YXZ')
      walker.keys.add('KeyW'); for (let frame = 0; frame < 100; frame++) walker.tick(); walker.keys.clear()
      movements.push({closed, opened, blocked, passed: side * walker.position().x})
    }
    const streets = ['street-an-der-roeth', 'street-hallerstrasse'].every(name => !!model.group.getObjectByName(name))
    const hedgeEnds = [hedges[0].min.z, hedges[1].max.z], division = [boundaryZ(0, 0), boundaryZ(0, 2)]
    walker.dispose(); model.dispose()
    return {opaque, terraceGlass, outside, streets, hedgeEnds, division, movements, deckBounds}
  })
  expect(probe.opaque).toBe(true)
  expect(probe.terraceGlass).toBe(true)
  expect(probe.deckBounds).toHaveLength(4)
  for (const sign of [1, -1]) {
    const parts = probe.deckBounds.filter(bounds => sign * bounds.min[0] > 0)
    expect(parts).toHaveLength(2)
    expect(parts.reduce((area, bounds) => area + bounds.area, 0)).toBeCloseTo(16.125)
    const main = parts.find(bounds => bounds.area > 10)!
    expect(main.min[0]).toBeCloseTo(sign === 1 ? 2.75 : -7.75)
    expect(main.min[2]).toBeCloseTo(sign === 1 ? 10 : 11.2)
    expect(main.max[2] - main.min[2]).toBeCloseTo(3)
  }
  expect(probe.outside).toEqual([])
  expect(probe.streets).toBe(true)
  for (const [index, end] of probe.hedgeEnds.entries()) expect(Math.abs(end - probe.division[index])).toBeLessThan(.04)
  for (const movement of probe.movements) {
    expect(movement.closed).toBe(true); expect(movement.opened).toBe(true)
    expect(movement.blocked).toBeLessThan(6.6); expect(movement.blocked).toBeGreaterThan(6.4)
    expect(movement.passed).toBeGreaterThan(7.8)
  }
  await page.locator('.scene-settings summary').click()
  for (const name of ['Gelände transparent', 'Nachbarschaft', 'Garten, Hecke und Zaun']) await expect(page.getByRole('checkbox', { name, exact: true })).toHaveCount(1)
  await page.locator('.scene-settings summary').click()
  const image = PNG.sync.read(await page.locator('canvas').screenshot())
  const colors = new Set<string>()
  for (let offset = 0; offset < image.data.length; offset += 16) colors.add(`${image.data[offset] >> 4},${image.data[offset + 1] >> 4},${image.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.screenshot({path: `test-results/${testInfo.project.name}-real-site.png`})
})