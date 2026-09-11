export type StairPoint = [number, number]
export const winderCore = { x: .4, z: 2.8, width: 1.88, depth: 3.18, end: 5.98, tread: .26, risers: 16, runWidth: 1, arrivalDepth: .95 }
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
  const core = winderCore, turnSize = 1.2, center: StairPoint = [core.x + turnSize, core.z + turnSize]
  const result: WinderStep[] = []
  const rectangle = (east: number, south: number, width: number, depth: number): StairPoint[] => [[east, south], [east + width, south], [east + width, south + depth], [east, south + depth]]
  const point = (angle: number, radius: number): StairPoint => [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]
  const endTread = (core.width - turnSize) / 2
  for (let index = 0; index < 2; index++) {
    const east = core.x + core.width - (index + 1) * endTread
    result.push({ id: `north-${index}`, footprint: rectangle(east, core.z, endTread, core.runWidth), inner: [[east + endTread, core.z + core.runWidth], [east, core.z + core.runWidth]], height: (index + 1) * rise / core.risers })
  }
  for (let index = 0; index < 4; index++) {
    const start = -Math.PI / 2 - index * Math.PI / 8, end = start - Math.PI / 8
    const outer = (angle: number) => point(angle, turnSize / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))))
    const innerStart = point(start, .2), innerEnd = point(end, .2)
    result.push({ id: `winder-${index}`, footprint: [innerStart, outer(start), outer(end), innerEnd], inner: [innerStart, innerEnd], height: (index + 3) * rise / core.risers })
  }
  for (let index = 0; index < 3; index++) {
    const south = center[1] + index * core.tread, east = core.x + core.runWidth
    result.push({ id: `middle-${index}`, footprint: rectangle(core.x, south, core.runWidth, core.tread), inner: [[east, south], [east, south + core.tread]], height: (index + 7) * rise / core.risers })
  }
  center[1] = core.end - turnSize
  for (let index = 0; index < 4; index++) {
    const start = Math.PI - index * Math.PI / 8, end = start - Math.PI / 8
    const outer = (angle: number) => point(angle, turnSize / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))))
    const innerStart = point(start, .2), innerEnd = point(end, .2)
    result.push({ id: `winder-${index + 4}`, footprint: [innerStart, outer(start), outer(end), innerEnd], inner: [innerStart, innerEnd], height: (index + 10) * rise / core.risers })
  }
  for (let index = 0; index < 2; index++) {
    const east = center[0] + index * endTread
    result.push({ id: `south-${index}`, footprint: rectangle(east, core.end - core.runWidth, endTread, core.runWidth), inner: [[east, core.end - core.runWidth], [east + endTread, core.end - core.runWidth]], height: (index + 14) * rise / core.risers })
  }
  return result
}

export function stairWalkingLine(rise: number): [number, number, number][] {
  const core = winderCore, center = [core.x + 1.2, core.z + 1.2]
  const points: [number, number, number][] = [[core.x + core.width + .6, 0, core.z + .5], [center[0], rise * 2 / 16, core.z + .5]]
  for (let index = 1; index <= 8; index++) {
    const angle = -Math.PI / 2 - index * Math.PI / 16
    points.push([center[0] + .7 * Math.cos(angle), rise * (2 + index / 2) / 16, center[1] + .7 * Math.sin(angle)])
  }
  center[1] = core.end - 1.2
  points.push([core.x + .5, rise * 9 / 16, center[1]])
  for (let index = 1; index <= 8; index++) {
    const angle = Math.PI - index * Math.PI / 16
    points.push([center[0] + .7 * Math.cos(angle), rise * (9 + index / 2) / 16, center[1] + .7 * Math.sin(angle)])
  }
  points.push([core.x + core.width + .6, rise, core.end - .5])
  return points
}