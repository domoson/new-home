import * as THREE from 'three'
import { boundaryX, boundaryZ, initialAppearance, partner, siteBoundary, woodTones } from './context'
import { flatGeometry } from './geometry'
import { carportRoof, parkingEntrance, rectCorners, siteParking } from './parking'
import { neighbor8, neighbor8Point } from './neighbor8'
import { addDirectNeighbors } from './directNeighbors'
import { createSeatLeon } from './seatLeon'
import { createCarParking } from './carParking'

export function createSurroundings() {
  const neighborhood = new THREE.Group(), garden = new THREE.Group()
  neighborhood.name = 'neighborhood'; garden.name = 'landscaping'
  const materials: THREE.Material[] = [], textures: THREE.Texture[] = []
  const colliders: { position: THREE.Vector3; size: THREE.Vector3; rotation: THREE.Quaternion }[] = []
  let carParking: ReturnType<typeof createCarParking> | undefined
  const material = (color: string, map?: THREE.Texture) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness: 1, map: map ?? null }); materials.push(result); return result
  }
  const paving = material('#c0c3bd'), walls = material('#dddeda'), roof = material('#838984'), redRoof = material('#a78678'), glass = material('#a7b8ba'), fence = material('#64766c'), trunk = material('#82786b')
  const carportWood = { east: material(woodTones[initialAppearance.woodTone].color), west: material(woodTones[initialAppearance.woodTone].color) }
  const roofEdge = material('#535c58'), roofMetal = material('#69716f'), grassPaving = material('#a0ab8d')
  const foliage = ['#72856b', '#879879', '#6c826c'].map(color => material(color))
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  let seed = 7401
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
  context.fillStyle = '#9da49a'; context.fillRect(0, 0, 128, 128)
  for (let index = 0; index < 3500; index++) { context.fillStyle = `rgba(55,69,57,${random() * .12})`; context.fillRect(random() * 128, random() * 128, 1, 1) }
  const groundTexture = new THREE.CanvasTexture(canvas); groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping; groundTexture.repeat.set(20, 20); groundTexture.colorSpace = THREE.SRGBColorSpace; textures.push(groundTexture)
  const groundMaterial = material('#dce2d8', groundTexture), asphalt = material('#989f9f', groundTexture)
  const box = (parent: THREE.Group, x: number, y: number, z: number, width: number, height: number, depth: number, finish: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), finish)
    mesh.position.set(x + width / 2, y + height / 2, z + depth / 2); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  const tree = (parent: THREE.Group, x: number, z: number, height: number, radius: number) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.09, .16, height * .65, 7), trunk); stem.position.set(x, height * .325, z); stem.castShadow = true; parent.add(stem)
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), foliage[Math.floor(random() * foliage.length)])
    crown.position.set(x, height * .74, z); crown.scale.set(radius, height * .32, radius * .9); crown.rotation.y = random() * Math.PI; crown.castShadow = true; crown.receiveShadow = true; parent.add(crown)
  }
  const groundShape = new THREE.Shape([new THREE.Vector2(-65, -48), new THREE.Vector2(65, -48), new THREE.Vector2(65, 64), new THREE.Vector2(-65, 64)])
  groundShape.holes.push(new THREE.Path(siteBoundary.map(([x, z]) => new THREE.Vector2(x, z))))
  const groundGeometry = new THREE.ShapeGeometry(groundShape); groundGeometry.rotateX(Math.PI / 2); groundGeometry.translate(0, -.18, 0)
  groundMaterial.side = THREE.DoubleSide
  const ground = new THREE.Mesh(groundGeometry, groundMaterial); ground.receiveShadow = true; neighborhood.add(ground)
  const band = (parent: THREE.Group, points: [number, number][], height: number, finish: THREE.Material, name: string) => {
    const geometry = new THREE.ShapeGeometry(new THREE.Shape(points.map(([east, south]) => new THREE.Vector2(east, south))))
    geometry.rotateX(Math.PI / 2); geometry.translate(0, height, 0); finish.side = THREE.DoubleSide
    const mesh = new THREE.Mesh(geometry, finish); mesh.receiveShadow = true; mesh.name = name; parent.add(mesh); return mesh
  }
  for (const side of [0, 2] as const) {
    const offset = side === 0 ? -20 : 1.1
    const street = (start: number, depth: number, height: number, finish: THREE.Material, name: string) => band(neighborhood, [[-60, boundaryZ(-60, side) + start], [60, boundaryZ(60, side) + start], [60, boundaryZ(60, side) + start + depth], [-60, boundaryZ(-60, side) + start + depth]], height, finish, name)
    street(offset, 5.6, -.135, asphalt, side === 0 ? 'street-hallerstrasse' : 'street-an-der-roeth')
    for (const edge of [-1.1, 5.6]) street(offset + edge, 1.1, -.095, paving, 'sidewalk')
  }
  const house = (x: number, z: number, width: number, depth: number, height: number, warm: boolean) => {
    const body = box(neighborhood, x, -.14, z, width, height, depth, walls)
    body.name = 'neighbor-body'
    height = body.position.y + height / 2
    const ridge = height + 2.4
    const vertices = new Float32Array([x-.2,height,z-.2, x+width+.2,height,z-.2, x+width+.2,height,z+depth+.2, x-.2,height,z+depth+.2, x-.2,ridge,z+depth/2, x+width+.2,ridge,z+depth/2])
    const geometry = flatGeometry(vertices, new Uint32Array([0,4,5,0,5,1, 4,3,2,4,2,5, 0,3,4, 1,5,2, 0,1,2,0,2,3]))
    const cover = new THREE.Mesh(geometry, warm ? redRoof : roof); cover.castShadow = true; cover.receiveShadow = true; cover.name = 'neighbor-roof'; neighborhood.add(cover)
    for (const level of [1.1, 3.6]) for (let offset = 1.1; offset < width - 1; offset += 2.6) {
      box(neighborhood, x + offset, level, z + depth + .01, 1, 1.2, .025, glass)
      box(neighborhood, x + offset, level, z - .035, 1, 1.2, .025, glass)
    }
    box(neighborhood, x + width + .25, -.14, z + 1, 2.4, .04, depth + 3, paving).castShadow = false
  }
  addDirectNeighbors(neighborhood, { material, box, band, tree })
  {
    const building = new THREE.Group(); building.name = 'neighbor-8'; building.userData.parcel = neighbor8.parcel
    building.position.set(neighbor8.origin.x, 0, neighbor8.origin.z); building.rotation.y = -neighbor8.angle; neighborhood.add(building)
    const shell = material('#e4e3df'), trim = material('#f0eee7'), tiles = material('#727b83'), metal = material('#636d72'), glazing = material('#83999e'), garageDoor = material('#8b8e8a')
    const { house: body, garage, ground, roofPitch } = neighbor8
    const eaves = ground + body.eaves, slope = Math.tan(roofPitch * Math.PI / 180), ridgeZ = body.z + body.depth / 2
    const roofY = (south: number) => eaves + (body.depth / 2 - Math.abs(south - ridgeZ)) * slope
    box(building, body.x, ground, body.z, body.width, body.eaves, body.depth, shell).name = 'neighbor-8-body'
    for (const east of [body.x, body.x + body.width]) {
      const vertices = new Float32Array([east,eaves,body.z, east,eaves,body.z+body.depth, east,roofY(ridgeZ),ridgeZ])
      const finish = material('#e4e3df'); finish.side = THREE.DoubleSide
      const gable = new THREE.Mesh(flatGeometry(vertices, new Uint32Array([0,1,2])), finish); gable.name = 'neighbor-8-gable'; gable.castShadow = true; building.add(gable)
    }
    const slopeBox = (east: number, south: number, width: number, depth: number, thickness: number, lift: number, finish: THREE.Material, name: string) => {
      const mesh = box(building, east, 0, south, width, thickness, depth, finish), positions = mesh.geometry.getAttribute('position')
      for (let index = 0; index < positions.count; index++) positions.setY(index, positions.getY(index) + roofY(south + depth / 2 + positions.getZ(index)) + lift)
      positions.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere(); mesh.name = name; return mesh
    }
    for (const [start, end] of [[body.z - .3, ridgeZ], [ridgeZ, body.z + body.depth + .3]]) {
      slopeBox(body.x - .25, start, body.width + .5, end - start, .12, 0, tiles, 'neighbor-8-roof')
      for (let south = start + .3; south < end - .08; south += .32) slopeBox(body.x - .25, south, body.width + .5, .025, .018, .12, metal, 'neighbor-8-tile-course')
    }
    for (const south of [body.z - .3, body.z + body.depth + .3]) box(building, body.x - .25, roofY(south) - .06, south - .04, body.width + .5, .12, .1, metal).name = 'neighbor-8-gutter'
    for (const [east, south, width, depth] of [[body.x + 2.25, 6.9, .85, 1.05], [body.x + 5.7, 6.5, 1.05, 1.15], [body.x + 1.8, 1.8, .65, 1], [body.x + 6.25, 2.15, .85, .9]]) {
      slopeBox(east - .09, south - .09, width + .18, depth + .18, .08, .13, trim, 'neighbor-8-skylight-frame')
      slopeBox(east, south, width, depth, .035, .23, glazing, 'neighbor-8-skylight')
    }
    box(building, body.x + 6.1, roofY(3.65), 3.35, .45, .8, .5, metal).name = 'neighbor-8-chimney'
    const window = (east: number, bottom: number, south: number, width: number, height: number, gable = false) => {
      const frame = box(building, east, bottom, south, gable ? .08 : width, height, gable ? width : .08, trim); frame.name = 'neighbor-8-window-frame'
      box(building, east + (gable ? .08 : .065), bottom + .065, south + (gable ? .065 : .08), gable ? .02 : width - .13, height - .13, gable ? width - .13 : .02, glazing).name = 'neighbor-8-window'
    }
    for (const east of [body.x + .85, body.x + 3.65, body.x + 6.45]) {
      window(east, .7, body.z + body.depth, 1.4, 1.55)
      window(east, 2.85, body.z + body.depth, 1.4, 2.1)
    }
    for (const south of [1.3, 6.6]) for (const bottom of [.85, 3.4]) window(body.x + body.width, bottom, south, 1.2, 1.3, true)
    window(body.x + body.width, 6.05, 3.95, 1.45, 1.35, true)
    box(building, body.x + .1, 2.62, body.z + body.depth, body.width - .2, .19, 1.35, trim).name = 'neighbor-8-balcony'
    box(building, body.x + .1, 2.81, body.z + body.depth + 1.24, body.width - .2, .85, .11, shell).name = 'neighbor-8-balcony-parapet'
    for (const east of [body.x + .1, body.x + body.width - .21]) box(building, east, 2.81, body.z + body.depth, .11, .85, 1.35, shell)
    box(building, body.x + .1, 3.66, body.z + body.depth + 1.23, body.width - .2, .045, .13, metal)
    box(building, garage.x, ground, garage.z, garage.width, garage.height, garage.depth, shell).name = 'neighbor-8-garage'
    box(building, garage.x, ground + garage.height, garage.z, garage.width, .14, garage.depth, metal).name = 'neighbor-8-garage-roof'
    box(building, garage.x + .2, ground, garage.z + garage.depth + .01, garage.width - .4, 2.15, .06, garageDoor).name = 'neighbor-8-garage-door'
    for (let level = .2; level < 2.1; level += .24) box(building, garage.x + .22, level, garage.z + garage.depth + .075, garage.width - .44, .015, .008, metal)
    const toStreet = (east: number) => {
      const start = neighbor8Point(east, 0), next = neighbor8Point(east, 1)
      const rate = next[1] - start[1] - (boundaryZ(next[0], 2) - boundaryZ(start[0], 2))
      return (boundaryZ(start[0], 2) - start[1]) / rate
    }
    band(building, [[0,garage.z+garage.depth],[garage.width,garage.z+garage.depth],[garage.width,toStreet(garage.width)],[0,toStreet(0)]], -.105, paving, 'neighbor-8-driveway')
    band(building, [[body.x,body.depth],[body.x+body.width,body.depth],[body.x+body.width,toStreet(body.x+body.width)-.3],[body.x,toStreet(body.x)-.3]], -.13, foliage[1], 'neighbor-8-front-garden')
    band(building, [[body.x+.3,body.depth],[body.x+body.width-.3,body.depth],[body.x+body.width-.3,body.depth+1.7],[body.x+.3,body.depth+1.7]], -.1, paving, 'neighbor-8-terrace')
    for (const east of [body.x + 1.6, body.x + 5.3, body.x + 7.9]) tree(building, east, toStreet(east) - 2.1, 2.4 + random(), .9)
  }
  house(boundaryX(10.5, 1) + 16.2, -.7, 8, 10, 5.3, false)
  for (const east of [-22]) house(east, Math.min(boundaryZ(east, 0), boundaryZ(east + 10, 0)) - 12.2, 10, 9, 5.6, true)
  for (const east of [-20, -5, 10]) house(east, boundaryZ(east, 2) + 11, 10, 9, 5.4, east === -5)
  for (const south of [15, 19, 25]) {
    if (south > 23) tree(neighborhood, boundaryX(south, 3) - 3.5, south, 5 + random() * 2, 1.8)
    if (south > 23) tree(neighborhood, boundaryX(south, 1) + 4.5, south, 5 + random() * 2, 1.8)
  }
  for (const east of [-12, 3, 18]) tree(neighborhood, east, boundaryZ(east, 2) + 9, 5.5, 1.6)
  for (const east of [-3.5, 3.5]) tree(garden, east, boundaryZ(east, 2) - 2.5, 4.2 + random(), 1.35)
  for (const east of [-5.8, 5.6]) tree(garden, east, (boundaryZ(east, 0) + (east < 0 ? partner.z : 0)) / 2, 3.6, 1)
  for (const { side, carport, open, bins, binAccess, angle, origin, point, streetZ, passagePoints, approach } of siteParking) {
    const parking = new THREE.Group(); parking.name = `parking-area-${side}`; parking.position.set(origin.x, 0, origin.z); parking.rotation.y = -angle; garden.add(parking)
    const structure = new THREE.Group(); structure.name = `carport-${side}`; parking.add(structure)
    const solid = (x: number, y: number, z: number, width: number, height: number, depth: number, finish: THREE.Material, name: string) => {
      const mesh = box(structure, x, y, z, width, height, depth, finish); mesh.name = name
      const center = point(mesh.position.x, mesh.position.z)
      colliders.push({ position: new THREE.Vector3(center[0], mesh.position.y, center[1]), size: new THREE.Vector3(width, height, depth), rotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle) })
      return mesh
    }
    const wood = carportWood[side]
    const slope = Math.tan(carportRoof.pitch * Math.PI / 180)
    const sloped = (x: number, y: number, z: number, width: number, height: number, depth: number, finish: THREE.Material, name: string) => {
      const mesh = solid(x, y + (z - carport.z) * slope, z, width, height, depth, finish, name)
      const positions = mesh.geometry.getAttribute('position')
      for (let index = 0; index < positions.count; index++) positions.setY(index, positions.getY(index) + (positions.getZ(index) + depth / 2) * slope)
      positions.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere()
      const collider = colliders[colliders.length - 1]; collider.position.y += depth * slope / 2; collider.size.y += depth * slope
      return mesh
    }
    sloped(carport.x + .16, -.14, carport.z, carport.width - .32, carportRoof.lowEdge + .14, .08, wood, 'carport-back-wall')
    band(parking, rectCorners(binAccess), -.105, paving, 'bin-access')
    band(parking, rectCorners(bins), -.105, paving, 'bin-pad')
    for (const [index, color] of ['#71805d', '#565c59', '#4f7586'].entries()) {
      const east = bins.x + .075 + index * .75, south = bins.z + .04
      solid(east, -.1, south, .6, 1.03, .75, material('#737b74'), `bin-${side}-${index}`)
      box(structure, east - .015, .93, south - .01, .63, .06, .77, material(color)).name = 'bin-lid'
    }
    for (const east of [carport.x, carport.x + carport.width - .16]) for (const south of [carport.z, carport.z + carport.depth - .16]) {
      solid(east, -.14, south, .16, 2.38 + (south - carport.z) * slope, .16, wood, 'carport-post')
      box(structure, east - .01, -.14, south - .01, .18, .1, .18, roofEdge)
    }
    for (const east of [carport.x, carport.x + carport.width - .16]) sloped(east, 2.24, carport.z, .16, .26, carport.depth, wood, 'carport-beam')
    for (let offset = .16; offset < carport.depth - .08; offset += .6) sloped(carport.x + .16, 2.34, carport.z + offset, carport.width - .32, .16, .08, wood, 'carport-rafter')
    sloped(carport.x, carportRoof.lowEdge, carport.z, carport.width, carportRoof.thickness, carport.depth, roofMetal, 'carport-roof')
    for (let offset = .12; offset < carport.width - .06; offset += .25) sloped(carport.x + offset, carportRoof.lowEdge + carportRoof.thickness, carport.z + .08, .045, .025, carport.depth - .08, roofEdge, 'carport-roof-rib')
    for (const east of [carport.x - .02, carport.x + carport.width]) sloped(east, 2.43, carport.z, .02, .16, carport.depth, roofEdge, 'carport-roof-flashing')
    solid(carport.x + .16, 2.38, carport.z + .08, carport.width - .32, .1, .1, roofEdge, 'carport-gutter')
    const pipeX = side === 'east' ? carport.x + carport.width - .27 : carport.x + .18
    solid(pipeX, -.1, carport.z + .09, .08, 2.48, .08, roofEdge, 'carport-downpipe')
    const screenX = side === 'east' ? carport.x + carport.width - .06 : carport.x
    for (let offset = .22; offset < 2.4; offset += .14) solid(screenX, .28, carport.z + offset, .06, 1.8, .06, wood, 'carport-slat')
    for (const [kind, rectangle] of [['covered', carport], ['open', open]] as const) {
      const stall = new THREE.Group(); stall.name = `parking-${side}-${kind}`; parking.add(stall)
      band(stall, [[rectangle.x, rectangle.z], [rectangle.x + rectangle.width, rectangle.z], [rectangle.x + rectangle.width, rectangle.z + rectangle.depth], [rectangle.x, rectangle.z + rectangle.depth]], -.119, grassPaving, 'grass-parking')
      for (const offset of [rectangle.width / 2 - .95, rectangle.width / 2 + .5]) {
        const east = rectangle.x + offset
        band(stall, [[east, rectangle.z + .2], [east + .45, rectangle.z + .2], [east + .45, streetZ(east + .45)], [east, streetZ(east)]], -.105, paving, 'permeable-wheel-track')
        for (let south = rectangle.z + .5; south < Math.min(streetZ(east), streetZ(east + .45)) - .1; south += .32) {
          box(stall, east, -.104, south, .45, .004, .055, grassPaving).castShadow = false
        }
      }
    }
    band(parking, passagePoints, -.105, paving, 'garden-path')
    band(garden, approach, -.105, paving, 'entrance-path')
    if (side === 'east') {
      const car = createSeatLeon(materials)
      car.position.set(carport.x + carport.width / 2, -.1, carport.z + carport.depth / 2)
      car.rotation.y = Math.PI
      parking.add(car)
      carParking = createCarParking(car, streetZ(car.position.x) + 3.9)
    }
  }
  for (const [start, end] of [[Math.max(boundaryZ(-.225, 0), boundaryZ(.225, 0)), 0], [partner.z + partner.depth, Math.min(boundaryZ(-.225, 2), boundaryZ(.225, 2))]]) {
    const hedge = box(garden, -.225, -.14, start, .45, 1.45, end - start, foliage[0]); hedge.name = 'division-hedge'
  }
  for (const side of [1, 3] as const) for (let south = 13.8; south < 20; south += 1.1) {
    const east = boundaryX(south, side) + (side === 3 ? .65 : -1.25)
    if (siteParking.some(({ carport, point }) => {
      const corners = rectCorners({ ...carport, z: carport.z - 2, depth: carport.depth + 5.5 }).map(([x, z]) => point(x, z))
      return east + .6 > Math.min(...corners.map(corner => corner[0])) && east < Math.max(...corners.map(corner => corner[0])) && south + .8 > Math.min(...corners.map(corner => corner[1])) && south < Math.max(...corners.map(corner => corner[1]))
    })) continue
    box(garden, east, -.14, south, .6, .45 + random() * .35, .8, foliage[Math.floor(random() * foliage.length)])
  }
  const fenceMatrices: THREE.Matrix4[] = []
  for (let side = 0; side < siteBoundary.length; side++) {
    const [x, z] = siteBoundary[side], [endX, endZ] = siteBoundary[(side + 1) % siteBoundary.length]
    const length = Math.hypot(endX - x, endZ - z), count = Math.ceil(length / .14)
    for (let index = 0; index <= count; index++) {
      const east = x + (endX - x) * index / count, south = z + (endZ - z) * index / count
      if (side === 2 && parkingEntrance(east)) continue
      const height = index % 12 === 0 ? 1.12 : 1
      fenceMatrices.push(new THREE.Matrix4().compose(new THREE.Vector3(east, -.14 + height / 2, south), new THREE.Quaternion(), new THREE.Vector3(.036, height, .036)))
    }
  }
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), fence, fenceMatrices.length)
  fenceMatrices.forEach((matrix, index) => posts.setMatrixAt(index, matrix)); posts.castShadow = true; posts.receiveShadow = true; posts.name = 'boundary-fence'; garden.add(posts)
  return { neighborhood, garden, colliders, activateVehicle(object: THREE.Object3D) { return carParking?.activate(object) ?? false }, updateVehicle(delta: number, reducedMotion: boolean) { return carParking?.update(delta, reducedMotion) ?? false }, setWoodTone(side: 'east' | 'west', tone: number) { carportWood[side].color.set(woodTones[tone].color) }, dispose() { for (const group of [neighborhood, garden]) group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() }); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose()) } }
}