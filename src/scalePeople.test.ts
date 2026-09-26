import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createScalePeople, familySizes, peoplePlacements } from './scalePeople'
import { floorIds, makeFloor, wallSolids } from './model'

test('scale figures use the four real heights and retain seated and lying furniture anchors', () => {
  for (const floor of floorIds) {
    expect(peoplePlacements(floor, true).map(person => person.height)).toEqual(familySizes)
    const people = createScalePeople([floor], false)
    for (const person of people.group.children) {
      const bounds = new THREE.Box3().setFromObject(person)
      expect(bounds.max.y - bounds.min.y).toBeCloseTo(person.userData.person.height, 3)
      expect(bounds.min.y).toBeCloseTo(makeFloor(floor).elevation, 3)
    }
    people.dispose()
  }
  expect(peoplePlacements('OG', true)[2].pose).toBe('lying')
  expect(peoplePlacements('DG', true)[1].pose).toBe('sitting')
})

test('people toggle independently and animation stops when disabled', () => {
  const people = createScalePeople(['EG'], true)
  expect(people.group.visible).toBe(false)
  expect(people.update(1)).toBe(false)
  people.set(true, true)
  const start = people.group.children[0].position.clone()
  expect(people.update(2)).toBe(true)
  expect(people.group.children[0].position.distanceTo(start)).toBeGreaterThan(.1)
  people.set(true, false)
  expect(people.update(3)).toBe(false)
  expect(people.group.children[0].position).toEqual(start)
  people.set(false, true)
  expect(people.update(4)).toBe(false)
  people.dispose()
})

test('furnished figures stay clear of walls throughout the walking path', () => {
  for (const id of floorIds) {
    const floor = makeFloor(id), people = createScalePeople([id], true)
    people.set(true, true)
    for (const seconds of [0, 2, 4, 6, 8]) {
      people.update(seconds)
      for (const person of people.group.children) {
        const bounds = new THREE.Box3().setFromObject(person)
        if (['standing', 'walking'].includes(person.userData.person.pose)) for (const item of floor.furniture) {
          const bottom = floor.elevation + (item.bottom ?? 0)
          const obstacle = new THREE.Box3(new THREE.Vector3(item.x, bottom, item.z), new THREE.Vector3(item.x + item.width, bottom + item.height, item.z + item.depth))
          expect(bounds.intersectsBox(obstacle), `${person.name}/${item.id}`).toBe(false)
        }
        for (const wall of floor.walls) for (const solid of wallSolids(wall, floor.height)) {
          const obstacle = new THREE.Box3(new THREE.Vector3(solid.x, floor.elevation + solid.bottom, solid.z), new THREE.Vector3(solid.x + solid.width, floor.elevation + solid.bottom + solid.height, solid.z + solid.depth))
          expect(bounds.intersectsBox(obstacle), `${person.name}/${wall.id}`).toBe(false)
        }
      }
    }
    people.dispose()
  }
})