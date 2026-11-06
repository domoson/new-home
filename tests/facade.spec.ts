import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Freie Holzflächen bearbeiten Seiten Geschosse und Ausschnitte ohne Kamerasprung', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const modelCheck = await page.evaluate(async () => {
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('EG', false, true, false)
    const east = model.group.getObjectByName('house-east').getObjectByName('timber-cladding')
    const west = model.group.getObjectByName('house-west').getObjectByName('timber-cladding')
    const area = { id: 'area', face: 'east', floor: 'OG', from: 0, to: 100, bottom: 0, top: 100, material: 'wood' }
    model.setCladding('custom', 0, 'grooved', 'east', { areas: [area] })
    const count = () => east.children.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0)
    const full = count(), original = east.children[0].geometry
    let disposed = false; original.addEventListener('dispose', () => { disposed = true })
    model.setCladding('custom', 0, 'grooved', 'east', { areas: [{ ...area, to: 40 }] })
    const partial = count(), partialGeometry = east.children[0].geometry
    model.setCladding('custom', 9, 'grooved', 'east', { surface: 'oiled', areas: [{ ...area, to: 40 }] })
    const reused = partialGeometry === east.children[0].geometry
    model.setCladding('custom', 0, 'shiplap', 'west', { areas: [{ ...area, face: 'north', floor: 'EG' }] })
    const westCount = west.children.length
    model.setCladding('custom', 0, 'grooved', 'east', { areas: [area, { ...area, id: 'remove', material: 'plaster' }] })
    const removed = east.children.length === 0, westRetained = west.children.length === westCount
    model.dispose()
    return { full, partial, disposed, reused, removed, westCount, westRetained }
  })
  expect(modelCheck.full).toBeGreaterThan(modelCheck.partial)
  expect(modelCheck.partial).toBeGreaterThan(0)
  expect(modelCheck.disposed && modelCheck.reused && modelCheck.removed && modelCheck.westRetained).toBe(true)
  expect(modelCheck.westCount).toBeGreaterThan(0)
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  const menu = page.locator('.scene-settings summary')
  const setRangeHandle = async (name: string, value: number) => {
    const handle = page.getByRole('slider', { name, exact: true })
    if (value === 0 || value === 100) {
      await handle.focus()
      await handle.press(value === 0 ? 'Home' : 'End')
    } else {
      const vertical = name.startsWith('Vertikal')
      const root = page.locator(`.timber-range[data-orientation="${vertical ? 'vertical' : 'horizontal'}"]`)
      await root.scrollIntoViewIfNeeded()
      const track = (await root.boundingBox())!, thumb = (await handle.boundingBox())!
      await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
      await page.mouse.down()
      await page.mouse.move(vertical ? track.x + track.width / 2 : track.x + track.width * value / 100, vertical ? track.y + track.height * (1 - value / 100) : track.y + track.height / 2, { steps: 4 })
      await page.mouse.up()
    }
    expect(Math.abs(Number(await handle.getAttribute('aria-valuenow')) - value)).toBeLessThan(1)
  }
  await menu.click()
  await page.getByLabel('Fassadenentwurf', { exact: true }).selectOption('upper')
  await page.getByLabel('Holzart / Farbton', { exact: true }).selectOption('0')
  await page.getByRole('button', { name: 'Fassadenansicht', exact: true }).click()
  await page.getByRole('button', { name: 'Vorlage als Holzflächen', exact: true }).click()
  await expect(page.getByLabel('Fassadenentwurf', { exact: true })).toHaveValue('custom')
  await expect(page.getByRole('checkbox', { name: 'Holz Nord OG', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Holz Süd EG', exact: true })).not.toBeChecked()
  const initialCount = await page.locator('#timber-area option').count()
  expect(initialCount).toBe(6)
  await page.getByRole('checkbox', { name: 'Holz Nord OG', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Holzfläche', exact: true }).click()
  await page.getByLabel('Fläche Seite', { exact: true }).selectOption('east')
  await page.getByLabel('Fläche Geschoss', { exact: true }).selectOption('EG')
  await expect(page.locator('.timber-coverage [role="slider"]')).toHaveCount(4)
  await expect(page.locator('.timber-coverage input[type="number"]')).toHaveCount(0)
  await setRangeHandle('Horizontal Beginn', 10)
  await setRangeHandle('Horizontal Ende', 60)
  await setRangeHandle('Vertikal Unterkante', 20)
  await setRangeHandle('Vertikal Oberkante', 90)
  const startHandle = page.getByRole('slider', { name: 'Horizontal Beginn', exact: true })
  const initialStart = Number(await startHandle.getAttribute('aria-valuenow'))
  await startHandle.focus(); await startHandle.press('ArrowRight')
  expect(Number(await startHandle.getAttribute('aria-valuenow'))).toBeCloseTo(initialStart + .1)
  const copiedStart = await startHandle.getAttribute('aria-valuenow')
  expect(await page.getByRole('checkbox', { name: 'Holz Ost EG', exact: true }).evaluate(input => input.indeterminate)).toBe(true)
  await page.getByRole('button', { name: 'Fläche duplizieren', exact: true }).click()
  await expect(startHandle).toHaveAttribute('aria-valuenow', copiedStart!)
  await page.getByRole('button', { name: 'Fläche löschen', exact: true }).click()
  await page.getByRole('button', { name: 'Putzausschnitt', exact: true }).click()
  await page.getByLabel('Fläche Seite', { exact: true }).selectOption('east')
  await page.getByLabel('Fläche Geschoss', { exact: true }).selectOption('OG')
  await setRangeHandle('Horizontal Beginn', 0)
  await setRangeHandle('Horizontal Ende', 100)
  await setRangeHandle('Vertikal Unterkante', 30)
  await setRangeHandle('Vertikal Oberkante', 60)
  const camera = await page.evaluate(() => window.__house.position())
  const canvas = page.locator('.scene-container canvas')
  await menu.click()
  const withCutout = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-timber-coverage-cutout.png` }))
  await menu.click()
  await page.getByRole('checkbox', { name: 'Fläche aktiv', exact: true }).uncheck()
  await menu.click()
  const withoutCutout = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-timber-coverage-solid.png` }))
  let changed = 0
  const colors = new Set<string>()
  for (let offset = 0; offset < withCutout.data.length; offset += 4) {
    if (Math.abs(withCutout.data[offset] - withoutCutout.data[offset]) > 8) changed++
    colors.add(`${withCutout.data[offset]},${withCutout.data[offset + 1]},${withCutout.data[offset + 2]}`)
  }
  expect(changed).toBeGreaterThan(300)
  expect(colors.size).toBeGreaterThan(200)
  expect(await page.evaluate(() => window.__house.position())).toEqual(camera)
  await menu.click()
  await page.getByRole('checkbox', { name: 'Fläche aktiv', exact: true }).check()
  const draftCount = await page.locator('#timber-area option').count()
  await page.getByLabel('Fassadenentwurf', { exact: true }).selectOption('plaster')
  await page.getByLabel('Fassadenentwurf', { exact: true }).selectOption('custom')
  await expect(page.locator('#timber-area option')).toHaveCount(draftCount)
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('west')
  await expect(page.getByLabel('Fassadenentwurf', { exact: true })).toHaveValue('plaster')
  await page.getByLabel('Fassadenentwurf', { exact: true }).selectOption('custom')
  await page.getByRole('checkbox', { name: 'Holz West EG', exact: true }).check()
  await expect(page.locator('#timber-area option')).toHaveCount(1)
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('east')
  await expect(page.locator('#timber-area option')).toHaveCount(draftCount)
  await page.locator('#timber-area').selectOption({ index: draftCount - 1 })
  await page.getByRole('slider', { name: 'Vertikal Oberkante', exact: true }).scrollIntoViewIfNeeded()
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-timber-coverage-controls.png` })
  await menu.click()
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await menu.click()
  await expect(page.getByLabel('Fassadenentwurf', { exact: true })).toHaveValue('custom')
  await expect(page.locator('#timber-area option')).toHaveCount(draftCount)
  expect(errors).toEqual([])
})

test('Fassade im 3D anklicken, Rahmen ziehen und Szene-Menue synchronisieren', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  const menu = page.locator('.scene-settings summary')
  await menu.click()
  await page.getByLabel('Fassadenentwurf', { exact: true }).selectOption('upper')
  await page.getByLabel('Holzart / Farbton', { exact: true }).selectOption('0')
  await page.getByRole('button', { name: 'Fassadenansicht', exact: true }).click()
  await menu.click()
  await page.waitForFunction(() => !!window.__house?.facadePoint)
  const canvas = page.locator('.scene-container canvas')
  const before = PNG.sync.read(await canvas.screenshot())
  const camera = await page.evaluate(() => window.__house.position())
  const point = (house: string, face: string, floor: string, along: number, height: number, offset = 0) => page.evaluate(args => window.__house.facadePoint(...args), [house, face, floor, along, height, offset] as const)
  const onCanvas = (target: { x: number; y: number }) => page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName === 'CANVAS', target)
  const handle = async (kind: string) => (await page.evaluate(() => window.__house.facadeHandles())).find(item => item.kind === kind)!
  const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
    expect(await onCanvas(from)).toBe(true)
    await page.mouse.move(from.x, from.y); await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 6 }); await page.mouse.up()
  }
  const gable = await point('east', 'east', 'DG', 50, 30)
  expect(gable.pick).toMatchObject({ house: 'east', face: 'east', floor: 'DG' })
  expect(await onCanvas(gable)).toBe(true)
  await page.mouse.click(gable.x, gable.y)
  const overlay = page.getByRole('region', { name: 'Fassadenbereich', exact: true })
  await expect(overlay).toBeVisible()
  await expect(overlay.locator('header strong')).toHaveText('Haus Ost · Ostgiebel · DG')
  if (testInfo.project.name !== 'mobile') await expect(overlay.getByText(/Vorlage/)).toBeVisible()
  await expect(overlay.locator('.facade-overlay-areas button[aria-pressed="true"]')).toHaveCount(1)
  expect((await page.evaluate(() => window.__house.facadeHandles())).map(item => item.kind).sort()).toEqual(['bottom', 'from', 'move', 'to', 'top'])
  await page.screenshot({ path: `test-results/${testInfo.project.name}-facade-overlay.png` })
  await drag(await handle('to'), await point('east', 'east', 'DG', 70, 50, .12))
  const end = Number(await overlay.getByRole('slider', { name: 'Bereich Horizontal Ende', exact: true }).getAttribute('aria-valuenow'))
  expect(end).toBeGreaterThan(65); expect(end).toBeLessThan(75)
  expect(await page.evaluate(() => window.__house.position())).toEqual(camera)
  await expect(overlay.getByText(/Vorlage/)).toHaveCount(0)
  const moveStart = await handle('move')
  await drag(moveStart, await point('east', 'east', 'DG', end / 2 + 15, 50, .12))
  const start = Number(await overlay.getByRole('slider', { name: 'Bereich Horizontal Beginn', exact: true }).getAttribute('aria-valuenow'))
  const moved = Number(await overlay.getByRole('slider', { name: 'Bereich Horizontal Ende', exact: true }).getAttribute('aria-valuenow'))
  expect(start).toBeGreaterThan(8); expect(moved - start).toBeCloseTo(end, 0)
  expect(await page.evaluate(() => window.__house.position())).toEqual(camera)
  await menu.click()
  await expect(page.getByLabel('Haushälfte', { exact: true })).toHaveValue('east')
  await expect(page.getByLabel('Fassadenentwurf', { exact: true })).toHaveValue('custom')
  await expect(page.locator('#timber-area option:checked')).toHaveText(/Holz · Ost · DG/)
  await expect(page.getByRole('slider', { name: 'Horizontal Beginn', exact: true })).toHaveAttribute('aria-valuenow', String(start))
  await menu.click()
  await overlay.getByRole('button', { name: 'Fassadenbereich schließen', exact: true }).click()
  await expect(overlay).toHaveCount(0)
  expect(await page.evaluate(() => window.__house.facadeHandles())).toEqual([])
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-facade-dragged.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 4) if (Math.abs(before.data[offset] - after.data[offset]) + Math.abs(before.data[offset + 1] - after.data[offset + 1]) > 16) changed++
  expect(changed).toBeGreaterThan(400)
  const plaster = await point('east', 'east', 'DG', 50, 30)
  await page.mouse.click(plaster.x, plaster.y)
  await expect(overlay).toBeVisible()
  await overlay.getByRole('button', { name: 'Putz hier', exact: true }).click()
  await expect(overlay.locator('.facade-overlay-areas button')).toHaveCount(2)
  await expect(overlay.locator('.facade-overlay-areas button[aria-pressed="true"]')).toHaveText('Putz 2')
  await overlay.getByRole('button', { name: 'Bereich löschen', exact: true }).click()
  await expect(overlay.locator('.facade-overlay-areas button')).toHaveCount(1)
  await overlay.getByRole('button', { name: 'Fassadenbereich schließen', exact: true }).click()
  const candidates = await Promise.all([35, 50, 65].flatMap(along => [75, 30].map(height => point('west', 'south', 'OG', along, height))))
  let west: Awaited<ReturnType<typeof point>> | undefined
  for (const candidate of candidates) if (candidate?.pick && await onCanvas(candidate)) { west = candidate; break }
  expect(west?.pick).toMatchObject({ house: 'west', face: 'south', floor: 'OG' })
  await page.mouse.click(west!.x, west!.y)
  await expect(overlay.locator('header strong')).toHaveText('Haus West · Südseite · OG')
  await menu.click()
  await expect(page.getByLabel('Haushälfte', { exact: true })).toHaveValue('west')
  await expect(page.getByLabel('Fassadenentwurf', { exact: true })).toHaveValue('plaster')
  if (testInfo.project.name === 'mobile') await expect(overlay).toBeHidden()
  await menu.click()
  await expect(overlay).toBeVisible()
  expect(await page.locator('.facade-overlay').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('Holz-L am Eingang steht hinten, folgt der Fassade und ist je Haus abschaltbar', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { entryCanopy, makeFloor, housePlacement } = await import('/src/model.ts')
    const { woodProfiles } = await import('/src/context.ts')
    const canopy = entryCanopy(makeFloor('EG'))
    const model = buildScene('EG', false, true, false, false, true, { west: false })
    const east = model.group.getObjectByName('house-east'), west = model.group.getObjectByName('house-west')
    const side = east.getObjectByName('entry-canopy-side'), roof = east.getObjectByName('entry-canopy-roof')
    const sideBox = new THREE.Box3().setFromObject(side)
    const extra = ['entry-mailbox', 'entry-mail-slot', 'entry-intercom', 'entry-canopy-led'].some(name => model.group.getObjectByName(name))
    const profiles = woodProfiles.filter(profile => profile.id !== 'open-slats').map(({ id: profile }) => {
      model.setCladding('upper', 0, profile, 'east', { surface: 'oiled' })
      const timber = east.getObjectByName('timber-boards-0')
      const boards = east.getObjectByName('entry-canopy-cladding')
      return { profile: boards.userData.profile, shared: side.material === timber.material && roof.material === timber.material && boards.children.some(mesh => mesh.material === timber.material), count: boards.children.length, roughness: side.material.roughness }
    })
    model.setCladding('plaster', 10, 'slats', 'east', { surface: 'weathered' })
    const inPlaster = east.getObjectByName('entry-canopy-cladding').children.length > 0
    const weathered = side.material.roughness
    const collider = model.colliders.find(shape => Math.abs(shape.size.y - canopy.bottom) < 1e-6 && Math.abs(shape.size.x - canopy.width) < 1e-6 && Math.abs(shape.size.z - canopy.sideThickness) < 1e-6)
    const absent = buildScene('EG', false, true, false, false, true, { east: false, west: false })
    const noCanopy = !absent.group.getObjectByName('entry-canopy')
    const noCollision = !absent.colliders.some(shape => Math.abs(shape.size.y - canopy.bottom) < 1e-6 && Math.abs(shape.size.x - canopy.width) < 1e-6 && Math.abs(shape.size.z - canopy.sideThickness) < 1e-6)
    absent.dispose()
    for (const child of model.group.children) child.visible = child === east
    model.setCladding('upper', 0, 'board-batten')
    model.setFinish('roof', '#424749')
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9eeeb'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#b6b8aa', 2))
    const sun = new THREE.DirectionalLight('#fff5e7', 3); sun.position.set(13, 10, 6); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(innerWidth, innerHeight)
    renderer.domElement.id = 'canopy-preview'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:10000'; document.body.append(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100)
    const target = new THREE.Vector3(canopy.x + .35 + housePlacement.x, 1.3, canopy.z + .9 + housePlacement.z)
    Object.assign(window, { canopyPreview: { render(rotated = false) {
      const direction = new THREE.Vector3(1, .22, rotated ? -.85 : .85).normalize()
      camera.position.copy(target).addScaledVector(direction, innerWidth < 600 ? 6.8 : 5)
      camera.lookAt(target); renderer.render(scene, camera)
    }, dispose() { model.dispose(); renderer.dispose(); renderer.domElement.remove() } } })
    window.canopyPreview.render()
    return { extra, north: sideBox.min.z - housePlacement.z, expectedNorth: canopy.z, sideTop: sideBox.max.y, expectedTop: canopy.bottom, profiles, inPlaster, weathered, noCanopy, noCollision, westAbsent: !west.getObjectByName('entry-canopy'), colliderNorth: collider.position.z - canopy.sideThickness / 2 - housePlacement.z }
  })
  expect(result.extra).toBe(false)
  expect(result.north).toBeCloseTo(result.expectedNorth)
  expect(result.colliderNorth).toBeCloseTo(result.expectedNorth)
  expect(result.sideTop).toBeCloseTo(result.expectedTop)
  expect(result.profiles.every(profile => profile.shared && profile.count > 3 && profile.count <= 12 && profile.roughness === .6)).toBe(true)
  expect(result.inPlaster && result.noCanopy && result.noCollision && result.westAbsent).toBe(true)
  expect(result.weathered).toBe(.94)
  const before = PNG.sync.read(await page.locator('#canopy-preview').screenshot({ path: `test-results/${testInfo.project.name}-timber-canopy-south.png` }))
  await page.evaluate(() => window.canopyPreview.render(true))
  const after = PNG.sync.read(await page.locator('#canopy-preview').screenshot({ path: `test-results/${testInfo.project.name}-timber-canopy-north.png` }))
  let changed = 0
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 4) {
    if (Math.abs(before.data[offset] - after.data[offset]) > 5) changed++
    colors.add(`${before.data[offset]},${before.data[offset + 1]},${before.data[offset + 2]}`)
  }
  expect(changed).toBeGreaterThan(1000); expect(colors.size).toBeGreaterThan(350)
  await page.evaluate(() => window.canopyPreview.dispose())
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  const toggle = page.getByRole('checkbox', { name: 'Eingangsüberdachung', exact: true })
  await expect(toggle).toBeChecked()
  const beforeMeshes = await page.evaluate(() => window.__house.meshes)
  await toggle.uncheck()
  await page.waitForFunction(before => !!window.__house && window.__house.meshes < before, beforeMeshes)
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('west')
  await expect(toggle).toBeChecked()
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('east')
  await expect(toggle).not.toBeChecked()
  await toggle.check()
  await page.waitForFunction(before => window.__house?.meshes === before, beforeMeshes)
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-timber-canopy-menu.png` })
  expect(errors).toEqual([])
})

test('Holzprofile sind echte zugeschnittene 3D-Koerper ohne Aenderung der Architektur', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor, housePlacement, elevations } = await import('/src/model.ts')
    const { woodProfiles } = await import('/src/context.ts')
    const model = buildScene('EG', false, true, false)
    const east = model.group.getObjectByName('house-east'), west = model.group.getObjectByName('house-west')
    const cladding = east.getObjectByName('timber-cladding'), westCladding = west.getObjectByName('timber-cladding')
    const architecture = () => {
      const parts = []
      east.traverse(object => { if (object.isMesh && (object.name.includes('-wall-') || object.name === 'main-roof-panel' || object.userData.windowFrame)) parts.push({ name: object.name, position: object.position.toArray(), vertices: Array.from(object.geometry.attributes.position.array) }) })
      return JSON.stringify(parts)
    }
    const before = architecture()
    const profiles = woodProfiles.filter(profile => profile.id !== 'open-slats').map(({ id: profile }) => {
      model.setCladding('upper', 0, profile)
      model.group.updateMatrixWorld(true)
      const holes = []
      for (const id of ['OG', 'DG']) for (const wall of makeFloor(id).walls.filter(wall => ['east', 'north', 'south'].includes(wall.id))) for (const opening of wall.openings) {
        const along = (wall.axis === 'x' ? wall.x : wall.z) + opening.start + opening.width / 2
        const height = elevations[id] + opening.sill + opening.height / 2
        const origin = wall.id === 'east' ? new THREE.Vector3(wall.x + wall.width + 1, height, along) : new THREE.Vector3(along, height, wall.id === 'north' ? wall.z - 1 : wall.z + wall.depth + 1)
        origin.x += housePlacement.x; origin.z += housePlacement.z
        const direction = wall.id === 'east' ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, wall.id === 'north' ? 1 : -1)
        holes.push(new THREE.Raycaster(origin, direction, 0, 1.4).intersectObject(cladding, true).length)
      }
      const bounds = new THREE.Box3().setFromObject(cladding)
      return { profile, batches: cladding.children.length, pieces: cladding.userData.pieces, holes, top: bounds.max.y, bottom: bounds.min.y, triangles: cladding.children.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3, 0) }
    })
    model.setCladding('upper', 0, 'horizontal')
    const geometry = cladding.children[0].geometry
    model.setCladding('upper', 8, 'horizontal', 'east', { surface: 'oiled' })
    const reused = geometry === cladding.children[0].geometry
    const colors = cladding.children.filter(mesh => mesh.name.startsWith('timber-boards')).map(mesh => mesh.material.color.getHexString())
    const roughness = cladding.children.find(mesh => mesh.name.startsWith('timber-boards')).material.roughness
    const westEmpty = westCladding.children.length === 0
    model.setCladding('upper', 9, 'rhombus', 'west', { windows: 'screen' })
    const mirrored = new THREE.Box3().setFromObject(westCladding).max.x < .1
    const eastUnchanged = cladding.userData.profile === 'horizontal'
    const unchanged = before === architecture()
    model.setCladding('plaster', 0, 'boards')
    const cleared = cladding.children.length === 0
    model.dispose()
    return { profiles, reused, colors, roughness, westEmpty, mirrored, eastUnchanged, unchanged, cleared }
  })
  expect(result.profiles).toHaveLength(10)
  for (const profile of result.profiles) {
    expect(profile.batches).toBeLessThanOrEqual(14)
    expect(profile.pieces).toBeGreaterThan(300)
    expect(profile.triangles).toBeGreaterThan(3000)
    expect(profile.holes.every(count => count === 0)).toBe(true)
    expect(profile.bottom).toBeCloseTo(2.77)
    expect(profile.top).toBeGreaterThan(9)
  }
  expect(result.reused && result.westEmpty && result.mirrored && result.eastUnchanged && result.unchanged && result.cleared).toBe(true)
  expect(new Set(result.colors).size).toBeGreaterThan(5)
  expect(result.roughness).toBe(.6)
})

test('Holzfassadenvergleich rendert Profile Holzarten Fensterdetails und Bewitterung', async ({ page }, testInfo) => {
  test.setTimeout(240000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  await page.getByLabel('Außenstil', { exact: true }).selectOption('timber-natural')
  for (const profile of ['shiplap', 'variable-width', 'grooved', 'bevelled', 'alternating-depth']) {
    await page.getByLabel('Holzprofil', { exact: true }).selectOption(profile)
    await expect(page.getByLabel('Holzprofil', { exact: true })).toHaveValue(profile)
  }
  await page.getByLabel('Holzprofil', { exact: true }).selectOption('rhombus')
  await page.getByLabel('Oberfläche', { exact: true }).selectOption('weathered')
  await page.getByLabel('Fensteranschluss', { exact: true }).selectOption('reveals')
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('west')
  await expect(page.getByLabel('Fassadenentwurf', { exact: true })).toHaveValue('plaster')
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('east')
  await expect(page.getByLabel('Holzprofil', { exact: true })).toHaveValue('rhombus')
  await expect(page.getByLabel('Oberfläche', { exact: true })).toHaveValue('weathered')
  await page.getByRole('button', { name: 'Fassadenvergleich', exact: true }).click()
  const dialog = page.locator('.timber-comparison')
  await expect(dialog).toBeVisible()
  const signatures = []
  for (const [name, count] of [['Profile A–J', 10], ['Holzarten', 8], ['Fensterdetails', 3], ['Bewitterung', 3]] as const) {
    await dialog.getByRole('button', { name, exact: true }).click()
    await expect(dialog.getByRole('status')).toHaveText(`${count} / ${count}`, { timeout: 90000 })
    const images = dialog.locator('.timber-image img')
    await expect(images).toHaveCount(count * 2)
    const stats = await images.evaluateAll(async elements => {
      return Promise.all(elements.map(async element => {
        const image = element as HTMLImageElement
        await image.decode()
        const canvas = document.createElement('canvas'); canvas.width = 168; canvas.height = 140
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0, 168, 140)
        const data = context.getImageData(0, 0, 168, 140).data
        const colors = new Set<string>(); let signature = 0
        for (let offset = 0; offset < data.length; offset += 4) {
          colors.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`)
          signature = (signature + data[offset] * (offset + 1) + data[offset + 1] * 17) % 2147483647
        }
        return { colors: colors.size, signature, width: image.naturalWidth, height: image.naturalHeight }
      }))
    })
    expect(stats.every(image => image.colors > 350 && image.width === 840 && image.height === 700)).toBe(true)
    expect(new Set(stats.filter((_, index) => index % 2 === 0).map(image => image.signature)).size).toBe(count)
    signatures.push(stats[0].signature)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await dialog.evaluate(element => { element.scrollTop = 0 })
    await page.screenshot({ path: `test-results/${testInfo.project.name}-timber-${name === 'Profile A–J' ? 'profiles' : name === 'Holzarten' ? 'species' : name === 'Fensterdetails' ? 'windows' : 'weathering'}.png` })
    if (name === 'Profile A–J') {
      const figures = dialog.locator('.timber-comparison-grid figure')
      await figures.nth(5).scrollIntoViewIfNeeded()
      await page.screenshot({ path: `test-results/${testInfo.project.name}-timber-profiles-F-J.png` })
      for (const [index, profile] of ['shiplap', 'variable-width', 'grooved', 'bevelled', 'alternating-depth'].entries()) {
        const downloaded = page.waitForEvent('download')
        await figures.nth(index + 5).locator('.timber-render a').nth(1).click()
        const detail = await downloaded
        await detail.saveAs(`test-results/${testInfo.project.name}-timber-${profile}-detail.png`)
      }
      expect(await figures.locator('figcaption span').allTextContents()).toEqual(Array(10).fill('Lärche natur'))
      await dialog.evaluate(element => { element.scrollTop = 0 })
    }
    const download = page.waitForEvent('download')
    await dialog.locator('.timber-render a').first().click()
    const file = await download
    expect(file.suggestedFilename()).toContain('Holzfassade-')
    await file.saveAs(testInfo.outputPath(file.suggestedFilename()))
  }
  expect(signatures[0]).toBe(signatures[3])
  await dialog.locator('.timber-image').first().click()
  await expect(dialog.locator('.timber-zoom img')).toBeVisible()
  await dialog.getByRole('button', { name: 'Detail schließen', exact: true }).click()
  await dialog.getByRole('button', { name: 'Vergleich schließen', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByLabel('Oberfläche', { exact: true })).toHaveValue('weathered')
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Fassadenansicht', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  const canvas = page.locator('.scene-container canvas')
  const before = PNG.sync.read(await canvas.screenshot())
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5)
  await page.mouse.down(); await page.mouse.move(box.x + box.width * .6, box.y + box.height * .5, { steps: 8 }); await page.mouse.up()
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-timber-live.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 4) if (Math.abs(before.data[offset] - after.data[offset]) > 5) changed++
  expect(changed).toBeGreaterThan(1000)
  expect(errors).toEqual([])
})

test('Innentueren und Zargen wechseln gemeinsam zwischen Eiche und Lackfarben', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { buildScene } = await import('/src/scene.ts')
    const { finishes, initialSettings, exteriorStyles } = await import('/src/context.ts')
    const model = buildScene('EG', true, true, true)
    const doors = model.doors.filter(door => door.kind === 'door' && !door.id.endsWith('-entrance') && !door.object.material.transparent)
    const materials = new Set(doors.map(door => door.object.material))
    const frames = []
    model.group.traverse(object => { if (object.isMesh && object.name.endsWith('-frame') && materials.has(object.material)) frames.push(object) })
    const excluded = model.doors.filter(door => !doors.includes(door))
    const appearance = object => ({ color: object.material.color.getHexString(), map: !!object.material.map, transparent: object.material.transparent })
    const before = excluded.map(door => appearance(door.object))
    const defaults = doors.map(door => appearance(door.object))
    const samples = [...finishes.interiorDoor, finishes.interiorDoor[0]].map(finish => {
      for (const side of ['east', 'west']) model.setFinish('interiorDoor', finish.color, side)
      return { color: finish.color.slice(1), wood: finish === finishes.interiorDoor[0], doors: doors.map(door => appearance(door.object)), frames: frames.map(appearance) }
    })
    const style = exteriorStyles[0].appearance
    model.setFinish('interiorDoor', '#ffffff')
    for (const key of ['facade', 'roof', 'roofTrim', 'entryDoor', 'frame']) model.setFinish(key, style[key])
    model.setCladding(style.composition, style.woodTone, style.woodProfile)
    const afterStyle = doors.map(door => appearance(door.object))
    model.setFinish('entryDoor', initialSettings.entryDoor)
    model.setFinish('frame', initialSettings.frame)
    const after = excluded.map(door => appearance(door.object))
    const floors = [...new Set(doors.map(door => door.id.split('-')[0]))]
    model.dispose()
    return { defaults, samples, before, after, floors, frames: frames.length, afterStyle }
  })
  expect(result.floors.sort()).toEqual(['DG', 'EG', 'KG', 'OG'])
  expect(result.frames).toBeGreaterThan(10)
  expect(result.defaults.every(door => door.color === 'ffffff' && !door.map)).toBe(true)
  for (const sample of result.samples) {
    for (const material of [...sample.doors, ...sample.frames]) expect(material).toEqual({ color: sample.color, map: sample.wood, transparent: false })
  }
  expect(result.after).toEqual(result.before)
  expect(result.afterStyle.every(door => door.color === 'ffffff' && !door.map)).toBe(true)
  await page.getByRole('button', { name: '3D', exact: true }).click()
  const menu = page.locator('.scene-settings summary')
  await menu.click()
  for (const name of ['Reinweiß', 'Gebrochenes Weiß', 'Hellgrau', 'Eiche natur']) {
    const swatch = page.getByRole('button', { name: `Innentüren ${name}`, exact: true })
    await swatch.click()
    await expect(swatch).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Fassadenentwurf', { exact: true })).toHaveValue('plaster')
  }
  await page.getByRole('button', { name: 'Innentüren Reinweiß', exact: true }).click()
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-interior-door-menu.png` })
  await page.getByRole('button', { name: 'Fenster außen Bronze', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Innentüren Reinweiß', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await menu.click()
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await menu.click()
  await expect(page.getByRole('button', { name: 'Innentüren Reinweiß', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await menu.click()
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await menu.click()
  await expect(page.getByRole('button', { name: 'Innentüren Reinweiß', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await menu.click()
  const image = PNG.sync.read(await page.locator('canvas').screenshot({ path: `test-results/${testInfo.project.name}-interior-doors-white.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < image.data.length; offset += 16) colors.add(`${image.data[offset]},${image.data[offset + 1]},${image.data[offset + 2]}`)
  expect(colors.size).toBeGreaterThan(100)
  expect(errors).toEqual([])
})

test('Aussenstile setzen alle Oberflaechen pro Haus und bleiben individuell anpassbar', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const probe = await page.evaluate(async () => {
    const { buildScene } = await import('/src/scene.ts')
    const { exteriorStyles, finishes, initialAppearance } = await import('/src/context.ts')
    const model = buildScene('EG', false, true, true)
    const west = model.group.getObjectByName('house-west')
    const color = mesh => mesh.material.color.getHexString()
    const snapshot = root => ({
      roof: root.getObjectByName('main-roof-panel').material.map(material => material.color.getHexString()),
      roofTrimMap: !!root.getObjectByName('main-roof-panel').material[0].map,
      door: color(root.getObjectByName('EG-entrance-leaf')),
      doorMap: !!root.getObjectByName('EG-entrance-leaf').material.map,
      frame: root.getObjectByName('EG-kitchen-east-window-mullion').material.map(material => material.color.getHexString()),
    })
    const westBefore = snapshot(west)
    const interiorDoor = model.doors.find(door => door.kind === 'door' && !door.id.startsWith('west-') && door.id !== 'EG-entrance' && !door.sliding && !door.object.material.transparent)
    const interiorBefore = color(interiorDoor.object)
    const apply = (appearance, side = 'east') => {
      for (const key of ['facade', 'roof', 'roofTrim', 'entryDoor', 'frame']) model.setFinish(key, appearance[key], side)
      model.setCladding(appearance.composition, appearance.woodTone, appearance.woodProfile, side)
    }
    apply(exteriorStyles[0].appearance)
    const cream = snapshot(model.group), westUnchanged = snapshot(west)
    const interiorAfter = color(interiorDoor.object)
    const interiorPlaster = color(model.group.getObjectByName('attic-ceiling'))
    apply(exteriorStyles.find(style => style.id === 'graphite-terracotta').appearance, 'west')
    const westDark = snapshot(west), eastUnchanged = snapshot(model.group)
    const samples = exteriorStyles.filter(style => style.id !== 'original').map(style => {
      apply(style.appearance)
      const labels = { facade: 'Fassade', roof: 'Dach', roofTrim: 'Dachunterbau', entryDoor: 'Haustür', frame: 'Fenster außen' }
      const swatches = Object.entries(labels).map(([key, label]) => `${label} ${finishes[key].find(finish => finish.color === style.appearance[key]).name}`)
      return { id: style.id, appearance: style.appearance, actual: snapshot(model.group), swatches }
    })
    apply(initialAppearance)
    const restored = snapshot(model.group)
    model.dispose()
    return { cream, westBefore, westUnchanged, westDark, eastUnchanged, restored, interiorBefore, interiorAfter, interiorPlaster, samples }
  })
  expect(probe.cream.roof).toEqual(['c4c7c4', ...Array(5).fill('424749')])
  expect(probe.cream.door).toBe('bcbdb7')
  expect(probe.cream.doorMap).toBe(false)
  expect(probe.cream.frame[0]).toBe('bcbdb7')
  expect(probe.cream.frame[1]).toBe('f7f7f4')
  expect(probe.westUnchanged).toEqual(probe.westBefore)
  expect(probe.eastUnchanged).toEqual(probe.cream)
  expect(probe.westDark.door).toBe('3b4243')
  expect(probe.westDark.roof[0]).toBe('3b4243')
  expect(probe.interiorAfter).toBe(probe.interiorBefore)
  expect(probe.interiorPlaster).toBe('ffffff')
  expect(probe.restored.doorMap).toBe(true)
  expect(probe.restored.door).toBe('dfd6c2')
  expect(probe.restored.roofTrimMap).toBe(false)
  for (const sample of probe.samples) {
    expect(sample.actual.roof).toEqual([sample.appearance.roofTrim.slice(1), ...Array(5).fill(sample.appearance.roof.slice(1))])
    expect(sample.actual.door).toBe(sample.appearance.entryDoor.slice(1))
    expect(sample.actual.frame[0]).toBe(sample.appearance.frame.slice(1))
    expect(sample.actual.frame[1]).toBe('f7f7f4')
    expect(sample.actual.roofTrimMap).toBe(sample.id === 'oak-terracotta')
  }
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect(page.locator('.scene-settings')).toBeVisible()
  const menu = page.locator('.scene-settings summary')
  await menu.click()
  const style = page.getByLabel('Außenstil', { exact: true })
  await expect(style).toHaveValue('original')
  await page.getByRole('button', { name: 'Fassadenansicht', exact: true }).click()
  await menu.click()
  const canvas = page.locator('canvas')
  const before = PNG.sync.read(await canvas.screenshot())
  await menu.click()
  await style.selectOption('cream-grey')
  for (const name of ['Fassade Cremeweiß', 'Dach Graphit', 'Dachunterbau Hellgrau', 'Haustür Hellgrau', 'Fenster außen Hellgrau', 'Fenster innen Weiß']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(page.getByLabel('Fassadenentwurf')).toHaveValue('plaster')
  await style.scrollIntoViewIfNeeded()
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-exterior-style-menu.png` })
  await menu.click()
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-exterior-style-cream.png` }))
  let changed = 0
  const colors = new Set<string>()
  for (let offset = 0; offset < after.data.length; offset += 4) {
    if (Math.abs(after.data[offset] - before.data[offset]) > 8) changed++
    colors.add(`${after.data[offset]},${after.data[offset + 1]},${after.data[offset + 2]}`)
  }
  expect(changed).toBeGreaterThan(500)
  expect(colors.size).toBeGreaterThan(100)
  const bounds = await canvas.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width * .5, bounds!.y + bounds!.height * .55)
  await page.mouse.down(); await page.mouse.move(bounds!.x + bounds!.width * .7, bounds!.y + bounds!.height * .55, { steps: 10 }); await page.mouse.up()
  const rotated = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-exterior-style-rotated.png` }))
  expect(Buffer.compare(after.data, rotated.data)).not.toBe(0)
  await menu.click()
  for (const sample of probe.samples) {
    await style.selectOption(sample.id)
    for (const name of sample.swatches) await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Fassadenentwurf')).toHaveValue('plaster')
    await menu.click()
    await canvas.screenshot({ path: `test-results/${testInfo.project.name}-style-${sample.id}.png` })
    await menu.click()
  }
  await style.selectOption('cream-grey')
  await page.getByRole('button', { name: 'Fenster innen Moosgrün', exact: true }).click()
  await expect(style).toHaveValue('cream-grey')
  await page.getByRole('button', { name: 'Haustür Anthrazit', exact: true }).click()
  await expect(style).toHaveValue('custom')
  await style.selectOption('cream-grey')
  await expect(page.getByRole('button', { name: 'Fenster innen Moosgrün', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('west')
  await expect(style).toHaveValue('original')
  await style.selectOption('oak-terracotta')
  await expect(page.getByRole('button', { name: 'Dachunterbau Eiche natur', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Fenster außen Eiche', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await style.selectOption('graphite-terracotta')
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('east')
  await expect(style).toHaveValue('cream-grey')
  await menu.click()
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await menu.click()
  await expect(style).toHaveValue('cream-grey')
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('west')
  await expect(style).toHaveValue('graphite-terracotta')
  await style.selectOption('original')
  await expect(page.getByRole('button', { name: 'Haustür Eiche natur', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('Fensterfarben innen und außen bleiben je Haus unabhängig', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const probe = await page.evaluate(async () => {
    const { buildScene } = await import('/src/scene.ts')
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const model = buildScene('EG', false, true, true)
    const east = model.group.getObjectByName('EG-kitchen-east-window-mullion')
    const west = model.group.getObjectByName('house-west').getObjectByName('EG-kitchen-east-window-mullion')
    const colors = mesh => mesh.material.map(material => material.color.getHexString())
    const defaults = colors(east)
    model.setFinish('frameInside', '#ff0000')
    model.setFinish('frame', '#00ff00')
    model.setFinish('frameInside', '#0000ff', 'west')
    const eastColors = colors(east), westColors = colors(west)
    const normals = []
    for (const [id, normal] of [['EG-kitchen-east-window-secondary', [-1, 0, 0]], ['EG-garden-west-secondary', [0, 0, -1]], ['OG-bath-window-secondary', [0, 0, 1]]]) {
      const door = model.doors.find(door => door.id === id)
      const frame = door.pivot.children.find(mesh => mesh.userData.windowFrame)
      const face = frame.material.findIndex(material => material.color.getHexString() === 'ff0000')
      model.setOpening(id, 0); model.group.updateMatrixWorld(true)
      const direction = new THREE.Vector3(0, 0, face === 4 ? 1 : -1).transformDirection(frame.matrixWorld)
      model.setOpening(id, 1)
      normals.push({ actual: direction.toArray(), expected: normal, retained: colors(frame)[face] === 'ff0000' })
    }
    model.dispose()
    return { defaults, eastColors, westColors, normals }
  })
  expect(probe.defaults[0]).toBe('756f65')
  expect(probe.defaults[1]).toBe('f7f7f4')
  expect(probe.eastColors[0]).toBe('00ff00')
  expect(probe.eastColors[1]).toBe('ff0000')
  expect(probe.westColors[0]).toBe('756f65')
  expect(probe.westColors[1]).toBe('0000ff')
  for (const result of probe.normals) {
    result.actual.forEach((value, axis) => expect(value).toBeCloseTo(result.expected[axis]))
    expect(result.retained).toBe(true)
  }
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect(page.locator('.scene-settings')).toBeVisible()
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Fenster innen Moosgrün', exact: true }).click()
  await page.getByRole('button', { name: 'Fenster außen Weiß', exact: true }).click()
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('west')
  await expect(page.getByRole('button', { name: 'Fenster innen Weiß', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('Haushälfte', { exact: true }).selectOption('east')
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-window-colors.png` })
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  await expect(page.getByRole('button', { name: 'Fenster innen Moosgrün', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Fenster außen Weiß', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('.scene-settings summary').click()
  const image = PNG.sync.read(await page.locator('canvas').screenshot())
  const colors = new Set<string>()
  for (let offset = 0; offset < image.data.length; offset += 4) colors.add(`${image.data[offset]},${image.data[offset + 1]},${image.data[offset + 2]}`)
  expect(colors.size).toBeGreaterThan(100)
  expect(errors).toEqual([])
})

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
    const eastFrame = model.group.getObjectByName('EG-kitchen-east-window-mullion').material[0].color.getHexString()
    const westFrame = model.group.getObjectByName('house-west').getObjectByName('EG-kitchen-east-window-mullion').material[0].color.getHexString()
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