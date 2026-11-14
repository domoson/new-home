import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

function pixelChanges(before: Buffer, after: Buffer) {
  const first = PNG.sync.read(before), second = PNG.sync.read(after)
  let changed = 0
  for (let offset = 0; offset < first.data.length; offset += 4) if (Math.abs(first.data[offset] - second.data[offset]) + Math.abs(first.data[offset + 1] - second.data[offset + 1]) > 20) changed++
  return changed
}

test('Fenstereditor: Auswahl, Masse, Felder, Ziehen und gespeicherte Varianten', async ({ page }, testInfo) => {
  test.setTimeout(240000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  const canvas = page.locator('.scene-container canvas')
  await expect(page.getByRole('button', { name: 'Fenstermodus' })).toBeVisible({ timeout: 45000 })
  const overview = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-window-editor-overview.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < overview.data.length; offset += 16) colors.add(`${overview.data[offset] >> 4},${overview.data[offset + 1] >> 4},${overview.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.getByRole('button', { name: 'Fenstermodus' }).click()
  const panel = page.getByRole('region', { name: 'Fenster bearbeiten', exact: true })
  const chooser = panel.getByRole('combobox', { name: /Fenster ausw/ })
  await chooser.selectOption('OG-south-east')
  const dimension = async (label: RegExp, value: string) => {
    const input = panel.getByRole('spinbutton', { name: label })
    await input.fill(value); await input.press('Enter')
    await expect(panel.getByRole('alert')).toHaveCount(0)
    await page.waitForFunction(() => !!window.__house)
  }
  const camera = await page.evaluate(() => ({ ...window.__house!.position() }))
  const before = await canvas.screenshot()
  await dimension(/^Breite/, '120')
  await dimension(/^H.he/, '120')
  await dimension(/^Ab Wandbeginn/, '396.5')
  const width = panel.getByRole('spinbutton', { name: /^Breite/ })
  await width.fill('999'); await width.press('Enter')
  await expect(panel.getByRole('alert')).toContainText('innerhalb')
  await dimension(/^Breite/, '120')
  await page.getByRole('button', { name: 'Zweiteilig', exact: true }).click()
  await panel.getByLabel('Fensterfeld 1', { exact: true }).selectOption('fixed')
  await panel.getByLabel('Fensterfeld 2', { exact: true }).selectOption('right')
  const split = panel.getByRole('slider', { name: 'Breitenanteil linkes Feld' })
  await split.focus(); await split.press('ArrowLeft'); await split.press('ArrowLeft')
  await expect(split).toHaveValue('48')
  await panel.getByRole('checkbox', { name: 'Festes Unterlicht' }).check()
  await expect(panel.getByRole('spinbutton', { name: /^Unterlicht/ })).toHaveValue('40')
  await panel.getByRole('button', { name: /Fensterfl.gel 2/ }).click()
  await expect.poll(() => page.evaluate(() => window.__house!.snapshot().openings.find(opening => opening.id === 'OG-south-east')?.open)).toBe(true)
  const opened = await canvas.screenshot({ path: `test-results/${testInfo.project.name}-window-editor-open.png` })
  expect(pixelChanges(before, opened)).toBeGreaterThan(50)
  await panel.getByRole('button', { name: /Fensterfl.gel 2/ }).click()
  const afterCamera = await page.evaluate(() => ({ ...window.__house!.position() }))
  for (const axis of ['x', 'y', 'z'] as const) expect(afterCamera[axis]).toBeCloseTo(camera[axis], 6)
  const handle = async (kind: string) => (await page.evaluate(() => window.__house!.facadeHandles!())).find(handle => handle.kind === kind)!
  const move = await handle('move')
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName === 'CANVAS', move)).toBe(true)
  const drag = async (point: { x: number; y: number }, dx: number, dy: number) => {
    if (testInfo.project.name === 'mobile') {
      const client = await page.context().newCDPSession(page)
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] })
      for (let step = 1; step <= 6; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + dx * step / 6, y: point.y + dy * step / 6 }] })
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await client.detach()
    } else {
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + dx, point.y + dy, { steps: 6 }); await page.mouse.up()
    }
  }
  const start = Number(await panel.getByRole('spinbutton', { name: /^Ab Wandbeginn/ }).inputValue())
  await drag(move, 10, 0)
  await expect.poll(async () => Number(await panel.getByRole('spinbutton', { name: /^Ab Wandbeginn/ }).inputValue())).not.toBe(start)
  await expect(width).toHaveValue('120')
  await expect(panel.getByRole('spinbutton', { name: /^H.he/ })).toHaveValue('120')
  await expect(panel.getByRole('spinbutton', { name: /^Br.stung/ })).toHaveValue('85.5')
  await drag(await handle('to'), 8, 0)
  await expect.poll(async () => Number(await width.inputValue())).not.toBe(120)
  await expect(panel.getByRole('alert')).toHaveCount(0)
  const savedWidth = await width.inputValue(), savedStart = await panel.getByRole('spinbutton', { name: /^Ab Wandbeginn/ }).inputValue()
  const point = await handle('move')
  await panel.getByRole('combobox', { name: /Fenster Haush/ }).selectOption('west')
  await chooser.selectOption('OG-south-east')
  await expect(width).toHaveValue('173')
  await dimension(/^Breite/, '160')
  await panel.getByRole('combobox', { name: /Fenster Haush/ }).selectOption('east')
  await chooser.selectOption('OG-south-east')
  await expect(width).toHaveValue(savedWidth)
  await panel.getByRole('combobox', { name: /Fenster Haush/ }).selectOption('west')
  await panel.getByRole('combobox', { name: /Fenster Haush/ }).selectOption('east')
  await expect(chooser).toHaveValue('')
  const clickable = await page.evaluate(async ({ start, width }) => {
    const { timberAreaExtent } = await import('/src/timberCladding.ts')
    const { elevations } = await import('/src/model.ts')
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const extent = timberAreaExtent('south', 'OG', 'boards')
    return window.__house!.facadePoint!('east', 'south', 'OG', (.3 + Number(start) / 100 + Number(width) / 200 - extent.left) / (extent.right - extent.left) * 100, (elevations.OG + .855 + .6 - extent.bottom) / (extent.top - extent.bottom) * 100, .12)!
  }, { start: savedStart, width: savedWidth })
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName === 'CANVAS', clickable)).toBe(true)
  if (testInfo.project.name === 'mobile') await page.touchscreen.tap(clickable.x, clickable.y)
  else await page.mouse.click(clickable.x, clickable.y)
  await expect(chooser).toHaveValue('OG-south-east')
  expect(point.x).toBeGreaterThan(0)
  await panel.evaluate(element => { element.scrollTop = 0 })
  await page.screenshot({ path: `test-results/${testInfo.project.name}-window-editor-panel.png` })
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('.scene-settings summary').click()
  await page.getByLabel('Entwurfsname', { exact: true }).fill('Fenstervariante')
  await page.getByRole('button', { name: 'Als neuen Entwurf speichern', exact: true }).click()
  await expect(page.locator('.scene-design-state')).toHaveText(/Gespeichert/)
  await page.reload()
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await page.screenshot({ path: `test-results/${testInfo.project.name}-window-editor-plan.png` })
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Fenstermodus' }).click()
  await chooser.selectOption('OG-south-east')
  await expect(width).toHaveValue(savedWidth)
  await expect(panel.getByRole('spinbutton', { name: /^Ab Wandbeginn/ })).toHaveValue(savedStart)
  await expect(panel.getByLabel('Fensterfeld 1', { exact: true })).toHaveValue('fixed')
  await expect(panel.getByRole('checkbox', { name: 'Festes Unterlicht' })).toBeChecked()
  await panel.getByRole('button', { name: /Fenster zur.cksetzen/ }).click()
  await expect(width).toHaveValue('130')
  await expect(panel.getByRole('checkbox', { name: 'Festes Unterlicht' })).not.toBeChecked()
  await panel.getByRole('combobox', { name: /Fenster Haush/ }).selectOption('west')
  await chooser.selectOption('OG-south-east')
  await expect(width).toHaveValue('160')
  await panel.getByRole('button', { name: /Fenstereditor schlie.en/ }).click()
  const rotatedBefore = await canvas.screenshot()
  const bounds = await canvas.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width * .6, bounds!.y + bounds!.height * .5); await page.mouse.down(); await page.mouse.move(bounds!.x + bounds!.width * .7, bounds!.y + bounds!.height * .48, { steps: 8 }); await page.mouse.up()
  const rotated = await canvas.screenshot({ path: `test-results/${testInfo.project.name}-window-editor-rotated.png` })
  expect(pixelChanges(rotatedBefore, rotated)).toBeGreaterThan(500)
  expect(errors).toEqual([])
})

test('Fenstervarianten: echte Rahmen, Fluegel, Wand und Holzanschluss folgen den Massen', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { makeFloor, housePlacement, elevations } = await import('/src/model.ts')
    const { windowDraft } = await import('/src/windowEdits.ts')
    const { buildScene } = await import('/src/scene.ts')
    const { timberPieces } = await import('/src/timberCladding.ts')
    const original = makeFloor('OG').walls.find(wall => wall.id === 'south')!.openings.find(opening => opening.id === 'south-east')!
    const edit = { ...windowDraft(original), start: original.start - .2, width: 1.2, height: 1.2, windowLayout: { columns: 2 as const, split: .4, lowerFixed: .4, fields: [{ fixed: false, hinge: 'end' as const }, { fixed: true, hinge: 'start' as const }] } }
    const windows = { 'OG-south-east': edit }
    const model = buildScene('OG', false, false, true, false, true, {}, { east: windows })
    model.setCladding('timber', 0, 'boards', 'east', { windows: 'reveals' })
    const east = model.group.getObjectByName('house-east')!, west = model.group.getObjectByName('house-west')!
    model.group.updateMatrixWorld(true)
    const frameBounds = (root: InstanceType<typeof THREE.Object3D>) => {
      const bounds = new THREE.Box3()
      root.traverse(object => { if (object.userData.windowFrame === 'OG-south-east') bounds.union(new THREE.Box3().setFromObject(object)) })
      return bounds
    }
    const frame = frameBounds(east), westFrame = frameBounds(west)
    const leaf = model.doors.find(door => door.id === 'OG-south-east')!
    const fixed = east.getObjectByName('OG-south-east-fixed-1')!, transom = east.getObjectByName('OG-south-east-transom-0')!
    const fixedBefore = new THREE.Box3().setFromObject(fixed), transomBefore = new THREE.Box3().setFromObject(transom), closed = leaf.pivot.quaternion.clone()
    model.setOpening(leaf.id, 1)
    const changed = closed.angleTo(leaf.pivot.quaternion)
    const stationary = fixedBefore.equals(new THREE.Box3().setFromObject(fixed)) && transomBefore.equals(new THREE.Box3().setFromObject(transom))
    const wallMeshes: InstanceType<typeof THREE.Object3D>[] = []
    east.traverse(object => { if (object.name === 'OG-wall-south') wallMeshes.push(object) })
    const hitsWall = (localX: number) => new THREE.Raycaster(new THREE.Vector3(localX + housePlacement.x, elevations.OG + 1.5, 12), new THREE.Vector3(0, 0, -1), 0, 3).intersectObjects(wallMeshes).length > 0
    const pieces = timberPieces(['OG'], 'timber', 'boards', false, 'east', 'reveals', [], windows).filter(piece => piece.face === 'south' && piece.kind === 'reveal')
    const bounds = pieces.flatMap(piece => piece.polygon).map(point => point[0])
    const actual = { width: frame.max.x - frame.min.x, height: frame.max.y - frame.min.y, x: frame.min.x - housePlacement.x, sill: frame.min.y - elevations.OG, westWidth: westFrame.max.x - westFrame.min.x, leafWidth: leaf.size.x, leafHeight: leaf.size.y, stationary, changed, noSecondary: !model.doors.some(door => door.id === 'OG-south-east-secondary'), newHoleClear: !hitsWall(.3 + edit.start + .08), oldHoleFilled: hitsWall(.3 + original.start + original.width - .05), cladding: bounds.length > 0 && !!east.getObjectByName('timber-cladding') }
    model.dispose()
    return actual
  })
  expect(result.width).toBeCloseTo(1.2)
  expect(result.height).toBeCloseTo(1.2)
  expect(result.x).toBeCloseTo(4.265)
  expect(result.sill).toBeCloseTo(.855)
  expect(result.westWidth).toBeCloseTo(1.73)
  expect(result.leafWidth).toBeCloseTo(.392)
  expect(result.leafHeight).toBeCloseTo(.712)
  expect(result.changed).toBeCloseTo(Math.PI / 2)
  expect(result.stationary).toBe(true)
  expect(result.noSecondary).toBe(true)
  expect(result.newHoleClear).toBe(true)
  expect(result.oldHoleFilled).toBe(true)
  expect(result.cladding).toBe(true)
})