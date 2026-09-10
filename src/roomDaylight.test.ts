import { expect, test } from 'vitest'
import { roomDaylight } from './roomDaylight'

test('Window-driven daylight distinguishes living rooms, rooflights and basement light wells', () => {
  const ground = roomDaylight('EG')
  expect(ground.find(room => room.id === 'EG-living')!.strength).toBeGreaterThan(.8)
  expect(ground.find(room => room.id === 'EG-wc')!.strength).toBeGreaterThan(.3)
  expect(ground.find(room => room.id === 'EG-pantry')!.strength).toBe(0)
  expect(roomDaylight('DG').filter(room => room.id !== 'DG-hall').every(room => room.glazing > 0)).toBe(true)
  expect(roomDaylight('DG').find(room => room.id === 'DG-hall')!.glazing).toBe(0)
  expect(roomDaylight('KG').find(room => room.id === 'KG-bath')!.strength).toBeLessThan(.08)
  for (const floor of ['KG', 'EG', 'OG', 'DG'] as const) for (const room of roomDaylight(floor)) {
    expect(Number.isFinite(room.center.x + room.center.y + room.strength)).toBe(true)
  }
})