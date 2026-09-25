import { expect, test } from '@playwright/test'

const view = async (page: import('@playwright/test').Page) => page.locator('svg.floor-plan').evaluate(svg => {
  const box = svg.viewBox.baseVal
  return { x: box.x, y: box.y, width: box.width, height: box.height }
})

test('2D views pan at default zoom without losing selection or measurements', async ({ page }) => {
  await page.goto('/')
  const plan = page.locator('svg.floor-plan')
  const start = await view(page)
  const point = await plan.evaluate(svg => { const screen = new DOMPoint(5, 8).matrixTransform(svg.getScreenCTM()!); return { x: screen.x, y: screen.y } })
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + 45, point.y + 30, { steps: 5 })
  await page.mouse.up()
  expect((await view(page)).x).toBeLessThan(start.x - .1)
  await expect(page.getByRole('button', { name: /Wohnen \/ Kochen \/ Essen/ }).first()).toHaveAttribute('aria-pressed', 'true')
  const bath = await plan.evaluate(svg => { const screen = new DOMPoint(1, 1).matrixTransform(svg.getScreenCTM()!); return { x: screen.x, y: screen.y } })
  await page.mouse.click(bath.x, bath.y)
  await expect(page.getByRole('button', { name: /Gästebad/ }).first()).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Maßband', exact: true }).click()
  for (const coordinate of [[.4, .365], [6.635, .365]]) {
    const screen = await plan.evaluate((svg, point) => { const position = new DOMPoint(point[0], point[1]).matrixTransform(svg.getScreenCTM()!); return { x: position.x, y: position.y } }, coordinate)
    await page.mouse.click(screen.x, screen.y)
  }
  await expect(page.locator('[data-measurement="saved"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Querschnitt' }).click()
  const section = await view(page)
  const bounds = await plan.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 40, bounds!.y + bounds!.height / 2 + 20, { steps: 4 })
  await page.mouse.up()
  expect((await view(page)).x).toBeLessThan(section.x - .1)
  await page.getByRole('button', { name: 'Maßband im Schnitt' }).click()
  for (const coordinate of [[8, 0], [8, -2.65]]) {
    const screen = await plan.evaluate((svg, point) => { const position = new DOMPoint(point[0], point[1]).matrixTransform(svg.getScreenCTM()!); return { x: position.x, y: position.y } }, coordinate)
    await page.mouse.click(screen.x, screen.y)
  }
  await expect(page.locator('[data-section-measurement="saved"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Außenanlagen' }).click()
  const exterior = await view(page)
  const site = await plan.boundingBox()
  await page.mouse.move(site!.x + site!.width / 2, site!.y + site!.height / 2)
  await page.mouse.down()
  await page.mouse.move(site!.x + site!.width / 2 + 40, site!.y + site!.height / 2 + 20, { steps: 4 })
  await page.mouse.up()
  expect((await view(page)).x).toBeLessThan(exterior.x - .1)
  await page.locator('[data-site-object="house-east"]').click()
  await expect(page.locator('[data-site-object="house-east"] polygon')).toHaveAttribute('stroke', '#247d7a')
})

test('two fingers zoom around their midpoint in each 2D view', async ({ page, browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile' || browserName !== 'chromium')
  await page.goto('/')
  const client = await page.context().newCDPSession(page)
  for (const mode of ['floor', 'section', 'site']) {
    if (mode === 'section') await page.getByRole('button', { name: 'Querschnitt' }).click()
    if (mode === 'site') await page.getByRole('button', { name: 'Außenanlagen' }).click()
    const svg = page.locator('svg.floor-plan')
    const box = await svg.boundingBox()
    const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2
    const before = await view(page)
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] })
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 35, y: y + 20, id: 0 }] })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(async () => (await view(page)).x).toBeLessThan(before.x - .1)
    const panned = await view(page)
    const anchor = await svg.evaluate((element, point) => {
      const plan = new DOMPoint(point.x, point.y).matrixTransform(element.getScreenCTM()!.inverse())
      return { x: plan.x, y: plan.y }
    }, { x, y })
    const touch = (left: number, right: number) => [{ x: x + left, y, id: 0 }, { x: x + right, y, id: 1 }]
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(-25, 25) })
    for (const spread of [35, 45, 55]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(-spread + 12, spread + 12) })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(async () => (await view(page)).width).toBeLessThan(panned.width * .8)
    const after = await svg.evaluate((element, point) => {
      const screen = new DOMPoint(point.x, point.y).matrixTransform(element.getScreenCTM()!)
      return { x: screen.x, y: screen.y }
    }, anchor)
    expect(Math.hypot(after.x - x - 12, after.y - y)).toBeLessThan(3)
  }
  await client.detach()
})