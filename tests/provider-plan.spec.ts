import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Möbelfronten und Bettkopfteile haben getrennte Flächen', async ({ page }) => {
  await page.goto('/')
  const gaps = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { makeFloor } = await import('/src/model.ts')
    const model = buildScene('EG', true, false, true)
    const bounds = name => new THREE.Box3().setFromObject(model.group.getObjectByName(name))
    const result = []
    for (const id of ['fridge', 'kitchen-tall']) result.push({ id, gap: bounds(`furniture-body-${id}`).min.x - bounds(`kitchen-front-${id}`).max.x })
    result.push({ id: 'oven', gap: bounds('kitchen-front-kitchen-tall').min.x - bounds('kitchen-oven').max.x })
    result.push({ id: 'wardrobe', gap: bounds('furniture-body-wardrobe').min.z - bounds('entry-wardrobe-front').max.z })
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
  expect(gaps).toHaveLength(12)
  for (const detail of gaps) expect(detail.gap, detail.id).toBeGreaterThan(.002)
})

test('Bemaßung schaltet auch Raumlabels im Grundriss um', async ({ page }, testInfo) => {
  await page.goto('/')
  const plan = page.locator('svg.floor-plan')
  const toggle = page.getByRole('button', { name: 'Bemaßung', exact: true })
  for (const [floor, count] of [['KG', 4], ['EG', 5], ['OG', 5], ['DG', 4]] as const) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect(plan.locator('[data-room-label]')).toHaveCount(count)
    await expect(plan.locator('[data-room-label] rect')).toHaveCount(count)
    await expect(plan.locator('[data-room-label] text')).toHaveCount(count * 2)
    await toggle.click()
    await expect(plan.locator('[data-room-label]')).toHaveCount(0)
    await expect(plan).not.toContainText('m²')
    await expect(plan).not.toContainText('11,40 m')
    if (floor === 'DG') await page.screenshot({ path: `test-results/${testInfo.project.name}-provider-labels-hidden.png` })
    await toggle.click()
    await expect(plan.locator('[data-room-label]')).toHaveCount(count)
    await expect(plan).toContainText('m²')
    await expect(plan).toContainText('11,40 m')
  }
})

test('Anbieterplaene, Flächenabgleich und bewegtes 3D-Modell', async ({ page }, testInfo) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect(page.locator('svg.floor-plan')).toContainText('11,40 m')
    await expect(page.locator('svg.floor-plan')).toContainText('6,60 m')
    if (floor === 'KG') {
      const wells = page.locator('[data-light-well]')
      await expect(wells).toHaveCount(2)
      expect(Number(await wells.nth(0).getAttribute('y'))).toBeCloseTo(8.95)
      expect(Number(await wells.nth(0).getAttribute('height'))).toBeCloseTo(1.3)
      expect(Number(await wells.nth(1).getAttribute('width'))).toBeCloseTo(1.3)
    }
    if (floor === 'EG') await expect(page.locator('[data-concealed-fittings="true"]')).toHaveCount(3)
    if (floor === 'DG') await expect(page.locator('[data-bed-head="south"] [data-furniture="parents-bed"]')).toHaveCount(1)
    await expect(page.locator('[data-stair-start]')).toHaveCount(1)
    await expect(page.locator('[data-step][data-hidden-step="true"]')).toHaveCount(7)
    const startSouth = Number(await page.locator('[data-stair-start]').getAttribute('cy'))
    expect(startSouth).toBeCloseTo(floor === 'DG' ? 4.51 : 5.66)
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
    const { elevations, storeyRise, ceilingHeight, makeFloor, lightWells } = await import('/src/model.ts')
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
      ['KG-tech', 'KG', [[2.85, 5.65], [3.05, 5.65], [3.05, 2.5]]],
      ['KG-store', 'KG', [[2.85, 5.65], [2.85, 4.95], [4.6, 4.95]]],
      ['KG-hobby', 'KG', [[2.85, 5.65], [3.05, 5.65], [3.05, 8]]],
      ['EG-kitchen', 'EG', [[2.85, 5.65], [2.7, 5.65], [2.7, 3.2], [2.1, 2.4]]],
      ['EG-pantry', 'EG', [[2.1, 2.4], [2.7, 2.4], [2.7, 1.25], [5.2, 1.25]]],
      ['EG-shower', 'EG', [[4.2, 5.2], [4.4, 5.2], [4.4, 3.1], [5.1, 3.1]]],
      ['EG-living', 'EG', [[2.85, 5.65], [3.03, 5.65], [3.03, 6.85], [3.45, 6.85], [3.45, 9.4]]],
      ['EG-entrance', 'EG', [[4.2, 5.2], [5.9, 4.85], [7.1, 4.85]]],
      ['OG-bath', 'OG', [[2.8, 5.65], [2.7, 5.65], [2.7, 3.35], [1.7, 3.35]]],
      ['OG-north', 'OG', [[2.8, 5.65], [2.8, 4.5], [4.4, 4.5], [4.4, 3.5]]],
      ['OG-south', 'OG', [[2.8, 5.65], [2.8, 6.95], [4.6, 6.95], [4.6, 8]]],
      ['OG-room', 'OG', [[2.8, 5.65], [2.8, 8], [1.7, 8]]],
      ['DG-office', 'DG', [[2.85, 5.65], [2.85, 4.65], [4.6, 4.65], [4.6, 3]]],
      ['DG-parents', 'DG', [[2.85, 5.65], [2.85, 7.2], [3.5, 7.2], [3.5, 8.5]]],
      ['DG-store', 'DG', [[3.25, 7.2], [3.5, 8.38], [3.5, 9.05], [2.4, 9.05]]],
    ]
    for (const [name, id, points] of routes) travel(name, elevations[id], points)
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
      if (object.name === 'kitchen-front-fridge' || object.name === 'kitchen-front-kitchen-tall') kitchenFronts.push(object.getWorldPosition(new THREE.Vector3()).x)
      if (object.name === 'light-well-base' && object.getWorldPosition(new THREE.Vector3()).x > 0) {
        const bounds = new THREE.Box3().setFromObject(object)
        wellBounds.push({ x: bounds.min.x, z: bounds.min.z, width: bounds.max.x - bounds.min.x, depth: bounds.max.z - bounds.min.z })
      }
    })
    const sanitaryDetails = ['guest-sink-concealed-control', 'guest-sink-wall-spout', 'guest-wc-flush-plate', 'guest-shower-concealed-control', 'guest-shower-rain-head'].map(name => ({ name, present: !!model.group.getObjectByName(name) }))
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
    for (const [floorId, doorId] of [['EG', 'kitchen-door'], ['EG', 'pantry'], ['EG', 'wc'], ['OG', 'child-north'], ['DG', 'attic-office'], ['DG', 'store']]) {
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
  for (const front of result.kitchenFronts) expect(front).toBeLessThan(3.2)
  expect(result.gardenCrowns.map(tree => tree.x).sort((first, second) => first - second)).toEqual([-5.8, 5.6])
  expect(result.gardenCrowns.every(tree => tree.z < 0)).toBe(true)
  expect(result.neighborCrowns).toBe(48)
  expect(result.ceilings).toHaveLength(6)
  for (const ceiling of result.ceilings) { expect(ceiling.min).toBeCloseTo(8.71); expect(ceiling.max).toBeCloseTo(8.95) }
  expect(result.entrancePivot.z).toBeCloseTo(5.33)
  expect(result.entranceTip.z).toBeCloseTo(result.entrancePivot.z)
  expect(result.entranceTip.x).toBeLessThan(result.entrancePivot.x)
  expect(result.bedHeads).toHaveLength(1)
  expect(result.bedHeads[0].side).toBe('south')
  expect(result.bedHeads[0].south).toBeCloseTo(9.815)
  expect(result.results.filter(route => route.blocked).map(route => route.name), JSON.stringify(result.results)).toEqual(['DG-store'])
  for (const route of result.results) {
    if (route.name === 'DG-store') { expect(route.blocked).not.toBeNull(); expect(route.blocked.position.x).toBeGreaterThan(3.075) }
    else expect(route.blocked, JSON.stringify(route)).toBeNull()
    expect(route.height, JSON.stringify(route)).toBeCloseTo(route.expected, 1)
  }
})