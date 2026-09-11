import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

declare global { interface Window { __neighborCleanup?: () => void; __neighborRotate?: () => void } }

test('Garagen 8 und 12: Wand und Dach liegen durchgehend an der eigenen Grenze', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { createSurroundings } = await import('/src/surroundings.ts')
    const { neighborItems } = await import('/src/sitePlanModel.ts')
    const { boundaryDistance } = await import('/src/context.ts')
    const model = createSurroundings(); model.neighborhood.updateMatrixWorld(true)
    const result = [
      { number: 8, side: 1, names: ['neighbor-8-garage', 'neighbor-8-garage-roof'] },
      { number: 12, side: 3, names: ['detailed-annex', 'detailed-annex-roof'] },
    ].map(({ number, side, names }) => {
      const group = model.neighborhood.getObjectByName(`neighbor-${number}`)!
      const plan = neighborItems.find(item => item.id === `neighbor-annex-${number}`)!.points
      return names.map(name => {
        const mesh = group.getObjectByName(name)!, positions = mesh.geometry.getAttribute('position')
        const points = Array.from({ length: positions.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld))
        const contacts = points.filter(point => Math.abs(boundaryDistance([point.x, point.z], side)) < .00001)
        return {
          name, contacts: contacts.length,
          contactLength: Math.max(...contacts.map(point => point.z)) - Math.min(...contacts.map(point => point.z)),
          intrusion: Math.max(...points.map(point => boundaryDistance([point.x, point.z], side))),
          planError: Math.max(...points.map(point => Math.min(...plan.map(corner => Math.hypot(corner[0] - point.x, corner[1] - point.z))))),
        }
      })
    }).flat()
    model.dispose(); return result
  })
  for (const mesh of result) {
    expect(mesh.contacts, mesh.name).toBeGreaterThanOrEqual(4)
    expect(mesh.contactLength, mesh.name).toBeGreaterThan(6)
    expect(mesh.intrusion, mesh.name).toBeLessThan(.00001)
    expect(mesh.planError, mesh.name).toBeLessThan(.00001)
  }
})

test('Nachbardaechern fehlt kein Hoehenanschluss an den Hauskoerper', async ({ page }) => {
  await page.goto('/')
  const gaps = await page.evaluate(async () => {
    const { createSurroundings } = await import('/src/surroundings.ts')
    const { Box3 } = await import('/node_modules/.vite/deps/three.js')
    const model = createSurroundings()
    const bodies = [], roofs = []
    model.neighborhood.traverse(object => { if (object.name === 'neighbor-body') bodies.push(object); if (object.name === 'neighbor-roof') roofs.push(object) })
    const result = bodies.map((body, index) => ({ gap: new Box3().setFromObject(roofs[index]).min.y - new Box3().setFromObject(body).max.y, vertices: roofs[index].geometry.getAttribute('position').count }))
    model.dispose()
    return result
  })
  expect(gaps.length).toBe(15)
  for (const roof of gaps) { expect(roof.gap).toBeCloseTo(0, 5); expect(roof.vertices).toBe(24) }
})

test('Haus 8 auf 74/5: Garage westlich angebaut, Dach geschlossen und Suedbalkon', async ({ page }, testInfo) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { createSurroundings } = await import('/src/surroundings.ts')
    const { neighbor8, neighbor8Point } = await import('/src/neighbor8.ts')
    const { boundaryDistance } = await import('/src/context.ts')
    const model = createSurroundings(), building = model.neighborhood.getObjectByName('neighbor-8')!
    building.updateWorldMatrix(true, true)
    let outsideOwnSite = true
    building.traverse(object => {
      if (!object.isMesh) return
      const vertices = object.geometry.getAttribute('position')
      for (let index = 0; index < vertices.count; index++) {
        const position = new THREE.Vector3().fromBufferAttribute(vertices, index).applyMatrix4(object.matrixWorld)
        if (boundaryDistance([position.x, position.z], 1) > .001) outsideOwnSite = false
      }
    })
    const roofMeshes = building.children.filter(object => object.name === 'neighbor-8-roof')
    const contacts = roofMeshes.map((mesh, roofIndex) => {
      const vertices = mesh.geometry.getAttribute('position')
      const points = []
      for (let index = 0; index < vertices.count; index++) {
        points.push(new THREE.Vector3().fromBufferAttribute(vertices, index).add(mesh.position))
      }
      const northZ = Math.min(...points.map(position => position.z)), southZ = Math.max(...points.map(position => position.z))
      const northY = Math.min(...points.filter(position => Math.abs(position.z - northZ) < .001).map(position => position.y))
      const southY = Math.min(...points.filter(position => Math.abs(position.z - southZ) < .001).map(position => position.y))
      const wallZ = roofIndex === 0 ? neighbor8.house.z : neighbor8.house.z + neighbor8.house.depth
      return northY + (southY - northY) * (wallZ - northZ) / (southZ - northZ) - (neighbor8.ground + neighbor8.house.eaves)
    })
    const body = building.getObjectByName('neighbor-8-body')!, garage = building.getObjectByName('neighbor-8-garage')!, garageRoof = building.getObjectByName('neighbor-8-garage-roof')!
    const garageJoin = garage.position.x + garage.geometry.parameters.width / 2 - (body.position.x - body.geometry.parameters.width / 2)
    const garageRoofGap = garageRoof.position.y - garageRoof.geometry.parameters.height / 2 - (garage.position.y + garage.geometry.parameters.height / 2)
    const balcony = building.getObjectByName('neighbor-8-balcony')!
    const data = { parcel: building.userData.parcel, garageJoin, garageRoofGap, outsideOwnSite, roofCount: roofMeshes.length, closedGables: building.children.filter(object => object.name === 'neighbor-8-gable').length, skylights: building.children.filter(object => object.name === 'neighbor-8-skylight').length, balconySouth: balcony.position.z > body.position.z + neighbor8.house.depth / 2, contacts }
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#edf1ed'); scene.add(model.neighborhood)
    scene.add(new THREE.HemisphereLight('#ffffff', '#9da894', 2))
    const sun = new THREE.DirectionalLight('#ffffff', 3); sun.position.set(10, 25, 35); scene.add(sun)
    const center = neighbor8Point(6, 5), camera = new THREE.PerspectiveCamera(45, 1, .1, 150)
    camera.position.set(center[0] + 18, 17, center[1] + 24); camera.lookAt(center[0], 3, center[1])
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(360, 360)
    renderer.domElement.setAttribute('data-neighbor-preview', 'true'); renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999;width:360px;height:360px'; document.body.appendChild(renderer.domElement)
    renderer.render(scene, camera)
    window.__neighborCleanup = () => { renderer.domElement.remove(); renderer.dispose(); model.dispose() }
    return data
  })
  expect(result.parcel).toBe('74/5')
  expect(result.garageJoin).toBeCloseTo(0)
  expect(result.garageRoofGap).toBeCloseTo(0)
  expect(result.outsideOwnSite).toBe(true)
  expect(result.roofCount).toBe(2)
  expect(result.closedGables).toBe(2)
  expect(result.skylights).toBe(4)
  expect(result.balconySouth).toBe(true)
  for (const gap of result.contacts) expect(gap).toBeCloseTo(0, 5)
  const preview = page.locator('[data-neighbor-preview]')
  const screenshot = await preview.screenshot({ path: `test-results/${testInfo.project.name}-neighbor-8-detail.png` })
  const image = PNG.sync.read(screenshot), colors = new Set<string>()
  for (let offset = 0; offset < image.data.length; offset += 16) colors.add(`${image.data[offset] >> 4},${image.data[offset + 1] >> 4},${image.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.evaluate(() => window.__neighborCleanup?.())
})

for (const number of [12, 50, 52]) test(`Direkter Nachbar ${number}: Lage, Dachanschluss, Anbauten und Bildansicht`, async ({ page }, testInfo) => {
  await page.goto('/')
  const result = await page.evaluate(async number => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { createSurroundings } = await import('/src/surroundings.ts')
    const { directNeighbors, directNeighborPoint } = await import('/src/directNeighbors.ts')
    const { boundaryDistance } = await import('/src/context.ts')
    const { streetBoundaryZ } = await import('/src/neighborhoodLayout.ts')
    const spec = directNeighbors.find(item => item.number === number)!
    const model = createSurroundings(), group = model.neighborhood.getObjectByName(`neighbor-${number}`)!
    group.updateWorldMatrix(true, true)
    let insideOwnSite = 0
    group.traverse(object => {
      if (!object.isMesh) return
      const vertices = object.geometry.getAttribute('position')
      for (let index = 0; index < vertices.count; index++) {
        const position = new THREE.Vector3().fromBufferAttribute(vertices, index).applyMatrix4(object.matrixWorld)
        if ([0, 1, 2, 3].every(side => boundaryDistance([position.x, position.z], side) > .001)) insideOwnSite++
      }
    })
    const roofs = group.children.filter(object => object.name === 'detailed-roof')
    const eaves = spec.height - .14
    const gaps = roofs.flatMap(roof => {
      const vertices = roof.geometry.getAttribute('position'), gaps: number[] = []
      for (const [x, z] of [[0, 0], [spec.width, 0], [0, spec.depth], [spec.width, spec.depth]]) {
        const heights: number[] = []
        for (let index = 0; index < vertices.count; index++) if (Math.abs(vertices.getX(index) - x) < .001 && Math.abs(vertices.getZ(index) - z) < .001) heights.push(vertices.getY(index))
        if (heights.length) gaps.push(Math.min(...heights) - eaves)
      }
      return gaps
    })
    const annex = group.getObjectByName('detailed-annex'), annexRoof = group.getObjectByName('detailed-annex-roof')
    const annexGap = annex ? annexRoof.position.y - annexRoof.geometry.parameters.height / 2 - (annex.position.y + annex.geometry.parameters.height / 2) : null
    const driveway = group.getObjectByName('detailed-driveway')!, vertices = driveway.geometry.getAttribute('position')
    let streetContacts = 0
    for (let index = 0; index < vertices.count; index++) {
      const position = new THREE.Vector3().fromBufferAttribute(vertices, index).applyMatrix4(driveway.matrixWorld)
      if (Math.abs(position.z - streetBoundaryZ(position.x, spec.northAccess)) < .001) streetContacts++
    }
    const data = { parcel: group.userData.parcel, insideOwnSite, gaps, roofs: roofs.length, annexGap, annex: !!annex, panels: group.children.filter(object => object.name === 'detailed-solar-panel').length, skylights: group.children.filter(object => object.name === 'detailed-skylight').length, balcony: !!group.getObjectByName('detailed-south-balcony'), streetContacts }
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#edf1ed'); scene.add(model.neighborhood)
    scene.add(new THREE.HemisphereLight('#ffffff', '#9da894', 2))
    const sun = new THREE.DirectionalLight('#ffffff', 3); sun.position.set(10, 25, 35); scene.add(sun)
    const center = directNeighborPoint(spec, spec.number === 50 ? 8 : 5, 5), camera = new THREE.PerspectiveCamera(45, 1, .1, 150)
    camera.position.set(center[0] + 20, 19, center[1] + 26); camera.lookAt(center[0], 3, center[1])
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(360, 360)
    renderer.domElement.setAttribute('data-neighbor-preview', 'true'); renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:9999;width:360px;height:360px'; document.body.appendChild(renderer.domElement)
    renderer.render(scene, camera)
    window.__neighborRotate = () => { camera.position.set(center[0] - 18, 17, center[1] - 26); camera.lookAt(center[0], 3, center[1]); renderer.render(scene, camera) }
    window.__neighborCleanup = () => { renderer.domElement.remove(); renderer.dispose(); model.dispose(); delete window.__neighborRotate }
    return data
  }, number)
  expect(result.parcel).toBe(({ 12: '75/4', 50: '74/4', 52: '73/4' })[number])
  expect(result.insideOwnSite).toBe(0)
  expect(result.gaps.length).toBeGreaterThan(3)
  for (const gap of result.gaps) expect(gap).toBeCloseTo(0, 5)
  expect(result.roofs).toBe(number === 12 ? 4 : 2)
  expect(result.annex).toBe(number !== 52)
  if (result.annex) expect(result.annexGap).toBeCloseTo(0)
  expect(result.panels).toBe(number === 50 ? 5 : 0)
  expect(result.skylights).toBeGreaterThan(0)
  expect(result.balcony).toBe(number === 50)
  expect(result.streetContacts).toBeGreaterThanOrEqual(2)
  const preview = page.locator('[data-neighbor-preview]')
  const before = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-neighbor-${number}-south.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 16) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.evaluate(() => window.__neighborRotate?.())
  const after = PNG.sync.read(await preview.screenshot({ path: `test-results/${testInfo.project.name}-neighbor-${number}-north.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 8) changed++
  expect(changed).toBeGreaterThan(100)
  await page.evaluate(() => window.__neighborCleanup?.())
})