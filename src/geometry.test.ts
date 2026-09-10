import { expect, it } from 'vitest'
import { flatGeometry } from './geometry'

it('trennt Normalen an Bauteilkanten statt glatte Giebelflaechen zu woelben', () => {
  const geometry = flatGeometry(new Float32Array([0,0,0, 1,0,0, 0,1,0, 0,0,1]), new Uint32Array([0,1,2, 0,3,1]))
  const normals = geometry.getAttribute('normal')
  expect(geometry.index).toBeNull()
  for (let index = 0; index < 3; index++) expect([normals.getX(index), normals.getY(index), normals.getZ(index)]).toEqual([0,0,1])
  for (let index = 3; index < 6; index++) expect([normals.getX(index), normals.getY(index), normals.getZ(index)]).toEqual([0,1,0])
  geometry.dispose()
})