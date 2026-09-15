import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PNG } from 'pngjs'

test('Hausauswahl zeigt variable BayBO-Flaechen, Grenzueberstaende und exportierbare Masse', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Außenanlagen', exact: true }).click()
  await expect(page.locator('[data-setbacks]')).toHaveCount(0)
  for (const side of ['east', 'west']) {
    await page.locator(`[data-site-object="house-${side}"]`).click()
    const overlay = page.locator(`[data-setbacks="${side}"]`)
    await expect(overlay).toBeAttached()
    await expect(overlay.locator('[data-setback-area]')).toHaveCount(4)
    await expect(overlay.locator('[data-setback-shared]')).toHaveCount(1)
    await expect(overlay.locator('[data-setback-face="gable"]')).toHaveAttribute('data-minimum', '3')
    expect(Number(await overlay.locator('[data-setback-face="gable"]').getAttribute('data-maximum'))).toBeCloseTo(4.172892)
    expect(Number(await overlay.locator('[data-setback-face="north"]').getAttribute('data-maximum'))).toBeCloseTo(3.220615)
    await expect(page.getByRole('region', { name: 'Abstandsflächenberechnung' })).toContainText('Kein Genehmigungsnachweis')
    if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Schließen', exact: true }).click()
    await expect(overlay).toBeAttached()
    await expect(overlay).toContainText('max. 4,173 m')
    const textSize = await overlay.locator('[data-setback-face="gable"] text').evaluate(element => {
      const svg = element as SVGTextElement
      return Number.parseFloat(getComputedStyle(svg).fontSize) * Math.hypot(svg.getScreenCTM()!.a, svg.getScreenCTM()!.b)
    })
    expect(textSize).toBeGreaterThanOrEqual(10.9)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const image = PNG.sync.read(await page.locator('svg.site-plan').screenshot())
    let red = 0, teal = 0
    for (let offset = 0; offset < image.data.length; offset += 4) {
      const [redChannel, greenChannel, blueChannel] = image.data.subarray(offset, offset + 3)
      if (redChannel > greenChannel + 35 && redChannel > blueChannel + 30) red++
      if (greenChannel > redChannel + 25 && blueChannel > redChannel + 25) teal++
    }
    expect(red).toBeGreaterThan(20)
    expect(teal).toBeGreaterThan(20)
    await page.screenshot({ path: `test-results/${testInfo.project.name}-setbacks-${side}.png` })
  }
  await page.getByRole('button', { name: 'Bemaßung', exact: true }).click()
  await expect(page.locator('[data-setbacks] .site-dimension')).toHaveCount(0)
  await expect(page.locator('[data-setback-area]')).toHaveCount(4)
  await page.getByRole('button', { name: 'Bemaßung', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Plan herunterladen' }).click()
  const download = await downloadPromise
  const svg = await readFile((await download.path())!, 'utf8')
  expect(svg).toContain('data-setbacks="west"')
  expect(svg).toContain('setback-outside')
  expect(svg).toContain('kein Genehmigungsnachweis')
  await page.locator('[data-site-object="carport-east"]').click()
  await expect(page.locator('[data-setbacks]')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Abstandsflächenberechnung' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Hausmasse und Hoehen aendern Polygon und Tiefen ohne feste Planwerte', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { houseSetbacks, currentSetbackParameters } = await import('/src/setbacks.ts')
    const parameters = currentSetbackParameters()
    const original = houseSetbacks('east', parameters)
    const changed = houseSetbacks('east', { ...parameters, width: parameters.width + 2, depth: parameters.depth + 2, attic: parameters.attic + 1 })
    return { original: original.faces[2], changed: changed.faces[2] }
  })
  expect(result.changed.maximum).toBeGreaterThan(result.original.maximum + .4)
  expect(result.changed.wall[0][0] - result.original.wall[0][0]).toBeCloseTo(2)
  expect(result.changed.wall.at(-1)![1] - result.original.wall.at(-1)![1]).toBeCloseTo(2)
})