import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('Carports: Abmessungen, Holztoene, freie Zugaenge und Pfostenkollision', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { carportRoof, siteParking } = await import('/src/parking.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    await initializePhysics()
    const model = buildScene('EG', true, true, true, false)
    const camera = new THREE.PerspectiveCamera()
    const walker = createWalker(model, camera, new THREE.Vector3(8.3, 0, 12))
    const drive = (placement: typeof siteParking[number], east: number, south: number, target: number) => {
      const start = placement.point(east, south)
      const local = () => {
        const current = walker.position(), dx = current.x - placement.origin.x, dz = current.z - placement.origin.z
        return { x: Math.cos(placement.angle) * dx + Math.sin(placement.angle) * dz, z: -Math.sin(placement.angle) * dx + Math.cos(placement.angle) * dz }
      }
      walker.teleport(new THREE.Vector3(start[0], 0, start[1])); camera.rotation.set(0, -placement.angle, 0)
      walker.keys.add('KeyW')
      for (let tick = 0; tick < Math.ceil((south - target) / .03) + 120 && local().z > target; tick++) walker.tick()
      walker.keys.clear()
      return local()
    }
    const placements = siteParking.map(placement => {
      const { side, carport, covered, open, passage, bins, point, angle } = placement
      const structure = model.group.getObjectByName(`carport-${side}`)!
      const roof = structure.getObjectByName('carport-roof')! as THREE.Mesh<THREE.BoxGeometry>
      const vertices = roof.geometry.getAttribute('position')
      const north: number[] = [], south: number[] = []
      for (let index = 0; index < vertices.count; index++) (vertices.getZ(index) < 0 ? north : south).push(vertices.getY(index))
      const rise = Math.max(...south) - Math.max(...north)
      const roofCorrect = Math.abs(rise - 6 * Math.tan(carportRoof.pitch * Math.PI / 180)) < .00001 && !structure.getObjectByName('carport-green-roof') && !!structure.getObjectByName('carport-gutter') && !!structure.getObjectByName('carport-downpipe')
      const mesh = structure.getObjectByName('carport-post')! as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
      model.setCladding('plaster', side === 'east' ? 2 : 1, 'boards', side)
      const color = mesh.material.color.getHexString()
      const through = drive(placement, passage.x + passage.width / 2, open.z + open.depth + .4, carport.z - 1.5)
      const turn = point(bins.x + bins.width / 2, carport.z - 1.5)
      camera.rotation.set(0, -angle + (side === 'west' ? Math.PI / 2 : -Math.PI / 2), 0)
      walker.keys.add('KeyW')
      for (let tick = 0; tick < 130 && Math.hypot(walker.position().x - turn[0], walker.position().z - turn[1]) > .08; tick++) walker.tick()
      walker.keys.clear()
      const binAccessDistance = Math.hypot(walker.position().x - turn[0], walker.position().z - turn[1])
      const into = drive(placement, covered.x + covered.width / 2, carport.z + carport.depth + 2, covered.z + .5)
      const blocked = drive(placement, carport.x + .08, carport.z + carport.depth + 1, carport.z + carport.depth - 1)
      const rearBlocked = drive(placement, covered.x + covered.width / 2, carport.z + 1, carport.z - .5)
      const binCount = structure.children.filter(object => /^bin-(east|west)-\d$/.test(object.name)).length
      return { side, width: roof.geometry.parameters.width, depth: roof.geometry.parameters.depth, roofCorrect, color, through, into, blocked, rearBlocked, binAccessDistance, binCount, carport, covered }
    })
    const fence = model.group.getObjectByName('boundary-fence')! as THREE.InstancedMesh
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3()
    const fenceBlocks = siteParking.some(({ passage, point, streetZ }) => {
      const edges = [passage.x, passage.x + passage.width].map(x => point(x, streetZ(x))[0]).sort((first, second) => first - second)
      for (let index = 0; index < fence.count; index++) {
        fence.getMatrixAt(index, matrix); position.setFromMatrixPosition(matrix)
        if (position.z > 20 && position.x > edges[0] && position.x < edges[1]) return true
      }
      return false
    })
    const eastWood = (model.group.getObjectByName('carport-east')!.getObjectByName('carport-post')! as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>).material.color.getHexString()
    walker.dispose(); model.dispose()
    return { placements, fenceBlocks, eastWood }
  })
  for (const placement of result.placements) {
    expect(placement.width).toBeCloseTo(3.25)
    expect(placement.depth).toBeCloseTo(6)
    expect(placement.roofCorrect).toBe(true)
    expect(placement.color).toBe(placement.side === 'east' ? '514f48' : '92968f')
    expect(placement.through.z).toBeLessThan(placement.carport.z)
    expect(placement.into.z).toBeLessThan(placement.covered.z + .6)
    expect(placement.blocked.z).toBeGreaterThan(placement.carport.z + placement.carport.depth)
    expect(placement.rearBlocked.z).toBeGreaterThan(placement.carport.z + .2)
    expect(placement.binCount).toBe(3)
    expect(placement.binAccessDistance).toBeLessThan(.12)
  }
  expect(result.eastWood).toBe('514f48')
  expect(result.fenceBlocks).toBe(false)
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.snapshot().site)).toBe(true)
  await expect(page.locator('.loading')).toHaveCount(0)
  const canvas = page.locator('canvas')
  const before = PNG.sync.read(await canvas.screenshot())
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 16) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-parking-site.png` })
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5)
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height * .55, { steps: 15 }); await page.mouse.up()
  await expect.poll(async () => {
    const after = PNG.sync.read(await canvas.screenshot())
    let changed = 0
    for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 8) changed++
    return changed
  }).toBeGreaterThan(100)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})