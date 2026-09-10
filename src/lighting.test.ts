import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createRoomLighting, daylightLevels, lightingCircuits } from './lighting'
import { elevations, floorIds, makeFloor, roofHeight, stair } from './model'

test('Jeder Raum hat schaltbare, abgeschattete Leuchten unter seiner Decke', () => {
  const materials: THREE.Material[] = [], model = createRoomLighting([...floorIds], materials)
  const allOn = Object.fromEntries(lightingCircuits.map(circuit => [circuit.id, true]))
  for (const floorId of floorIds) {
    model.update(allOn, floorId)
    const stairLamp = model.group.getObjectByName(`${floorId}-stairs-wall-light-0`)!
    expect(stairLamp.position.x).toBeCloseTo(stair.x + .065)
    expect(stairLamp.position.z).toBeCloseTo(stair.z + stair.depth / 2)
    expect(stairLamp.position.y - elevations[floorId]).toBeGreaterThan(1.5)
    expect(stairLamp.position.y - elevations[floorId]).toBeLessThan(roofHeight(stairLamp.position.z))
    for (const room of makeFloor(floorId).rooms) {
      const lamps = model.group.children.filter(object => object.userData.lightCircuit === `${floorId}-${room.id}`)
      expect(lamps.length).toBeGreaterThan(0)
      for (const lamp of lamps) {
        expect(room.parts.some(part => lamp.position.x > part.x && lamp.position.x < part.x + part.width && lamp.position.z > part.z && lamp.position.z < part.z + part.depth)).toBe(true)
        const ceiling = floorId === 'DG' ? roofHeight(lamp.position.z) : makeFloor(floorId).height
        expect(lamp.position.y - elevations[floorId]).toBeLessThan(ceiling)
      }
    }
    for (const object of model.group.children) if (object instanceof THREE.SpotLight) {
      expect(object.visible).toBe(object.name.startsWith(floorId))
      expect(object.castShadow).toBe(true)
      expect(object.decay).toBe(2)
      expect(object.distance).toBeLessThanOrEqual(11)
    }
  }
  model.update(Object.fromEntries(lightingCircuits.map(circuit => [circuit.id, false])), 'EG')
  expect(model.group.children.filter(object => object instanceof THREE.Light && object.visible)).toHaveLength(0)
  for (const material of materials) material.dispose()
  model.group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
})

test('Kein starkes globales Aufhellen am Tag oder bei Nacht', () => {
  expect(daylightLevels(.8).ambient).toBeCloseTo(.12)
  const night = daylightLevels(-.3)
  expect(night.ambient).toBeLessThan(.04)
  expect(night.sun).toBe(0)
  expect(night.sky).toBe(0)
  expect(night.exterior).toBe(0)
  expect(night.interior).toBe(0)
  expect(daylightLevels(.8).interior).toBe(1)
  expect(daylightLevels(.8, 'global').interior).toBe(0)
  expect(daylightLevels(.8).exterior).toBeCloseTo(.65)
  expect(daylightLevels(.8, 'global').exterior).toBe(0)
  expect(daylightLevels(.8, 'global').ambient).toBeCloseTo(1.3)
  expect(daylightLevels(-.3, 'global').ambient).toBeCloseTo(.48)
  expect(daylightLevels(.8, 'global').sky).toBe(0)
})