import { describe, expect, it } from 'vitest'
import { area, floorIds, floorSlabs, heightLine, house, interiorWallThickness, makeFloor, rect, roofHeight, roomArea, stair, stairFor, stairGuards, stairSolids, wallSolids } from './model'
import type { Rect } from './model'

const overlapArea = (first: Rect, second: Rect) => Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))

describe('Maßhaltiger Vorentwurf', () => {
  it('setzt Innenwände auf 16 cm und plant ohne Installationsschacht', () => {
    for (const id of floorIds) {
      expect(makeFloor(id).walls.some(wall => wall.id === 'installation')).toBe(false)
      const interior = makeFloor(id).walls.filter(wall => !['west', 'east', 'north', 'south', 'installation'].includes(wall.id))
      expect(interior.length).toBeGreaterThan(0)
      for (const wall of interior) expect(Math.min(wall.width, wall.depth)).toBeCloseTo(interiorWallThickness)
    }
  })
  it('legt das Bad ueber das EG-WC und bietet zwei grosse gleichwertige Kinderzimmer', () => {
    const floor = makeFloor('OG'), bath = floor.rooms.find(room => room.id === 'bath')!, wc = makeFloor('EG').rooms.find(room => room.id === 'wc')!
    for (const part of wc.parts) expect(bath.parts.reduce((sum, upper) => sum + overlapArea(part, upper), 0)).toBeCloseTo(part.width * part.depth)
    const children = floor.rooms.filter(room => room.id.startsWith('child-'))
    expect(Math.abs(roomArea(children[0], 'OG').floor - roomArea(children[1], 'OG').floor)).toBeLessThan(.05)
    for (const child of children) {
      expect(roomArea(child, 'OG').floor).toBeGreaterThanOrEqual(15.3)
      expect(roomArea(child, 'OG').floor).toBeLessThanOrEqual(18)
    }
    const shared = floor.rooms.find(room => room.id === 'multifunction')!
    expect(shared.parts).toHaveLength(1)
    expect(shared.parts[0].width).toBeGreaterThanOrEqual(2)
    expect(shared.parts[0].depth / shared.parts[0].width).toBeLessThan(2.1)
    const access = floor.walls.flatMap(wall => wall.openings).find(opening => opening.id === 'multifunction')!
    expect(access.kind).toBe('passage')
    expect(access.width).toBe(.9)
    const accessWall = floor.walls.find(wall => wall.id === 'shared-west')!
    expect(shared.parts[0].z).toBeCloseTo(accessWall.z + access.start)
    const corridor = rect(4.4, accessWall.z + access.start, .4, access.width)
    expect(floor.rooms.find(room => room.id === 'hall')!.parts.reduce((sum, part) => sum + overlapArea(part, corridor), 0)).toBeCloseTo(area([corridor]))
    expect(shared.parts[0].x).toBeGreaterThan(children[1].parts[0].x + children[1].parts[0].width)
    expect(children[0].parts).toHaveLength(2)
    expect(children[0].parts[0].width).toBeGreaterThan(3.7)
    expect(children[1].parts).toHaveLength(2)
    expect(children[1].parts[0].depth).toBeGreaterThan(2.9)
    expect(children[1].parts[0].width / children[1].parts[0].depth).toBeLessThan(1.6)
    expect(children[1].parts[1].width).toBeGreaterThan(2.1)
    expect(bath.parts).toHaveLength(1)
    expect(bath.parts[0].depth / bath.parts[0].width).toBeLessThan(1.2)
    expect(floor.walls.flatMap(wall => wall.openings).find(opening => opening.id === 'bath')!.swing).toBe('reverse')
    const sharedWindow = floor.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'east-south')!
    const windowStrip = rect(house.east - .01, sharedWindow.start, .01, sharedWindow.width)
    expect(shared.parts.reduce((sum, part) => sum + overlapArea(part, windowStrip), 0)).toBeCloseTo(area([windowStrip]))
    const benchAccess = rect(5.9, 7.2, .7, 1.4)
    for (const item of floor.furniture) {
      expect(overlapArea(benchAccess, item), `Sitzbank-Zugang/${item.id}`).toBeLessThan(.000001)
      expect(overlapArea(rect(4.5, 5.79, 1.8, .6), item), `Gemeinschaftszugang/${item.id}`).toBeLessThan(.000001)
    }
    expect(floor.rooms.some(room => room.id === 'store')).toBe(false)
  })
  it('schliesst niedrige DG-Traufen und verteilt die nutzbare Flaeche auf zwei Zimmer und Flur', () => {
    const floor = makeFloor('DG'), north = heightLine(1.2), south = 10 - north
    expect(floor.rooms.map(room => room.id)).toEqual(['office', 'bedroom', 'hall'])
    const barriers = floor.walls.filter(wall => wall.id.startsWith('knee-'))
    expect(barriers).toHaveLength(2)
    for (const barrier of barriers) {
      expect(barrier.x).toBe(house.west)
      expect(barrier.x + barrier.width).toBeCloseTo(house.east)
      expect(barrier.openings).toHaveLength(0)
    }
    expect(barriers[0].z).toBeCloseTo(north)
    expect(barriers[1].z + barriers[1].depth).toBeCloseTo(south)
    for (const part of [...floor.rooms.flatMap(room => room.parts), ...floor.furniture]) {
      expect(part.z).toBeGreaterThanOrEqual(north + interiorWallThickness - .00001)
      expect(part.z + part.depth).toBeLessThanOrEqual(south - interiorWallThickness + .00001)
    }
    const bedroom = floor.rooms.find(room => room.id === 'bedroom')!, office = floor.rooms.find(room => room.id === 'office')!
    expect(roomArea(bedroom, 'DG').floor).toBeGreaterThan(19.5)
    expect(roomArea(bedroom, 'DG').floor).toBeLessThan(23)
    expect(roomArea(office, 'DG').floor).toBeGreaterThan(16)
    expect(roomArea(bedroom, 'DG').floor).toBeGreaterThan(roomArea(office, 'DG').floor)
    const gable = floor.walls.find(wall => wall.id === 'east')!.openings.find(opening => opening.id === 'gable-office')!
    const windowStrip = rect(house.east - .01, gable.start, .01, gable.width)
    expect(bedroom.parts.reduce((sum, part) => sum + overlapArea(part, windowStrip), 0)).toBeCloseTo(area([windowStrip]), 6)
  })
  it('verwendet Bestandssofa, Ostwandbank und ein tuerhohes Seitenlicht', () => {
    const floor = makeFloor('EG'), sofa = floor.furniture.find(item => item.id === 'sofa')!, chaise = floor.furniture.find(item => item.id === 'sofa-chaise')!
    expect([sofa.width, sofa.depth]).toEqual([.8, 2.5])
    expect(sofa.x + sofa.width - chaise.x).toBeCloseTo(1.7)
    expect(floor.furniture.some(item => item.id === 'larder')).toBe(false)
    const bench = floor.furniture.find(item => item.kind === 'bench')!, table = floor.furniture.find(item => item.id === 'dining')!
    expect(bench.x + bench.width).toBeCloseTo(house.east)
    expect(floor.furniture.filter(item => item.id.startsWith('dining-chair')).every(item => item.x < table.x)).toBe(true)
    const opening = floor.walls.flatMap(wall => wall.openings).find(opening => opening.id === 'entrance-fixed')!
    expect([opening.width, opening.height, opening.sill]).toEqual([.35, 2.1, 0])
  })
  it('bildet einen durchgehenden Lauf mit zwei Viertelwendelungen und gleichmaessigen Steigungen', () => {
    const core = stairFor()
    expect([core.width, core.depth, core.z]).toEqual([2.18, 2.2, 3.6])
    expect(core.end).toBeCloseTo(5.8)
    for (const rise of [2.7, 2.95]) {
      const steps = stairSolids(rise).sort((first, second) => first.bottom + first.height - second.bottom - second.height)
      expect(steps.filter(step => step.id.startsWith('landing'))).toHaveLength(0)
      expect(steps.filter(step => step.id.startsWith('winder'))).toHaveLength(8)
      expect(steps.filter(step => step.id.startsWith('middle'))).toHaveLength(0)
      for (const [index, step] of steps.entries()) {
        expect(step.bottom + step.height).toBeCloseTo((index + 1) * rise / 16)
        expect(step.footprint).toHaveLength(4)
        if (step.id.startsWith('north')) expect(Math.min(step.width, step.depth)).toBeCloseTo(.27)
        if (index > 0) {
          const previous = steps[index - 1]
          const gapX = Math.max(0, step.x - previous.x - previous.width, previous.x - step.x - step.width)
          const gapZ = Math.max(0, step.z - previous.z - previous.depth, previous.z - step.z - step.depth)
          expect(gapX + gapZ).toBeLessThan(.000001)
        }
        for (const slab of floorSlabs('DG')) expect(overlapArea(step, slab)).toBeLessThan(.000001)
      }
      expect(stairGuards(rise)).toHaveLength(15)
      expect(roofHeight(core.z)).toBeGreaterThan(2)
      expect(roofHeight(core.end)).toBeGreaterThan(2)
    }
  })
  for (const id of floorIds) it(`Hauptentwurf ${id}: keine Raum-, Moebel- oder Wandkonflikte am Treppenkern`, () => {
    const floor = makeFloor(id), core = stairFor()
    const walls = floor.walls.flatMap(wall => wallSolids(wall, id === 'DG' ? roofHeight(5) : floor.height))
    for (const room of floor.rooms) for (const part of room.parts) {
      expect(overlapArea(part, core), room.id).toBeLessThan(.000001)
      for (const wall of walls.filter(wall => wall.bottom === 0)) expect(overlapArea(part, wall), `${room.id}/${wall.id}`).toBeLessThan(.000001)
    }
    for (const item of floor.furniture) {
      expect(overlapArea(item, core), item.id).toBeLessThan(.000001)
      for (const wall of walls.filter(wall => wall.bottom < item.height)) expect(overlapArea(item, wall), `${item.id}/${wall.id}`).toBeLessThan(.000001)
    }
    for (const room of floor.rooms) for (const item of floor.furniture) expect(room.spawn[0] > item.x && room.spawn[0] < item.x + item.width && room.spawn[1] > item.z && room.spawn[1] < item.z + item.depth, `${room.id} spawn/${item.id}`).toBe(false)
    if (id === 'OG') for (const room of floor.rooms.filter(room => room.id.startsWith('child-'))) expect(roomArea(room, id).floor).toBeGreaterThan(14)
    if (id === 'KG') {
      expect(floor.rooms.map(room => room.name)).toEqual(['Technik', 'Waschen / Lager', 'Kinderpartyraum', 'Flur'])
      expect(roomArea(floor.rooms[0], id).floor).toBeGreaterThan(11)
      expect(floor.rooms[1].parts).toHaveLength(1)
      expect(floor.rooms[2].parts).toHaveLength(1)
      expect(floor.rooms[2].parts[0].z).toBeCloseTo(core.end + interiorWallThickness)
    }
  })
  it('hält Außenmaß, Treppenloch und Austrittshöhen ein', () => {
    expect(house.width * house.depth).toBe(75)
    expect(area(floorSlabs('OG')) + stair.width * stair.depth).toBeCloseTo(75)
    for (const rise of [2.7, 2.95]) {
      const steps = stairSolids(rise)
      expect(Math.max(...steps.map(step => step.bottom + step.height))).toBeCloseTo(rise * 15 / 16)
      expect(2 * rise / 16 + stair.tread).toBeGreaterThan(.6)
      expect(2 * rise / 16 + stair.tread).toBeLessThan(.65)
      for (const step of steps) {
        const head = Math.min(roofHeight(step.z), roofHeight(step.z + step.depth)) + rise - step.bottom - step.height
        expect(head).toBeGreaterThan(2)
      }
    }
    expect(roofHeight(stair.end + 1)).toBeGreaterThan(2)
  })
  it('berechnet Dachhöhen und Wohnflächen statt Wunschwerte zu beschriften', () => {
    expect(roofHeight(.365)).toBe(.5)
    expect(roofHeight(heightLine(2))).toBeCloseTo(2)
    const sample = { id: 'test', name: '', parts: [rect(1, .365, 1, heightLine(1) - .365)], color: '', note: '', spawn: [1, 1] as [number, number] }
    expect(roomArea(sample, 'DG').living).toBeCloseTo(0)
    sample.parts = [rect(1, heightLine(1), 1, heightLine(2) - heightLine(1))]
    expect(roomArea(sample, 'DG').living).toBeCloseTo(area(sample.parts) / 2)
    expect(roomArea(sample, 'KG').living).toBe(0)
  })
  it('hält DG-Möbel unter dem Dach und mindestens 60 cm am Elternbett frei', () => {
    {
      const floor = makeFloor('DG')
      for (const item of floor.furniture) expect(Math.min(roofHeight(item.z), roofHeight(item.z + item.depth)), item.id).toBeGreaterThan(item.height)
      const bed = floor.furniture.find(item => item.id === 'parents-bed')!
      const bedroom = floor.rooms.find(room => room.id === 'bedroom')!.parts[0]
      expect(Math.min(roofHeight(bed.z - .6), roofHeight(bed.z + bed.depth + .6))).toBeGreaterThan(2)
      expect(bed.x - bedroom.x).toBeGreaterThanOrEqual(.6)
      const chair = floor.furniture.find(item => item.id === 'office-chair')!
      expect(Math.min(roofHeight(chair.z), roofHeight(chair.z + chair.depth))).toBeGreaterThan(2)
      const guest = floor.furniture.find(item => item.id === 'guest-bed')!
      expect([guest.width, guest.depth]).toEqual([1.6, 2])
      expect(floor.furniture.some(item => item.id === 'office-desk')).toBe(true)
      expect(floor.furniture.some(item => item.id === 'office-storage')).toBe(true)
      expect(floor.furniture.some(item => item.id === 'dressing-divider')).toBe(false)
      const access = rect(guest.x, guest.z + guest.depth, guest.width, .6)
      const sideAccess = rect(guest.x - .6, 2.55, .6, guest.z + guest.depth + .6 - 2.55)
      expect(floor.rooms.find(room => room.id === 'office')!.parts.reduce((sum, part) => sum + overlapArea(part, sideAccess), 0)).toBeCloseTo(area([sideAccess]))
      for (const item of floor.furniture) expect(overlapArea(sideAccess, item), `Gaestebett-Seitenzugang/${item.id}`).toBeLessThan(.000001)
      expect(floor.rooms.find(room => room.id === 'office')!.parts.reduce((sum, part) => sum + overlapArea(part, access), 0)).toBeCloseTo(area([access]))
      for (const item of floor.furniture) expect(overlapArea(access, item), `Gaestebett-Zugang/${item.id}`).toBeLessThan(.000001)
      for (const item of floor.furniture) for (const wall of floor.walls) for (const solid of wallSolids(wall, floor.height).filter(solid => solid.bottom < item.height)) {
        const overlap = Math.max(0, Math.min(item.x + item.width, solid.x + solid.width) - Math.max(item.x, solid.x)) * Math.max(0, Math.min(item.z + item.depth, solid.z + solid.depth) - Math.max(item.z, solid.z))
        expect(overlap, `${item.id}/${wall.id}`).toBeLessThan(.000001)
      }
    }
  })
  it('hält im südlichen Kinderzimmer den geöffneten Türflügel vom Bett frei', () => {
    const floor = makeFloor('OG')
    const divider = floor.walls.find(wall => wall.id === 'store-north')!
    const opening = divider.openings.find(opening => opening.id === 'child-south')!
    const bed = floor.furniture.find(item => item.id === 'bed-south')!
    expect(bed.x + bed.width).toBeLessThan(divider.x + opening.start)
  })
  {
    it(`erfüllt Raumziele im Hauptentwurf`, () => {
      const eg = makeFloor('EG'), og = makeFloor('OG')
      const wcArea = roomArea(eg.rooms.find(room => room.id === 'wc')!, 'EG').floor
      expect(wcArea).toBeGreaterThanOrEqual(3)
      expect(wcArea).toBeGreaterThan(4.4)
      expect(wcArea).toBeLessThan(4.9)
      const pantry = eg.rooms.find(room => room.id === 'pantry')!
      expect(roomArea(pantry, 'EG').floor).toBeGreaterThan(1.5)
      expect(roomArea(pantry, 'EG').floor).toBeLessThan(2.1)
      const wc = eg.rooms.find(room => room.id === 'wc')!
      const shower = eg.furniture.find(item => item.id === 'guest-shower')!
      expect([shower.width, shower.depth]).toEqual([.9, .9])
      expect(shower.z).toBeGreaterThan(wc.parts[0].z + wc.parts[0].depth)
      const showerApproach = rect(.6, 1.4, .65, .99)
      expect(wc.parts.reduce((sum, part) => sum + overlapArea(part, showerApproach), 0)).toBeCloseTo(area([showerApproach]))
      for (const item of eg.furniture) expect(overlapArea(showerApproach, item), `Duschnischen-Zugang/${item.id}`).toBeLessThan(.000001)
      expect(pantry.parts[0].z).toBeGreaterThan(2.165)
      expect(pantry.parts[0].z + pantry.parts[0].depth).toBeCloseTo(stair.z - interiorWallThickness)
      expect(eg.walls.flatMap(wall => wall.openings).find(opening => opening.id === 'pantry')!.kind).toBe('passage')
      for (const name of ['child-north', 'child-south']) expect(roomArea(og.rooms.find(room => room.id === name)!, 'OG').floor).toBeGreaterThanOrEqual(14)
      const bath = og.rooms.find(room => room.id === 'bath')!
      expect(roomArea(bath, 'OG').floor).toBeGreaterThan(7)
      expect(roomArea(bath, 'OG').floor).toBeLessThan(9)
      const core = stairFor()
      expect(area(floorSlabs('OG')) + core.width * core.depth).toBeCloseTo(75)
      expect(eg.walls.flatMap(wall => wall.openings).find(opening => opening.id === 'living')!.kind).toBe('passage')
      for (const step of stairSolids(2.95)) expect(Math.min(roofHeight(step.z), roofHeight(step.z + step.depth)) + 2.95 - step.bottom - step.height).toBeGreaterThan(2)
      const sideboard = eg.furniture.find(item => item.id === 'sideboard')!
      expect([sideboard.width, sideboard.depth, sideboard.height]).toEqual([.45, 1.8, .6])
      const shelf = eg.furniture.find(item => item.id === 'bookshelf')!
      expect(shelf.width * shelf.depth).toBeCloseTo(2.12 * .4)
      expect(shelf.height).toBe(2.12)
      const bathItems = og.furniture.filter(item => item.id.startsWith('bath-'))
      for (const [index, first] of bathItems.entries()) for (const second of bathItems.slice(index + 1)) {
        const overlap = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))
        expect(overlap, `${first.id}/${second.id}`).toBe(0)
      }
    })
    for (const id of floorIds) it(`${id}/disjunkte Innenflächen und gültige Öffnungen`, () => {
      const floor = makeFloor(id)
      const parts = floor.rooms.flatMap(room => room.parts)
      for (const [index, first] of parts.entries()) {
        expect(first.width).toBeGreaterThan(0)
        expect(first.depth).toBeGreaterThan(0)
        expect(first.x).toBeGreaterThanOrEqual(house.west)
        expect(first.z).toBeGreaterThanOrEqual(house.north)
        expect(first.x + first.width).toBeLessThanOrEqual(house.east + .001)
        expect(first.z + first.depth).toBeLessThanOrEqual(house.south + .001)
        for (const second of parts.slice(index + 1)) {
          const overlap = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.z + first.depth, second.z + second.depth) - Math.max(first.z, second.z))
          expect(overlap).toBeLessThan(.000001)
        }
      }
      for (const room of floor.rooms) expect(room.parts.some(part => room.spawn[0] >= part.x && room.spawn[0] <= part.x + part.width && room.spawn[1] >= part.z && room.spawn[1] <= part.z + part.depth), `${room.id} spawn`).toBe(true)
      for (const wall of floor.walls) {
        if (wall.id === 'west') expect(wall.openings).toHaveLength(0)
        for (const opening of wall.openings) {
          expect(opening.start).toBeGreaterThanOrEqual(0)
          expect(opening.start + opening.width).toBeLessThanOrEqual((wall.axis === 'x' ? wall.width : wall.depth) + .00001)
        }
        expect(wallSolids(wall, floor.height).every(solid => solid.height > 0)).toBe(true)
      }
    })
  }
})