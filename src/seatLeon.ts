import * as THREE from 'three'

export const seatLeonDimensions = { length: 4.642, bodyWidth: 1.799, mirrorWidth: 1.991, height: 1.448, wheelbase: 2.686, frontOverhang: .888, rearOverhang: 1.068 }

export function createSeatLeon(materials: THREE.Material[]) {
  const car = new THREE.Group(); car.name = 'seat-leon-st-grey'
  const finish = (color: string, metalness = 0, roughness = .45) => {
    const material = new THREE.MeshStandardMaterial({ color, metalness, roughness, side: THREE.DoubleSide }); materials.push(material); return material
  }
  const paint = finish('#898c90', .25, .36), trim = finish('#202427'), rubber = finish('#222325', 0, .85)
  const glass = finish('#34474f', .3, .15), alloy = finish('#bfc4c7', .8, .25), brake = finish('#505457', .6)
  const headlight = finish('#dceef5', .25, .18), tailLight = finish('#a71320', .25, .22), plate = finish('#edf0ed')
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string) => {
    const object = new THREE.Mesh(geometry, material); object.name = name; object.castShadow = true; object.receiveShadow = true; car.add(object); return object
  }
  const box = (name: string, position: [number, number, number], size: [number, number, number], material: THREE.Material) => {
    const object = mesh(new THREE.BoxGeometry(...size), material, name); object.position.set(...position); return object
  }
  const panel = (name: string, points: [number, number, number][], material: THREE.Material) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)))
    geometry.setIndex(points.slice(2).flatMap((_, index) => [0, index + 1, index + 2])); geometry.computeVertexNormals()
    return mesh(geometry, material, name)
  }
  const beam = (name: string, start: [number, number, number], end: [number, number, number], width: number, material: THREE.Material) => {
    const first = new THREE.Vector3(...start), last = new THREE.Vector3(...end), direction = last.clone().sub(first)
    const object = mesh(new THREE.CylinderGeometry(width / 2, width / 2, direction.length(), 6), material, name)
    object.position.copy(first.add(last).multiplyScalar(.5)); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return object
  }
  const halfLength = seatLeonDimensions.length / 2, halfWidth = seatLeonDimensions.bodyWidth / 2
  const frontAxle = halfLength - seatLeonDimensions.frontOverhang, rearAxle = frontAxle - seatLeonDimensions.wheelbase
  const silhouette = new THREE.Shape()
  silhouette.moveTo(-halfLength, .24)
  for (const axle of [rearAxle, frontAxle]) {
    silhouette.lineTo(axle - .355, .24); silhouette.lineTo(axle - .355, .315)
    silhouette.absarc(axle, .315, .355, Math.PI, 0, true); silhouette.lineTo(axle + .355, .24)
  }
  silhouette.lineTo(halfLength, .24); silhouette.lineTo(halfLength, .55); silhouette.lineTo(halfLength - .11, .79)
  silhouette.lineTo(.9, .94); silhouette.lineTo(-1.94, .96); silhouette.lineTo(-halfLength, .83); silhouette.closePath()
  const body = new THREE.ExtrudeGeometry(silhouette, { depth: seatLeonDimensions.bodyWidth, bevelEnabled: false, curveSegments: 16 })
  const vertices = body.getAttribute('position')
  for (let index = 0; index < vertices.count; index++) {
    const south = vertices.getX(index), height = vertices.getY(index), across = halfWidth - vertices.getZ(index)
    const taper = 1 - .1 * Math.max(0, (Math.abs(south) - 1.7) / (halfLength - 1.7)) - .07 * Math.max(0, (height - .65) / .31)
    vertices.setXYZ(index, across * taper, height, south)
  }
  body.computeVertexNormals(); mesh(body, paint, 'leon-body')
  const frontBase = .88, frontRoof = .22, rearRoof = -1.59, rearBase = -2.13, sill = .91, top = 1.397, lowerWidth = .826, roofWidth = .675
  panel('leon-windscreen', [[-lowerWidth, sill, frontBase], [lowerWidth, sill, frontBase], [roofWidth, top, frontRoof], [-roofWidth, top, frontRoof]], glass)
  panel('leon-rear-window', [[lowerWidth, sill, rearBase], [-lowerWidth, sill, rearBase], [-roofWidth, top, rearRoof], [roofWidth, top, rearRoof]], glass)
  panel('leon-roof', [[-roofWidth, top, frontRoof], [roofWidth, top, frontRoof], [roofWidth, top, rearRoof], [-roofWidth, top, rearRoof]], paint)
  for (const sign of [-1, 1]) {
    panel('leon-side-windows', [[sign * lowerWidth, sill, frontBase], [sign * lowerWidth, sill, rearBase], [sign * roofWidth, top, rearRoof], [sign * roofWidth, top, frontRoof]], glass)
    beam('leon-a-pillar', [sign * lowerWidth, sill, frontBase], [sign * roofWidth, top, frontRoof], .055, paint)
    beam('leon-d-pillar', [sign * lowerWidth, sill, rearBase], [sign * roofWidth, top, rearRoof], .085, paint)
    for (const south of [-.42, -1.23]) beam('leon-window-pillar', [sign * lowerWidth, sill, south], [sign * roofWidth, top, south], .058, trim)
    beam('leon-window-trim', [sign * lowerWidth, sill, frontBase], [sign * lowerWidth, sill, rearBase], .025, alloy)
    beam('leon-roof-edge', [sign * roofWidth, top, frontRoof], [sign * roofWidth, top, rearRoof], .025, paint)
    box('leon-roof-rail', [sign * .615, 1.431, -.69], [.032, .034, 1.95], alloy)
    box('leon-mirror-stalk', [sign * .867, .995, .64], [.13, .032, .085], trim)
    box('leon-mirror', [sign * (seatLeonDimensions.mirrorWidth / 2 - .065), 1.035, .66], [.13, .09, .17], paint)
    box('leon-mirror-glass', [sign * .93, 1.035, .573], [.1, .062, .008], glass)
    for (const south of [-.34, -1.17]) box('leon-door-handle', [sign * .855, .852, south], [.025, .033, .17], paint)
    for (const south of [-.48, -1.45, .76]) beam('leon-door-seam', [sign * .887, .39, south], [sign * .85, .905, south], .008, trim)
    beam('leon-sill', [sign * .883, .285, rearAxle + .39], [sign * .883, .285, frontAxle - .39], .045, trim)
    for (const [axle, track] of [[frontAxle, 1.545], [rearAxle, 1.516]]) {
      const wheel = mesh(new THREE.CylinderGeometry(.315, .315, .215, 32), rubber, 'leon-tire')
      wheel.rotation.z = Math.PI / 2; wheel.position.set(sign * track / 2, .315, axle)
      const face = sign * (track / 2 + .109)
      const rim = mesh(new THREE.CylinderGeometry(.237, .237, .015, 32), trim, 'leon-rim'); rim.rotation.z = Math.PI / 2; rim.position.set(face, .315, axle)
      const disc = mesh(new THREE.CylinderGeometry(.185, .185, .016, 24), brake, 'leon-brake'); disc.rotation.z = Math.PI / 2; disc.position.set(face + sign * .01, .315, axle)
      const ring = mesh(new THREE.TorusGeometry(.224, .013, 6, 32), alloy, 'leon-rim-edge'); ring.rotation.y = Math.PI / 2; ring.position.set(face + sign * .022, .315, axle)
      for (let spoke = 0; spoke < 10; spoke++) {
        const angle = spoke * Math.PI / 5
        const spokeMesh = box('leon-alloy-spoke', [face + sign * .022, .315 + Math.cos(angle) * .137, axle + Math.sin(angle) * .137], [.02, .172, .027], alloy)
        spokeMesh.rotation.x = angle
      }
      const hub = mesh(new THREE.CylinderGeometry(.052, .052, .026, 16), alloy, 'leon-hub'); hub.rotation.z = Math.PI / 2; hub.position.set(face + sign * .032, .315, axle)
    }
    panel('leon-angular-headlight', [[sign * .39, .705, 2.258], [sign * .77, .76, 2.233], [sign * .72, .585, 2.313], [sign * .47, .61, 2.301]], headlight)
    panel('leon-tail-light', [[sign * .25, .845, -2.282], [sign * .78, .87, -2.276], [sign * .72, .728, -2.32], [sign * .36, .755, -2.32]], tailLight)
    box('leon-fog-light', [sign * .62, .395, 2.304], [.19, .045, .022], headlight)
  }
  box('leon-upper-grille', [0, .653, 2.303], [.65, .16, .026], trim)
  box('leon-lower-grille', [0, .366, 2.311], [.85, .13, .02], trim)
  box('leon-front-badge', [0, .687, 2.319], [.055, .053, .004], alloy)
  box('leon-front-plate', [0, .505, 2.313], [.43, .092, .016], plate)
  box('leon-rear-plate', [0, .635, -2.313], [.43, .095, .016], plate)
  box('leon-rear-badge', [0, .854, -2.28], [.053, .048, .012], alloy)
  box('leon-rear-diffuser', [0, .305, -2.31], [1.43, .07, .022], trim)
  box('leon-spoiler', [0, 1.387, -1.65], [1.35, .03, .16], paint)
  return car
}