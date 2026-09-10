export type StairPoint = [number, number]
export const winderCore = { x: .4, z: 3.6, width: 2.18, depth: 2.2, end: 5.8, tread: .27, risers: 16, runWidth: .9, arrivalDepth: 1.62 }
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
  const core = winderCore, center: StairPoint = [core.x + 1.1, core.z + 1.1]
  const result: WinderStep[] = []
  const rectangle = (east: number, south: number, width: number, depth: number): StairPoint[] => [[east, south], [east + width, south], [east + width, south + depth], [east, south + depth]]
  for (let index = 0; index < 4; index++) {
    const east = core.x + core.width - (index + 1) * core.tread
    result.push({ id: `north-${index}`, footprint: rectangle(east, core.z, core.tread, core.runWidth), inner: [[east, core.z + core.runWidth], [east + core.tread, core.z + core.runWidth]], height: (index + 1) * rise / core.risers })
  }
  const point = (angle: number, radius: number): StairPoint => [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]
  for (let index = 0; index < 8; index++) {
    const start = -Math.PI / 2 - index * Math.PI / 8, end = start - Math.PI / 8
    const outer = (angle: number) => point(angle, 1.1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))))
    const innerStart = point(start, .2), innerEnd = point(end, .2)
    result.push({ id: `winder-${index}`, footprint: [innerStart, outer(start), outer(end), innerEnd], inner: [innerStart, innerEnd], height: (index + 5) * rise / core.risers })
  }
  for (let index = 0; index < 3; index++) {
    const east = center[0] + index * core.tread, south = core.end - core.runWidth
    const width = index === 2 ? core.tread * 2 : core.tread
    result.push({ id: `south-${index}`, footprint: rectangle(east, south, width, core.runWidth), inner: [[east, south], [east + width, south]], height: (index + 13) * rise / core.risers })
  }
  return result
}

export function stairWalkingLine(rise: number): [number, number, number][] {
  const core = winderCore, center = [core.x + 1.1, core.z + 1.1]
  const points: [number, number, number][] = [[core.x + core.width + .35, 0, core.z + .45], [center[0], rise * 4 / 16, core.z + .45]]
  for (let index = 1; index <= 16; index++) {
    const angle = -Math.PI / 2 - index * Math.PI / 16
    points.push([center[0] + .65 * Math.cos(angle), rise * (4 + index / 2) / 16, center[1] + .65 * Math.sin(angle)])
  }
  points.push([core.x + core.width + .35, rise, core.end - .45])
  return points
}