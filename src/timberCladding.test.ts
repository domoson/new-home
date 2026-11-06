import { describe, expect, it } from 'vitest'
import { elevations, entryCanopy, house, makeFloor, roofEdgeDetail, roofEnvelope, roofFacadeRise, roofHeight, roofOuterElevation, slabThickness } from './model'
import { canopyTimberGeometry, timberBoardSections, timberGeometry, timberPieces, timberPresetAreas, timberProfiles, timberStoreyJoint } from './timberCladding'
import type { TimberArea } from './timberCladding'

describe('3D timber facade', () => {
  it('limits custom wood to selected floors and sides, unions overlaps and subtracts plaster areas', () => {
    const area: TimberArea = { id: 'wood', face: 'east', floor: 'OG', from: 10, to: 70, bottom: 20, top: 80, material: 'wood' }
    const pieces = timberPieces(['EG', 'OG', 'DG'], 'custom', 'bevelled', false, 'east', 'none', [area])
    expect(pieces.length).toBeGreaterThan(0)
    expect(pieces.every(piece => piece.face === 'east')).toBe(true)
    expect(pieces.every(piece => piece.polygon.every(([, height]) => height > elevations.OG && height < elevations.DG))).toBe(true)
    expect(timberPieces(['EG', 'OG', 'DG'], 'custom', 'bevelled', false, 'east', 'none', [area, { ...area, id: 'duplicate' }])).toEqual(pieces)
    expect(timberPieces(['EG', 'OG', 'DG'], 'custom', 'bevelled', false, 'east', 'none', [area, { ...area, id: 'cutout', material: 'plaster' }])).toEqual([])
    expect(timberPieces(['EG', 'OG', 'DG'], 'custom', 'bevelled', false, 'east', 'none', [{ ...area, enabled: false }])).toEqual([])
    expect(timberPieces(['EG', 'OG', 'DG'], 'custom', 'bevelled')).toEqual([])
  })
  it('preserves preset coverage and clips partial masks without overlapping backing surfaces', () => {
    const surfaceArea = (pieces: ReturnType<typeof timberPieces>) => pieces.filter(piece => piece.kind === 'backing').reduce((sum, piece) => sum + Math.abs(piece.polygon.reduce((value, point, index, points) => { const next = points[(index + 1) % points.length]; return value + point[0] * next[1] - next[0] * point[1] }, 0)) / 2, 0)
    for (const preset of ['plaster', 'timber', 'upper', 'gable', 'entry', 'og', 'og-entry', 'panels'] as const) {
      const areas = timberPresetAreas(preset, 'grooved')
      expect(surfaceArea(timberPieces(['EG', 'OG', 'DG'], 'custom', 'grooved', false, 'east', 'none', areas))).toBeCloseTo(surfaceArea(timberPieces(['EG', 'OG', 'DG'], preset, 'grooved')), 5)
    }
    const full: TimberArea = { id: 'full', face: 'south', floor: 'OG', from: 0, to: 100, bottom: 0, top: 100, material: 'wood' }
    const pieces = (areas: TimberArea[]) => timberPieces(['EG', 'OG', 'DG'], 'custom', 'shiplap', false, 'east', 'none', areas)
    const overlap = [{ ...full, id: 'left', to: 70 }, { ...full, id: 'right', from: 30 }]
    expect(surfaceArea(pieces(overlap))).toBeCloseTo(surfaceArea(pieces([full])), 5)
    const cutout: TimberArea = { ...full, id: 'cutout', from: 25, to: 75, bottom: 20, top: 80, material: 'plaster' }
    const after = surfaceArea(pieces([...overlap, cutout]))
    expect(after).toBeGreaterThan(0)
    expect(after).toBeLessThan(surfaceArea(pieces([full])))
    expect(surfaceArea(pieces([cutout, ...overlap]))).toBeCloseTo(after)
    expect(surfaceArea(pieces([{ ...full, from: -20, to: 120 }]))).toBeCloseTo(surfaceArea(pieces([full])))
    expect(pieces([{ ...full, from: 90, to: 10 }])).toEqual([])
  })
  it('uses the actual eaves height for DG percentages and retains masks in cutaway and mirrored houses', () => {
    const band: TimberArea = { id: 'band', face: 'north', floor: 'DG', from: 0, to: 100, bottom: 50, top: 100, material: 'wood' }
    for (const side of ['east', 'west'] as const) {
      const pieces = timberPieces(['DG'], 'custom', 'alternating-depth', false, side, 'none', [band])
      expect(pieces.filter(piece => piece.kind === 'board').length).toBeGreaterThan(0)
      expect(pieces.every(piece => piece.face === 'north')).toBe(true)
    }
    expect(timberPieces(['OG'], 'custom', 'boards', true, 'east', 'none', [{ ...band, floor: 'OG', bottom: 70 }])).toEqual([])
  })
  it('builds regular F-J cross-sections with actual rebates, grooves, bevels and depth changes', () => {
    const variable = timberBoardSections('variable-width', 0, .432)
    expect(variable.map(section => Math.round((section.end - section.start) * 1000))).toEqual([90, 140, 190])
    expect(variable.slice(1).map((section, index) => Math.round((section.start - variable[index].end) * 1000))).toEqual([4, 4])
    const rhythm = timberBoardSections('alternating-depth', 0, .14)
    expect(rhythm.map(section => Math.round((section.end - section.start) * 1000))).toEqual([45, 75])
    expect(rhythm.map(section => section.thickness)).toEqual([.024, .04])
    const lap = timberBoardSections('shiplap', 0, .348)
    expect(lap.some(section => section.back === .012 && section.end > .174)).toBe(true)
    expect(lap.every(section => section.kind === 'board')).toBe(true)
    for (const profile of ['shiplap', 'variable-width', 'grooved', 'bevelled', 'alternating-depth'] as const) {
      const depths = new Set<number>()
      for (const section of timberBoardSections(profile, 0, timberProfiles[profile].pitch)) {
        const geometry = timberGeometry({ face: 'south', plane: 0, polygon: [[section.start, 0], [section.end, 0], [section.end, 2], [section.start, 2]], back: section.back, thickness: section.thickness, slope: section.slope, frontSlope: section.frontSlope, slopeOrigin: section.origin, board: section.board, kind: section.kind, horizontal: false })
        const positions = geometry.getAttribute('position')
        for (let index = 0; index < positions.count; index++) {
          expect(positions.getY(index) === 0 || positions.getY(index) === 2).toBe(true)
          expect(positions.getZ(index)).toBeGreaterThanOrEqual(-1e-7)
          expect(positions.getZ(index)).toBeLessThanOrEqual(timberProfiles[profile].thickness + 1e-7)
          depths.add(Math.round(positions.getZ(index) * 1000))
        }
        if (section.frontSlope) expect(Array.from(geometry.getAttribute('normal').array).some(value => Math.abs(value) > .1 && Math.abs(value) < .95)).toBe(true)
        geometry.dispose()
      }
      if (profile === 'grooved') expect([...depths].sort((left, right) => left - right)).toEqual([0, 21, 24])
      if (profile === 'bevelled') expect([...depths].sort((left, right) => left - right)).toEqual([0, 10, 28])
    }
  })
  it('keeps every attic profile below the slim roof deck and inside its compact overhang', () => {
    const outline = roofEnvelope()
    for (const profile of Object.keys(timberProfiles) as (keyof typeof timberProfiles)[]) {
      for (const piece of timberPieces(['DG'], 'timber', profile)) {
        const geometry = timberGeometry(piece), positions = geometry.getAttribute('position')
        for (let index = 0; index < positions.count; index++) {
          expect(positions.getX(index)).toBeLessThan(outline.x + outline.width)
          expect(positions.getZ(index)).toBeGreaterThan(outline.z)
          expect(positions.getZ(index)).toBeLessThan(outline.z + outline.depth)
          expect(positions.getY(index)).toBeLessThanOrEqual(roofOuterElevation(positions.getZ(index)) - roofEdgeDetail.thickness - roofEdgeDetail.ventilationGap + 1e-6)
        }
        geometry.dispose()
      }
    }
  })
  it('places the canopy near the north wall and keeps every wood profile clear of the complete entrance assembly', () => {
    for (const side of ['east', 'west'] as const) {
      const floor = makeFloor('EG', side), canopy = entryCanopy(floor)
      const wall = floor.walls.find(wall => wall.id === 'east')!
      const door = wall.openings.find(opening => opening.id === 'entrance')!
      const doorStart = wall.z + door.start
      const entranceStart = wall.z + Math.min(...wall.openings.filter(opening => ['entrance', 'entrance-fixed'].includes(opening.id)).map(opening => opening.start))
      expect(canopy.z).toBeCloseTo(wall.z + .06)
      expect(canopy.depth).toBeGreaterThan(2.2)
      expect(canopy.depth).toBeLessThan(2.3)
      expect(canopy.z + canopy.depth).toBeCloseTo(doorStart + (door.width - .3 + 2.5) / 2)
      for (const profile of Object.keys(timberProfiles) as (keyof typeof timberProfiles)[]) {
        for (const { geometry } of canopyTimberGeometry(canopy, profile)) {
          const positions = geometry.getAttribute('position')
          for (let index = 0; index < positions.count; index++) {
            expect(positions.getZ(index)).toBeGreaterThan(wall.z)
            if (positions.getY(index) < canopy.bottom - .05) expect(positions.getZ(index)).toBeLessThan(entranceStart - .02)
          }
          geometry.dispose()
        }
      }
    }
  })
  for (const profile of Object.keys(timberProfiles) as (keyof typeof timberProfiles)[]) it(`${profile}: real depth, upper floors only, openings and gable preserved`, () => {
    const pieces = timberPieces(['EG', 'OG', 'DG'], 'upper', profile)
    expect(pieces.length).toBeGreaterThan(200)
    expect(pieces.some(piece => piece.kind === 'backing')).toBe(true)
    for (const piece of pieces) {
      expect(piece.face).not.toBe('west')
      for (const [along, height] of piece.polygon) {
        expect(height).toBeGreaterThanOrEqual(elevations.OG - slabThickness('OG') - 1e-7)
        if (piece.face === 'east') expect(height).toBeLessThanOrEqual(elevations.DG + roofHeight(along) + roofFacadeRise + 1e-7)
      }
      if (piece.kind !== 'board' && piece.kind !== 'batten') continue
      for (const id of ['OG', 'DG'] as const) {
        const wall = makeFloor(id).walls.find(wall => wall.id === piece.face)!
        const offset = piece.face === 'east' ? wall.z : wall.x
        for (const opening of wall.openings) {
          const left = offset + opening.start, right = left + opening.width
          const bottom = elevations[id] + opening.sill, top = bottom + opening.height
          const along = piece.polygon.reduce((sum, point) => sum + point[0], 0) / piece.polygon.length
          const height = piece.polygon.reduce((sum, point) => sum + point[1], 0) / piece.polygon.length
          expect(along > left && along < right && height > bottom && height < top).toBe(false)
        }
      }
      const geometry = timberGeometry(piece)
      geometry.computeBoundingBox()
      const size = geometry.boundingBox!
      expect(piece.face === 'east' ? size.max.x - size.min.x : size.max.z - size.min.z).toBeGreaterThan(.006)
      expect(Array.from(geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true)
      geometry.dispose()
    }
    expect(pieces.some(piece => piece.polygon.some(point => point[1] > elevations.DG + house.knee + 1))).toBe(true)
  })
  it('plaster has no added geometry; screens remain optional and limited', () => {
    expect(timberPieces(['EG', 'OG', 'DG'], 'plaster', 'boards')).toEqual([])
    expect(timberPieces(['OG'], 'upper', 'slats').some(piece => piece.kind === 'screen')).toBe(false)
    const screens = timberPieces(['OG'], 'upper', 'slats', false, 'east', 'screen').filter(piece => piece.kind === 'screen')
    expect(screens.length).toBeGreaterThan(0)
    expect(screens.every(piece => piece.face === 'east' && piece.back > .1)).toBe(true)
  })
  it('uses raised 40 mm storey joints with clearance to every timber profile', () => {
    for (const profile of Object.keys(timberProfiles) as (keyof typeof timberProfiles)[]) {
      const pieces = timberPieces(['OG', 'DG'], 'upper', profile)
      const joints = pieces.filter(piece => piece.kind === 'storey-joint')
      expect(joints.length).toBeGreaterThanOrEqual(6)
      for (const joint of joints) {
        const bottom = Math.min(...joint.polygon.map(point => point[1]))
        const top = Math.max(...joint.polygon.map(point => point[1]))
        expect(top - bottom).toBeCloseTo(timberStoreyJoint.height)
        for (const piece of pieces.filter(piece => piece.face === joint.face && piece.kind === 'board')) {
          const boardBottom = Math.min(...piece.polygon.map(point => point[1]))
          const boardTop = Math.max(...piece.polygon.map(point => point[1]))
          expect(boardTop <= bottom + 1e-7 || boardBottom >= top + timberStoreyJoint.gap - 1e-7).toBe(true)
        }
        const spec = timberProfiles[profile]
        const profileFront = .04 + spec.thickness + (profile === 'board-batten' ? .02 : profile === 'rhombus' ? .16 * spec.width : 0)
        expect(joint.back + joint.thickness - profileFront).toBeCloseTo(.018)
      }
    }
  })
})