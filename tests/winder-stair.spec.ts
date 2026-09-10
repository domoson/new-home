import { expect, test } from '@playwright/test'

test('Nordantritt und zwei Wendelungen sind in beiden Haelften auf- und abwaerts begehbar', async ({ page }) => {
  await page.goto('/')
  const results = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { stairWalkingLine } = await import('/src/winderStair.ts')
    const { initializePhysics, createWalker } = await import('/src/walk.ts')
    await initializePhysics()
    const model = buildScene('EG', true, true, true)
    model.group.updateMatrixWorld(true)
    const camera = new THREE.PerspectiveCamera(), walker = createWalker(model, camera, new THREE.Vector3(3.7, 0, 1.6))
    const results = []
    for (const sign of [1, -1]) for (const [base, rise] of [[-2.7, 2.7], [0, 2.95], [2.95, 2.95]]) for (const descending of [false, true]) {
      const offset = sign === 1 ? 0 : 1.2
      const route = stairWalkingLine(rise).map(([east, height, south]) => [sign * east, base + height, south + offset])
      if (descending) route.reverse()
      walker.teleport(new THREE.Vector3(...route[0]))
      let blocked = null
      for (const [east, , south] of route.slice(1)) {
        let frames = 0
        while (Math.hypot(walker.position().x - east, walker.position().z - south) > .045 && frames++ < 240) {
          const position = walker.position()
          camera.lookAt(east, camera.position.y, south)
          walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
          if (!Number.isFinite(position.y)) throw new Error('Invalid stair position')
        }
        if (frames >= 240) { blocked = { east, south, position: walker.position() }; break }
      }
      for (let frame = 0; frame < 20; frame++) walker.tick()
      results.push({ sign, base, descending, blocked, height: walker.position().y - .9, expected: descending ? base : base + rise })
    }
    let approachBlocked = false
    const accessRoutes = [[0, [[3.7, 1.6], [3.7, 3.7], [2.95, 4.05]]], [2.95, [[3.7, 5.35], [3.7, 5.85], [5.65, 5.85], [5.65, 7.4]]]] as const
    for (const sign of [1, -1]) for (const [base, points] of accessRoutes) {
      const offset = sign === 1 ? 0 : 1.2
      walker.teleport(new THREE.Vector3(sign * points[0][0], base, points[0][1] + offset))
      for (const [localEast, localSouth] of points.slice(1)) {
      const east = sign * localEast, south = localSouth + offset
      let frames = 0
      while (Math.hypot(walker.position().x - east, walker.position().z - south) > .045 && frames++ < 240) {
        camera.lookAt(east, camera.position.y, south); walker.keys.add('KeyW'); walker.tick(); walker.keys.clear()
      }
      if (frames >= 240) approachBlocked = true
      }
    }
    walker.dispose(); model.dispose()
    return { results, approachBlocked }
  })
  expect(results.approachBlocked, JSON.stringify(results)).toBe(false)
  for (const result of results.results) {
    expect(result.blocked, JSON.stringify(result)).toBeNull()
    expect(result.height, JSON.stringify(result)).toBeCloseTo(result.expected, 1)
  }
})

test('Alle Grundrisse zeigen Wendelstufen und den nördlichen Antritt', async ({ page }, testInfo) => {
  await page.goto('/')
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    await expect(page.locator('[data-stair="double-quarter-winder"] polygon')).toHaveCount(15)
    await expect(page.locator('[data-step^="winder"]')).toHaveCount(8)
    await page.screenshot({ path: `test-results/${testInfo.project.name}-winder-plan-${floor}.png` })
  }
  await page.getByRole('button', { name: 'EG', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').waitFor({ timeout: 45000 })
  await page.locator('canvas').screenshot({ path: `test-results/${testInfo.project.name}-winder-model.png` })
})