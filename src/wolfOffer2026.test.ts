import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { atticCeiling, basement, basementEastSetback, basementEnvelope, construction, elevations, floorIds, frostSkirts, house, houseEnvelope, housePlacement, lightWells, makeFloor, ridgeElevations, roofEdgeDetail, roofWindows, roomArea, slabThickness, stair, storeyRise, wallSolids } from './model'
import { offeredAreas } from './providerPlan'
import { raffstores } from './raffstore'
import { editableWindow, windowDraft, windowEditError } from './windowEdits'
import { windowPanels } from './windowLayout'
import { stairWalkingLine } from './winderStair'
import { buildScene } from './scene'
import { createWalker, initializePhysics } from './walk'

describe('Wolf-Planung 13.11.2026', () => {
  it('matches envelope, full basement, clear heights, slabs, roof and 16-riser stair', () => {
    expect(houseEnvelope()).toEqual({ x: 0, z: 0, width: 7.1, depth: 10.7 })
    expect(basementEnvelope()).toEqual({ x: .03, z: .03, width: 7.04, depth: 10.64 })
    expect(basementEastSetback).toBe(0)
    expect(frostSkirts()).toEqual([])
    expect(basement.east - basement.west).toBeCloseTo(6.44, 4)
    expect(basement.south - basement.north).toBeCloseTo(10.04, 4)
    expect(house.east - house.west).toBeCloseTo(6.405, 4)
    expect(house.south - house.north).toBeCloseTo(10.005, 4)
    expect(construction.southWallEG).toBe(.39)

    expect(elevations).toEqual({ KG: -2.89, EG: 0, OG: 2.98, DG: 5.96 })
    expect(floorIds.map(id => makeFloor(id).height)).toEqual([2.53, 2.55, 2.54, 2.535])
    expect(floorIds.map(slabThickness)).toEqual([.41, .36, .43, .44])
    expect([storeyRise('KG'), storeyRise('EG'), storeyRise('OG')]).toEqual([2.89, 2.98, 2.98])
    expect(atticCeiling).toEqual({ height: 2.535, thickness: .36 })
    expect([house.pitch, house.knee]).toEqual([35, .275])
    expect([roofEdgeDetail.vergeOverhang, roofEdgeDetail.eavesOverhang]).toEqual([.1, .1])
    expect(ridgeElevations.outside - construction.terrain).toBeCloseTo(10.63, 2)

    expect([stair.width, stair.depth, stair.risers]).toEqual([2.12, 2.21, 16])
    expect([stair.z, stair.end]).toEqual([3.965, 6.175])
  })

  it('matches Wolf room stamps across KG, EG, OG and DG within 0.1 m²', () => {
    for (const id of floorIds) {
      const floor = makeFloor(id)
      const stamps = offeredAreas[id]
      expect(floor.rooms.map(room => room.id).sort()).toEqual(Object.keys(stamps).sort())
      for (const room of floor.rooms) {
        const actual = roomArea(room, id)
        expect(actual.floor, `${id}-${room.id}`).toBeCloseTo(stamps[room.id][0], 1)
      }
    }
  })

  it('places all 17 facade openings, 2 skylights, 3 light wells and sunshades without edit errors', () => {
    expect(lightWells).toHaveLength(3)
    expect(roofWindows.map(window => [window.width, window.length])).toEqual([[.94, 1.18], [.94, 1.18]])

    const blinds = floorIds.flatMap(id => raffstores(makeFloor(id)))
    expect(blinds.filter(blind => blind.kind === 'raffstore').map(blind => blind.id)).toEqual(['EG-garden-west-fixed', 'EG-terrace'])
    expect(blinds.filter(blind => blind.kind === 'roller')).toHaveLength(11)

    const egEast = makeFloor('EG').walls.find(wall => wall.id === 'east')!
    const kitchenWindow = egEast.openings.find(opening => opening.id === 'kitchen-east-window')!
    const panels = windowPanels(kitchenWindow)
    expect(panels.filter(panel => !panel.fixed)).toHaveLength(2)
    expect(panels.filter(panel => panel.fixed)).toHaveLength(1)

    for (const id of ['OG', 'DG'] as const) {
      for (const wall of makeFloor(id).walls) {
        for (const opening of wall.openings.filter(entry => entry.kind === 'window')) {
          expect(windowPanels(opening).filter(panel => !panel.fixed), `${id}-${opening.id}`).toHaveLength(1)
        }
      }
    }

    for (const side of ['east', 'west'] as const) {
      for (const id of floorIds) {
        const floor = makeFloor(id, side)
        for (const wall of floor.walls) {
          for (const opening of wall.openings.filter(entry => editableWindow(floor, wall, entry))) {
            expect(windowEditError(floor, wall, { ...opening, ...windowDraft(opening) }), `${side}-${id}-${opening.id}`).toBe('')
          }
        }
      }
    }
  })

  it('keeps furniture clear of structural walls and climbs all 3 stair flights in Rapier physics', async () => {
    for (const id of floorIds) {
      const floor = makeFloor(id)
      const solids = floor.walls.flatMap(wall => wallSolids(wall, floor.height))
      for (const item of floor.furniture) {
        for (const solid of solids) {
          const overlapX = Math.min(item.x + item.width, solid.x + solid.width) - Math.max(item.x, solid.x)
          const overlapZ = Math.min(item.z + item.depth, solid.z + solid.depth) - Math.max(item.z, solid.z)
          const bottom = item.bottom ?? 0
          const overlapY = Math.min(bottom + item.height, solid.bottom + solid.height) - Math.max(bottom, solid.bottom)
          if (overlapX > .005 && overlapZ > .005 && overlapY > .005) {
            throw new Error(`Furniture ${id}-${item.id} overlaps wall ${solid.id}`)
          }
        }
      }
    }

    await initializePhysics()
    if (!('document' in globalThis)) {
      const gradient = { addColorStop() {} }
      const context = new Proxy({}, {
        get: (_target, prop) => prop === 'createLinearGradient' || prop === 'createRadialGradient'
          ? () => gradient
          : prop === 'createImageData'
            ? (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) })
            : prop === 'getImageData'
              ? () => ({ data: new Uint8ClampedArray(4) })
              : () => {},
      })
      Object.assign(globalThis, { document: { createElement: () => ({ width: 0, height: 0, getContext: () => context }) } })
    }
    const model = buildScene('EG', true, true, true, false)
    model.group.updateMatrixWorld(true)
    const eastHouse = model.group.getObjectByName('house-east')!
    for (const wallName of ['DG-wall-east', 'DG-wall-west', 'DG-wall-north', 'DG-wall-south']) {
      const meshes: THREE.Mesh[] = []
      eastHouse.traverse(object => {
        if (object instanceof THREE.Mesh && object.name === wallName) meshes.push(object)
      })
      expect(meshes.length, wallName).toBeGreaterThan(0)
      if (wallName === 'DG-wall-east' || wallName === 'DG-wall-west') {
        const bounds = new THREE.Box3()
        for (const mesh of meshes) bounds.expandByObject(mesh)
        expect(bounds.min.z, `${wallName} north extent`).toBeCloseTo(housePlacement.z, 2)
        expect(bounds.max.z, `${wallName} south extent`).toBeCloseTo(housePlacement.z + house.depth, 2)
      }
    }
    const camera = new THREE.PerspectiveCamera(65, 16 / 9, .05, 250)
    const walker = createWalker(model, camera, new THREE.Vector3(3.6 + housePlacement.x, 0, 7.3 + housePlacement.z))
    try {
      for (const door of model.doors) expect(model.setOpening(door.id, 1)).toBe(true)
      for (const door of model.doors) expect(model.setOpening(door.id, 0)).toBe(true)
      walker.setOpening('EG-basement-stair', 1)

      for (const id of floorIds) {
        const floor = makeFloor(id)
        for (const room of floor.rooms) {
          walker.teleport(new THREE.Vector3(room.spawn[0] + housePlacement.x, floor.elevation, room.spawn[1] + housePlacement.z))
          for (let step = 0; step < 15; step++) walker.tick()
          expect(Math.abs(walker.position().y - (floor.elevation + .875)), `spawn ${id}-${room.id}`).toBeLessThan(.12)
        }
      }

      const followStair = (fromFloor: 'KG' | 'EG' | 'OG', upward: boolean) => {
        const rise = storeyRise(fromFloor), base = elevations[fromFloor]
        const waypoints = (upward ? stairWalkingLine(rise) : [...stairWalkingLine(rise)].reverse()).map(([east, height, south]) => new THREE.Vector3(east + housePlacement.x, base + height, south + housePlacement.z))
        walker.teleport(waypoints[0])
        for (const target of waypoints.slice(1)) {
          let frames = 0
          while (Math.hypot(walker.position().x - target.x, walker.position().z - target.z) > .045 && frames++ < 240) {
            camera.lookAt(target.x, camera.position.y, target.z)
            camera.updateMatrixWorld(true)
            walker.keys.add('KeyW')
            walker.tick()
            walker.keys.clear()
          }
          expect(frames, `${fromFloor} ${upward ? 'up' : 'down'} at (${target.x.toFixed(2)}, ${target.z.toFixed(2)}) stuck=(${walker.position().x.toFixed(3)}, ${walker.position().y.toFixed(3)}, ${walker.position().z.toFixed(3)})`).toBeLessThan(240)
        }
        for (let frame = 0; frame < 20; frame++) walker.tick()
        const expectedElevation = upward ? base + rise : base
        expect(Math.abs(walker.position().y - .9 - expectedElevation), `${fromFloor} ${upward ? 'up' : 'down'}`).toBeLessThan(.12)
      }

      followStair('EG', true)
      followStair('OG', true)
      followStair('KG', true)
      followStair('OG', false)
      followStair('EG', false)
      followStair('KG', false)
    } finally {
      walker.dispose()
      model.dispose()
    }
  })
})
