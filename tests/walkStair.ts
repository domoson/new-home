import type { Page } from '@playwright/test'
import { stairWalkingLine } from '../src/winderStair'

export async function walkStair(page: Page, base: number, rise: number, sign = 1, descending = false) {
  const route = stairWalkingLine(rise).map(([east, height, south]) => ({ x: sign * east, y: base + height, z: south + (sign === -1 ? 1.2 : 0) }))
  if (descending) route.reverse()
  const start = route[0]
  await page.evaluate(start => window.__house!.teleport(start.x, start.y, start.z), start)
  for (const target of route.slice(1)) {
    await page.evaluate(target => { const position = window.__house!.position(); window.__house!.look(Math.atan2(position.x - target.x, position.z - target.z)) }, target)
    await page.keyboard.down('KeyW')
    try {
      await page.waitForFunction(target => { const position = window.__house!.position(); window.__house!.look(Math.atan2(position.x - target.x, position.z - target.z)); return Math.hypot(position.x - target.x, position.z - target.z) < .06 }, target, { timeout: 15000, polling: 'raf' })
    } catch (error) {
      throw new Error(`Stair target ${JSON.stringify(target)}, actual ${JSON.stringify(await page.evaluate(() => window.__house!.position()))}`, { cause: error })
    } finally { await page.keyboard.up('KeyW') }
  }
}