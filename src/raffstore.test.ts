import { describe, expect, it } from 'vitest'
import { house, makeFloor, roofHeight, wallSolids } from './model'
import { raffstoreDetail, raffstores } from './raffstore'
import * as THREE from 'three'
import { createRaffstore } from './raffstoreScene'

describe('Raffstoredetails', () => {
  it('stacks lamellas inside the housing and lowers the rail to the sill', () => {
    const floor = makeFloor('OG'), material = new THREE.MeshStandardMaterial()
    const blind = raffstores(floor).find(blind => blind.id === 'OG-play-window')!
    const rendered = createRaffstore(blind, floor.elevation, material, material)
    const blades = rendered.group.getObjectByName(`${blind.id}-raffstore-lamellas`)!
    const raised = new THREE.Box3().setFromObject(blades)
    expect(raised.min.y).toBeGreaterThan(floor.elevation + blind.box.bottom)
    expect(raised.max.y).toBeLessThan(floor.elevation + blind.box.bottom + blind.box.height)
    rendered.set(1, 75)
    const lowered = new THREE.Box3().setFromObject(blades)
    expect(lowered.min.y).toBeGreaterThanOrEqual(floor.elevation + blind.sill)
    expect(lowered.max.y).toBeLessThanOrEqual(floor.elevation + blind.sill + blind.height)
    const rail = new THREE.Box3().setFromObject(rendered.group.getObjectByName(`${blind.id}-raffstore-bottom-rail`)!)
    expect(rail.min.y).toBeCloseTo(floor.elevation + blind.sill)
    expect(lowered.min.x).toBeGreaterThan(house.east + .15 + .03)
    rendered.dispose(); rendered.group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() }); material.dispose()
  })
  it('fits recessed boxes above the glazing without changing clear opening heights', () => {
    for (const id of ['EG', 'OG', 'DG'] as const) {
      const floor = makeFloor(id)
      for (const blind of raffstores(floor)) {
        expect(blind.box.bottom).toBeCloseTo(blind.sill + blind.height)
        expect(blind.box.bottom + blind.box.height).toBeLessThanOrEqual(floor.height)
        if (id === 'DG') for (const south of [blind.box.z, blind.box.z + blind.box.depth]) expect(blind.box.bottom + blind.box.height).toBeLessThan(roofHeight(south))
        for (const wall of floor.walls) for (const solid of wallSolids(wall, floor.height)) {
          const overlap = Math.min(solid.x + solid.width, blind.box.x + blind.box.width) - Math.max(solid.x, blind.box.x) > .00001 && Math.min(solid.z + solid.depth, blind.box.z + blind.box.depth) - Math.max(solid.z, blind.box.z) > .00001 && Math.min(solid.bottom + solid.height, blind.box.bottom + blind.box.height) - Math.max(solid.bottom, blind.box.bottom) > .00001
          expect(overlap, `${id}/${wall.id}/${blind.id}`).toBe(false)
        }
      }
    }
  })
  it('uses one south curtain over the slider and fixed pane with a shared corner guide', () => {
    const blinds = raffstores(makeFloor('EG'))
    expect(blinds).toHaveLength(6)
    expect(raffstores(makeFloor('OG'))).toHaveLength(6)
    expect(raffstores(makeFloor('DG'))).toHaveLength(2)
    expect(raffstores(makeFloor('KG'))).toEqual([])
    expect(blinds.some(blind => blind.id.includes('entrance'))).toBe(false)
    const south = blinds.find(blind => blind.id === 'EG-terrace')!
    const east = blinds.find(blind => blind.id === 'EG-living-corner-fixed')!
    expect(south.x + south.width).toBeCloseTo(east.x)
    expect(east.z + east.width).toBeCloseTo(south.z)
    expect(south.sharedEndGuide).toBe(true)
    expect(east.sharedEndGuide).toBe(false)
    expect(house.width - east.x).toBeCloseTo(raffstoreDetail.setback)
  })
})