import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Grauer Leon steht masshaltig nur im Ost-Carport', async ({ page }, testInfo) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { siteParking } = await import('/src/parking.ts')
    const model = buildScene('EG', true, true, true)
    model.group.updateMatrixWorld(true)
    const car = model.group.getObjectByName('seat-leon-st-grey')!
    const parking = model.group.getObjectByName('parking-area-east')!
    const placement = siteParking.find(placement => placement.side === 'east')!
    const bounds = new THREE.Box3()
    car.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const vertices = object.geometry.getAttribute('position')
      for (let index = 0; index < vertices.count; index++) bounds.expandByPoint(parking.worldToLocal(new THREE.Vector3().fromBufferAttribute(vertices, index).applyMatrix4(object.matrixWorld)))
    })
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e6ecee'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#7e887b', 2))
    const sun = new THREE.DirectionalLight('#ffffff', 3); sun.position.set(5, 10, 20); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(Math.min(720, innerWidth - 16), 440); renderer.setPixelRatio(1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.dataset.carPreview = 'true'; renderer.domElement.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999'; document.body.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(48, renderer.domElement.width / 440, .05, 180)
    const view = (east: number, height: number, south: number, targetHeight: number) => {
      const position = placement.point(east, south), target = placement.point(placement.carport.width / 2, 3)
      camera.position.set(position[0], height, position[1]); camera.lookAt(target[0], targetHeight, target[1]); renderer.render(scene, camera)
    }
    view(-3.8, 2.7, 10.8, .9)
    Object.assign(window, { carPreview: { model, renderer, view } })
    const front = parking.worldToLocal(car.localToWorld(new THREE.Vector3(0, 0, 2.321)))
    return { frontZ: front.z, size: bounds.getSize(new THREE.Vector3()).toArray(), parent: car.parent!.name, westCar: !!model.group.getObjectByName('parking-area-west')!.getObjectByName(car.name), clearances: [bounds.min.x - .16, 3.09 - bounds.max.x, bounds.min.z - .08, 6 - bounds.max.z], bottom: bounds.min.y }
  })
  expect(result.parent).toBe('parking-area-east'); expect(result.westCar).toBe(false)
  expect(result.frontZ).toBeCloseTo(.679, 5)
  for (const [index, expected] of [1.991, 1.448, 4.642].entries()) expect(result.size[index]).toBeCloseTo(expected, 5)
  expect(result.bottom).toBeCloseTo(-.1)
  expect(Math.min(...result.clearances)).toBeGreaterThan(.34)
  const canvas = page.locator('[data-car-preview]')
  const before = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-leon-carport.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 16) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(35)
  await page.evaluate(() => (window as any).carPreview.view(5.5, 1.8, 9.4, .65))
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-leon-front.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 10) changed++
  expect(changed).toBeGreaterThan(500)
  await page.evaluate(() => { const preview = (window as any).carPreview; preview.model.dispose(); preview.renderer.dispose(); preview.renderer.domElement.remove(); delete (window as any).carPreview })
})