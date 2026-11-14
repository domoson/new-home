import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Teilunterkellerung West: 2D-Pläne, West-Ost-Schnitt, 3D-Baukörper und Rapier-Begehbarkeit', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })

  await page.goto('/')
  await page.getByRole('button', { name: 'KG', exact: true }).click()
  const plan = page.getByRole('img', { name: 'Grundriss Kellergeschoss' })
  await expect(plan).toBeVisible()
  await expect(plan.locator('[data-unexcavated-area="true"]')).toContainText('Nicht unterkellert')
  await expect(plan.locator('[data-total-width-label="true"]')).toHaveText('5,248 m')
  await expect(plan).toContainText('+1,80 m Ost frei')
  await expect(plan).toContainText('4,500 m lichte Breite')
  await expect(plan.locator('[data-light-well="true"]')).toHaveCount(2)
  await expect(plan.locator('[data-light-well-bar]')).toHaveCount(8)
  await expect(plan.locator('[data-room-label]')).toHaveCount(3)
  await expect(plan).toContainText('Technik / Waschen')
  await expect(plan).toContainText('Kellerflur')
  await expect(plan).toContainText('Keller / Hobby')
  await page.screenshot({ path: `test-results/${testInfo.project.name}-partial-basement-plan.png` })

  await page.getByRole('button', { name: 'Querschnitt', exact: true }).click()
  const section = page.getByRole('img', { name: /Gebäudeschnitt/ })
  await expect(section).toBeVisible()
  await page.locator('#section-axis').selectOption('EW', { force: true })
  await expect(page.getByRole('img', { name: 'Gebäudeschnitt West–Ost' })).toBeVisible()
  await expect(section.locator('title').filter({ hasText: 'Frostschürze nicht unterkellerter Ostbereich' })).toHaveCount(1)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-partial-basement-section-ew.png` })
  await page.getByRole('button', { name: 'Querschnitt', exact: true }).click()

  await page.getByRole('button', { name: 'Außenanlagen', exact: true }).click()
  const sitePlan = page.getByRole('img', { name: 'Außenanlagenplan' })
  await expect(sitePlan.locator('[data-site-light-well]')).toHaveCount(4)
  await expect(sitePlan.locator('[data-basement-outline]')).toHaveCount(2)
  await sitePlan.locator('[data-site-object="house-east"]').evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await expect(page.locator('.room-detail').first()).toContainText('Garage Nr. 8')
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Schließen', exact: true }).click()
  await page.screenshot({ path: `test-results/${testInfo.project.name}-partial-basement-site.png` })

  const runtime = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { OBB } = await import('/node_modules/three/examples/jsm/math/OBB.js')
    const { buildScene } = await import('/src/scene.ts')
    const { basement, basementEnvelope, elevations, furnitureVolumes, houseEnvelope, housePlacement, makeFloor, storeyRise, wallSolids } = await import('/src/model.ts')
    const { stairWalkingLine } = await import('/src/winderStair.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    await initializePhysics()

    const fullModel = buildScene('KG', true, true, true)
    fullModel.group.updateMatrixWorld(true)

    const eastHouse = fullModel.group.getObjectByName('house-east')!
    const westHouse = fullModel.group.getObjectByName('house-west')!
    const eastKgSlab = new THREE.Box3().setFromObject(eastHouse.getObjectByName('KG-slab')!)
    const westKgSlab = new THREE.Box3().setFromObject(westHouse.getObjectByName('KG-slab')!)
    const eastKgWall = new THREE.Box3().setFromObject(eastHouse.getObjectByName('KG-wall-east')!)
    let frostSkirts = 0, grates = 0
    fullModel.group.traverse((object: { name: string }) => {
      if (object.name === 'frost-skirt') frostSkirts++
      if (object.name.startsWith('light-well-grate-')) grates++
    })

    const kgFloor = makeFloor('KG')
    const obstacles = [
      ...kgFloor.walls.flatMap(wall => wallSolids(wall, kgFloor.height).map(solid => ({
        id: `wall-${wall.id}`,
        box: new THREE.Box3(
          new THREE.Vector3(solid.x + housePlacement.x + .006, elevations.KG + solid.bottom + .006, solid.z + housePlacement.z + .006),
          new THREE.Vector3(solid.x + solid.width + housePlacement.x - .006, elevations.KG + solid.bottom + solid.height - .006, solid.z + solid.depth + housePlacement.z - .006),
        ),
      }))),
      ...kgFloor.furniture.flatMap(item => furnitureVolumes(item).map(part => ({
        id: `furniture-${item.id}`,
        box: new THREE.Box3(
          new THREE.Vector3(part.x + housePlacement.x + .004, elevations.KG + (item.bottom ?? 0) + part.bottom + .004, part.z + housePlacement.z + .004),
          new THREE.Vector3(part.x + part.width + housePlacement.x - .004, elevations.KG + (item.bottom ?? 0) + part.bottom + part.height - .004, part.z + part.depth + housePlacement.z - .004),
        ),
      }))),
    ]

    const collisions: string[] = []
    const kgOpenings = fullModel.doors.filter((door: { id: string }) => door.id.includes('KG-'))
    for (const door of kgOpenings) {
      const halfSize = door.size.clone().multiplyScalar(.5).subScalar(.012)
      for (let step = 0; step <= 20; step++) {
        fullModel.setOpening(door.id, step / 20)
        fullModel.group.updateMatrixWorld(true)
        const obb = new OBB(new THREE.Vector3(), halfSize.clone())
        obb.applyMatrix4(door.pivot.matrixWorld)
        obb.center.copy(door.center).applyMatrix4(door.pivot.matrixWorld)
        for (const obstacle of obstacles) {
          if (step === 0 && obstacle.id.startsWith('wall-')) continue
          if (obb.intersectsBox3(obstacle.box)) collisions.push(`${door.id}@${step}:${obstacle.id}`)
        }
      }
      fullModel.setOpening(door.id, 0)
    }

    const camera = new THREE.PerspectiveCamera(65, 1, .04, 100)
    const walker = createWalker(fullModel, camera, new THREE.Vector3(3.4 + housePlacement.x, 0, 2.8 + housePlacement.z))
    const walkTo = (east: number, south: number, maxSteps = 300) => {
      const targetX = east + housePlacement.x, targetZ = south + housePlacement.z
      walker.keys.add('KeyW')
      for (let step = 0; step < maxSteps; step++) {
        const pos = walker.position()
        if (Math.hypot(pos.x - targetX, pos.z - targetZ) < .055) break
        camera.position.set(pos.x, pos.y + .775, pos.z)
        camera.lookAt(targetX, pos.y + .775, targetZ)
        walker.tick()
      }
      walker.keys.delete('KeyW')
      return walker.position()
    }

    walker.setOpening('EG-basement-stair', 1)
    const descent = stairWalkingLine(storeyRise('KG')).map(([east, , south]: [number, number, number]) => [east, south]).reverse()
    walker.teleport(new THREE.Vector3(descent[0][0] + housePlacement.x, elevations.EG, descent[0][1] + housePlacement.z))
    for (const [east, south] of descent.slice(1)) walkTo(east, south, 300)
    for (let settle = 0; settle < 20; settle++) walker.tick()
    const arrivedKg = walker.position()

    walkTo(3.1, 2.5, 120)
    const blockedNorth = walker.position().z - housePlacement.z
    walker.teleport(new THREE.Vector3(3.1 + housePlacement.x, elevations.KG, 4.5 + housePlacement.z))
    walker.setOpening('KG-bath', 1)
    walkTo(3.1, 2.05, 220)
    const insideNorth = walkTo(2.95, 1.95, 220)

    walkTo(3.1, 2.05, 220)
    walkTo(3.1, 4.5, 240)
    walkTo(3.1, 6.4, 120)
    const blockedSouth = walker.position().z - housePlacement.z
    walker.teleport(new THREE.Vector3(3.1 + housePlacement.x, elevations.KG, 4.5 + housePlacement.z))
    walker.setOpening('KG-child-south', 1)
    walkTo(3.1, 6.7, 220)
    const insideSouth = walkTo(2.5, 7.8, 240)

    walker.dispose()
    fullModel.dispose()

    const preview = buildScene('KG', false, false, true)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#eef2ec')
    scene.add(preview.group, new THREE.HemisphereLight('#ffffff', '#7e867c', 1.35))
    const sun = new THREE.DirectionalLight('#fff6e8', 2.4)
    sun.position.set(14, 24, 16)
    scene.add(sun)
    const width = Math.min(innerWidth, 960), height = Math.min(innerHeight, 720)
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.id = 'partial-basement-3d'
    renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999'
    document.body.appendChild(renderer.domElement)
    const viewCamera = new THREE.PerspectiveCamera(45, width / height, .05, 150)
    const distance = width < 500 ? 19 : 13.5
    viewCamera.position.set(distance * .95, distance * .85 - 2.45, 5.4 + distance * .9)
    viewCamera.lookAt(2.8, -1.8, 5.4)
    renderer.render(scene, viewCamera)
    Object.assign(window, {
      __rotateCellarPreview: () => {
        viewCamera.position.set(-distance * .65, distance * .9 - 2.45, 5.4 - distance * .95)
        viewCamera.lookAt(2.4, -1.8, 5.4)
        renderer.render(scene, viewCamera)
      },
      __disposeCellarPreview: () => {
        renderer.domElement.remove()
        renderer.dispose()
        preview.dispose()
      },
    })

    const cellar = basementEnvelope(), full = houseEnvelope()
    return {
      eastSlabWidth: eastKgSlab.max.x - eastKgSlab.min.x,
      westSlabWidth: westKgSlab.max.x - westKgSlab.min.x,
      expectedCellarWidth: cellar.width,
      fullWidth: full.width,
      eastWallMaxX: eastKgWall.max.x - housePlacement.x,
      expectedWallMaxX: basement.east + .348,
      frostSkirts,
      grates,
      openingIds: kgOpenings.map((door: { id: string }) => door.id).sort(),
      collisions,
      arrivedKgFloor: arrivedKg.y - .9,
      expectedKgFloor: elevations.KG,
      blockedNorth,
      insideNorth: [insideNorth.x - housePlacement.x, insideNorth.z - housePlacement.z, insideNorth.y - .9],
      blockedSouth,
      insideSouth: [insideSouth.x - housePlacement.x, insideSouth.z - housePlacement.z, insideSouth.y - .9],
    }
  })

  expect(runtime.eastSlabWidth).toBeCloseTo(runtime.expectedCellarWidth, 3)
  expect(runtime.westSlabWidth).toBeCloseTo(runtime.expectedCellarWidth, 3)
  expect(runtime.fullWidth - runtime.eastSlabWidth).toBeCloseTo(1.8, 3)
  expect(runtime.eastWallMaxX).toBeCloseTo(runtime.expectedWallMaxX, 3)
  expect(runtime.frostSkirts).toBe(6)
  expect(runtime.grates).toBe(16)
  expect(runtime.openingIds).toEqual([
    'KG-bath',
    'KG-child-south',
    'KG-well-hobby-south',
    'KG-well-plant',
    'west-KG-well-hobby-south',
    'west-KG-well-plant',
  ])
  expect(runtime.collisions).toEqual([])
  expect(runtime.arrivedKgFloor).toBeCloseTo(runtime.expectedKgFloor, 1)
  expect(runtime.blockedNorth).toBeGreaterThan(3.45)
  expect(runtime.insideNorth[0]).toBeCloseTo(2.95, 1)
  expect(runtime.insideNorth[1]).toBeCloseTo(1.95, 1)
  expect(runtime.insideNorth[2]).toBeCloseTo(runtime.expectedKgFloor, 1)
  expect(runtime.blockedSouth).toBeLessThan(5.45)
  expect(runtime.insideSouth[0]).toBeCloseTo(2.5, 1)
  expect(runtime.insideSouth[1]).toBeCloseTo(7.8, 1)
  expect(runtime.insideSouth[2]).toBeCloseTo(runtime.expectedKgFloor, 1)

  const first = PNG.sync.read(await page.locator('#partial-basement-3d').screenshot({ path: `test-results/${testInfo.project.name}-partial-basement-3d.png` }))
  await page.evaluate(() => (window as unknown as { __rotateCellarPreview: () => void }).__rotateCellarPreview())
  const rotated = PNG.sync.read(await page.locator('#partial-basement-3d').screenshot({ path: `test-results/${testInfo.project.name}-partial-basement-3d-rotated.png` }))
  await page.evaluate(() => (window as unknown as { __disposeCellarPreview: () => void }).__disposeCellarPreview())

  expect(Buffer.compare(first.data, rotated.data)).not.toBe(0)
  const palette = new Set<string>()
  for (let offset = 0; offset < first.data.length; offset += 16) palette.add(`${first.data[offset] >> 4},${first.data[offset + 1] >> 4},${first.data[offset + 2] >> 4}`)
  expect(palette.size).toBeGreaterThan(20)
  expect(errors).toEqual([])
})
