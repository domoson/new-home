import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Standard-Dachfenster bleiben mittig unter der Spitzbodendecke und frei beweglich', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'DG', exact: true }).click()
  await expect(page.locator('[data-roof-window]')).toHaveCount(2)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-skylight-plan.png` })
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { OBB } = await import('/node_modules/three/examples/jsm/math/OBB.js')
    const { buildScene } = await import('/src/scene.ts')
    const { roofWindows, roofInnerElevation, roofOuterElevation, elevations, atticCeiling, atticCeilingPanels, makeFloor, furnitureVolumes } = await import('/src/model.ts')
    const model = buildScene('DG', false, true, true)
    const obstacles = makeFloor('DG').furniture.flatMap(item => furnitureVolumes(item).map(part => ({ id: item.id, box: new OBB(new THREE.Vector3(part.x + part.width / 2, elevations.DG + part.bottom + part.height / 2, part.z + part.depth / 2), new THREE.Vector3(part.width / 2, part.height / 2, part.depth / 2)) })))
    const collisions: string[] = [], hidden: string[] = []
    let maxHeight = 0
    const windows = model.doors.filter(door => door.id.endsWith('-skylight'))
    for (const window of roofWindows) {
      const door = windows.find(door => door.id === window.id)!
      for (let step = 0; step <= 20; step++) {
        model.setOpening(door.id, step / 20); model.group.updateMatrixWorld(true)
        const leaf = new OBB(new THREE.Vector3(), door.size.clone().multiplyScalar(.5)).applyMatrix4(door.pivot.matrixWorld)
        leaf.center.copy(door.center).applyMatrix4(door.pivot.matrixWorld)
        for (const obstacle of obstacles) if (leaf.intersectsOBB(obstacle.box)) collisions.push(`${door.id}:${step}:${obstacle.id}`)
        door.pivot.traverse(object => {
          if (!object.isMesh) return
          const points = object.geometry.getAttribute('position')
          for (let index = 0; index < points.count; index++) {
            const point = new THREE.Vector3().fromBufferAttribute(points, index).applyMatrix4(object.matrixWorld)
            if (step === 0) maxHeight = Math.max(maxHeight, point.y - elevations.DG)
            if (point.y >= elevations.DG + atticCeiling.height && atticCeilingPanels().some(part => point.x >= part.x && point.x <= part.x + part.width && point.z >= part.z && point.z <= part.z + part.depth)) collisions.push(`${door.id}:${step}:ceiling`)
            const inside = point.x > window.x + .04 && point.x < window.x + window.width - .04 && point.z > window.z + .04 && point.z < window.z + window.depth - .04
            if (!inside && point.y > roofInnerElevation(point.z) && point.y < roofOuterElevation(point.z) + .02) collisions.push(`${door.id}:${step}:roof-frame`)
          }
        })
      }
      model.setOpening(door.id, 0); model.group.updateMatrixWorld(true)
      const center = door.object.getWorldPosition(new THREE.Vector3())
      const normal = new THREE.Vector3(0, Math.cos(35 * Math.PI / 180), (window.z < 5.25 ? -1 : 1) * Math.sin(35 * Math.PI / 180))
      const ray = new THREE.Raycaster(center.clone().addScaledVector(normal, -.8), normal, 0, .79)
      const roofParts = model.group.children.filter(object => object.name === 'main-roof-panel' || object.name === 'attic-ceiling' || object.name === `${door.id}-lining`)
      if (ray.intersectObjects(roofParts).length) hidden.push(door.id)
    }
    const westPanels = model.group.getObjectByName('house-west')!.children.filter(object => object.name === 'main-roof-panel').length
    model.group.getObjectByName('neighborhood')!.visible = false
    model.group.getObjectByName('landscaping')!.visible = false
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dce6e8'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#829181', 2))
    const sun = new THREE.DirectionalLight('#fff5e6', 2); sun.position.set(10, 18, -12); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(Math.min(760, innerWidth - 16), 440); renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.dataset.skylightPreview = 'true'; renderer.domElement.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999'; document.body.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(50, renderer.domElement.width / 440, .05, 150)
    const view = (south: boolean, inside = false, open = false) => {
      const window = roofWindows[south ? 1 : 0]
      model.setOpening(window.id, open ? 1 : 0)
      const centerZ = window.z + window.depth / 2
      if (inside) camera.position.set(3.45, elevations.DG + (south ? 1.55 : 1.2), south ? 6.5 : 3.15)
      else camera.position.set(3.45, 11.5, south ? 14 : -3.5)
      camera.lookAt(3.45, roofOuterElevation(centerZ), centerZ)
      renderer.render(scene, camera)
    }
    view(false)
    Object.assign(window, { skylightPreview: { model, renderer, view } })
    return { collisions: [...new Set(collisions)], hidden, maxHeight, ceiling: atticCeiling.height, count: windows.length, westPanels }
  })
  expect(result.count).toBe(2)
  expect(result.westPanels).toBe(2)
  expect(result.collisions).toEqual([])
  expect(result.hidden).toEqual([])
  expect(result.maxHeight).toBeLessThan(result.ceiling)
  const canvas = page.locator('[data-skylight-preview]')
  const north = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-skylight-north.png` }))
  expect(new Set(Array.from({ length: north.width * north.height }, (_, index) => north.data.subarray(index * 4, index * 4 + 3).toString('hex'))).size).toBeGreaterThan(100)
  await page.evaluate(() => (window as any).skylightPreview.view(true))
  const south = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-skylight-south.png` }))
  let changed = 0
  for (let offset = 0; offset < north.data.length; offset += 4) if (Math.abs(north.data[offset] - south.data[offset]) > 8) changed++
  expect(changed).toBeGreaterThan(200)
  for (const side of ['north', 'south']) {
    await page.evaluate(south => (window as any).skylightPreview.view(south, true), side === 'south')
    const closed = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-skylight-${side}-inside.png` }))
    await page.evaluate(south => (window as any).skylightPreview.view(south, true, true), side === 'south')
    const open = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-skylight-${side}-open.png` }))
    let moved = 0
    for (let offset = 0; offset < closed.data.length; offset += 4) if (Math.abs(closed.data[offset] - open.data[offset]) > 8) moved++
    expect(moved).toBeGreaterThan(50)
  }
  await page.evaluate(() => { const preview = (window as any).skylightPreview; preview.model.dispose(); preview.renderer.dispose(); preview.renderer.domElement.remove(); delete (window as any).skylightPreview })
  expect(errors).toEqual([])
})

test('Ziegelreihen auf beiden Dachseiten folgen den getrennten Dachfarben', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const colors = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('EG', false, true, true)
    const drainage: { name: string; geometry: string; minX: number; maxX: number; minY: number; maxY: number; color?: string; metalness?: number }[] = []
    model.group.traverse(object => {
      if (!object.name.startsWith('main-')) return
      const bounds = new THREE.Box3().setFromObject(object)
      const material = Array.isArray(object.material) ? object.material[0] : object.material
      drainage.push({ name: object.name, geometry: object.geometry.type, minX: bounds.min.x, maxX: bounds.max.x, minY: bounds.min.y, maxY: bounds.max.y, color: material.color?.getHexString(), metalness: material.metalness })
    })
    const east = model.group.children.find(object => object.name === 'roof-tile-courses')!
    const west = model.group.getObjectByName('house-west')!.getObjectByName('roof-tile-courses')!
    const westBefore = west.material.color.getHexString()
    const samples = ['#858e92', '#b45c42', '#313638'].map(color => {
      model.setFinish('roof', color, 'east')
      return { actual: east.material.color.getHexString(), expected: new THREE.Color(color).multiplyScalar(.72).getHexString(), west: west.material.color.getHexString() }
    })
    model.setFinish('roof', '#858e92', 'east'); model.setFinish('roof', '#b45c42', 'west')
    const westAfter = west.material.color.getHexString()
    model.group.getObjectByName('neighborhood')!.visible = false
    model.group.getObjectByName('landscaping')!.visible = false
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dce6e8'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#829181', 1.5))
    const sun = new THREE.DirectionalLight('#fff5e6', 2); sun.position.set(10, 18, -12); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(Math.min(760, innerWidth - 16), 440); renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.dataset.roofPreview = 'true'; renderer.domElement.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999'; document.body.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(45, renderer.domElement.width / 440, .05, 150)
    const view = (south: boolean) => {
      const distance = innerWidth < 600 ? 20 : 14
      camera.position.set(south ? -3.8 : 3.8, 12.5, south ? 5 + distance : 5 - distance)
      camera.lookAt(south ? -3.8 : 3.8, 8, south ? 8 : 2.5)
      renderer.render(scene, camera)
    }
    const render = (visible: boolean) => { east.visible = west.visible = visible; renderer.render(scene, camera) }
    view(false)
    Object.assign(window, { roofPreview: { model, renderer, view, render } })
    return { samples, drainage, westBefore, westAfter, westExpected: new THREE.Color('#b45c42').multiplyScalar(.72).getHexString() }
  })
  expect(colors.drainage.filter(item => item.name.startsWith('main-gutter-'))).toHaveLength(4)
  expect(colors.drainage.filter(item => item.name.endsWith('-inner'))).toHaveLength(4)
  expect(colors.drainage.filter(item => item.name.endsWith('-elbow'))).toHaveLength(4)
  expect(colors.drainage.find(item => item.name === 'main-gutter-north')?.geometry).toBe('CylinderGeometry')
  expect(colors.drainage.find(item => item.name === 'main-downpipe-north-inner')?.geometry).toBe('CylinderGeometry')
  expect(colors.drainage.find(item => item.name === 'main-gutter-north')?.color).toBe('d6dbdc')
  expect(colors.drainage.find(item => item.name === 'main-gutter-north')?.metalness).toBeCloseTo(.35)
  expect(colors.drainage.filter(item => item.name.endsWith('-inner')).every(item => item.minY < -.13 && item.maxY > 5.8 && Math.min(Math.abs(item.minX), Math.abs(item.maxX)) > .4)).toBe(true)
  for (const sample of colors.samples) { expect(sample.actual).toBe(sample.expected); expect(sample.west).toBe(colors.westBefore) }
  expect(colors.westAfter).toBe(colors.westExpected)
  const canvas = page.locator('[data-roof-preview]')
  const detailed = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-roof-tiles-grey.png` }))
  await page.evaluate(() => (window as any).roofPreview.render(false))
  const plain = PNG.sync.read(await canvas.screenshot())
  let changed = 0
  for (let offset = 0; offset < detailed.data.length; offset += 4) if (Math.abs(detailed.data[offset] - plain.data[offset]) > 8) changed++
  expect(changed).toBeGreaterThan(200)
  await page.evaluate(() => { const preview = (window as any).roofPreview; preview.render(true); preview.view(true) })
  await canvas.screenshot({ path: `test-results/${testInfo.project.name}-roof-tiles-red.png` })
  await page.evaluate(() => { const preview = (window as any).roofPreview; preview.model.dispose(); preview.renderer.dispose(); preview.renderer.domElement.remove(); delete (window as any).roofPreview })
  expect(errors).toEqual([])
})