import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Ziegelreihen auf beiden Dachseiten folgen den getrennten Dachfarben', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const colors = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('EG', false, true, true)
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
    return { samples, westBefore, westAfter, westExpected: new THREE.Color('#b45c42').multiplyScalar(.72).getHexString() }
  })
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