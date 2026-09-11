import { expect, test } from '@playwright/test'

test('New room doors clear furniture throughout their swing in both halves', async ({ page }) => {
  await page.goto('/')
  const collisions = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { buildScene } = await import('/src/scene.ts')
    const { floorIds, makeFloor } = await import('/src/model.ts')
    const model = buildScene('EG', true, true, true)
    const conflicts: string[] = []
    for (const side of [1, -1]) for (const id of floorIds) {
      const prefix = side === 1 ? '' : 'west-', floor = makeFloor(id), offset = side === 1 ? 0 : 1.2
      for (const door of model.doors.filter(door => door.id.startsWith(`${prefix}${id}-`) && door.kind === 'door' && !door.sliding)) {
        for (let sample = 0; sample <= 20; sample++) {
          model.setOpening(door.id, sample / 20)
          model.group.updateMatrixWorld(true)
          const bounds = new THREE.Box3().setFromObject(door.object)
          for (const item of floor.furniture) {
            const east = side === 1 ? item.x : -item.x - item.width
            const fixture = new THREE.Box3(new THREE.Vector3(east, floor.elevation + (item.bottom ?? 0), item.z + offset), new THREE.Vector3(east + item.width, floor.elevation + (item.bottom ?? 0) + item.height, item.z + item.depth + offset))
            if (bounds.intersectsBox(fixture)) conflicts.push(`${door.id}/${item.id}/${sample}`)
          }
        }
      }
    }
    model.dispose()
    return conflicts
  })
  expect(collisions).toEqual([])
})