import { expect, test } from '@playwright/test'

test('Wandoeffnungen bilden eine schaltbare zweite Masskette', async ({ page }) => {
  await page.goto('/')
  for (const floor of ['KG', 'EG', 'OG', 'DG']) {
    await page.getByRole('button', { name: floor, exact: true }).click()
    const expected = await page.evaluate(async floorId => {
      const { makeFloor } = await import('/src/model.ts')
      const { openingDimensions } = await import('/src/openingDimensions.ts')
      return Object.fromEntries(makeFloor(floorId).walls.filter(wall => wall.openings.length && ['north', 'east', 'south', 'west'].includes(wall.id)).map(wall => [wall.id, openingDimensions(wall).map(segment => ({ kind: segment.kind, width: (segment.end - segment.start).toFixed(2), height: segment.kind === 'opening' ? segment.height.toFixed(2) : null }))]))
    }, floor)
    for (const [side, segments] of Object.entries(expected)) {
      const chain = page.locator(`[data-opening-dimensions="${side}"]`)
      await expect(chain.locator('[data-dimension-tick]')).toHaveCount(segments.length + 1)
      await expect(chain.locator('[data-dimension-segment]')).toHaveCount(segments.length)
      for (const [index, segment] of segments.entries()) {
        const label = chain.locator('[data-dimension-segment]').nth(index)
        await expect(label).toHaveAttribute('data-dimension-segment', segment.kind)
        await expect(label.locator('text').first()).toHaveText(segment.width)
        if (segment.height) await expect(label.locator('text').nth(1)).toHaveText(segment.height)
      }
    }
  }
  await page.getByRole('button', { name: 'Bemaßung' }).click()
  await expect(page.locator('[data-opening-dimensions]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bemaßung' }).click()
  await expect(page.locator('[data-opening-dimensions]')).toHaveCount(1)
})