import * as THREE from 'three'
import { flatGeometry } from './geometry'
import { boundaryAttachedPoint, drivewayEnd, footprintPlacement, neighborFootprints, placementMatrix, placementPoint, reshapePlanMesh } from './neighborhoodLayout'

export const directNeighbors = [
  { number: 12, parcel: '75/4', width: 9.2, depth: 9.6, height: 5.1, pitch: 34, hip: 1.65, wall: '#e0e1dc', roof: '#77716b', annex: { x: 9.2, z: -.6, width: 5.5, depth: 6.9, height: 2.6 }, northAccess: false },
  { number: 50, parcel: '74/4', width: 9, depth: 9, height: 5.25, pitch: 39, hip: 0, wall: '#e5d9bd', roof: '#b75e47', annex: { x: 9, z: 2.6, width: 12.5, depth: 7.5, height: 2.75 }, northAccess: true },
  { number: 52, parcel: '73/4', width: 8.5, depth: 9.2, height: 5.2, pitch: 36, hip: 0, wall: '#e5e5df', roof: '#8d7b72', annex: { x: -.05, z: 1.8, width: .05, depth: 0, height: 0 }, northAccess: true },
].map(spec => ({ ...spec, placement: footprintPlacement(neighborFootprints[spec.number as keyof typeof neighborFootprints], spec.width, spec.depth) }))

export function directNeighborPoint(neighbor: typeof directNeighbors[number], x: number, z: number): [number, number] {
  return placementPoint(neighbor.placement, x, z)
}

export function directAnnexLocalPoint(neighbor: typeof directNeighbors[number], east: number, south: number): [number, number] {
  const annex = neighbor.annex
  return neighbor.number === 12 ? boundaryAttachedPoint(neighbor.placement, annex.x, annex.x + annex.width, 3, east, south) : [east, south]
}

export function directAnnexPoint(neighbor: typeof directNeighbors[number], east: number, south: number) {
  return directNeighborPoint(neighbor, ...directAnnexLocalPoint(neighbor, east, south))
}

type Helpers = {
  material: (color: string) => THREE.MeshStandardMaterial
  box: (parent: THREE.Group, x: number, y: number, z: number, width: number, height: number, depth: number, material: THREE.Material) => THREE.Mesh<THREE.BoxGeometry>
  band: (parent: THREE.Group, points: [number, number][], height: number, material: THREE.Material, name: string) => THREE.Mesh
}

export function addDirectNeighbors(neighborhood: THREE.Group, { material, box, band }: Helpers) {
  for (const spec of directNeighbors) {
    const group = new THREE.Group(); group.name = `neighbor-${spec.number}`; group.userData.parcel = spec.parcel; group.userData.estimated = true
    group.matrix.copy(placementMatrix(spec.placement)); group.matrixAutoUpdate = false; group.matrixWorldNeedsUpdate = true; neighborhood.add(group)
    const wall = material(spec.wall), tiles = material(spec.roof), trim = material('#eeeae2'), glazing = material('#81969a'), metal = material('#646c6b'), paving = material('#c5c6be'), timber = material('#8c7664'), lawn = material('#9dad8d')
    const ground = -.14, eaves = ground + spec.height, ridgeZ = spec.depth / 2, slope = Math.tan(spec.pitch * Math.PI / 180)
    const rise = ridgeZ * slope
    const roofHeight = (x: number, z: number) => eaves + Math.min((ridgeZ - Math.abs(z - ridgeZ)) * slope, spec.hip ? Math.min(x, spec.width - x) * rise / spec.hip : rise)
    box(group, 0, ground, 0, spec.width, spec.height, spec.depth, wall).name = 'detailed-body'
    const roofPart = (points: [number, number][], finish: THREE.Material) => {
      const vertices = new Float32Array(points.flatMap(([x, z]) => [x, roofHeight(x, z), z]).concat(points.flatMap(([x, z]) => [x, roofHeight(x, z) + .14, z])))
      const count = points.length, indices: number[] = []
      for (let index = 1; index < count - 1; index++) { indices.push(0, index + 1, index); indices.push(count, count + index, count + index + 1) }
      for (let index = 0; index < count; index++) { const next = (index + 1) % count; indices.push(index, next, next + count, index, next + count, index + count) }
      const mesh = new THREE.Mesh(flatGeometry(vertices, new Uint32Array(indices)), finish); mesh.name = 'detailed-roof'; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
    }
    tiles.side = THREE.DoubleSide
    if (spec.hip) {
      roofPart([[0,0],[spec.width,0],[spec.width-spec.hip,ridgeZ],[spec.hip,ridgeZ]], tiles)
      roofPart([[0,spec.depth],[spec.hip,ridgeZ],[spec.width-spec.hip,ridgeZ],[spec.width,spec.depth]], tiles)
      roofPart([[0,0],[spec.hip,ridgeZ],[0,spec.depth]], tiles)
      roofPart([[spec.width,0],[spec.width,spec.depth],[spec.width-spec.hip,ridgeZ]], tiles)
    } else {
      roofPart([[0,0],[spec.width,0],[spec.width,ridgeZ],[0,ridgeZ]], tiles)
      roofPart([[0,ridgeZ],[spec.width,ridgeZ],[spec.width,spec.depth],[0,spec.depth]], tiles)
      for (const east of [0, spec.width]) {
        const finish = material(spec.wall); finish.side = THREE.DoubleSide
        const gable = new THREE.Mesh(flatGeometry(new Float32Array([east,eaves,0,east,eaves,spec.depth,east,eaves+rise,ridgeZ]), new Uint32Array([0,1,2])), finish)
        gable.name = 'detailed-gable'; gable.castShadow = true; group.add(gable)
      }
    }
    const roofBox = (x: number, z: number, width: number, depth: number, lift: number, thickness: number, finish: THREE.Material, name: string) => {
      const mesh = box(group, x, 0, z, width, thickness, depth, finish), positions = mesh.geometry.getAttribute('position')
      for (let index = 0; index < positions.count; index++) positions.setY(index, positions.getY(index) + roofHeight(mesh.position.x + positions.getX(index), mesh.position.z + positions.getZ(index)) + lift)
      positions.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere(); mesh.name = name
    }
    for (const [start, end] of [[0, ridgeZ], [ridgeZ, spec.depth]]) for (let south = start + .3; south < end - .05; south += .33) {
      const inset = spec.hip ? spec.hip * (ridgeZ - Math.abs(south - ridgeZ)) / ridgeZ + .03 : .04
      roofBox(inset, south, spec.width - 2 * inset, .024, .14, .018, metal, 'detailed-tile-course')
    }
    for (const south of [0, spec.depth]) box(group, -.1, eaves - .06, south - .055, spec.width + .2, .13, .11, metal).name = 'detailed-gutter'
    for (const east of [.08, spec.width - .16]) box(group, east, ground, spec.depth + .04, .07, spec.height, .07, metal).name = 'detailed-downpipe'
    const lights = spec.number === 50 ? [[2.1,1.7],[4.4,1.7],[6.7,1.7],[2.4,6.2],[6,6]] : spec.number === 12 ? [[2.8,6.3]] : [[2.2,6.1],[5.7,1.9]]
    for (const [east, south] of lights) {
      roofBox(east, south, .8, 1, .15, .07, trim, 'detailed-skylight-frame')
      roofBox(east + .07, south + .07, .66, .86, .24, .025, glazing, 'detailed-skylight')
    }
    box(group, spec.width * .67, roofHeight(spec.width * .67, ridgeZ - .4), ridgeZ - .6, .5, .8, .5, wall).name = 'detailed-chimney'
    const window = (east: number, bottom: number, south: number, width: number, height: number, face: 'north' | 'south' | 'east' | 'west') => {
      const lateral = face === 'east' || face === 'west'
      box(group, east, bottom, south, lateral ? .07 : width, height, lateral ? width : .07, trim).name = 'detailed-window-frame'
      const outerX = face === 'west' ? east - .015 : east + (lateral ? .07 : .065), outerZ = face === 'north' ? south - .015 : south + (lateral ? .065 : .07)
      box(group, outerX, bottom + .065, outerZ, lateral ? .015 : width - .13, height - .13, lateral ? width - .13 : .015, glazing).name = 'detailed-window'
    }
    for (const level of [.8, 3.35]) for (const east of [1, spec.width / 2 - .6, spec.width - 2.2]) {
      window(east, level, -.07, 1.2, 1.25, 'north')
      window(east, level, spec.depth, 1.2, 1.3, 'south')
    }
    for (const face of ['east', 'west'] as const) for (const south of [1.5, spec.depth - 2.7]) for (const level of [.8, 3.35]) window(face === 'east' ? spec.width : -.07, level, south, 1.1, 1.25, face)
    if (!spec.hip) for (const east of [-.07, spec.width]) window(east, eaves + .7, ridgeZ - .6, 1.2, 1.25, east < 0 ? 'west' : 'east')
    box(group, spec.width / 2 - .5, ground, -.1, 1, 2.1, .07, timber).name = 'detailed-entrance'
    if (spec.number === 50) {
      box(group, .5, 2.65, spec.depth, spec.width - 1, .18, 1.15, trim).name = 'detailed-south-balcony'
      box(group, .5, 2.83, spec.depth + 1.04, spec.width - 1, .78, .09, timber)
      for (const east of [.5, spec.width - .6]) box(group, east, 2.83, spec.depth, .1, .78, 1.15, timber)
    }
    const annex = spec.annex
    if (annex.depth) {
      box(group, annex.x, ground, annex.z, annex.width, annex.height, annex.depth, wall).name = 'detailed-annex'
      box(group, annex.x, ground + annex.height, annex.z, annex.width, .14, annex.depth, metal).name = 'detailed-annex-roof'
      const doorZ = spec.northAccess ? annex.z - .07 : annex.z + annex.depth
      box(group, annex.x + .25, ground, doorZ, Math.min(3, annex.width - .5), 2.2, .07, trim).name = 'detailed-garage-door'
      if (spec.number === 50) for (let panel = 0; panel < 5; panel++) {
        const mesh = box(group, annex.x + 1.2 + panel * 1.35, ground + annex.height + .25, annex.z + 1.6, 1.2, .06, 1.65, glazing)
        mesh.rotation.x = -.2; mesh.name = 'detailed-solar-panel'
      }
    }
    const streetZ = (east: number) => drivewayEnd((east, south) => directNeighborPoint(spec, east, south), east, spec.northAccess)
    const drivewayX = annex.depth ? annex.x + .1 : -3.1, drivewayWidth = annex.depth ? Math.min(3.8, annex.width - .2) : 2.8
    const driveEnd = annex.depth ? spec.northAccess ? annex.z : annex.z + annex.depth : 4
    const driveStreetZ = (east: number) => drivewayEnd((east, south) => directAnnexPoint(spec, east, south), east, spec.northAccess)
    band(group, [[drivewayX,driveEnd],[drivewayX+drivewayWidth,driveEnd],[drivewayX+drivewayWidth,driveStreetZ(drivewayX+drivewayWidth)],[drivewayX,driveStreetZ(drivewayX)]], -.105, paving, 'detailed-driveway')
    if (spec.number === 12) for (const child of group.children) {
      if (child instanceof THREE.Mesh && ['detailed-annex', 'detailed-annex-roof', 'detailed-garage-door', 'detailed-driveway'].includes(child.name)) reshapePlanMesh(child, (east, south) => directAnnexLocalPoint(spec, east, south))
    }
    const gardenEnd = spec.northAccess ? spec.depth + 3.5 : Math.min(streetZ(0), streetZ(spec.width)) - .4
    band(group, [[0,spec.depth],[spec.width,spec.depth],[spec.width,gardenEnd],[0,gardenEnd]], -.13, lawn, 'detailed-garden')
    band(group, [[.3,spec.depth],[spec.width-.3,spec.depth],[spec.width-.3,spec.depth+1.6],[.3,spec.depth+1.6]], -.1, paving, 'detailed-terrace')
  }
}