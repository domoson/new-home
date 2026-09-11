import { flatGeometry } from './geometry'
import type { Rect } from './model'

export const roofTileSpacing = .32 * Math.cos(35 * Math.PI / 180)

export function roofTileStrips(panels: Rect[]): Rect[] {
  const strips: Rect[] = []
  for (const panel of panels) {
    for (let course = -21; course <= 21; course++) {
      const south = 5 + course * roofTileSpacing
      const start = Math.max(panel.z, south - .012), end = Math.min(panel.z + panel.depth, south + .012)
      if (end - start > .00001) strips.push({ x: panel.x, z: start, width: panel.width, depth: end - start })
    }
  }
  return strips
}

export function roofTileGeometry(panels: Rect[], roofAt: (south: number) => number, thickness: number) {
  const vertices: number[] = [], indices: number[] = []
  for (const { x, z, width, depth } of roofTileStrips(panels)) {
    const base = vertices.length / 3, north = roofAt(z) + thickness, south = roofAt(z + depth) + thickness
    vertices.push(x,north,z, x+width,north,z, x+width,south,z+depth, x,south,z+depth, x,north+.012,z, x+width,north+.012,z, x+width,south+.012,z+depth, x,south+.012,z+depth)
    indices.push(...[0,1,2,0,2,3, 4,6,5,4,7,6, 0,4,5,0,5,1, 3,2,6,3,6,7, 0,3,7,0,7,4, 1,5,6,1,6,2].map(index => base + index))
  }
  return flatGeometry(new Float32Array(vertices), new Uint32Array(indices))
}