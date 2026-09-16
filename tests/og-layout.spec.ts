import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'

test('OG balanced rooms render without overflow and the furnished 3D scene rotates', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'OG', exact: true }).click()
  const plan = page.locator('svg.floor-plan')
  await expect(plan).toContainText('15,7 m²')
  await expect(plan).toContainText('17,0 m²')
  await expect(plan).toContainText('3,5 m²')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-og-balanced-plan.png` })
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.locator('.scene-settings summary').waitFor({ timeout: 45000 })
  const canvas = page.locator('canvas')
  const before = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-og-balanced-3d.png` }))
  const colors = new Set<string>()
  for (let offset = 0; offset < before.data.length; offset += 32) colors.add(`${before.data[offset] >> 4},${before.data[offset + 1] >> 4},${before.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .6, { steps: 10 })
  await page.mouse.up()
  const after = PNG.sync.read(await canvas.screenshot({ path: `test-results/${testInfo.project.name}-og-balanced-rotated.png` }))
  let changed = 0
  for (let offset = 0; offset < before.data.length; offset += 16) if (Math.abs(before.data[offset] - after.data[offset]) > 10) changed++
  expect(changed).toBeGreaterThan(100)
  expect(errors).toEqual([])
})