import { expect, test } from '@playwright/test'

test('Kinderzimmer haben Fensterarbeitsplaetze mit korrekt ausgerichteten Monitoren', async ({ page }, testInfo) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { OBB } = await import('/node_modules/three/examples/jsm/math/OBB.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor, elevations } = await import('/src/model.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    const model = buildScene('OG', true, true, true)
    model.group.updateMatrixWorld(true)
    const equipment = [], monitors = []
    model.group.traverse(object => { if (object instanceof THREE.Mesh && /-(monitor-|keyboard)/.test(object.name)) equipment.push(object) })
    for (const [floorId, deskId, chairId] of [['OG', 'desk-north', 'desk-chair-north'], ['OG', 'desk-south', 'desk-chair-south'], ['DG', 'office-desk', 'office-chair']]) {
      const floor = makeFloor(floorId), desk = floor.furniture.find(item => item.id === deskId), chair = floor.furniture.find(item => item.id === chairId)
      const screen = model.group.getObjectByName(`${deskId}-monitor-screen`), frame = model.group.getObjectByName(`${deskId}-monitor-frame`)
      const bounds = new THREE.Box3().setFromObject(frame), size = bounds.getSize(new THREE.Vector3()), center = screen.getWorldPosition(new THREE.Vector3())
      const towardChair = new THREE.Vector3(chair.x + chair.width / 2 - center.x, 0, chair.z + chair.depth / 2 - center.z).normalize()
      const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(screen.getWorldQuaternion(new THREE.Quaternion()))
      monitors.push({ id: deskId, facing: facing.dot(towardChair), width: size.x, thickness: size.z, centered: bounds.getCenter(new THREE.Vector3()).x - desk.x - desk.width / 2, top: bounds.max.y - floor.elevation })
    }
    const collisions = []
    for (const door of model.doors.filter(door => door.kind === 'window')) for (let step = 0; step <= 20; step++) {
      model.setOpening(door.id, step / 20)
      door.object.geometry.computeBoundingBox()
      const moving = new OBB().fromBox3(door.object.geometry.boundingBox).applyMatrix4(door.object.matrixWorld)
      for (const object of equipment) if (moving.intersectsOBB(new OBB().fromBox3(new THREE.Box3().setFromObject(object)))) collisions.push(`${door.id}/${object.name}/${step}`)
    }
    for (const door of model.doors) model.setOpening(door.id, door.kind === 'door' ? 1 : 0)
    await initializePhysics()
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(2.85, elevations.OG, 4.4))
    const routes = []
    for (const points of [[[2.85, 4.4], [4.6, 4.4], [4.6, 1.9], [5.4, 1.9]], [[4.6, 4.4], [4.9, 4.8], [5.1, 6.1]], [[2.85, 8.5], [3.95, 8.5], [5.4, 8.5]]]) {
      walker.teleport(new THREE.Vector3(points[0][0], elevations.OG, points[0][1]))
      for (const [east, south] of points.slice(1)) {
        for (let step = 0; step < 300 && Math.hypot(walker.position().x - east, walker.position().z - south) > .07; step++) {
          camera.lookAt(east, camera.position.y, south); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
        }
        routes.push(Math.hypot(walker.position().x - east, walker.position().z - south) < .1)
      }
    }
    walker.dispose(); model.dispose()
    const preview = buildScene('OG', false, false, true)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e7ebed'); scene.add(preview.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#9eacb1', 2.5))
    const light = new THREE.DirectionalLight('#ffffff', 3); light.position.set(3, 10, 6); scene.add(light)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(innerWidth, innerHeight)
    renderer.domElement.id = 'child-desk-preview'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999'; document.body.append(renderer.domElement)
    camera.fov = 65; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
    window.__childDeskPreview = { render(north) { camera.position.set(4.7, elevations.OG + 2.4, north ? 3.1 : 7.8); camera.lookAt(5.4, elevations.OG + .85, north ? .7 : 9.85); renderer.render(scene, camera) }, dispose() { preview.dispose(); renderer.dispose(); renderer.domElement.remove() } }
    return { monitors, collisions, routes }
  })
  for (const monitor of result.monitors) {
    expect(monitor.facing, monitor.id).toBeGreaterThan(.9)
    expect(monitor.width).toBeCloseTo(.56)
    expect(monitor.thickness).toBeCloseTo(.045)
    expect(monitor.centered).toBeCloseTo(0)
    expect(monitor.top).toBeCloseTo(1.17)
  }
  expect(result.collisions).toEqual([])
  expect(result.routes.every(Boolean)).toBe(true)
  for (const north of [true, false]) {
    await page.evaluate(north => window.__childDeskPreview.render(north), north)
    const image = PNG.sync.read(await page.locator('#child-desk-preview').screenshot({ path: `test-results/${testInfo.project.name}-child-desk-${north ? 'north' : 'south'}.png` }))
    const colors = new Set<string>()
    for (let offset = 0; offset < image.data.length; offset += 16) colors.add(`${image.data[offset] >> 4},${image.data[offset + 1] >> 4},${image.data[offset + 2] >> 4}`)
    expect(colors.size).toBeGreaterThan(25)
  }
  await page.evaluate(() => { window.__childDeskPreview.dispose(); delete window.__childDeskPreview })
})

test('Duschtueren oeffnen nach innen und EG-Armaturen sitzen an der Rueckwand', async ({ page }, testInfo) => {
  await page.goto('/')
  for (const floorId of ['EG', 'OG']) {
    const result = await page.evaluate(async floorId => {
      const THREE = await import('/node_modules/.vite/deps/three.js')
      const { buildScene } = await import('/src/scene.ts')
      const { makeFloor, wallSolids, furnitureVolumes } = await import('/src/model.ts')
      const { initializePhysics, createWalker } = await import('/src/walk.ts')
      const floor = makeFloor(floorId), model = buildScene(floorId, false, false, true)
      const showerId = floorId === 'EG' ? 'guest-shower' : 'bath-shower'
      const shower = floor.furniture.find(item => item.id === showerId)
      const door = model.doors.find(door => door.id === `${floorId}-shower`)
      const bounds = object => new THREE.Box3().setFromObject(object)
      const obstacles = [...floor.walls.flatMap(wall => wallSolids(wall, floor.height)), ...floor.furniture.filter(item => item.id !== showerId).flatMap(furnitureVolumes)].map(solid => new THREE.Box3(new THREE.Vector3(solid.x, floor.elevation + solid.bottom, solid.z), new THREE.Vector3(solid.x + solid.width, floor.elevation + solid.bottom + solid.height, solid.z + solid.depth)))
      const control = bounds(model.group.getObjectByName(`${showerId}-concealed-control`))
      const arm = floorId === 'EG' ? bounds(model.group.getObjectByName(`${showerId}-rain-arm`)) : null
      const backWall = floor.walls.find(wall => wall.id === (floorId === 'EG' ? 'stair-north' : 'bath-installation'))
      const fittingsOnWall = floorId === 'EG' ? control.min.z < backWall.z && control.max.z > backWall.z && arm.max.z > backWall.z : control.min.z >= backWall.z + backWall.depth && control.min.z < backWall.z + backWall.depth + .05
      const fittingBoxes = [control, bounds(model.group.getObjectByName(`${showerId}-rain-head`)), ...(arm ? [arm] : [])]
      const sweepClear = []
      for (let step = 0; step <= 20; step++) {
        model.setOpening(door.id, step / 20)
        const moving = bounds(door.pivot)
        sweepClear.push([...obstacles, ...fittingBoxes].every(obstacle => !moving.intersectsBox(obstacle)))
      }
      const open = bounds(door.object)
      model.setOpening(door.id, 0)
      const closed = bounds(door.object)
      const inward = floorId === 'EG' ? open.max.z > closed.max.z + .7 : open.min.x < closed.min.x - .7
      const trayVolume = new THREE.Box3(new THREE.Vector3(shower.x, floor.elevation + .1, shower.z), new THREE.Vector3(shower.x + shower.width, floor.elevation + 1.9, shower.z + shower.depth))
      let staticGlass = 0
      model.group.traverse(object => {
        if (!(object instanceof THREE.Mesh) || door.pivot.getObjectById(object.id)) return
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        if (materials.some(material => material.transparent && material.opacity < .8) && bounds(object).intersectsBox(trayVolume)) staticGlass++
      })
      await initializePhysics()
      const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .05, 100)
      const start = floorId === 'EG' ? [.8, 1.65] : [2.1, 2.85]
      const target = floorId === 'EG' ? [.8, 2.65] : [.8, 2.85]
      const walker = createWalker(model, camera, new THREE.Vector3(start[0], floor.elevation, start[1]))
      const canEnter = () => {
        walker.teleport(new THREE.Vector3(start[0], floor.elevation, start[1]))
        for (let step = 0; step < 150; step++) {
          if (Math.hypot(walker.position().x - target[0], walker.position().z - target[1]) < .08) return true
          camera.lookAt(target[0], camera.position.y, target[1]); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
        }
        return false
      }
      const closedBlocks = !canEnter()
      model.setOpening(door.id, 1)
      const openPasses = canEnter()
      walker.dispose()
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#e7ebed'); scene.add(model.group)
      scene.add(new THREE.HemisphereLight('#ffffff', '#9eacb1', 2.5))
      const light = new THREE.DirectionalLight('#ffffff', 3); light.position.set(3, 8, 1); scene.add(light)
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(innerWidth, innerHeight)
      renderer.domElement.id = 'shower-preview'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999'; document.body.append(renderer.domElement)
      camera.position.set(floorId === 'EG' ? .9 : 3.4, floor.elevation + 2.4, floorId === 'EG' ? .7 : 3); camera.lookAt(.85, floor.elevation + 1.05, 2.7)
      window.__showerPreview = { render(amount) { model.setOpening(door.id, amount); renderer.render(scene, camera) }, dispose() { model.dispose(); renderer.dispose(); renderer.domElement.remove() } }
      window.__showerPreview.render(0)
      return { inward, fittingsOnWall, sweepClear, staticGlass, closedBlocks, openPasses, glass: door.object.material.transparent }
    }, floorId)
    expect(result.inward).toBe(true)
    expect(result.fittingsOnWall).toBe(true)
    expect(result.sweepClear.every(Boolean)).toBe(true)
    expect(result.staticGlass).toBe(0)
    expect(result.closedBlocks).toBe(true)
    expect(result.openPasses).toBe(true)
    expect(result.glass).toBe(true)
    const closedImage = PNG.sync.read(await page.locator('#shower-preview').screenshot({ path: `test-results/${testInfo.project.name}-${floorId}-shower-closed.png` }))
    await page.evaluate(() => window.__showerPreview.render(1))
    const openImage = PNG.sync.read(await page.locator('#shower-preview').screenshot({ path: `test-results/${testInfo.project.name}-${floorId}-shower-open.png` }))
    const colors = new Set<string>(); let changed = 0
    for (let offset = 0; offset < openImage.data.length; offset += 16) {
      colors.add(`${openImage.data[offset] >> 4},${openImage.data[offset + 1] >> 4},${openImage.data[offset + 2] >> 4}`)
      if (Math.abs(openImage.data[offset] - closedImage.data[offset]) + Math.abs(openImage.data[offset + 1] - closedImage.data[offset + 1]) + Math.abs(openImage.data[offset + 2] - closedImage.data[offset + 2]) > 30) changed++
    }
    expect(colors.size).toBeGreaterThan(25)
    expect(changed).toBeGreaterThan(200)
    await page.evaluate(() => { window.__showerPreview.dispose(); delete window.__showerPreview })
  }
})

test('Rundgang bleibt auch weit ausserhalb des Grundstuecks auf dem Boden', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { construction, elevations, lightWells } = await import('/src/model.ts')
    const { siteBoundary } = await import('/src/context.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    const model = buildScene('EG', true, true, true)
    await initializePhysics()
    const camera = new THREE.PerspectiveCamera()
    const walker = createWalker(model, camera, new THREE.Vector3(3, 0, 6))
    const east = Math.max(...siteBoundary.map(([east]: number[]) => east))
    const west = Math.min(...siteBoundary.map(([east]: number[]) => east))
    const north = Math.min(...siteBoundary.map(([, south]: number[]) => south))
    const south = Math.max(...siteBoundary.map(([, south]: number[]) => south))
    const ground = []
    for (const [eastward, southward, directionX, directionZ] of [[east + 2, 5, 1, 0], [west - 2, 5, -1, 0], [0, north - 2, 0, -1], [0, south + 2, 0, 1], [500, 500, 0, 1], [-500, -500, 0, 1], [9000, -9000, 0, 1]]) {
      walker.teleport(new THREE.Vector3(eastward, construction.terrain, southward))
      camera.lookAt(eastward + directionX * 10, camera.position.y, southward + directionZ * 10)
      walker.keys.add('KeyW')
      for (let step = 0; step < 180; step++) walker.tick()
      walker.keys.clear()
      ground.push({ height: walker.position().y - .9, distance: (walker.position().x - eastward) * directionX + (walker.position().z - southward) * directionZ })
    }
    walker.teleport(new THREE.Vector3(0, construction.terrain, south - 1))
    const boundaryHeights = []
    for (const direction of [1, -1]) {
      camera.lookAt(0, camera.position.y, walker.position().z + direction * 10)
      walker.keys.add('KeyW')
      for (let step = 0; step < 120; step++) { walker.tick(); boundaryHeights.push(walker.position().y - .9) }
      walker.keys.clear()
    }
    const boundaryReturn = walker.position().z
    walker.teleport(new THREE.Vector3(3, elevations.KG, 6))
    for (let step = 0; step < 90; step++) walker.tick()
    const basement = walker.position().y - .9
    const well = lightWells[0]
    walker.teleport(new THREE.Vector3(well.x + well.width / 2, -1, well.z + well.depth / 2))
    for (let step = 0; step < 90; step++) walker.tick()
    const lightWell = walker.position().y - .9
    walker.dispose(); model.dispose()
    return { ground, terrain: construction.terrain, boundaryHeights, boundaryReturn, boundaryStart: south - 1, basement, basementFloor: elevations.KG, lightWell }
  })
  for (const point of result.ground) {
    expect(point.height).toBeCloseTo(result.terrain, 1)
    expect(point.distance, JSON.stringify(result)).toBeGreaterThan(7)
  }
  for (const height of result.boundaryHeights) expect(height).toBeCloseTo(result.terrain, 1)
  expect(result.boundaryReturn).toBeCloseTo(result.boundaryStart, 1)
  expect(result.basement).toBeCloseTo(result.basementFloor, 1)
  expect(result.lightWell).toBeLessThan(-1)
})
import { PNG } from 'pngjs'

test('Eine gerade Treppenmittelwand verbindet die Laeufe ohne rundliche Doppelwangen', async ({ page }, testInfo) => {
  await page.goto('/')
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  for (const id of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: id, exact: true }).click()
    const wall = page.locator('[data-stair-center-wall]')
    await expect(wall).toHaveCount(1)
    expect(Number(await wall.getAttribute('width'))).toBeCloseTo(1)
    expect(Number(await wall.getAttribute('height'))).toBeCloseTo(.2)
    await expect(page.locator('[data-stair-eye-guard]')).toHaveCount(0)
  }
  await page.screenshot({ path: `test-results/${testInfo.project.name}-center-wall-plan.png` })
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { stairWalkingLine } = await import('/src/winderStair.ts')
    const { elevations, storeyRise } = await import('/src/model.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    await initializePhysics()
    const model = buildScene('EG', true, true, true)
    for (const door of model.doors) if (door.kind === 'door') model.setOpening(door.id, 1)
    const walls = model.group.children.filter(object => object.name === 'stair-center-wall').map(object => {
      const bounds = new THREE.Box3().setFromObject(object)
      return { min: bounds.min.toArray(), max: bounds.max.toArray() }
    })
    const guards = model.group.children.filter(object => object.name === 'stair-center-wall-guard').length
    const oldWalls = model.group.children.filter(object => object.name.startsWith('stair-inner-wall-') || object.name === 'stair-eye-guard').length
    const handrails = model.group.children.filter(object => object.name === 'stair-handrail').map(object => {
      const bounds = new THREE.Box3().setFromObject(object), center = bounds.getCenter(new THREE.Vector3())
      return { outer: Math.min(Math.abs(center.x - .36), Math.abs(center.z - 3.56), Math.abs(center.z - 5.44)) < .001, min: bounds.min.toArray(), max: bounds.max.toArray() }
    })
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(2.8, 0, 5.075))
    const routes = []
    for (const id of ['KG', 'EG', 'OG']) for (const reverse of [false, true]) {
      const points = stairWalkingLine(storeyRise(id)).map(([east, , south]) => [east, south])
      if (reverse) points.reverse()
      walker.teleport(new THREE.Vector3(points[0][0], elevations[id] + (reverse ? storeyRise(id) : 0), points[0][1]))
      let blocked = false
      for (const [east, south] of points.slice(1)) {
        let frames = 0
        while (Math.hypot(walker.position().x - east, walker.position().z - south) > .055 && frames++ < 300) {
          camera.lookAt(east, camera.position.y, south); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
        }
        if (frames >= 300) { blocked = true; break }
      }
      for (let frame = 0; frame < 20; frame++) walker.tick()
      routes.push({ id, reverse, blocked, height: walker.position().y - .9, expected: elevations[id] + (reverse ? 0 : storeyRise(id)) })
    }
    walker.teleport(new THREE.Vector3(2.8, elevations.EG, 4.5))
    for (let frame = 0; frame < 120; frame++) { camera.lookAt(1.75, camera.position.y, 4.5); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear() }
    const wallBlocks = walker.position().x > 2.4
    walker.dispose(); model.dispose()
    const preview = buildScene('EG', false, false, false)
    for (const child of preview.group.children) child.visible = child.name.startsWith('stair-')
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e7ebed'); scene.add(preview.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#718078', 2))
    const light = new THREE.DirectionalLight('#ffffff', 2); light.position.set(6, 9, 3); scene.add(light)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(1)
    renderer.domElement.id = 'center-wall-preview'; renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:10000'; document.body.append(renderer.domElement)
    camera.aspect = innerWidth / innerHeight; camera.fov = 45; camera.updateProjectionMatrix()
    const render = (rotated: boolean) => {
      const distance = innerWidth < 600 ? 1.4 : 1
      camera.position.set(1.4 + (rotated ? -4.8 : 5) * distance, 2 + 2.7 * distance, 4.5 + (rotated ? -5 : 5) * distance)
      camera.lookAt(1.3, 1.8, 4.5); renderer.render(scene, camera)
    }
    render(false)
    Object.assign(window, { centerWallPreview: { render, dispose() { preview.dispose(); renderer.dispose(); renderer.domElement.remove() } } })
    return { walls, guards, oldWalls, handrails, routes, wallBlocks }
  })
  expect(result.walls).toHaveLength(3)
  expect(result.guards).toBe(1)
  expect(result.oldWalls).toBe(0)
  expect(result.handrails).toHaveLength(42)
  for (const rail of result.handrails) {
    expect(rail.outer).toBe(true)
    expect(rail.min[0]).toBeGreaterThan(.3)
    expect(rail.min[2]).toBeGreaterThan(3.5)
    expect(rail.max[2]).toBeLessThan(5.5)
  }
  expect(result.wallBlocks).toBe(true)
  for (const [index, wall] of result.walls.entries()) {
    expect(wall.min[0]).toBeCloseTo(1.2)
    expect(wall.max[0]).toBeCloseTo(2.2)
    expect(wall.min[2]).toBeCloseTo(4.4)
    expect(wall.max[2]).toBeCloseTo(4.6)
    if (index) expect(wall.min[1]).toBeCloseTo(result.walls[index - 1].max[1])
  }
  for (const route of result.routes) {
    expect(route.blocked, `${route.id} ${route.reverse ? 'ab' : 'auf'}`).toBe(false)
    expect(Math.abs(route.height - route.expected)).toBeLessThan(.07)
  }
  const canvas = page.locator('#center-wall-preview')
  const first = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-center-wall-3d.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < first.data.length; offset += 32) colors.add(`${first.data[offset] >> 4},${first.data[offset + 1] >> 4},${first.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.evaluate(() => (window as any).centerWallPreview.render(true))
  const rotated = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-center-wall-rotated.png` }))
  expect(rotated.data.equals(first.data)).toBe(false)
  await page.evaluate(() => { (window as any).centerWallPreview.dispose(); delete (window as any).centerWallPreview })
  expect(errors).toEqual([])
})

test('Türen starten im Rundgang geschlossen', async ({ page }) => {
  await page.goto('/')
  const states = await page.evaluate(async () => {
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('EG', true, false, false)
    const doors = model.doors.filter(door => door.kind === 'door').map(door => {
      const initialPosition = door.pivot.position.toArray()
      const initialRotation = door.pivot.rotation.toArray()
      const amount = door.amount, open = door.open
      const acceptedClosed = model.setOpening(door.id, 0)
      const sameAsClosed = initialPosition.every((value, index) => Math.abs(value - door.pivot.position.toArray()[index]) < 1e-8)
        && initialRotation.slice(0, 3).every((value, index) => Math.abs(value - door.pivot.rotation.toArray()[index]) < 1e-8)
      const acceptedOpen = model.setOpening(door.id, 1)
      return {
        id: door.id,
        amount,
        open,
        acceptedClosed,
        sameAsClosed,
        opensFromClosed: acceptedOpen && door.amount === 1 && door.open,
      }
    })
    model.dispose()
    return doors
  })
  expect(states.length).toBeGreaterThan(0)
  expect(states.every(door => door.amount === 0 && !door.open && door.acceptedClosed && door.sameAsClosed && door.opensFromClosed)).toBe(true)
  for (const id of ['EG-entrance', 'EG-terrace', 'OG-bath', 'DG-attic-office', 'west-EG-entrance']) {
    expect(states.some(door => door.id === id), id).toBe(true)
  }
})

test('Der EG-2D-Plan zeigt keinen Eingangsmarker', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await expect(page.locator('svg.floor-plan')).toBeVisible()
  await expect(page.locator('[data-entrance-marker]')).toHaveCount(0)
})

test('DG Buero und Gaestezimmer bleiben mit Doppelbett begehbar', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'DG', exact: true }).click()
  await expect(page.locator('svg.floor-plan')).toContainText('Büro / Gäste')
  await expect(page.getByRole('button', { name: '01 Schlafen / Ankleide 15,4 m²', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '03 Büro / Gäste 22,2 m²', exact: true })).toBeVisible()
  await expect(page.locator('[data-furniture="guest-bed"]')).toHaveCount(1)
  await expect(page.locator('svg.floor-plan')).not.toContainText('Abstellraum')
  await expect(page.getByRole('button', { name: /Abstellraum/ })).toHaveCount(0)
  await expect(page.locator('[data-furniture="store-shelf"]')).toHaveCount(0)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-guest-office-plan.png` })
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor, elevations } = await import('/src/model.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    const model = buildScene('DG', false, false, true, true)
    const floor = makeFloor('DG'), bed = floor.furniture.find(item => item.id === 'guest-bed')
    const obstacle = new THREE.Box3(new THREE.Vector3(bed.x, elevations.DG, bed.z), new THREE.Vector3(bed.x + bed.width, elevations.DG + bed.height + .35, bed.z + bed.depth))
    const sweep = []
    for (const id of ['DG-attic-office', 'DG-gable-office']) {
      const door = model.doors.find(door => door.id === id)
      for (let step = 0; step <= 20; step++) {
        model.setOpening(id, step / 20)
        sweep.push(!new THREE.Box3().setFromObject(door.pivot).intersectsBox(obstacle))
      }
    }
    model.setOpening('DG-gable-office', 0)
    await initializePhysics()
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .05, 80)
    const walker = createWalker(model, camera, new THREE.Vector3(3.05, elevations.DG, 4.1))
    const points = [[4.7, 4.1], [4.9, 4.15], [6.3, 4.15], [6.3, 2.8], [6.3, 4.15], [4.7, 4.15], [4.7, 4.1], [3.85, 4.1], [3.85, 3.02], [3.25, 3.02], [3.25, 2.5], [2.3, 2.5], [1.5, 2.4]]
    const reached = []
    for (const [east, south] of points) {
      for (let step = 0; step < 350 && Math.hypot(walker.position().x - east, walker.position().z - south) > .07; step++) {
        camera.lookAt(east, camera.position.y, south); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
      }
      reached.push(Math.hypot(walker.position().x - east, walker.position().z - south) < .1)
    }
    walker.teleport(new THREE.Vector3(3.5, elevations.DG, 8.1))
    for (let step = 0; step < 150; step++) {
      if (Math.abs(walker.position().x - 1.5) < .07) break
      camera.lookAt(1.5, camera.position.y, 8.1); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
    }
    const dressingAccessible = Math.abs(walker.position().x - 1.5) < .1
    walker.teleport(new THREE.Vector3(3.1, elevations.DG, 6.5))
    for (let step = 0; step < 150; step++) {
      if (Math.hypot(walker.position().x - 2.15, walker.position().z - 6.75) < .07) break
      camera.lookAt(2.15, camera.position.y, 6.75); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
    }
    const deskAccessible = Math.hypot(walker.position().x - 2.15, walker.position().z - 6.75) < .1
    const storageDoorRemoved = !model.doors.some(door => door.id === 'DG-store')
    walker.dispose()
    const canvas = document.createElement('canvas')
    canvas.id = 'guest-preview'
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:10000'
    document.body.append(canvas)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(innerWidth, innerHeight)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#edf1eb')
    scene.add(new THREE.HemisphereLight('#ffffff', '#777766', 2.5))
    const light = new THREE.DirectionalLight('#ffffff', 2); light.position.set(3, 12, 8); scene.add(light)
    model.group.getObjectByName('house-west').visible = false
    scene.add(model.group)
    const render = (rotated: boolean) => {
      camera.position.set(rotated ? -3 : 10, elevations.DG + (innerWidth < 600 ? 19 : 13), 10)
      camera.lookAt(3.45, elevations.DG, 5.4)
      renderer.render(scene, camera)
    }
    window.__guestPreview = { render, dispose() { model.dispose(); renderer.dispose(); canvas.remove() } }
    render(false)
    return { sweep, reached, dressingAccessible, deskAccessible, storageDoorRemoved }
  })
  expect(result.sweep.every(Boolean)).toBe(true)
  expect(result.reached).toEqual(Array(13).fill(true))
  expect(result.dressingAccessible).toBe(true)
  expect(result.deskAccessible).toBe(true)
  expect(result.storageDoorRemoved).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const preview = page.locator('#guest-preview')
  const image = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-guest-office-3d.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < image.data.length; offset += 32) colors.add(`${image.data[offset] >> 4},${image.data[offset + 1] >> 4},${image.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.evaluate(() => window.__guestPreview.render(true))
  const rotated = await preview.screenshot({ path: `test-results/${testInfo.project.name}-guest-office-rotated.png` })
  expect(PNG.sync.read(rotated).data.equals(image.data)).toBe(false)
  await page.evaluate(() => { window.__guestPreview.dispose(); delete window.__guestPreview })
})

test('Badewannenarmatur sitzt an der Ostwand und ragt ueber die Wanne', async ({ page }) => {
  await page.goto('/')
  const placement = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor, elevations } = await import('/src/model.ts')
    const model = buildScene('OG', true, true, true)
    const floor = makeFloor('OG')
    const tub = floor.furniture.find(item => item.id === 'bath-tub')
    const eastWall = floor.walls.find(wall => wall.id === 'bath-east')
    const bounds = (name: string) => new THREE.Box3().setFromObject(model.group.getObjectByName(name))
    const control = bounds('bath-tub-control'), spout = bounds('bath-tub-spout')
    model.dispose()
    return {
      attached: control.min.x < eastWall.x && control.max.x > eastWall.x,
      overTub: spout.min.x > tub.x && spout.min.x < tub.x + tub.width - .09 && spout.max.x > tub.x + tub.width,
      centered: control.min.z > tub.z && control.max.z < tub.z + tub.depth,
      aboveRim: spout.min.y > elevations.OG + tub.height,
    }
  })
  expect(placement).toEqual({ attached: true, overTub: true, centered: true, aboveRim: true })
})

test('Raffstores fahren vor der Verglasung und die OG-Raumrevision bleibt bedienbar', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await expect(page.locator('[data-furniture="coffee-counter"]')).toHaveCount(0)
  await expect(page.locator('[data-furniture="peninsula"]')).toHaveAttribute('transform', 'translate(3.95 4.96)')
  await page.screenshot({ path: `test-results/${testInfo.project.name}-revised-eg-plan.png` })
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await expect(page.locator('[data-raffstore]')).toHaveCount(5)
  await expect(page.locator('svg.floor-plan')).not.toContainText('Spielzimmer')
  await expect(page.locator('[data-furniture="play-table"]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-raffstore-og-plan.png` })
  const geometry = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor, elevations, roomArea, wallSolids, furnitureVolumes } = await import('/src/model.ts')
    const { raffstores } = await import('/src/raffstore.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    const model = buildScene('OG', true, true, true)
    const groups = []
    model.group.traverse(object => { if (object.userData.raffstore) groups.push(object) })
    model.setRaffstores(1, 75)
    const bounds = (name: string) => new THREE.Box3().setFromObject(model.group.getObjectByName(name))
    const east = bounds('EG-living-corner-fixed-raffstore-lamellas')
    const south = bounds('EG-terrace-raffstore-lamellas')
    const curtainStates = groups.map(group => ({ extension: group.userData.extension, tilt: group.userData.tilt }))
    const raised = []
    model.setRaffstores(0, 30)
    for (const id of ['EG', 'OG', 'DG']) for (const blind of raffstores(makeFloor(id))) {
      const packet = bounds(`${blind.id}-raffstore-lamellas`)
      raised.push(packet.min.y >= elevations[id] + blind.box.bottom && packet.max.y < elevations[id] + blind.box.bottom + blind.box.height)
    }
    await initializePhysics()
    for (const door of model.doors) model.setOpening(door.id, 1)
    const camera = new THREE.PerspectiveCamera()
    const walker = createWalker(model, camera, new THREE.Vector3(2.85, elevations.OG, 6.2))
    const route = (points: number[][], level = elevations.OG) => {
      walker.teleport(new THREE.Vector3(points[0][0], level, points[0][1]))
      for (const [east, south] of points.slice(1)) {
        for (let step = 0; step < 350 && Math.hypot(walker.position().x - east, walker.position().z - south) > .07; step++) {
          camera.lookAt(east, camera.position.y, south); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
        }
        if (Math.hypot(walker.position().x - east, walker.position().z - south) > .1) return false
      }
      return true
    }
    const storageRoute = route([[2.85, 6.2], [1.25, 6.2]])
    const bedroomRoute = route([[2.85, 6.2], [2.85, 8.5], [3.95, 8.5], [5.4, 8.5]])
    const northRoute = route([[2.85, 4.4], [4.6, 4.4], [5.1, 4.4], [5.1, 6.7], [5.1, 4.4], [4.6, 4.4], [4.6, 2.8]])
    const tubRoute = route([[2.85, 3.9], [2.6, 2.8], [2.6, .7]])
    const kitchenRoute = route([[2.8, 3.9], [4.8, 3.9], [4.8, 4.55], [3.65, 4.55], [3.65, 6.7]], elevations.EG)
    const showerRoute = route([[2.85, 3.9], [2.85, 2.95], [2.25, 2.95], [.8, 2.95]])
    const toiletRouteOpen = route([[2.6, 2.95], [2.6, .68], [1.05, .68]])
    const bathWindow = model.doors.find((door: { id: string }) => door.id.startsWith('OG-bath-window'))!
    model.setOpening(bathWindow.id, 0)
    const toiletRoute = route([[2.6, 2.95], [2.6, .68], [1.05, .68]])
    model.setOpening(bathWindow.id, 1)
    const upper = makeFloor('OG')
    const showerStem = upper.walls.find(wall => wall.id === 'bath-installation')
    const showerHead = bounds('bath-shower-rain-head'), showerControl = bounds('bath-shower-concealed-control')
    const showerFittingsAtTWall = showerControl.min.z > showerStem.z + showerStem.depth && showerControl.max.z < showerStem.z + showerStem.depth + .05 && showerHead.min.z > showerStem.z + showerStem.depth && showerHead.max.z < showerStem.z + showerStem.depth + .5 && showerHead.max.y < elevations.OG + showerStem.height
    const showerDoor = model.doors.find(door => door.id === 'OG-shower')
    const obstacles = [...upper.walls.flatMap(wall => wallSolids(wall, upper.height)), ...upper.furniture.filter(item => item.id !== 'bath-shower').flatMap(furnitureVolumes)].map(solid => new THREE.Box3(new THREE.Vector3(solid.x, elevations.OG + solid.bottom, solid.z), new THREE.Vector3(solid.x + solid.width, elevations.OG + solid.bottom + solid.height, solid.z + solid.depth)))
    const showerSweepClear = []
    for (let step = 0; step <= 20; step++) {
      model.setOpening('OG-shower', step / 20)
      const moving = new THREE.Box3().setFromObject(showerDoor.pivot)
      showerSweepClear.push(obstacles.every(obstacle => !moving.intersectsBox(obstacle)))
    }
    model.setOpening('OG-shower', 0)
    const closedBlocksShower = !route([[2.1, 2.85], [.8, 2.85]])
    const closedGlass = new THREE.Box3().setFromObject(showerDoor.object)
    model.setOpening('OG-shower', 1)
    const openGlass = new THREE.Box3().setFromObject(showerDoor.pivot)
    const showerClearWidth = openGlass.min.z - upper.walls.find(wall => wall.id === 'bath-screen').z - upper.walls.find(wall => wall.id === 'bath-screen').depth
    const areas = Object.fromEntries(upper.rooms.map(room => [room.id, roomArea(room, 'OG').floor]))
    walker.dispose(); model.dispose()
    return { count: groups.length, curtainStates, cornerClear: !east.intersectsBox(south), raised, storageRoute, bedroomRoute, northRoute, tubRoute, kitchenRoute, showerRoute, toiletRouteOpen, toiletRoute, areas, showerSweepClear, closedBlocksShower, showerClearWidth, showerFittingsAtTWall, showerTop: closedGlass.max.y - elevations.OG, showerGlass: showerDoor.object.material.transparent }
  })
  expect(geometry.count).toBe(26)
  expect(geometry.curtainStates.every(state => state.extension === 1 && state.tilt === 75)).toBe(true)
  expect(geometry.cornerClear).toBe(true)
  expect(geometry.raised.every(Boolean)).toBe(true)
  expect(geometry.storageRoute).toBe(true)
  expect(geometry.bedroomRoute).toBe(true)
  expect(geometry.northRoute).toBe(true)
  expect(geometry.tubRoute).toBe(true)
  expect(geometry.kitchenRoute).toBe(true)
  expect(geometry.showerRoute).toBe(true)
  expect(geometry.toiletRouteOpen).toBe(false)
  expect(geometry.toiletRoute).toBe(true)
  expect(geometry.showerSweepClear.every(Boolean)).toBe(true)
  expect(geometry.closedBlocksShower).toBe(true)
  expect(geometry.showerClearWidth).toBeGreaterThanOrEqual(.8)
  expect(geometry.showerTop).toBeCloseTo(2.1)
  expect(geometry.showerGlass).toBe(true)
  expect(geometry.showerFittingsAtTWall).toBe(true)
  expect(geometry.areas.store).toBeCloseTo(2.701594595)
  expect(geometry.areas.store).toBeGreaterThanOrEqual(2.5)
  expect(geometry.areas.playroom).toBeUndefined()
  expect(geometry.areas['child-north']).toBeCloseTo(18.604581081)
  expect(geometry.areas['child-south']).toBeCloseTo(geometry.areas['child-north'], 10)
  expect(geometry.areas.bath).toBeCloseTo(10.7115)
  await page.getByRole('button', { name: '3D', exact: true }).click()
  for (const floor of ['EG', 'OG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    const pixels = PNG.sync.read(await page.locator('canvas').screenshot({ path: `test-results/${testInfo.project.name}-revised-${floor}-3d.png` }))
    const colors = new Set<string>()
    for (let offset = 0; offset < pixels.data.length; offset += 32) colors.add(`${pixels.data[offset] >> 4},${pixels.data[offset + 1] >> 4},${pixels.data[offset + 2] >> 4}`)
    expect(colors.size).toBeGreaterThan(25)
  }
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect(page.locator('.scene-settings')).toBeVisible()
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: 'Fassadenansicht', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  const canvas = page.locator('canvas')
  const before = PNG.sync.read(await canvas.screenshot())
  await page.locator('.scene-settings summary').click()
  const extension = page.locator('#raffstore-extension'), tilt = page.locator('#raffstore-tilt')
  await extension.focus(); await extension.press('End')
  await expect(extension).toHaveValue('1')
  await tilt.focus(); await tilt.press('End')
  await expect(tilt).toHaveValue('75')
  expect(await page.locator('.settings-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.locator('.scene-settings summary').click()
  const after = PNG.sync.read(await canvas.screenshot())
  let changed = 0
  const colors = new Set<string>()
  for (let offset = 0; offset < after.data.length; offset += 4) {
    colors.add(`${after.data[offset]},${after.data[offset + 1]},${after.data[offset + 2]}`)
    if (Math.abs(after.data[offset] - before.data[offset]) + Math.abs(after.data[offset + 1] - before.data[offset + 1]) > 15) changed++
  }
  expect(colors.size).toBeGreaterThan(50)
  expect(changed).toBeGreaterThan(300)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-raffstore-lowered.png` })
  await page.locator('.scene-settings summary').click()
  await extension.focus(); await extension.press('Home')
  await page.locator('.scene-settings summary').click()
  await page.getByRole('button', { name: '2D', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').click()
  await expect(page.locator('#raffstore-extension')).toHaveValue('0')
  await expect(page.locator('#raffstore-tilt')).toHaveValue('75')
  expect(errors).toEqual([])
})

test('Detailkorrekturen haben echte freie Volumen, Zargen und einen schließenden Kellerzugang', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    const model = buildScene('EG', true, false, true)
    model.group.updateMatrixWorld(true)
    const bounds = name => new THREE.Box3().setFromObject(model.group.getObjectByName(name))
    const occupied = (east, height, south) => model.colliders.some(collider => {
      const point = new THREE.Vector3(east, height, south).sub(collider.position).applyQuaternion(collider.rotation.clone().invert())
      return Math.abs(point.x) < collider.size.x / 2 && Math.abs(point.y) < collider.size.y / 2 && Math.abs(point.z) < collider.size.z / 2
    })
    const free = [[6.3, 1.2, 2.88], [4.5, .55, 6.2], [5.9, .55, 6.3], [4, 1, .5]].map(point => !occupied(...point))
    const coatHooks = model.group.children.filter(object => object.name.startsWith('entry-coats-hook-')).length
    const wardrobeBounds = bounds('furniture-body-wardrobe')
    const solid = [[6.3, 1.2, 2.51], [5, .55, 5.8], [4.5, .91, 6.2]].map(point => occupied(...point))
    const stools = [0, 1].map(index => { const seat = bounds(`barstool-seat-kitchen-stool-${index}`); return [seat.min.y, seat.max.y] })
    const sofaBack = bounds('sofa-back-sofa')
    const chairBack = bounds('chair-back-dining-chair-0')
    const towerTops = []
    const tiles = []
    model.group.traverse(object => {
      if (object.name.startsWith('kitchen-front-') && object.name !== 'kitchen-front-kitchen-upper') towerTops.push(new THREE.Box3().setFromObject(object).max.y)
      if (object.userData.floorRoom === 'entry' && object.userData.floorLevel === 'EG') tiles.push(new THREE.Box3().setFromObject(object).min.x)
    })
    const basement = model.doors.find(door => door.id === 'EG-basement-stair')
    const frameParts = model.group.children.filter(object => object.name === 'EG-basement-stair-frame')
    const frame = new THREE.Box3()
    for (const part of frameParts) frame.union(new THREE.Box3().setFromObject(part))
    const fixed = model.group.getObjectByName('EG-garden-fixed-fixed-0')
    const fixedBefore = fixed.matrixWorld.clone()
    const sliding = model.doors.find(door => door.id === 'EG-terrace')
    let movingGlass = 0
    sliding.pivot.traverse(object => { if (object.userData.glazing) movingGlass++ })
    model.setOpening(sliding.id, 0); model.setOpening(sliding.id, 1)
    const twoPane = movingGlass === 1 && fixedBefore.equals(fixed.matrixWorld) && !model.doors.some(door => door.id.includes('garden-fixed'))
    const transoms = []
    model.group.traverse(object => { if (object.name.startsWith('EG-') && object.name.includes('transom')) transoms.push(object.name) })
    await initializePhysics()
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(2.8, 0, 3.925))
    const cross = amount => {
      model.setOpening(basement.id, amount)
      walker.teleport(new THREE.Vector3(2.8, 0, 3.925))
      for (let frame = 0; frame < 150 && walker.position().x > 1.86; frame++) {
        camera.lookAt(1.8, camera.position.y, 3.925)
        walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
      }
      return walker.position().x
    }
    const closed = cross(0), opened = cross(1)
    const result = { free, solid, coatHooks, wardrobeEast: wardrobeBounds.max.x, stools, sofaBack: sofaBack.min.z, chairBack: chairBack.max.x, towerTops, tiles, frameParts: frameParts.length, frameWidth: frame.max.z - frame.min.z, frameHeight: frame.max.y - frame.min.y, leafWidth: basement.size.x, leafHeight: basement.size.y, closed, opened, twoPane, transoms }
    walker.dispose(); model.dispose()
    return result
  })
  expect(result.free).toEqual([true, true, true, true])
  expect(result.coatHooks).toBe(7)
  expect(result.wardrobeEast).toBeCloseTo(5.55)
  expect(result.solid).toEqual([true, true, true])
  for (const [bottom, top] of result.stools) { expect(bottom).toBeCloseTo(.62); expect(top).toBeCloseTo(.68) }
  expect(result.sofaBack).toBeCloseTo(9.82)
  expect(result.chairBack).toBeCloseTo(4.565)
  expect(result.towerTops).toHaveLength(5)
  for (const top of result.towerTops) expect(top).toBeGreaterThan(2.71)
  expect(result.tiles).toHaveLength(2)
  for (const east of result.tiles) expect(east).toBeGreaterThanOrEqual(3.299)
  expect(result.frameParts).toBe(3)
  expect(result.frameWidth).toBeCloseTo(.86)
  expect(result.frameHeight).toBeCloseTo(2.11)
  expect(result.leafWidth).toBeCloseTo(.8)
  expect(result.leafHeight).toBeCloseTo(2.08)
  expect(result.closed).toBeGreaterThan(2.5)
  expect(result.opened).toBeLessThan(1.86)
  expect(result.twoPane).toBe(true)
  expect(result.transoms).toEqual(['EG-garden-west-transom-0', 'EG-garden-west-transom-0'])
})

test('Gartenschiebeflügel bleibt innerhalb der 2,80 Meter breiten Verglasung mit Eckkopplung', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { house, makeFloor } = await import('/src/model.ts')
    const model = buildScene('EG', false, false, false)
    const door = model.doors.find(door => door.id === 'EG-terrace')
    const south = makeFloor('EG').walls.find(wall => wall.id === 'south')
    const terrace = south.openings.find(opening => opening.id === 'terrace'), fixedOpening = south.openings.find(opening => opening.id === 'garden-fixed')
    const corner = model.group.getObjectByName('EG-living-corner-fixed-fixed-0')
    const cornerBefore = corner.matrixWorld.clone()
    const positions = []
    for (const amount of [0, .5, 1]) {
      model.setOpening(door.id, amount)
      const bounds = new THREE.Box3().setFromObject(door.pivot)
      positions.push({ min: bounds.min.x, max: bounds.max.x, rotation: door.pivot.rotation.y })
    }
    const fixed = model.group.getObjectByName('EG-garden-fixed-fixed-0')
    const coupling = model.group.getObjectByName('EG-glazing-corner-coupling')
    const couplingBounds = new THREE.Box3().setFromObject(coupling)
    const eastGlass = new THREE.Box3().setFromObject(corner), southGlass = new THREE.Box3().setFromObject(fixed)
    const result = { sliding: door.sliding, width: door.size.x, fixed: !!fixed, cornerFixed: cornerBefore.equals(corner.matrixWorld) && !model.doors.some(door => door.id.includes('living-corner')), cornerTop: eastGlass.max.y, coupled: Math.abs(southGlass.max.x - couplingBounds.min.x) < .02 && Math.abs(eastGlass.max.z - couplingBounds.min.z) < .02 && Math.abs(eastGlass.min.x - couplingBounds.min.x) < .05 && Math.abs(southGlass.min.z - couplingBounds.min.z) < .05, positions, apertureStart: south.x + terrace.start, apertureEnd: south.x + fixedOpening.start + fixedOpening.width, innerEast: house.east }
    model.dispose()
    return result
  })
  expect(result.sliding).toBe(true)
  expect(result.fixed).toBe(true)
  expect(result.cornerFixed).toBe(true)
  expect(result.coupled).toBe(true)
  expect(result.cornerTop).toBeCloseTo(2.125 - .05)
  expect(result.width).toBe(1.25)
  for (const bounds of result.positions) {
    expect(bounds.min).toBeGreaterThanOrEqual(result.apertureStart - .01)
    expect(bounds.max).toBeLessThanOrEqual(result.apertureEnd + .01)
    expect(bounds.rotation).toBe(0)
  }
  expect(result.positions[2].min - result.positions[0].min).toBeCloseTo(1.25)
  expect(result.positions[0].min).toBeCloseTo(result.apertureStart)
  expect(result.positions[2].max).toBeCloseTo(result.apertureEnd - .3)
  expect(result.apertureEnd - result.apertureStart).toBeCloseTo(2.8)
  expect(result.apertureEnd).toBeCloseTo(result.innerEast)
})

test('Fensterrevision zeigt stimmige Fassaden und eine geschlossene seitliche Terrassenwand', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('[data-opening="garden-door-east"]')).toHaveCount(0)
  await expect(page.locator('[data-raffstore]')).toHaveCount(6)
  for (const floor of ['EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    if (floor === 'OG') {
      await expect(page.locator('[data-opening="play-window"]')).toHaveCount(0)
      await expect(page.locator('[data-opening="east-north"]')).toHaveCount(1)
      await expect(page.locator('[data-raffstore]')).toHaveCount(5)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/${testInfo.project.name}-window-revision-${floor}-plan.png` })
  }
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    const model = buildScene('EG', true, true, true)
    const noDoor = !model.doors.some(door => door.id.includes('garden-door-east'))
    const noBlind = !model.group.getObjectByName('EG-garden-door-east-raffstore-lamellas')
    await initializePhysics()
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(5.7, 0, 6.85))
    for (let step = 0; step < 180; step++) {
      camera.lookAt(7.4, camera.position.y, 6.85); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
    }
    const stoppedAt = walker.position().x
    walker.dispose()
    for (const name of ['house-west', 'neighborhood', 'landscaping']) model.group.getObjectByName(name)!.visible = false
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#e7ebed'); scene.add(model.group)
    scene.add(new THREE.HemisphereLight('#ffffff', '#829181', 2))
    const sun = new THREE.DirectionalLight('#fff5e6', 2); sun.position.set(12, 20, 15); scene.add(sun)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    const width = Math.min(900, innerWidth - 16), height = Math.min(720, innerHeight - 16), aspect = width / height
    renderer.setSize(width, height); renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.id = 'window-revision-preview'; renderer.domElement.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999'; document.body.append(renderer.domElement)
    const halfWidth = Math.max(6.4, 6.4 * aspect), halfHeight = halfWidth / aspect
    const viewCamera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, .05, 100)
    const render = (view: string) => {
      if (view === 'east') { viewCamera.position.set(24, 5.1, 5.25); viewCamera.lookAt(6.6, 5.1, 5.25) }
      else if (view === 'south') { viewCamera.position.set(3.45, 5.1, 28); viewCamera.lookAt(3.45, 5.1, 5.25) }
      else if (view === 'north') { viewCamera.position.set(3.45, 5.1, -20); viewCamera.lookAt(3.45, 5.1, 5.25) }
      else { viewCamera.position.set(20, 12, 22); viewCamera.lookAt(3.45, 4.8, 5.25) }
      renderer.render(scene, viewCamera)
    }
    render('east')
    Object.assign(window, { windowRevision: { render, dispose() { model.dispose(); renderer.dispose(); renderer.domElement.remove() } } })
    return { noDoor, noBlind, stoppedAt }
  })
  expect(result.noDoor).toBe(true)
  expect(result.noBlind).toBe(true)
  expect(result.stoppedAt).toBeGreaterThan(6.2)
  expect(result.stoppedAt).toBeLessThan(6.4)
  const canvas = page.locator('#window-revision-preview')
  let previous: PNG | undefined
  for (const view of ['east', 'south', 'north', 'rotated']) {
    await page.evaluate(view => (window as any).windowRevision.render(view), view)
    const image = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-window-revision-${view}.png` }))
    const colors = new Set<string>()
    for (let offset = 0; offset < image.data.length; offset += 32) colors.add(image.data.subarray(offset, offset + 3).toString('hex'))
    expect(colors.size).toBeGreaterThan(60)
    let foreground = 0
    for (let offset = 0; offset < image.data.length; offset += 4) if (Math.abs(image.data[offset] - image.data[0]) + Math.abs(image.data[offset + 1] - image.data[1]) + Math.abs(image.data[offset + 2] - image.data[2]) > 30) foreground++
    expect(foreground / (image.width * image.height)).toBeGreaterThan(.08)
    if (previous) {
      let changed = 0
      for (let offset = 0; offset < image.data.length; offset += 4) if (Math.abs(image.data[offset] - previous.data[offset]) > 8) changed++
      expect(changed).toBeGreaterThan(200)
    }
    previous = image
  }
  await page.evaluate(() => { (window as any).windowRevision.dispose(); delete (window as any).windowRevision })
  expect(errors).toEqual([])
})

test('Fensterflügel öffnen einzeln nach innen und lassen Festfelder und Unterlichter stehen', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { floorIds, makeFloor } = await import('/src/model.ts')
    const { windowPanels, windowGap, windowMullionStart, windowJoint } = await import('/src/windowLayout.ts')
    const model = buildScene('EG', true, true, false)
    const checks = []
    for (const floor of floorIds) for (const wall of makeFloor(floor).walls) for (const opening of wall.openings.filter(opening => opening.kind === 'window')) {
      const id = `${floor}-${opening.id}`, primary = model.doors.find(door => door.id === id), secondary = model.doors.find(door => door.id === `${id}-secondary`)
      if (opening.id.includes('fixed')) { checks.push({ id, fixed: !primary && !secondary }); continue }
      const panels = windowPanels(opening)
      const ventilationColumn = opening.windowLayout.ventilationSide === 'start' ? 0 : 1
      const ventilationLeaf = ventilationColumn ? secondary : primary
      const fixedPanels = panels.filter(panel => panel.fixed).map(panel => {
        const mesh = model.group.getObjectByName(`${id}-fixed-${panel.column}`)
        return { mesh, before: mesh?.matrixWorld.clone() }
      })
      if (opening.windowLayout.ventilationWidth) checks.push({ id, narrowLeaf: !(ventilationColumn ? primary : secondary) && !!ventilationLeaf && fixedPanels.length >= 1 && ventilationLeaf.size.x < .6 })
      for (const panel of panels.filter(panel => !panel.fixed)) {
        const door = panel.column ? secondary : primary
        if (!door) throw new Error(`Missing operable panel: ${id}/${panel.column}`)
        const closed = door.pivot.localToWorld(door.center.clone())
        for (const amount of [.25, .5, .75, 1]) {
          model.setOpening(door.id, amount)
          checks.push({ id: door.id, stationaryFixed: fixedPanels.every(panel => !!panel.mesh && panel.before.equals(panel.mesh.matrixWorld)) })
          if (floor !== 'KG') {
            const bounds = new THREE.Box3().setFromObject(door.pivot)
            const furniture = makeFloor(floor).furniture
            checks.push({ id: door.id, furnitureClear: furniture.every(item => !bounds.intersectsBox(new THREE.Box3(new THREE.Vector3(item.x, makeFloor(floor).elevation + (item.bottom ?? 0), item.z), new THREE.Vector3(item.x + item.width, makeFloor(floor).elevation + (item.bottom ?? 0) + item.height, item.z + item.depth)))) })
          }
        }
        const opened = door.pivot.localToWorld(door.center.clone())
        checks.push({ id: door.id, inward: wall.id === 'north' ? opened.z > closed.z : wall.id === 'south' ? opened.z < closed.z : opened.x < closed.x, width: door.size.x, expectedWidth: panel.width - 2 * windowGap, height: door.size.y, expectedHeight: panel.height - 2 * windowGap })
        model.setOpening(door.id, 0)
      }
      if (opening.windowLayout.columns === 2) {
        const mullion = new THREE.Box3().setFromObject(model.group.getObjectByName(`${id}-mullion`)).getCenter(new THREE.Vector3())
        checks.push({ id, divided: Math.abs((wall.axis === 'x' ? mullion.x - wall.x : mullion.z - wall.z) - opening.start - windowMullionStart(opening) - windowJoint / 2) < .001 })
      }
      if (opening.windowLayout.lowerFixed) checks.push({ id, lowerFixed: !!model.group.getObjectByName(`${id}-transom-${opening.windowLayout.ventilationWidth ? ventilationColumn : 0}`) })
      if (opening.windowLayout.ventilationWidth) checks.push({ id, uninterrupted: !model.group.getObjectByName(`${id}-transom-${1 - ventilationColumn}`) })
    }
    const mirrored = model.doors.find(door => door.id === 'west-EG-kitchen-east-window-secondary')
    checks.push({ id: 'west', mirrored: !!mirrored && model.setOpening(mirrored.id, .5) && mirrored.amount === .5 })
    model.dispose()
    return checks
  })
  for (const check of result) {
    for (const key of ['fixed', 'inward', 'divided', 'lowerFixed', 'mirrored', 'narrowLeaf', 'stationaryFixed', 'uninterrupted', 'furnitureClear']) if (key in check) expect(check[key], `${check.id} ${key}`).toBe(true)
    if ('width' in check) expect(check.width).toBeCloseTo(check.expectedWidth)
    if ('height' in check) expect(check.height).toBeCloseTo(check.expectedHeight)
  }
})

test('EG Ecksofa mit rundem weissem Couchtisch ohne Sessel und linkes Regal', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const model = buildScene('EG', false, false, true)
    const sofa = new THREE.Box3(), returnSeat = new THREE.Box3()
    let shelf = false
    model.group.traverse(object => {
      if (object.userData.furniture === 'sofa') sofa.union(new THREE.Box3().setFromObject(object))
      if (object.userData.furniture === 'sofa-chaise') returnSeat.union(new THREE.Box3().setFromObject(object))
      if (object.userData.furniture === 'bookshelf') shelf = true
    })
    const back = new THREE.Box3().setFromObject(model.group.getObjectByName('sofa-back-sofa-chaise'))
    const top = model.group.getObjectByName('table-top-coffee')
    const legs = [0, 1, 2, 3].map(index => model.group.getObjectByName(`table-leg-coffee-${index}`))
    let chair = false
    model.group.traverse(object => { if (object.userData.furniture === 'lounge-chair') chair = true })
    const result = { shelf, chair, roundTop: top.geometry.type === 'CylinderGeometry', radius: top.geometry.parameters.radiusTop, topColor: top.material.color.getHexString(), woodenLegs: !top.material.map && legs.every(leg => !!leg && leg.material !== top.material && !!leg.material.map), width: sofa.max.x - sofa.min.x, depth: sofa.max.z - returnSeat.min.z, backWest: back.min.x, backEast: back.max.x, joint: sofa.min.z - returnSeat.max.z }
    model.dispose()
    return result
  })
  expect(result.shelf).toBe(false)
  expect(result.chair).toBe(false)
  expect(result.roundTop).toBe(true)
  expect(result.radius).toBe(.45)
  expect(result.topColor).toBe('ffffff')
  expect(result.woodenLegs).toBe(true)
  expect(result.width).toBeCloseTo(2.8)
  expect(result.depth).toBeCloseTo(2.8)
  expect(result.backWest).toBeCloseTo(.4)
  expect(result.backEast).toBeCloseTo(.58)
  expect(result.joint).toBeCloseTo(0)
  await expect(page.locator('[data-furniture="bookshelf"]')).toHaveCount(0)
  await expect(page.locator('[data-furniture="lounge-chair"]')).toHaveCount(0)
  await expect(page.locator('circle[data-round-table="coffee"]')).toHaveAttribute('r', '0.45')
  await expect(page.locator('[data-furniture="coffee"]')).toHaveAttribute('fill', '#ffffff')
  await expect(page.locator('[data-furniture-part="sofa-chaise"]')).toHaveAttribute('transform', /rotate\(-90\)/)
})

test('Möbelfronten und Bettkopfteile haben getrennte Flächen', async ({ page }) => {
  await page.goto('/')
  const gaps = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor } = await import('/src/model.ts')
    const model = buildScene('EG', true, false, true)
    const bounds = name => new THREE.Box3().setFromObject(model.group.getObjectByName(name))
    const result = []
    for (const id of ['fridge', 'kitchen-tall', 'kitchen-tall-storage-1', 'kitchen-tall-storage-2', 'kitchen-tall-storage-3']) result.push({ id, gap: bounds(`kitchen-front-${id}`).min.z - bounds(`furniture-body-${id}`).max.z })
    result.push({ id: 'oven', gap: bounds('kitchen-oven').min.z - bounds('kitchen-front-kitchen-tall').max.z })
    result.push({ id: 'wardrobe', gap: bounds('furniture-body-wardrobe').min.z - bounds('cabinet-front-wardrobe').max.z })
    for (const floor of ['OG', 'DG']) for (const bed of makeFloor(floor).furniture.filter(item => item.kind === 'bed')) {
      const head = bounds(`bed-head-${bed.id}`)
      for (const part of ['base', 'mattress']) {
        const body = bounds(`bed-${part}-${bed.id}`)
        result.push({ id: `${bed.id}-${part}`, gap: bed.angle === Math.PI ? head.min.z - body.max.z : bed.angle === Math.PI / 2 ? head.min.x - body.max.x : body.min.z - head.max.z })
      }
    }
    model.dispose()
    return result
  })
  expect(gaps).toHaveLength(13)
  for (const detail of gaps) expect(detail.gap, detail.id).toBeGreaterThan(.002)
})

test('Vierzig Zentimeter Aussenwaende schliessen in 3D an Decken und Glasecke an', async ({ page }, testInfo) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { elevations, housePlacement, storeyRise } = await import('/src/model.ts')
    const { boundaryDistance, partner } = await import('/src/context.ts')
    const { stairWalkingLine } = await import('/src/winderStair.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    const model = buildScene('EG', true, true, true)
    model.group.updateMatrixWorld(true)
    const walls = []
    for (const side of ['east', 'west']) {
      const group = model.group.getObjectByName(`house-${side}`)
      for (const floor of ['KG', 'EG', 'OG', 'DG']) for (const face of ['north', 'east', 'south', 'west']) {
        const bounds = new THREE.Box3()
        for (const mesh of group.children.filter(mesh => mesh.name === `${floor}-wall-${face}`)) bounds.union(new THREE.Box3().setFromObject(mesh))
        const localWest = (side === 'east' ? bounds.min.x : -bounds.max.x) - housePlacement.x
        const localEast = (side === 'east' ? bounds.max.x : -bounds.min.x) - housePlacement.x
        const offsetZ = housePlacement.z + (side === 'west' ? partner.z : 0)
        walls.push({ side, floor, face, thickness: ['east', 'west'].includes(face) ? bounds.max.x - bounds.min.x : bounds.max.z - bounds.min.z, outer: face === 'east' ? localEast : face === 'west' ? localWest : face === 'north' ? bounds.min.z - offsetZ : bounds.max.z - offsetZ, clearance: face === 'north' ? boundaryDistance([bounds.min.x, bounds.min.z], 0) : 3, partyEdge: face === 'west' ? (side === 'east' ? bounds.min.x : bounds.max.x) : 0 })
      }
    }
    const coupling = new THREE.Box3().setFromObject(model.group.getObjectByName('EG-glazing-corner-coupling')).getCenter(new THREE.Vector3())
    const slider = model.doors.find(door => door.id === 'EG-terrace')
    model.setOpening(slider.id, 0)
    const closed = slider.object.getWorldPosition(new THREE.Vector3())
    model.setOpening(slider.id, 1)
    const opened = slider.object.getWorldPosition(new THREE.Vector3())
    const slab = new THREE.Box3()
    for (const mesh of model.group.getObjectByName('house-east').children.filter(mesh => mesh.name === 'EG-slab')) slab.union(new THREE.Box3().setFromObject(mesh))
    for (const door of model.doors) if (door.kind === 'door') model.setOpening(door.id, 1)
    await initializePhysics()
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(3, 0, 5))
    const move = (east: number, south: number) => {
      for (let frame = 0; frame < 300 && Math.hypot(walker.position().x - east, walker.position().z - south) > .055; frame++) {
        camera.lookAt(east, camera.position.y, south); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
      }
      return Math.hypot(walker.position().x - east, walker.position().z - south) < .07
    }
    const routes = []
    for (const id of ['KG', 'EG', 'OG']) for (const reverse of [false, true]) {
      const points = stairWalkingLine(storeyRise(id)).map(([east, , south]) => [east + housePlacement.x, south + housePlacement.z])
      if (reverse) points.reverse()
      walker.teleport(new THREE.Vector3(points[0][0], elevations[id] + (reverse ? storeyRise(id) : 0), points[0][1]))
      const reached = points.slice(1).every(([east, south]) => move(east, south))
      for (let frame = 0; frame < 20; frame++) walker.tick()
      routes.push({ id, reverse, reached, error: walker.position().y - .9 - elevations[id] - (reverse ? 0 : storeyRise(id)) })
    }
    const entrances = []
    for (const side of ['east', 'west']) {
      const sign = side === 'east' ? 1 : -1, doorId = side === 'east' ? 'EG-entrance' : 'west-EG-entrance'
      const south = 1.15 + housePlacement.z + (side === 'west' ? partner.z : 0)
      walker.teleport(new THREE.Vector3(sign * 3, 0, 7))
      walker.setOpening(doorId, 0)
      walker.teleport(new THREE.Vector3(sign * (5.9 + housePlacement.x), 0, south))
      const closedPasses = move(sign * (7.6 + housePlacement.x), south)
      walker.teleport(new THREE.Vector3(sign * 3, 0, 7))
      walker.setOpening(doorId, 1)
      walker.teleport(new THREE.Vector3(sign * (5.9 + housePlacement.x), 0, south))
      entrances.push({ side, closedPasses, openPasses: move(sign * (7.6 + housePlacement.x), south) })
    }
    walker.dispose()
    const result = { walls, routes, entrances, coupling: [coupling.x, coupling.z], slide: opened.x - closed.x, slab: [slab.min.x, slab.max.x, slab.min.z, slab.max.z] }
    model.dispose()
    return result
  })
  for (const wall of result.walls) {
    expect(wall.thickness, `${wall.side}/${wall.floor}/${wall.face}`).toBeCloseTo(.4)
    expect(wall.outer).toBeCloseTo(wall.face === 'east' ? 7 : ['north', 'west'].includes(wall.face) ? -.1 : 10.6)
    expect(wall.clearance).toBeGreaterThanOrEqual(3)
    expect(wall.partyEdge).toBeCloseTo(0)
  }
  for (const route of result.routes) {
    expect(route.reached, `${route.id}/${route.reverse}`).toBe(true)
    expect(Math.abs(route.error)).toBeLessThan(.07)
  }
  for (const entrance of result.entrances) { expect(entrance.closedPasses).toBe(false); expect(entrance.openPasses).toBe(true) }
  expect(result.coupling[0]).toBeCloseTo(6.9)
  expect(result.coupling[1]).toBeCloseTo(10.6)
  expect(result.slide).toBeCloseTo(1.25)
  for (const [index, coordinate] of [0, 7.1, .1, 10.8].entries()) expect(result.slab[index]).toBeCloseTo(coordinate)
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').waitFor({ timeout: 45000 })
  const canvas = page.locator('canvas')
  const before = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-wall-40-3d.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 32) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .6, { steps: 10 })
  await page.mouse.up()
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-wall-40-rotated.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 10) changed++
  expect(changed).toBeGreaterThan(100)
})

test('Fenstermasse stehen mit Hinweislinien ausserhalb des Grundrisses', async ({ page }, testInfo) => {
  await page.goto('/')
  const plan = page.locator('svg.floor-plan')
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect(plan.locator('[data-opening-labels]')).toBeVisible()
    await expect(plan.locator('[data-masonry-joint], [data-exterior-masonry]')).toHaveCount(0)
    const alignment = await plan.evaluate(svg => {
      const envelope = svg.querySelector<SVGGraphicsElement>('[data-house-envelope]')!.getBBox()
      const width = svg.querySelector<SVGGraphicsElement>('[data-total-width]')!.getBBox()
      const depth = svg.querySelector<SVGGraphicsElement>('[data-total-depth]')!.getBBox()
      const center = Number(svg.querySelector('[data-total-width-label]')!.getAttribute('x'))
      return [width.x - envelope.x, width.x + width.width - envelope.x - envelope.width, depth.y - envelope.y, depth.y + depth.height - envelope.y - envelope.height, center - envelope.x - envelope.width / 2]
    })
    for (const offset of alignment) expect(offset).toBeCloseTo(0, 5)
    await expect(plan.locator('[data-clear-depth-label]')).toHaveText('9,900 m lichte Länge')
    const clearDepth = await plan.locator('[data-clear-depth]').evaluate(element => {
      const bounds = (element as SVGGraphicsElement).getBBox()
      return { start: bounds.y, end: bounds.y + bounds.height }
    })
    expect(clearDepth.start).toBeCloseTo(.3)
    expect(clearDepth.end).toBeCloseTo(10.2)
    const lengthLabel = (await plan.locator('[data-clear-depth-label]').boundingBox())!
    const envelopeBox = (await plan.locator('[data-house-envelope]').boundingBox())!
    expect(lengthLabel.x).toBeGreaterThanOrEqual((await plan.boundingBox())!.x)
    expect(lengthLabel.x + lengthLabel.width).toBeLessThan(envelopeBox.x)
    if (floor === 'EG') await expect(plan.locator('[data-opening-label="terrace"]')).toContainText('280 × 212,5 cm')
    if (floor === 'DG') {
      await expect(plan.locator('[data-opening-label="DG-north-skylight"]')).toContainText('94 × 140 cm')
      await expect(plan.locator('[data-opening-label="DG-south-skylight"]')).toContainText('94 × 140 cm')
    }
    const failures = await plan.evaluate(svg => {
      const view = (svg as SVGSVGElement).viewBox.baseVal
      const labels = [...svg.querySelectorAll<SVGGraphicsElement>('[data-opening-label-text]')]
      const buttons = [...document.querySelectorAll('button')].map(button => button.getBoundingClientRect())
      const failures: string[] = []
      for (const [index, label] of labels.entries()) {
        const box = label.getBBox(), screen = label.getBoundingClientRect()
        if (box.x < view.x || box.y < view.y || box.x + box.width > view.x + view.width || box.y + box.height > view.y + view.height) failures.push(`clipped: ${label.textContent}`)
        for (const other of [...labels.slice(index + 1).map(item => item.getBoundingClientRect()), ...buttons]) if (screen.left < other.right && screen.right > other.left && screen.top < other.bottom && screen.bottom > other.top) failures.push(`overlap: ${label.textContent}`)
      }
      return failures
    })
    expect(failures).toEqual([])
    await page.screenshot({ path: `test-results/${testInfo.project.name}-opening-labels-${floor}.png` })
    await page.getByRole('button', { name: 'Bemaßung', exact: true }).click()
    await expect(plan.locator('[data-opening-label]')).toHaveCount(0)
    await expect(plan.locator('[data-clear-depth], [data-clear-depth-label]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Bemaßung', exact: true }).click()
    await expect(plan.locator('[data-opening-leader]').first()).toBeVisible()
  }
})

test('Bemaßung schaltet auch Raumlabels im Grundriss um', async ({ page }, testInfo) => {
  await page.goto('/')
  const plan = page.locator('svg.floor-plan')
  const toggle = page.getByRole('button', { name: 'Bemaßung', exact: true })
  for (const [floor, count] of [['KG', 4], ['EG', 4], ['OG', 6], ['DG', 4]] as const) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect(plan.locator('[data-room-label]')).toHaveCount(count)
    await expect(plan.locator('[data-room-label] rect')).toHaveCount(count)
    await expect(plan.locator('[data-room-label] text')).toHaveCount(count * 2)
    await toggle.click()
    await expect(plan.locator('[data-room-label]')).toHaveCount(0)
    await expect(plan).not.toContainText('m²')
    await expect(plan).not.toContainText('10,50 m')
    if (floor === 'DG') await page.screenshot({ path: `test-results/${testInfo.project.name}-provider-labels-hidden.png` })
    await toggle.click()
    await expect(plan.locator('[data-room-label]')).toHaveCount(count)
    await expect(plan).toContainText('m²')
    await expect(plan).toContainText('10,50 m')
  }
})

test('Anbieterplaene, Flächenabgleich und bewegtes 3D-Modell', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect(page.locator('svg.floor-plan')).toContainText('10,50 m')
    await expect(page.locator('svg.floor-plan')).toContainText('6,90 m')
    await expect(page.locator('[data-window-mullion]')).toHaveCount(({ KG: 0, EG: 3, OG: 6, DG: 2 } as Record<string, number>)[floor])
    if (floor === 'EG') await expect(page.locator('[data-angled-wall]')).toHaveCount(0)
    await expect(page.locator('[data-exterior-masonry]')).toHaveCount(4)
    await expect(page.locator('[data-exterior-masonry="west"] [data-masonry-joint]')).toHaveCount(34)
    expect(await page.locator('[data-masonry-joint]').count()).toBeGreaterThan(40)
    await expect(page.locator('[data-masonry-legend]')).toContainText('Steinraster 30 cm')
    if (floor === 'KG') {
      const wells = page.locator('[data-light-well]')
      await expect(wells).toHaveCount(2)
      expect(Number(await wells.nth(0).getAttribute('y'))).toBeCloseTo(8.2)
      expect(Number(await wells.nth(0).getAttribute('height'))).toBeCloseTo(1.3)
      expect(Number(await wells.nth(1).getAttribute('width'))).toBeCloseTo(1.3)
    }
    if (floor === 'EG') {
      await expect(page.locator('[data-coat-hooks]')).toHaveCount(1)
      await expect(page.locator('[data-coat-hooks] path')).toHaveCount(7)
      await expect(page.locator('[data-tall-cabinet]')).toHaveCount(5)
      await expect(page.locator('[data-concealed-fittings="true"]')).toHaveCount(3)
      await expect(page.locator('[data-entrance-marker]')).toHaveCount(0)
    }
    if (floor === 'DG') await expect(page.locator('[data-bed-head="south"] [data-furniture="parents-bed"]')).toHaveCount(1)
    await expect(page.locator('[data-stair-start]')).toHaveCount(1)
    await expect(page.locator('[data-step][data-hidden-step="true"]')).toHaveCount(7)
    const startSouth = Number(await page.locator('[data-stair-start]').getAttribute('cy'))
    expect(startSouth).toBeCloseTo(5.075)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/${testInfo.project.name}-provider-${floor}.png` })
  }
  await page.getByRole('button', { name: 'Planungsannahmen', exact: true }).click()
  await expect(page.locator('.area-comparison tbody tr')).toHaveCount(18)
  expect(await page.locator('.modal').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).click()
  await page.getByRole('button', { name: 'Querschnitt', exact: true }).click()
  await expect(page.locator('[data-attic-ceiling]')).toHaveCount(3)
  await expect(page.locator('svg.section-view')).toContainText('Geschossdecken 20 cm')
  await page.screenshot({ path: `test-results/${testInfo.project.name}-provider-section.png` })
  await page.getByRole('button', { name: 'Querschnitt', exact: true }).click()
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').waitFor({ timeout: 45000 })
  const canvas = page.locator('canvas')
  const before = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-provider-3d.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 32) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .6, { steps: 10 })
  await page.mouse.up()
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-provider-rotated.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 10) changed++
  expect(changed).toBeGreaterThan(100)
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await canvas.screenshot({ path: `test-results/${testInfo.project.name}-provider-site.png` })
  expect(errors).toEqual([])
})

test('Neue Treppe, Raumwege und niedrige Abstellraumtür berücksichtigen Kollisionen', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { stairWalkingLine } = await import('/src/winderStair.ts')
    const { construction, elevations, storeyRise, ceilingHeight, makeFloor, lightWells } = await import('/src/model.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    await initializePhysics()
    const model = buildScene('EG', true, true, true)
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(2.8, 0, 5.65))
    const results = []
    const travel = (name, base, points, expected = base) => {
      walker.teleport(new THREE.Vector3(points[0][0], base, points[0][1]))
      let blocked = null
      for (const [east, south] of points.slice(1)) {
        let frames = 0
        while (Math.hypot(walker.position().x - east, walker.position().z - south) > .055 && frames++ < 300) {
          camera.lookAt(east, camera.position.y, south)
          walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
        }
        if (frames >= 300) { blocked = { east, south, position: walker.position() }; break }
      }
      for (let frame = 0; frame < 20; frame++) walker.tick()
      results.push({ name, blocked, height: walker.position().y - .9, expected })
    }
    for (const id of ['KG', 'EG', 'OG']) {
      const points = stairWalkingLine(storeyRise(id)).map(([east, , south]) => [east, south])
      travel(`${id}-up`, elevations[id], points, elevations[id] + storeyRise(id))
      travel(`${id}-down`, elevations[id] + storeyRise(id), [...points].reverse(), elevations[id])
    }
    const routes = [
      ['KG-tech', 'KG', [[2.85, 5.05], [3.05, 5.05], [3.05, 2.5]]],
      ['KG-store', 'KG', [[2.85, 5.05], [2.85, 4.3], [4.6, 4.3]]],
      ['KG-hobby', 'KG', [[2.85, 5.05], [3.05, 5.05], [3.05, 8]]],
      ['EG-kitchen', 'EG', [[2.8, 5.075], [4.8, 5.075], [4.8, 3.8]]],
      ['EG-open-kitchen-living', 'EG', [[4.8, 3.8], [4.8, 4.7], [3.7, 4.7], [3.7, 7.1]]],
      ['EG-shower', 'EG', [[2.8, 3], [2.8, 1.35], [1.15, 1.35], [.8, 1.75], [.8, 2.5]]],
      ['EG-living', 'EG', [[2.8, 5.075], [3.2, 6.85], [3.45, 9.4]]],
      ['EG-entrance', 'EG', [[2.8, 1.25], [5.9, 1.25], [7.5, 1.25]]],
      ['OG-bath', 'OG', [[2.8, 5.075], [2.85, 3.7], [2.85, 2.85], [1.7, 2.85], [.85, 2.85]]],
      ['OG-shower', 'OG', [[2.85, 2.85], [2.4, 2.85], [2.4, .75], [.85, .75]]],
      ['OG-north', 'OG', [[2.8, 5.075], [2.8, 4.4], [4.4, 4.4], [5, 3.7]]],
      ['OG-play', 'OG', [[2.8, 5.075], [2.8, 6.3], [4.1, 6.3], [4.1, 7.1]]],
      ['OG-south', 'OG', [[2.8, 5.075], [2.85, 7.8], [2.1, 8.5]]],
      ['OG-store', 'OG', [[2.8, 5.075], [2.8, 6.2], [1.25, 6.2]]],
      ['DG-office', 'DG', [[2.85, 5.075], [2.85, 3.95], [4.6, 3.95], [4.6, 3]]],
      ['DG-parents', 'DG', [[2.85, 5.075], [2.85, 6.7], [3.5, 6.7], [3.5, 8]]],
      ['DG-store', 'DG', [[3.5, 7.2], [3.5, 8.2], [2.4, 8.2]]],
      ['EG-garden', 'EG', [[3.45, 8.5], [4.1, 8.5], [4.1, 11.1]]],
    ]
    for (const [name, id, points] of routes) travel(name, elevations[id], points, name === 'EG-garden' ? construction.terrain : elevations[id])
    const west = model.group.getObjectByName('house-west')
    let westFurniture = 0, terraces = 0
    west.traverse(object => { if (object.userData.furniture) westFurniture++ })
    model.group.traverse(object => { if (object.name === 'terrace-base') terraces++ })
    model.group.updateMatrixWorld(true)
    const entrance = model.doors.find(door => door.id === 'EG-entrance')
    const entrancePivot = entrance.pivot.getWorldPosition(new THREE.Vector3())
    const entranceTip = entrance.pivot.localToWorld(new THREE.Vector3(entrance.size.x, 0, 0))
    const bedHeads = []
    const ceilings = [], fixtures = [], atticWalls = [], kitchenFronts = [], wellBounds = []
    model.group.traverse(object => {
      if (object.userData.furniture === 'parents-bed' && object.userData.bedHead) bedHeads.push({ side: object.userData.bedHead, south: object.getWorldPosition(new THREE.Vector3()).z })
      if (object.name === 'attic-ceiling') { const bounds = new THREE.Box3().setFromObject(object); ceilings.push({ min: bounds.min.y, max: bounds.max.y }) }
      if (object.userData.lightCircuit || object.isSpotLight) fixtures.push(object.name)
      if (object.name.startsWith('DG-wall-') && !['DG-wall-west', 'DG-wall-east', 'DG-wall-north', 'DG-wall-south'].includes(object.name)) atticWalls.push(new THREE.Box3().setFromObject(object).max.y)
      if (object.name === 'kitchen-front-fridge' || object.name === 'kitchen-front-kitchen-tall') kitchenFronts.push(object.getWorldPosition(new THREE.Vector3()).z)
      if (object.name === 'light-well-base' && object.getWorldPosition(new THREE.Vector3()).x > 0) {
        const bounds = new THREE.Box3().setFromObject(object)
        wellBounds.push({ x: bounds.min.x, z: bounds.min.z, width: bounds.max.x - bounds.min.x, depth: bounds.max.z - bounds.min.z })
      }
    })
    const sanitaryDetails = ['guest-sink-concealed-control', 'guest-sink-wall-spout', 'guest-wc-flush-plate', 'guest-shower-concealed-control', 'guest-shower-rain-head', 'bath-sink-wall-spout', 'bath-sink-concealed-control', 'bath-wc-flush-plate', 'bath-shower-concealed-control', 'bath-shower-rain-head'].map(name => ({ name, present: !!model.group.getObjectByName(name) }))
    let storageRoofClearance = Infinity
    const storageDoor = model.doors.find(door => door.id === 'DG-store')
    for (let sample = 0; sample <= 20; sample++) {
      model.setOpening(storageDoor.id, sample / 20)
      for (const east of [0, storageDoor.size.x]) for (const south of [-storageDoor.size.z / 2, storageDoor.size.z / 2]) {
        const corner = storageDoor.pivot.localToWorld(new THREE.Vector3(east, storageDoor.size.y, south))
        storageRoofClearance = Math.min(storageRoofClearance, elevations.DG + ceilingHeight(corner.z) - corner.y)
      }
    }
    const { OBB } = await import('/node_modules/three/examples/jsm/math/OBB.js')
    const doorFurnitureCollisions = []
    for (const [floorId, doorId] of [['EG', 'entrance'], ['EG', 'wc'], ['EG', 'basement-stair'], ['OG', 'bath'], ['OG', 'child-north'], ['OG', 'child-south'], ['OG', 'playroom'], ['OG', 'store'], ['DG', 'attic-office'], ['DG', 'store']]) {
      const door = model.doors.find(door => door.id === `${floorId}-${doorId}`)
      for (let sample = 0; sample <= 20; sample++) {
        model.setOpening(door.id, sample / 20)
        const leaf = new OBB(new THREE.Vector3(), door.size.clone().multiplyScalar(.5)).applyMatrix4(door.pivot.matrixWorld)
        leaf.center.copy(door.center).applyMatrix4(door.pivot.matrixWorld)
        for (const item of makeFloor(floorId).furniture) {
          const bounds = new THREE.Box3(new THREE.Vector3(item.x, elevations[floorId] + (item.bottom ?? 0), item.z), new THREE.Vector3(item.x + item.width, elevations[floorId] + (item.bottom ?? 0) + item.height, item.z + item.depth))
          if (leaf.intersectsOBB(new OBB().fromBox3(bounds))) doorFurnitureCollisions.push(`${door.id}/${item.id}/${sample}`)
        }
      }
    }
    const garden = model.group.getObjectByName('landscaping')
    const gardenCrowns = garden.children.filter(object => object.geometry?.type === 'IcosahedronGeometry').map(object => ({ x: object.position.x, z: object.position.z }))
    const neighborCrowns = model.group.getObjectByName('context-vegetation').children.length
    walker.dispose(); model.dispose()
    return { results, westFurniture, terraces, entrancePivot, entranceTip, bedHeads, ceilings, fixtures, gardenCrowns, neighborCrowns, atticWalls, kitchenFronts, storageRoofClearance, doorFurnitureCollisions, wellBounds, expectedWells: lightWells, sanitaryDetails }
  })
  expect(result.westFurniture).toBe(0)
  expect(result.terraces).toBe(0)
  expect(result.fixtures).toEqual([])
  expect(result.wellBounds).toHaveLength(2)
  for (const [index, well] of result.wellBounds.entries()) for (const key of ['x', 'z', 'width', 'depth'] as const) expect(well[key]).toBeCloseTo(result.expectedWells[index][key])
  for (const detail of result.sanitaryDetails) expect(detail.present, detail.name).toBe(true)
  expect(result.doorFurnitureCollisions).toEqual([])
  expect(result.storageRoofClearance).toBeGreaterThan(.05)
  expect(result.atticWalls.length).toBeGreaterThan(0)
  for (const top of result.atticWalls) expect(top).toBeLessThanOrEqual(8.71001)
  expect(result.kitchenFronts).toHaveLength(2)
  for (const front of result.kitchenFronts) expect(front).toBeCloseTo(3.084)
  expect(result.gardenCrowns.map(tree => tree.x).sort((first, second) => first - second)).toEqual([-5.8, 5.6])
  expect(result.gardenCrowns.every(tree => tree.z < 0)).toBe(true)
  expect(result.neighborCrowns).toBe(48)
  expect(result.ceilings).toHaveLength(6)
  for (const ceiling of result.ceilings) { expect(ceiling.min).toBeCloseTo(8.71); expect(ceiling.max).toBeCloseTo(8.95) }
  expect(result.entrancePivot.z).toBeCloseTo(.75)
  expect(result.entranceTip.z).toBeCloseTo(result.entrancePivot.z)
  expect(result.entranceTip.x).toBeLessThan(result.entrancePivot.x)
  expect(result.bedHeads).toHaveLength(1)
  expect(result.bedHeads[0].side).toBe('south')
  expect(result.bedHeads[0].south).toBeCloseTo(8.915)
  expect(result.results.filter(route => route.blocked).map(route => route.name), JSON.stringify(result.results)).toEqual(['DG-store'])
  for (const route of result.results) {
    if (route.name === 'DG-store') { expect(route.blocked).not.toBeNull(); expect(route.blocked.position.x).toBeGreaterThan(3.075) }
    else expect(route.blocked, JSON.stringify(route)).toBeNull()
    expect(route.height, JSON.stringify(route)).toBeCloseTo(route.expected, 1)
  }
})