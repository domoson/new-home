import { expect, test } from '@playwright/test'

test('Wolf-Gesamtplansatz 13.11.2026: 2D Grundrisse, Schnitt, Fenstereditor und 3D Darstellung', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/')
  await expect(page.locator('.variant-label')).toContainText('7,10 × 10,70 m')
  await expect(page.locator('.level-metrics')).toContainText('56,2')
  await expect(page.locator('.level-metrics')).toContainText('2,55')

  await page.getByRole('button', { name: 'KG', exact: true }).click()
  await expect(page.locator('.variant-label')).toContainText('7,04 × 10,64 m · Vollkeller')
  await expect(page.locator('[data-light-well="true"]')).toHaveCount(3)
  await expect(page.locator('[data-unexcavated-area="true"]')).toHaveCount(0)

  await page.getByRole('button', { name: 'OG', exact: true }).click()
  await expect(page.locator('.level-metrics')).toContainText('54,7')
  await expect(page.locator('.level-metrics')).toContainText('2,54')

  await page.getByRole('button', { name: 'DG', exact: true }).click()
  await expect(page.locator('.level-metrics')).toContainText('43,8')
  await expect(page.locator('[data-roof-window]')).toHaveCount(2)
  await expect(page.locator('[data-closed-eaves="true"]')).toHaveCount(2)

  await page.getByRole('button', { name: 'Querschnitt' }).click()
  await expect(page.locator('.section-view')).toContainText('Kniestock 0,20 m')
  await expect(page.locator('.section-view')).toContainText('DV 0,10 m')
  await expect(page.locator('.section-view')).toContainText('10,628 m')

  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible({ timeout: 45000 })
  await page.getByRole('button', { name: 'Dach', exact: true }).click()
  await page.getByRole('button', { name: 'Fenstermodus' }).click()
  await expect(page.getByRole('region', { name: 'Fenster bearbeiten' })).toBeVisible()
  await page.getByLabel('Fenster auswählen').selectOption('EG-kitchen-east-window')
  await expect(page.locator('.scene-design-error')).toHaveCount(0)

  expect(errors).toEqual([])
})
