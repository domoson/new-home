import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Raffstores fahren vor der Verglasung und die OG-Raumrevision bleibt bedienbar', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await expect(page.locator('[data-raffstore]')).toHaveCount(6)
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
    const route = (points: number[][]) => {
      walker.teleport(new THREE.Vector3(points[0][0], elevations.OG, points[0][1]))
      for (const [east, south] of points.slice(1)) {
        for (let step = 0; step < 350 && Math.hypot(walker.position().x - east, walker.position().z - south) > .07; step++) {
          camera.lookAt(east, camera.position.y, south); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
        }
        if (Math.hypot(walker.position().x - east, walker.position().z - south) > .1) return false
      }
      return true
    }
    const storageRoute = route([[2.85, 6.2], [1.25, 6.2]])
    const bedroomRoute = route([[2.85, 6.2], [2.85, 8], [3.16, 8], [3.16, 8.48], [3.95, 8.48], [3.95, 9.25], [5.5, 9.25]])
    const showerRoute = route([[2.85, 3.9], [2.85, 2.95], [2.25, 2.95], [.8, 2.95]])
    const toiletRoute = route([[2.25, 2.95], [2.25, .68], [.8, .68]])
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
    return { count: groups.length, curtainStates, cornerClear: !east.intersectsBox(south), raised, storageRoute, bedroomRoute, showerRoute, toiletRoute, areas, showerSweepClear, closedBlocksShower, showerClearWidth, showerFittingsAtTWall, showerTop: closedGlass.max.y - elevations.OG, showerGlass: showerDoor.object.material.transparent }
  })
  expect(geometry.count).toBe(28)
  expect(geometry.curtainStates.every(state => state.extension === 1 && state.tilt === 75)).toBe(true)
  expect(geometry.cornerClear).toBe(true)
  expect(geometry.raised.every(Boolean)).toBe(true)
  expect(geometry.storageRoute).toBe(true)
  expect(geometry.bedroomRoute).toBe(true)
  expect(geometry.showerRoute).toBe(true)
  expect(geometry.toiletRoute).toBe(true)
  expect(geometry.showerSweepClear.every(Boolean)).toBe(true)
  expect(geometry.closedBlocksShower).toBe(true)
  expect(geometry.showerClearWidth).toBeGreaterThanOrEqual(.8)
  expect(geometry.showerTop).toBeCloseTo(2.1)
  expect(geometry.showerGlass).toBe(true)
  expect(geometry.showerFittingsAtTWall).toBe(true)
  expect(geometry.areas.store).toBeCloseTo(2)
  expect(geometry.areas.playroom).toBeCloseTo(7.10875)
  await page.getByRole('button', { name: '3D', exact: true }).click()
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
  expect(result.transoms).toEqual(['EG-garden-west-transom-1', 'EG-garden-west-transom-1'])
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
  expect(result.cornerTop).toBeGreaterThan(2.4)
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
        checks.push({ id: door.id, inward: wall.id === 'north' ? opened.z > closed.z : wall.id === 'south' ? opened.z < closed.z : opened.x < closed.x, width: door.size.x, expectedWidth: panel.width - 2 * windowGap })
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
      const entranceCenter = await page.evaluate(async () => {
        const { makeFloor } = await import('/src/model.ts')
        const openings = makeFloor('EG').walls.find(wall => wall.id === 'east').openings.filter(opening => ['entrance', 'entrance-fixed'].includes(opening.id))
        const start = Math.min(...openings.map(opening => opening.start))
        const end = Math.max(...openings.map(opening => opening.start + opening.width))
        return (start + end) / 2
      })
      await expect(page.locator('[data-entrance-marker]')).toHaveAttribute('transform', `translate(0 ${entranceCenter})`)
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