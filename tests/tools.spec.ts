import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { PNG } from 'pngjs'

async function pointOnPlan(page: Page, x: number, z: number) {
  return page.locator('svg.floor-plan').evaluate((svg, point) => {
    const location = new DOMPoint(point.x, point.z).matrixTransform((svg as SVGSVGElement).getScreenCTM()!)
    return { x: location.x, y: location.y }
  }, { x, z })
}
async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value))
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}
test('Planwerkzeuge: Hover-Masse, Massband, Zoom und echte Schnitte', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const hover = await pointOnPlan(page, 5.05, 4.95)
  await page.mouse.move(hover.x, hover.y)
  await expect(page.getByRole('tooltip')).toContainText('Induktionskochfeld')
  await expect(page.getByRole('tooltip')).toContainText('0,80 m × 0,52 m')
  const wall = await pointOnPlan(page, 7.3, 6.2)
  await page.mouse.move(wall.x, wall.y)
  await expect(page.getByRole('tooltip')).toContainText('Außenwand Ost')
  await page.screenshot({ path: `test-results/${testInfo.project.name}-hover.png` })
  await page.getByRole('button', { name: 'Maßband', exact: true }).click()
  for (const [x, z] of [[.4, .365], [7.135, .365]]) { const point = await pointOnPlan(page, x, z); await page.mouse.click(point.x, point.y) }
  await expect(page.locator('[data-measurement="saved"]')).toHaveText('6,735 m')
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click()
  for (const [x, z] of [[3, 4], [6, 8]]) { const point = await pointOnPlan(page, x, z); await page.mouse.click(point.x, point.y) }
  await expect(page.locator('[data-measurement="saved"]').last()).toHaveText('5,00 m')
  await page.screenshot({ path: `test-results/${testInfo.project.name}-measurements.png` })
  await page.getByRole('button', { name: 'Messungen löschen', exact: true }).click()
  await expect(page.locator('[data-measurement="saved"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Querschnitt', exact: true }).click()
  const section = page.getByRole('img', { name: 'Gebäudeschnitt Nord–Süd' })
  await expect(section).toBeVisible(); await expect(section).toContainText('2,65 m'); await expect(section).toContainText('2,40 m')
  expect(await section.getByText('2,65 m', { exact: true }).first().evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(10)
  await expect(section.locator('title').filter({ hasText: 'Dachfenster Treppenhaus' })).toHaveCount(1)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-section-NS.png` })
  await page.getByRole('button', { name: 'Maßband im Schnitt', exact: true }).click()
  for (const [x, z] of [[8, 0], [8, -2.65]]) { const point = await pointOnPlan(page, x, z); await page.mouse.click(point.x, point.y) }
  await expect(page.locator('[data-section-measurement="saved"]')).toHaveText('2,65 m')
  await page.getByLabel('Schnittachse', { exact: true }).selectOption('EW')
  await setRange(page, '#section-position', 5)
  await expect(page.getByRole('img', { name: 'Gebäudeschnitt West–Ost' })).toContainText('3,745 m')
  await page.screenshot({ path: `test-results/${testInfo.project.name}-section-EW.png` })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
test('Oeffnungsgrade: Hebeschiebetuer, Fenster nach innen und neues Dachfenster', async ({ page }, testInfo) => {
  await page.goto('/'); await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.mode)).toBe('orbit')
  await page.locator('.scene-settings summary').click()
  await page.getByLabel('Tür / Fenster', { exact: true }).selectOption('EG-terrace')
  await setRange(page, '#opening-amount', 0)
  const closed = await page.evaluate(() => window.__house!.snapshot().openings.find(opening => opening.id === 'EG-terrace')!)
  await setRange(page, '#opening-amount', 50)
  await expect(page.locator('.opening-state')).toHaveText('50 % geöffnet')
  const half = await page.evaluate(() => window.__house!.snapshot().openings.find(opening => opening.id === 'EG-terrace')!)
  expect(half.tip[0] - closed.tip[0]).toBeCloseTo(.75)
  await setRange(page, '#opening-amount', 100)
  const full = await page.evaluate(() => window.__house!.snapshot().openings.find(opening => opening.id === 'EG-terrace')!)
  expect(full.tip[0] - closed.tip[0]).toBeCloseTo(1.5)
  for (const id of ['EG-kitchen-window', 'EG-wc-window']) {
    await page.getByLabel('Tür / Fenster', { exact: true }).selectOption(id)
    await setRange(page, '#opening-amount', 50)
    const opening = await page.evaluate(id => window.__house!.snapshot().openings.find(opening => opening.id === id)!, id)
    if (id.includes('kitchen')) expect(opening.tip[0]).toBeLessThan(7.135)
    else expect(opening.tip[2]).toBeGreaterThan(.365)
  }
  await page.locator('.scene-settings summary').click()
  await page.screenshot({ path: `test-results/${testInfo.project.name}-kitchen-new.png` })
  const image = PNG.sync.read(await page.locator('canvas').screenshot()), colors = new Set<string>()
  for (let offset = 0; offset < image.data.length; offset += 16) colors.add(`${image.data[offset] >> 4},${image.data[offset + 1] >> 4},${image.data[offset + 2] >> 4}`)
  expect(colors.size).toBeGreaterThan(25)
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__house?.snapshot().site)).toBe(true)
  const skylight = await page.evaluate(() => window.__house!.snapshot().openings.find(opening => opening.id === 'DG-stair-skylight')!)
  expect(skylight.tip[2]).toBeCloseTo(3.5)
  await page.locator('.scene-settings summary').click()
  await page.getByLabel('Tür / Fenster', { exact: true }).selectOption('DG-stair-skylight')
  await setRange(page, '#opening-amount', 50)
  const tilted = await page.evaluate(() => window.__house!.snapshot().openings.find(opening => opening.id === 'DG-stair-skylight')!)
  expect(tilted.tip[1]).toBeLessThan(skylight.tip[1])
  await page.locator('.scene-settings summary').click()
  await page.screenshot({ path: `test-results/${testInfo.project.name}-roof-new.png` })
})