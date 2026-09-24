import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Fassaden: acht Kompositionen, Holztoene und Lamellen ohne Kamerasprung', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' || (message.type() === 'warn' && message.text().startsWith('THREE.'))) errors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.snapshot().site)).toBe(true)
  const probe = await page.evaluate(async () => {
    const facadePath = '/src/facade.ts', scenePath = '/src/scene.ts', threePath = '/node_modules/.vite/deps/three.js'
    const { createFacadeMaterial } = await import(facadePath), { buildScene } = await import(scenePath), THREE = await import(threePath)
    const { house } = await import('/src/model.ts')
    const texture = new THREE.DataTexture(new Uint8Array([180, 120, 60, 255]), 1, 1); texture.needsUpdate = true
    const finish = createFacadeMaterial(texture), renderer = new THREE.WebGLRenderer(), target = new THREE.WebGLRenderTarget(8, 8)
    renderer.setSize(8, 8); renderer.setRenderTarget(target)
    const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-.01, .01, .01, -.01, .01, 5)
    const geometry = new THREE.PlaneGeometry(.02, .02), mesh = new THREE.Mesh(geometry, finish.material)
    scene.add(mesh, new THREE.AmbientLight('#ffffff', 2))
    const sample = (x: number, y: number, z: number, mode: string, profile = 'boards') => {
      finish.setComposition(mode, 0, profile); mesh.position.set(x, y, z); camera.position.set(x, y, z + 1); camera.lookAt(x, y, z)
      renderer.render(scene, camera); const pixels = new Uint8Array(4); renderer.readRenderTargetPixels(target, 4, 4, 1, 1, pixels); return [...pixels]
    }
    const outerX = house.width - .1, innerX = house.east + .035
    const outer = sample(outerX, 3.5, 4.2, 'timber'), inner = sample(innerX, 3.5, 4.2, 'timber'), white = sample(innerX, 3.5, 4.2, 'plaster'), corner = sample(house.width - .3, 3.5, .1, 'timber'), gableReturn = sample(outerX, 7, 4.2, 'gable')
    const exteriorPlaster = sample(outerX, 7, 4.2, 'plaster'), og = sample(outerX, 3.5, 4.2, 'og'), dg = sample(outerX, 7, 4.2, 'og'), entry = sample(outerX, 1, 1.5, 'og-entry'), gap = sample(outerX, 3.5, 4.28, 'og', 'open-slats'), slat = sample(outerX, 3.5, 4.2, 'og', 'open-slats')
    const entrySurround = [[1, .2], [1, 1.8], [2.6, 1]].map(([height, south]) => sample(outerX, height, south, 'entry'))
    const outsideEntry = [[1, 2], [2.75, 1]].map(([height, south]) => sample(outerX, height, south, 'entry'))
    const { initialSettings } = await import('/src/context.ts')
    const model = buildScene('EG', false, true, false)
    const eastFrame = model.group.getObjectByName('EG-kitchen-east-window-mullion').material.color.getHexString()
    const westFrame = model.group.getObjectByName('house-west').getObjectByName('EG-kitchen-east-window-mullion').material.color.getHexString()
    const walls = model.group.children.filter((object: { name: string }) => object.name === 'EG-wall-east' || object.name === 'DG-wall-east').map((mesh: { name: string; material: { customProgramCacheKey: () => string }[] }) => ({ name: mesh.name, materials: mesh.material.map(material => material.customProgramCacheKey()) }))
    model.dispose(); geometry.dispose(); finish.material.dispose(); texture.dispose(); target.dispose(); renderer.dispose()
    return { outer, inner, white, corner, gableReturn, walls, og, dg, entry, gap, slat, exteriorPlaster, entrySurround, outsideEntry, eastFrame, westFrame, initialSettings }
  })
  expect(probe.inner).toEqual(probe.white)
  expect(probe.outer).not.toEqual(probe.white)
  expect(probe.corner).not.toEqual(probe.white)
  expect(probe.gableReturn).not.toEqual(probe.white)
  expect(probe.og).not.toEqual(probe.white)
  expect(probe.dg).toEqual(probe.exteriorPlaster)
  expect(probe.entry).not.toEqual(probe.white)
  for (const color of probe.entrySurround) expect(color).not.toEqual(probe.exteriorPlaster)
  for (const color of probe.outsideEntry) expect(color).toEqual(probe.exteriorPlaster)
  expect(probe.eastFrame).toBe('756f65')
  expect(probe.westFrame).toBe(probe.eastFrame)
  expect(probe.initialSettings.composition).toBe('entry')
  expect(probe.initialSettings.west.composition).toBe('entry')
  expect(probe.gap).toEqual(probe.exteriorPlaster)
  expect(probe.slat).not.toEqual(probe.white)
  expect(probe.walls.length).toBeGreaterThan(2)
  for (const wall of probe.walls) for (const [face, material] of wall.materials.entries()) expect(material.startsWith('facade-profiles-v4-room-bounce-')).toBe(face !== (wall.name.startsWith('DG') ? 4 : 1))
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Fassadenansicht', exact: true }).click()
  await page.getByLabel('Fassadenentwurf', { exact: true }).selectOption('plaster')
  await page.locator('.scene-settings summary').click()
  const camera = await page.evaluate(() => ({ ...window.__house!.position() }))
  const baseline = PNG.sync.read(await page.locator('canvas').screenshot())
  await page.screenshot({ path: `test-results/${testInfo.project.name}-facade-plaster.png` })
  for (const composition of ['timber', 'upper', 'gable', 'entry', 'og', 'og-entry', 'panels']) {
    await page.locator('.scene-settings summary').click()
    await page.getByLabel('Fassadenentwurf', { exact: true }).selectOption(composition)
    await page.locator('.scene-settings summary').click()
    const image = PNG.sync.read(await page.locator('canvas').screenshot())
    let changed = 0
    for (let offset = 0; offset < image.data.length; offset += 4) if (Math.abs(image.data[offset] - baseline.data[offset]) + Math.abs(image.data[offset + 1] - baseline.data[offset + 1]) > 12) changed++
    expect(changed / (image.width * image.height), composition).toBeGreaterThan(.0005)
    await page.screenshot({ path: `test-results/${testInfo.project.name}-facade-${composition}.png` })
    const position = await page.evaluate(() => ({ ...window.__house!.position() }))
    for (const axis of ['x', 'y', 'z'] as const) expect(position[axis]).toBeCloseTo(camera[axis], 8)
    expect(await page.evaluate(() => window.__house!.snapshot().slabs.every(slab => slab.colors[3] === 'ffffff'))).toBe(true)
  }
  await page.locator('.scene-settings summary').click()
  await page.getByLabel('Fassadenentwurf', { exact: true }).selectOption('upper')
  for (const tone of ['Silbergrau', 'Dunkel lasiert', 'Eiche hell', 'Thermoesche', 'Zeder', 'Gekälkt', 'Verkohlt']) {
    await page.getByRole('button', { name: `Holz ${tone}`, exact: true }).click()
    await expect(page.getByRole('button', { name: `Holz ${tone}`, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.locator('.scene-settings summary').click()
    await page.screenshot({ path: `test-results/${testInfo.project.name}-facade-${tone.replace(' ', '-')}.png` })
    await page.locator('.scene-settings summary').click()
  }
  for (const profile of ['slats', 'open-slats']) {
    await page.getByLabel('Holzprofil', { exact: true }).selectOption(profile)
    await page.locator('.scene-settings summary').click()
    await page.screenshot({ path: `test-results/${testInfo.project.name}-facade-${profile}.png` })
    await page.locator('.scene-settings summary').click()
  }
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(errors).toEqual([])
})