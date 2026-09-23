import { describe, expect, it } from 'vitest'
import { floorIds, furnitureVolumes, makeFloor, standardDoor } from './model'

describe('Detailkorrekturen der 6,9-m-Variante', () => {
  it('führt fünf Hochschränke bis zur Decke und setzt den Backofen in das dritte Modul', () => {
    const floor = makeFloor('EG')
    const towers = floor.furniture.filter(item => item.id === 'fridge' || item.id.startsWith('kitchen-tall'))
    expect(towers).toHaveLength(5)
    for (const item of towers) expect(item.height).toBe(floor.height)
    expect(towers.find(item => item.id === 'kitchen-tall')!.x).toBeCloseTo(3.45 + 2 * .63)
  })
  it('hält alle Küchengeräte in der Küche und öffnet die rechte Arbeitsnische wirklich', () => {
    const furniture = makeFloor('EG').furniture
    for (const id of ['espresso', 'toaster', 'sodastream', 'cookit']) expect(furniture.find(item => item.id === id)!.z).toBeGreaterThanOrEqual(2.5)
    const corner = furniture.find(item => item.id === 'kitchen-tall-storage-3')!
    expect(corner.niche).toEqual({ bottom: .92, height: .6 })
    expect(furnitureVolumes(corner).some(part => part.x < 6.3 && part.x + part.width > 6.3 && part.z < 2.8 && part.z + part.depth > 2.8 && part.bottom < 1.2 && part.bottom + part.height > 1.2)).toBe(false)
    expect(furniture.find(item => item.id === 'toaster')!.x).toBeGreaterThan(6)
    expect(furniture.find(item => item.id === 'sodastream')!.z).toBeLessThan(furniture.find(item => item.id === 'kitchen-sink')!.z)
  })
  it('lässt 35 cm seitlichen und 40 cm südlichen Beinraum unter der Halbinsel', () => {
    const island = makeFloor('EG').furniture.find(item => item.id === 'peninsula')!
    const [base, top] = furnitureVolumes(island)
    expect(base.x - top.x).toBeCloseTo(.35)
    expect(top.z + top.depth - base.z - base.depth).toBeCloseTo(.4)
    expect(base.height).toBeCloseTo(.89)
    expect(top.height).toBeCloseTo(.03)
  })
  it('begrenzt die Fliesen vor dem Bad und ersetzt Dielengeräte durch deckenhohe Garderoben', () => {
    const floor = makeFloor('EG'), entry = floor.rooms.find(room => room.id === 'entry')!
    expect(entry.tileParts!.every(part => part.x >= 3.3)).toBe(true)
    expect(floor.furniture.some(item => item.id === 'hall-counter')).toBe(false)
    for (const id of ['wardrobe', 'cleaning-storage']) expect(floor.furniture.find(item => item.id === id)!.height).toBe(floor.height)
    const hooks = floor.furniture.find(item => item.id === 'entry-coats')!
    expect(hooks).toMatchObject({ kind: 'coat-rack', x: 3.45, z: .3, width: 2.1, depth: .1, bottom: 1.5 })
    const wardrobe = floor.furniture.find(item => item.id === 'wardrobe')!
    expect(wardrobe).toMatchObject({ x: 3.45, width: 2.1, depth: .6, front: 'north' })
    expect(6.6 - wardrobe.x - wardrobe.width).toBeCloseTo(1.05)
    expect(floor.furniture.find(item => item.id === 'cleaning-storage')).toMatchObject({ x: 1.4, z: 1.975, width: .875, front: 'east' })
    expect(floor.walls.find(wall => wall.id === 'north')!.openings.some(opening => opening.id === 'kitchen-window')).toBe(false)
  })
  it('verwendet Zargenaußenmaße für alle normalen Türen und ergänzt den Kellerabschluss', () => {
    for (const id of floorIds) for (const door of makeFloor(id).walls.flatMap(wall => wall.openings).filter(opening => opening.kind === 'door' && opening.id !== 'terrace' && opening.height >= 2)) expect(door).toMatchObject(standardDoor)
    expect(makeFloor('EG').walls.find(wall => wall.id === 'basement-entry')!.openings[0].id).toBe('basement-stair')
    expect(makeFloor('DG').walls.find(wall => wall.id === 'store-east')!.openings[0]).toMatchObject({ width: .73, height: 1.6 })
  })
  it('entfernt nur die Querleisten bodentiefer EG-Fenster und richtet die Sitzmöbel aus', () => {
    const floor = makeFloor('EG')
    for (const window of floor.walls.flatMap(wall => wall.openings).filter(opening => opening.kind === 'window' && opening.sill === 0)) expect(window.windowLayout?.lowerFixed).toBeUndefined()
    expect(floor.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'kitchen-east-window')!.sill).toBe(1.05)
    expect(floor.furniture.find(item => item.id === 'sofa')).toMatchObject({ width: 2.5, depth: .8, angle: Math.PI })
    for (const chair of floor.furniture.filter(item => item.id.startsWith('dining-chair'))) expect(chair.angle).toBe(-Math.PI / 2)
    for (const stool of floor.furniture.filter(item => item.id.startsWith('kitchen-stool'))) expect(stool.seatHeight).toBe(.65)
  })
})