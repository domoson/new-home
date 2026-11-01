import { describe, expect, it } from 'vitest'
import { floorIds, makeFloor, rect } from './model'
import type { Wall } from './model'
import { openingDimensions, openingLabels } from './openingDimensions'

describe('opening dimension chain', () => {
  it('beschriftet Fenster und die komplette Hebeschiebeanlage mit Modellmassen', () => {
    for (const id of floorIds) {
      const floor = makeFloor(id), labels = openingLabels(floor)
      for (const wall of floor.walls) for (const opening of wall.openings.filter(opening => opening.kind === 'window' && opening.id !== 'garden-fixed')) expect(labels.some(label => label.id === opening.id && label.size.endsWith(' cm'))).toBe(true)
    }
    expect(openingLabels(makeFloor('EG')).find(label => label.id === 'terrace')).toMatchObject({ title: 'Hebeschiebet\u00fcr', size: '280 \u00d7 250 cm', detail: 'Fl\u00fcgel 125 + Festfeld 155 cm' })
    expect(openingLabels(makeFloor('EG')).some(label => label.id === 'garden-fixed')).toBe(false)
    const skylights = openingLabels(makeFloor('DG')).filter(label => label.id.includes('skylight'))
    expect(skylights).toHaveLength(2)
    expect(skylights.every(label => label.size === '94 \u00d7 140 cm')).toBe(true)
  })
  it('describes actual opening leaves, fixed fields, fixed lower lights and top-hung/pivot skylights', () => {
    const ground = openingLabels(makeFloor('EG'))
    expect(ground.find(label => label.id === 'wc-window')).toMatchObject({ size: '60 \u00d7 100 cm', execution: ['1 \u00d6ffnungsfl\u00fcgel'] })
    expect(ground.find(label => label.id === 'wc-window')!.x).toBeCloseTo(.9)
    expect(ground.find(label => label.id === 'hall-window-fixed')).toMatchObject({ title: 'Festverglasung', size: '180 \u00d7 50 cm', execution: ['nicht \u00f6ffenbar'] })
    expect(ground.find(label => label.id === 'hall-window-fixed')!.x).toBeCloseTo(4.8)
    expect(ground.find(label => label.id === 'kitchen-east-window')).toMatchObject({ size: '210 \u00d7 100 cm', execution: ['1 \u00d6ffnungsfl\u00fcgel + Festfeld'] })
    expect(ground.find(label => label.id === 'garden-west-fixed')).toMatchObject({ title: 'Festverglasung', size: '120 \u00d7 250 cm', execution: ['nicht \u00f6ffenbar'] })
    expect(openingLabels(makeFloor('OG')).find(label => label.id === 'south-west')!.execution).toEqual(['1 \u00d6ffnungsfl\u00fcgel', 'Unterlicht fest bis 90 cm'])
    expect(openingLabels(makeFloor('OG')).find(label => label.id === 'bath-window')).toMatchObject({ size: '180 \u00d7 100 cm', execution: ['1 \u00d6ffnungsfl\u00fcgel + Festfeld'] })
    expect(openingLabels(makeFloor('OG')).find(label => label.id === 'bath-window')!.x).toBeCloseTo(2.1)
    expect(ground.find(label => label.id === 'living-corner-fixed')!.execution).toEqual(['nicht \u00f6ffenbar'])
    expect(ground.find(label => label.id === 'terrace')!.execution).toEqual(['1 Schiebefl\u00fcgel + Festfeld'])
    expect(openingLabels(makeFloor('DG')).filter(label => label.id.includes('skylight')).every(label => label.execution[0] === 'Klapp-/Schwingfenster')).toBe(true)
    const floor = makeFloor('KG')
    const opening = floor.walls.find(wall => wall.id === 'north')!.openings[0]
    opening.windowLayout = { columns: 2 }
    expect(openingLabels(floor).find(label => label.id === opening.id)!.execution).toEqual(['2 \u00d6ffnungsfl\u00fcgel'])
  })
  it('sorts openings and includes both corners and every pier', () => {
    const wall: Wall = { ...rect(0, 0, 5, .3), id: 'north', axis: 'x', openings: [
      { id: 'door', start: 3, width: 1, height: 2.1, sill: 0, kind: 'door' },
      { id: 'window', start: .5, width: 1.5, height: 1.2, sill: .9, kind: 'window' },
    ] }
    expect(openingDimensions(wall)).toEqual([
      { start: 0, end: .5, kind: 'pier' },
      { start: .5, end: 2, kind: 'opening' },
      { start: 2, end: 3, kind: 'pier' },
      { start: 3, end: 4, kind: 'opening' },
      { start: 4, end: 5, kind: 'pier' },
    ])
  })

  it('covers every exterior wall without gaps on all floors', () => {
    for (const floorId of floorIds) for (const wall of makeFloor(floorId).walls.filter(wall => ['north', 'east', 'south', 'west'].includes(wall.id))) {
      const segments = openingDimensions(wall)
      const length = wall.axis === 'x' ? wall.width : wall.depth
      expect(segments[0].start).toBe(0)
      expect(segments.at(-1)!.end).toBeCloseTo(length)
      expect(segments.reduce((sum, segment) => sum + segment.end - segment.start, 0)).toBeCloseTo(length)
      for (let index = 1; index < segments.length; index++) expect(segments[index].start).toBeCloseTo(segments[index - 1].end)
    }
  })
})