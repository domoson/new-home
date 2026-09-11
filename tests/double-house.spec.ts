import { expect, test } from '@playwright/test'
import type { Mesh, MeshStandardMaterial } from 'three'
import { PNG } from 'pngjs'

test('Mausrad zoomt 2D und steuert nur die avisierte Oeffnung', async ({ page }) => {
  await page.goto('/')
  const plan = page.locator('svg.floor-plan'), original = await plan.getAttribute('viewBox')
  await plan.hover(); await page.mouse.wheel(0, -200)
  await expect(plan).not.toHaveAttribute('viewBox', original!)
  await page.mouse.wheel(0, 200)
  await expect.poll(async () => Number((await plan.getAttribute('viewBox'))!.split(' ')[2])).toBeCloseTo(10.2)
  await page.getByRole('button', { name: 'Querschnitt', exact: true }).click()
  const section = await plan.getAttribute('viewBox')
  await plan.hover(); await page.mouse.wheel(0, -100); await expect(plan).not.toHaveAttribute('viewBox', section!)
  await page.getByRole('button', { name: 'Rundgang', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.mode)).toBe('walk')
  for (const side of [1, -1]) {
    await page.evaluate(side => { window.__house!.teleport(side * 5.2, 0, 4.5 + (side < 0 ? 1.2 : 0)); window.__house!.look(-side * Math.PI / 2) }, side)
    const before = await page.evaluate(() => ({ ...window.__house!.position() }))
    const closed = await page.evaluate(side => window.__house!.snapshot().openings.find(opening => opening.id === `${side < 0 ? 'west-' : ''}EG-kitchen-window`)!.rotation, side)
    await page.locator('canvas').hover(); await page.mouse.wheel(0, -200)
    const opened = await page.evaluate(side => window.__house!.snapshot().openings.find(opening => opening.id === `${side < 0 ? 'west-' : ''}EG-kitchen-window`)!.rotation, side)
    expect(opened).not.toEqual(closed)
    await page.locator('canvas').hover(); await page.mouse.wheel(0, 100)
    const reduced = await page.evaluate(side => window.__house!.snapshot().openings.find(opening => opening.id === `${side < 0 ? 'west-' : ''}EG-kitchen-window`)!.rotation, side)
    expect(reduced).not.toEqual(opened)
    expect(reduced).not.toEqual(closed)
    const after = await page.evaluate(() => ({ ...window.__house!.position() }))
    expect(after.x).toBeCloseTo(before.x); expect(after.z).toBeCloseTo(before.z)
  }
  await page.evaluate(() => { window.__house!.teleport(5.2, 0, 6.1); window.__house!.look(-Math.PI / 2) })
  const before = await page.evaluate(() => window.__house!.snapshot().openings)
  await page.mouse.wheel(0, -200)
  expect(await page.evaluate(() => window.__house!.snapshot().openings)).toEqual(before)
})

test('Westhaelfte: gespiegelte Treppe und Kinderzimmer begehbar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Gleiche Physik; mobile Eingabe separat getestet.')
  await page.goto('/'); await page.getByRole('button', {name:'Rundgang',exact:true}).click()
  await expect.poll(() => page.evaluate(() => window.__house?.mode)).toBe('walk')
  const walkTo = async (yaw: number, axis: 'x' | 'z', target: number, less: boolean) => {
    await page.evaluate(yaw => window.__house!.look(yaw), yaw); await page.keyboard.down('KeyW')
    try { await page.waitForFunction(({axis,target,less}) => less ? window.__house!.position()[axis] < target : window.__house!.position()[axis] > target, {axis,target,less}, {timeout:15000,polling:'raf'}) } finally { await page.keyboard.up('KeyW') }
  }
  const { walkStair } = await import('./walkStair')
  await walkStair(page, 0, 2.95, -1)
  expect((await page.evaluate(() => window.__house!.position())).y).toBeGreaterThan(3.8)
  await page.evaluate(() => window.__house!.teleport(-2.88, 2.95, 5.41))
  await walkTo(Math.PI/2, 'x', -5.1, true)
  await page.evaluate(() => window.__house!.teleport(-2.88, 2.95, 6.68))
  await walkTo(0, 'z', 2.9, true)
  expect((await page.evaluate(() => window.__house!.position())).y).toBeGreaterThan(3.8)
  await page.evaluate(() => window.__house!.teleport(-2.88, 2.95, 8.5))
  await walkTo(-Math.PI / 2, 'x', -1.9, false)
})

test('Spiegelung, getrennte Farben, abschaltbare Umgebung und lichtdurchlaessiges Glas', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/'); await page.getByRole('button', { name: '3D', exact: true }).click(); await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.snapshot().site)).toBe(true)
  const probe = await page.evaluate(async () => {
    const scenePath = '/src/scene.ts', threePath = '/node_modules/.vite/deps/three.js'
    const { buildScene } = await import(scenePath), THREE = await import(threePath)
    const model = buildScene('EG', true, true, true), west = model.group.getObjectByName('house-west')
    const westWalls = west.children.filter((mesh: Mesh) => mesh.name.includes('-wall-')), eastWalls = model.group.children.filter((mesh: Mesh) => mesh.name.includes('-wall-'))
    const mirrored = westWalls.every((mesh: Mesh, index: number) => {
      const east = eastWalls[index], position = mesh.getWorldPosition(new THREE.Vector3())
      return mesh.geometry.getAttribute('position').count === east.geometry.getAttribute('position').count && Math.abs(position.x + east.position.x) < .00001 && Math.abs(position.z - east.position.z - 1.2) < .00001
    })
    model.setFinish('facade', '#bdcdd3', 'west'); model.setFinish('frame', '#202624', 'west'); model.setFinish('roof', '#b66b52', 'west')
    const eastWall = eastWalls.find((mesh: Mesh) => mesh.name === 'EG-wall-east'), westWall = westWalls.find((mesh: Mesh) => mesh.name === 'EG-wall-east')
    const colors = [(eastWall.material[0] as MeshStandardMaterial).color.getHexString(), (westWall.material[0] as MeshStandardMaterial).color.getHexString()]
    const glazing: Mesh[] = []; model.group.traverse((object: Mesh) => { if (object.userData.glazing) glazing.push(object) })
    const allTransparent = glazing.every(mesh => !mesh.castShadow)
    const pane = model.doors.find((door: {id: string}) => door.id === 'EG-kitchen-window').object.clone()
    pane.position.set(0, 0, 1); pane.rotation.set(0, 0, 0)
    const renderer = new THREE.WebGLRenderer(); renderer.setSize(64, 64); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
    const target = new THREE.WebGLRenderTarget(64, 64); renderer.setRenderTarget(target)
    const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .1, 20); camera.position.set(0, 0, 6); camera.lookAt(0, 0, 0)
    const receiver = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({color:'#ffffff'})); receiver.receiveShadow = true
    const light = new THREE.DirectionalLight('#ffffff', 3); light.position.set(0, 0, 5); light.castShadow = true; light.shadow.camera.left = -2; light.shadow.camera.right = 2; light.shadow.camera.top = 2; light.shadow.camera.bottom = -2
    scene.add(receiver, pane, light, new THREE.AmbientLight('#ffffff', .15))
    const sample = (shadow: boolean) => { pane.castShadow = shadow; renderer.render(scene, camera); const pixels = new Uint8Array(4); renderer.readRenderTargetPixels(target, 32, 32, 1, 1, pixels); return pixels[0] }
    const transmitted = sample(false), blocked = sample(true)
    const result = { mirrored, count: westWalls.length, colors, allTransparent, transmitted, blocked, floors: ['KG','EG','OG','DG'].every(id => west.getObjectByName(`${id}-slab`)), doors: model.doors.filter((door: {id: string}) => door.id.startsWith('west-')).length, totalDoors: model.doors.length }
    receiver.geometry.dispose(); receiver.material.dispose(); target.dispose(); renderer.dispose(); model.dispose()
    return result
  })
  expect(probe.mirrored).toBe(true); expect(probe.count).toBeGreaterThan(40); expect(probe.floors).toBe(true)
  expect(probe.doors * 2).toBe(probe.totalDoors); expect(probe.colors).toEqual(['eeeae0', 'bdcdd3']); expect(probe.allTransparent).toBe(true)
  expect(probe.transmitted).toBeGreaterThan(probe.blocked + 20)
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', {name:'Fassadenansicht', exact:true}).click()
  await page.getByLabel('Haushälfte', {exact:true}).selectOption('west')
  await expect(page.getByLabel('Fassadenentwurf', {exact:true})).toHaveValue('plaster')
  await page.getByRole('button', {name:'Fassade Nebelblau', exact:true}).click(); await page.getByRole('button', {name:'Dach Naturrot', exact:true}).click(); await page.getByRole('button', {name:'Fensterrahmen Anthrazit', exact:true}).click()
  await page.getByLabel('Haushälfte', {exact:true}).selectOption('east')
  await expect(page.getByRole('button', {name:'Fassade Muschelweiß', exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(page.getByRole('button', {name:'Fensterrahmen Eiche', exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(page.getByRole('button', {name:'Holz Eiche hell', exact:true})).toHaveAttribute('aria-pressed','true')
  await page.locator('.scene-settings summary').click()
  await page.screenshot({path:`test-results/${testInfo.project.name}-double-house-context.png`})
  const baseline = PNG.sync.read(await page.locator('canvas').screenshot())
  await page.locator('.scene-settings summary').click(); await page.getByLabel('Nachbarschaft', {exact:true}).uncheck(); await page.getByLabel('Garten, Hecke und Zaun', {exact:true}).uncheck(); await page.locator('.scene-settings summary').click()
  const bare = PNG.sync.read(await page.locator('canvas').screenshot()); let changed = 0
  for (let offset = 0; offset < bare.data.length; offset += 4) if (Math.abs(bare.data[offset] - baseline.data[offset]) > 12) changed++
  expect(changed / (bare.width * bare.height)).toBeGreaterThan(.03)
  await page.screenshot({path:`test-results/${testInfo.project.name}-double-house-bare.png`})
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([])
})