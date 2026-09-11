import { expect, test } from '@playwright/test'
import type { Mesh, BufferGeometry, Material } from 'three'
import { PNG } from 'pngjs'

test('Volle Wandhoehe, ebene Giebelflaechen und L-Vordach', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.meshes ?? 0)).toBeGreaterThan(60)
  const toggle = page.getByRole('button', { name: 'Wände schneiden', exact: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  const full = PNG.sync.read(await page.locator('canvas').screenshot())
  await page.screenshot({ path: `test-results/${testInfo.project.name}-full-walls.png` })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.loading')).toHaveCount(0)
  const cut = PNG.sync.read(await page.locator('canvas').screenshot())
  let changed = 0
  for (let offset = 0; offset < full.data.length; offset += 4) if (Math.abs(full.data[offset] - cut.data[offset]) > 8) changed++
  expect(changed / (full.width * full.height)).toBeGreaterThan(.01)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-cut-walls.png` })
  const probe = await page.evaluate(async () => {
    const scenePath = '/src/scene.ts', { buildScene } = await import(scenePath)
    const full = buildScene('EG', false, false, false), cut = buildScene('EG', false, false, false, true), roof = buildScene('EG', false, true, false)
    const wallHeight = (model: typeof full) => model.group.children.find((mesh: Mesh) => mesh.name === 'EG-wall-west').geometry.parameters.height
    const heights = [wallHeight(full), wallHeight(cut)]
    const gables = roof.group.children.filter((mesh: Mesh) => mesh.name === 'DG-wall-east')
    const flat = gables.every((mesh: Mesh<BufferGeometry, Material[]>) => {
      const normals = mesh.geometry.getAttribute('normal')
      for (let face = 0; face < normals.count; face += 6) for (let corner = 1; corner < 6; corner++) {
        if (Math.abs(normals.getX(face) - normals.getX(face + corner)) + Math.abs(normals.getY(face) - normals.getY(face + corner)) + Math.abs(normals.getZ(face) - normals.getZ(face + corner)) > .0001) return false
      }
      return true
    })
    const canopy = roof.group.children.filter((mesh: Mesh) => mesh.name.startsWith('entry-canopy')).map((mesh: Mesh) => mesh.name)
    const attic = buildScene('DG', false, false, false)
    const knees = attic.group.children.filter((mesh: Mesh) => mesh.name.startsWith('DG-wall-knee-')).map((mesh: Mesh) => {
      const positions = mesh.geometry.getAttribute('position')
      return { name: mesh.name, width: Math.max(...Array.from({length: positions.count}, (_, index) => positions.getX(index))) - Math.min(...Array.from({length: positions.count}, (_, index) => positions.getX(index))), height: Math.max(...Array.from({length: positions.count}, (_, index) => positions.getY(index))) - Math.min(...Array.from({length: positions.count}, (_, index) => positions.getY(index))) }
    })
    attic.dispose()
    full.dispose(); cut.dispose(); roof.dispose()
    return { heights, flat, gables: gables.length, canopy, knees }
  })
  expect(probe.heights).toEqual([2.65, 1.05])
  expect(probe.gables).toBeGreaterThan(0)
  expect(probe.flat).toBe(true)
  expect(probe.canopy).toEqual(['entry-canopy-roof', 'entry-canopy-side'])
  expect(probe.knees).toHaveLength(2)
  for (const knee of probe.knees) { expect(knee.width).toBeCloseTo(6.235); expect(knee.height).toBeGreaterThan(1.2); expect(knee.height).toBeLessThan(1.35) }
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})