import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Flurkartenumfeld im Plan: Auswahl, Massband und Gesamtansicht', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Außenanlagen', exact: true }).click()
  await page.getByRole('button', { name: 'Nachbarschaft einpassen', exact: true }).click()
  const plan = page.locator('.site-plan')
  await expect(page.locator('[data-neighbor-object="neighbor-9a"]')).toBeVisible()
  await expect(page.locator('[data-neighbor-object="neighbor-11b"]')).toBeVisible()
  await expect(page.locator('[data-neighbor-object="neighbor-10"]')).toHaveCount(0)
  await page.locator('[data-neighbor-object="neighbor-8"]').click()
  await expect(page.locator('[data-neighbor-object="neighbor-8"] polygon')).toHaveAttribute('stroke', '#247d7a')
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Schließen', exact: true }).click()
  const endpoints = await page.evaluate(async () => {
    const { neighborItems } = await import('/src/sitePlanModel.ts')
    const { siteBoundary } = await import('/src/context.ts')
    const start = neighborItems.find(item => item.id === 'neighbor-12')!.points[2], end = siteBoundary[3]
    const matrix = document.querySelector<SVGSVGElement>('.site-plan')!.getScreenCTM()!
    return { points: [start, end].map(point => { const screen = new DOMPoint(...point).matrixTransform(matrix); return { x: screen.x, y: screen.y } }), distance: Math.hypot(start[0] - end[0], start[1] - end[1]) }
  })
  await page.getByRole('button', { name: 'Maßband', exact: true }).click()
  for (const point of endpoints.points) await page.mouse.click(point.x, point.y)
  await expect(page.locator('[data-measurement="saved"]')).toHaveCount(1)
  const measured = Number.parseFloat((await page.locator('[data-measurement="saved"]').textContent())!.replace(',', '.'))
  expect(measured).toBeCloseTo(endpoints.distance, 1)
  await plan.screenshot({ path: `test-results/${testInfo.project.name}-neighborhood-plan.png` })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Nachbarschaft einpassen', exact: true }).click()
  await expect(plan).toHaveAttribute('viewBox', '-17.5 -7 35 34')
})

test('Flurkartenumfeld in 3D: gleiche Hausumrisse, freie Parzelle und Suedseite', async ({ page }, testInfo) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { boundaryDistance } = await import('/src/context.ts')
    const { neighborItems } = await import('/src/sitePlanModel.ts')
    const model = buildScene('EG', false, true, false), neighborhood = model.group.getObjectByName('neighborhood')!
    model.group.updateMatrixWorld(true)
    const errors: string[] = [], overlaps: string[] = []
    for (const item of neighborItems.filter(item => !item.id.includes('annex'))) {
      const building = neighborhood.getObjectByName(item.id)!
      const body = building.children.find(object => ['detailed-body', 'neighbor-8-body', 'neighbor-body'].includes(object.name))!
      const bounds = body.geometry.parameters
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([east, south]) => new THREE.Vector3(east * bounds.width / 2, 0, south * bounds.depth / 2).applyMatrix4(body.matrixWorld))
      corners.forEach((point, index) => {
        if (Math.hypot(point.x - item.points[index][0], point.z - item.points[index][1]) > .001) errors.push(item.id)
      })
    }
    neighborhood.traverse(object => {
      if (!object.isMesh || !['neighbor-body', 'detailed-body', 'neighbor-8-body', 'neighbor-8-garage', 'detailed-annex'].includes(object.name)) return
      const vertices = object.geometry.getAttribute('position')
      for (let index = 0; index < vertices.count; index++) {
        const point = new THREE.Vector3().fromBufferAttribute(vertices, index).applyMatrix4(object.matrixWorld)
        if ([0, 1, 2, 3].every(side => boundaryDistance([point.x, point.z], side) > .001)) overlaps.push(object.name)
      }
    })
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#edf1ed'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#9da894', 2))
    const sun = new THREE.DirectionalLight('#ffffff', 3); sun.position.set(10, 50, 35); scene.add(sun)
    const width = Math.min(innerWidth, 760), height = Math.min(innerHeight - 20, 650)
    const camera = new THREE.PerspectiveCamera(48, width / height, .1, 400)
    const distance = width < 500 ? 140 : 108
    camera.position.set(12, distance, distance * .66); camera.lookAt(0, 0, 7)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(width, height)
    renderer.domElement.setAttribute('data-neighborhood-preview', 'true'); renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999'; document.body.appendChild(renderer.domElement)
    renderer.render(scene, camera)
    window.__neighborRotate = () => { camera.position.set(-8, distance * .75, -distance * .8); camera.lookAt(0, 0, 7); renderer.render(scene, camera) }
    window.__neighborCleanup = () => { renderer.domElement.remove(); renderer.dispose(); model.dispose(); delete window.__neighborRotate }
    return { errors, overlaps, parcels: neighborhood.children.filter(object => object.name.startsWith('neighbor-parcel-') && object.name !== 'neighbor-parcel-boundary').length }
  })
  expect(result.errors).toEqual([])
  expect(result.overlaps).toEqual([])
  expect(result.parcels).toBe(19)
  const preview = page.locator('[data-neighborhood-preview]')
  const before = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-neighborhood-south.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 16) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.evaluate(() => window.__neighborRotate?.())
  const after = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-neighborhood-north.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 8) changed++
  expect(changed).toBeGreaterThan(1000)
  await page.evaluate(() => window.__neighborCleanup?.())
})