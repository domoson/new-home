export type StairPoint = [number, number]
export const winderCore = { x: .3, z: 4.085, width: 1.9, depth: 2, end: 6.085, tread: .3, risers: 15, runWidth: .85, turnSize: 1, arrivalDepth: 1.1 }
export type WinderStep = { id: string; footprint: StairPoint[]; inner: [StairPoint, StairPoint]; height: number }

export function stairPrism(footprint: StairPoint[], bottom: number, height: number) {
  const signedArea = footprint.reduce((sum, point, index) => { const next = footprint[(index + 1) % footprint.length]; return sum + point[0] * next[1] - next[0] * point[1] }, 0)
  const points = signedArea > 0 ? footprint : [...footprint].reverse(), count = points.length
  const vertices = new Float32Array([bottom, bottom + height].flatMap(elevation => points.flatMap(([east, south]) => [east, elevation, south])))
  const faces: number[] = []
  for (let index = 1; index < count - 1; index++) faces.push(0, index, index + 1, count, count + index + 1, count + index)
  for (let index = 0; index < count; index++) { const next = (index + 1) % count; faces.push(index, count + index, count + next, index, count + next, next) }
  return { vertices, indices: new Uint32Array(faces) }
}

export function winderSteps(rise: number): WinderStep[] {
  const core = winderCore, turnSize = core.turnSize, center: StairPoint = [core.x + turnSize, core.z + turnSize]
  const result: WinderStep[] = []
  const rectangle = (east: number, south: number, width: number, depth: number): StairPoint[] => [[east, south], [east + width, south], [east + width, south + depth], [east, south + depth]]
  const point = (angle: number, radius: number): StairPoint => [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]
  const endTread = (core.width - turnSize) / 3
  for (let index = 0; index < 3; index++) {
    const east = core.x + core.width - (index + 1) * endTread
    result.push({ id: `north-${index}`, footprint: rectangle(east, core.z, endTread, core.runWidth), inner: [[east + endTread, core.z + core.runWidth], [east, core.z + core.runWidth]], height: (index + 1) * rise / core.risers })
  }
  for (let index = 0; index < 8; index++) {
    const start = -Math.PI / 2 - index * Math.PI / 8, end = start - Math.PI / 8
    const outer = (angle: number) => point(angle, turnSize / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))))
    const innerStart = point(start, turnSize - core.runWidth), innerEnd = point(end, turnSize - core.runWidth)
    result.push({ id: `winder-${index}`, footprint: [innerStart, outer(start), outer(end), innerEnd], inner: [innerStart, innerEnd], height: (index + 4) * rise / core.risers })
  }
  for (let index = 0; index < 3; index++) {
    const east = center[0] + index * endTread
    const width = endTread
    result.push({ id: `south-${index}`, footprint: rectangle(east, core.end - core.runWidth, width, core.runWidth), inner: [[east, core.end - core.runWidth], [east + width, core.end - core.runWidth]], height: (index + 12) * rise / core.risers })
  }
  const mirror = ([east, south]: StairPoint): StairPoint => [east, core.z + core.end - south]
  return result.map(step => ({ ...step, footprint: step.footprint.map(mirror).reverse(), inner: [mirror(step.inner[1]), mirror(step.inner[0])] }))
}

export function stairWalkingLine(rise: number): [number, number, number][] {
  const core = winderCore, center = [core.x + core.turnSize, core.z + core.turnSize]
  const halfRun = core.runWidth / 2, radius = core.turnSize - halfRun
  const points: [number, number, number][] = [[core.x + core.width + .6, 0, core.z + halfRun], [center[0], rise * 3 / core.risers, core.z + halfRun]]
  for (let index = 1; index <= 16; index++) {
    const angle = -Math.PI / 2 - index * Math.PI / 16
    points.push([center[0] + radius * Math.cos(angle), rise * (3 + index / 2) / core.risers, center[1] + radius * Math.sin(angle)])
  }
  points.push([core.x + core.width + .6, rise, core.end - halfRun])
  return points.map(([east, height, south]) => [east, height, core.z + core.end - south])
}