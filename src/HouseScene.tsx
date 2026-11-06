import { lazy, Suspense, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'
import SceneDesignControls from './SceneDesignControls'
import type { SceneDesignControlsProps } from './SceneDesignControls'
import * as Slider from '@radix-ui/react-slider'
import { canvasPng } from './exportImage'
import { Columns3, Copy, DoorOpen, House, Lightbulb, LightbulbOff, MousePointer2, Plus, RotateCcw, Settings2, Sun, Trash2, X } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { elevations, floorIds, houseEnvelope, housePlacement, makeFloor } from './model'
import type { FloorId } from './model'
import { buildScene } from './scene'
import { createScalePeople } from './scalePeople'
import { daylightLevels, lightingCircuits } from './lighting'
import { createOutdoorLighting } from './outdoorLighting'
import { facadeCompositions, finishes, siteBoundary, sunPosition, woodProfiles, woodTones } from './context'
import type { FacadeComposition, HouseAppearance, SceneSettings, WoodProfile } from './context'
import { timberAreaExtent, timberPresetAreas } from './timberCladding'
import type { TimberArea, WindowTimber, WoodSurface } from './timberCladding'
import './scene-controls.css'

const TimberComparison = lazy(() => import('./TimberComparison'))

type House = 'east' | 'west'
type FacadeHandle = 'from' | 'to' | 'bottom' | 'top' | 'move'
type FacadePick = { house: House; face: TimberArea['face']; floor: TimberArea['floor']; along: number; height: number }
type FacadeTarget = FacadePick & { overlay: boolean }
type FacadeFrame = { house: House; face: TimberArea['face']; floor: TimberArea['floor']; profile: WoodProfile; area?: TimberArea }
type SceneDebug = { people?: () => { visible: boolean; positions: number[][] }; vehicle?: () => { position: number[]; screen: number[] } | null; position: () => { x: number; y: number; z: number }; teleport: (x: number, y: number, z: number) => void; look: (yaw: number) => void; door: (id?: string) => boolean; mode: string; meshes: number; snapshot: () => { openings: { id: string; open: boolean; rotation: number[]; tip: number[] }[]; sun: number[]; slabs: { name: string; colors: string[]; maps: boolean[] }[]; site: boolean }; facadePoint?: (house: House, face: TimberArea['face'], floor: TimberArea['floor'], along: number, height: number, offset?: number) => { x: number; y: number; pick: FacadePick | null } | null; facadeHandles?: () => { kind: FacadeHandle; x: number; y: number }[] }
declare global { interface Window { __house?: SceneDebug } }

const fullWood = (area: TimberArea) => area.enabled !== false && area.material === 'wood' && area.from === 0 && area.to === 100 && area.bottom === 0 && area.top === 100
function cellState(areas: TimberArea[], face: TimberArea['face'], floor: TimberArea['floor']) {
  const cell = areas.filter(area => area.face === face && area.floor === floor && area.enabled !== false)
  const full = cell.some(fullWood) && !cell.some(area => area.material === 'plaster')
  return { full, partial: !full && cell.some(area => area.material === 'wood') }
}
function setCellAreas(areas: TimberArea[], face: TimberArea['face'], floor: TimberArea['floor'], checked: boolean): { areas: TimberArea[]; added?: TimberArea } {
  const remaining = areas.filter(area => area.face !== face || area.floor !== floor)
  if (!checked) return { areas: remaining }
  const added: TimberArea = { id: crypto.randomUUID(), face, floor, from: 0, to: 100, bottom: 0, top: 100, material: 'wood' }
  return { areas: [...remaining, added], added }
}
function facadeLocal(face: TimberArea['face'], along: number, height: number, offset = 0) {
  const envelope = houseEnvelope()
  return face === 'east' ? new THREE.Vector3(envelope.x + envelope.width + offset, height, along) : new THREE.Vector3(along, height, face === 'north' ? envelope.z - offset : envelope.z + envelope.depth + offset)
}
function dragFacadeArea(kind: FacadeHandle, area: TimberArea, start: { along: number; height: number }, point: { along: number; height: number }): Partial<TimberArea> {
  const round = (value: number) => Math.round(value * 10) / 10, clamp = THREE.MathUtils.clamp
  if (kind === 'from') return { from: round(clamp(point.along, 0, area.to - 1)) }
  if (kind === 'to') return { to: round(clamp(point.along, area.from + 1, 100)) }
  if (kind === 'bottom') return { bottom: round(clamp(point.height, 0, area.top - 1)) }
  if (kind === 'top') return { top: round(clamp(point.height, area.bottom + 1, 100)) }
  const along = clamp(point.along - start.along, -area.from, 100 - area.to), height = clamp(point.height - start.height, -area.bottom, 100 - area.top)
  return { from: round(area.from + along), to: round(area.to + along), bottom: round(area.bottom + height), top: round(area.top + height) }
}

function AreaRanges({ area, onChange, prefix = '' }: { area: TimberArea; onChange: (patch: Partial<TimberArea>) => void; prefix?: string }) {
  const id = useId()
  return <div className="timber-area-ranges">{([
    { name: 'Horizontal', orientation: 'horizontal', keys: ['from', 'to'], labels: ['Beginn', 'Ende'] },
    { name: 'Vertikal', orientation: 'vertical', keys: ['bottom', 'top'], labels: ['Unterkante', 'Oberkante'] },
  ] as const).map(axis => <div className="timber-area-range" key={axis.orientation}>
    <div className="timber-range-heading"><span id={`${id}-${axis.orientation}`}>{axis.name}</span><output aria-live="off">{Number(area[axis.keys[0]].toFixed(1))} – {Number(area[axis.keys[1]].toFixed(1))} %</output></div>
    <Slider.Root className="timber-range" orientation={axis.orientation} aria-labelledby={`${id}-${axis.orientation}`} min={0} max={100} step={.1} minStepsBetweenThumbs={1} value={[area[axis.keys[0]], area[axis.keys[1]]]} onValueChange={([start, end]) => onChange({ [axis.keys[0]]: start, [axis.keys[1]]: end })}>
      <Slider.Track className="timber-range-track"><Slider.Range className="timber-range-selection" /></Slider.Track>
      {axis.keys.map((key, index) => <Slider.Thumb className="timber-range-thumb" key={key} aria-label={`${prefix}${axis.name} ${axis.labels[index]}`} aria-valuetext={`${Number(area[key].toFixed(1))} %`} />)}
    </Slider.Root>
  </div>)}</div>
}

function FacadeOverlay({ panelRef, target, areas, template, selectedId, onSelect, onAreas, onClose }: { panelRef: RefObject<HTMLElement | null>; target: FacadeTarget; areas: TimberArea[]; template?: string; selectedId: string; onSelect: (area?: TimberArea) => void; onAreas: (areas: TimberArea[]) => void; onClose: () => void }) {
  const cell = areas.filter(area => area.face === target.face && area.floor === target.floor)
  const selected = cell.find(area => area.id === selectedId)
  const { full, partial } = cellState(areas, target.face, target.floor)
  const faceName = target.face === 'north' ? 'Nordseite' : target.face === 'south' ? 'Südseite' : target.house === 'east' ? 'Ostgiebel' : 'Westgiebel'
  const edit = (patch: Partial<TimberArea>) => { if (selected) onAreas(areas.map(area => area.id === selected.id ? { ...area, ...patch } : area)) }
  const add = (material: TimberArea['material']) => {
    const width = material === 'wood' ? 30 : 20, height = material === 'wood' ? 100 : 30
    const from = Math.round(THREE.MathUtils.clamp(target.along - width / 2, 0, 100 - width) * 10) / 10
    const bottom = material === 'wood' ? 0 : Math.round(THREE.MathUtils.clamp(target.height - height / 2, 0, 100 - height) * 10) / 10
    const area: TimberArea = { id: crypto.randomUUID(), face: target.face, floor: target.floor, material, from, to: from + width, bottom, top: bottom + height }
    onAreas([...areas, area]); onSelect(area)
  }
  return <section ref={panelRef} className="facade-overlay" aria-label="Fassadenbereich">
    <header><strong>{target.house === 'east' ? 'Haus Ost' : 'Haus West'} · {faceName} · {target.floor}</strong><button className="icon-button" aria-label="Fassadenbereich schließen" title="Schließen" onClick={onClose}><X size={16} /></button></header>
    {template && <p className="facade-overlay-note">Vorlage „{template}“ wird beim Bearbeiten als freie Holzflächen übernommen.</p>}
    <label className="check-setting"><input type="checkbox" checked={full} ref={input => { if (input) input.indeterminate = partial }} onChange={event => { const result = setCellAreas(areas, target.face, target.floor, event.target.checked); onAreas(result.areas); onSelect(result.added) }} />Ganze Fläche in Holz</label>
    {cell.length > 0 && <div className="facade-overlay-areas" role="group" aria-label="Bereiche">{cell.map((area, index) => <button key={area.id} aria-pressed={area.id === selected?.id} onClick={() => onSelect(area)}>{area.material === 'wood' ? 'Holz' : 'Putz'} {index + 1}{area.enabled === false ? ' · aus' : ''}</button>)}</div>}
    <div className="timber-area-actions"><button onClick={() => add('wood')}><Plus size={14} />Holz hier</button><button onClick={() => add('plaster')}><Plus size={14} />Putz hier</button></div>
    {selected ? <>
      <AreaRanges area={selected} onChange={edit} prefix="Bereich " />
      <div className="facade-overlay-row"><select aria-label="Bereich Material" value={selected.material} onChange={event => edit({ material: event.target.value as TimberArea['material'] })}><option value="wood">Holz</option><option value="plaster">Putz / Ausschnitt</option></select><button className="icon-button" aria-label="Bereich löschen" title="Bereich löschen" onClick={() => { onAreas(areas.filter(area => area.id !== selected.id)); onSelect() }}><Trash2 size={16} /></button></div>
      <p className="facade-overlay-hint">Ränder und Mittelpunkt im 3D-Modell ziehen.</p>
    </> : <p className="facade-overlay-hint">Bereich auswählen oder hinzufügen.</p>}
  </section>
}

function TimberCoverageEditor({ areas, onChange, house, selectedId, onSelect }: { areas: TimberArea[]; onChange: (areas: TimberArea[]) => void; house: House; selectedId: string; onSelect: (area?: TimberArea) => void }) {
  const selected = areas.find(area => area.id === selectedId) ?? areas[0]
  const faces: { id: TimberArea['face']; name: string }[] = [{ id: 'north', name: 'Nord' }, { id: 'east', name: house === 'east' ? 'Ost' : 'West' }, { id: 'south', name: 'Süd' }]
  const levels = ['DG', 'OG', 'EG'] as const
  const setCell = (face: TimberArea['face'], floor: TimberArea['floor'], checked: boolean) => {
    const result = setCellAreas(areas, face, floor, checked)
    onChange(result.areas)
    if (result.added) onSelect(result.added)
  }
  const addArea = (material: TimberArea['material'], duplicate = false) => {
    const id = crypto.randomUUID()
    const area: TimberArea = duplicate && selected ? { ...selected, id } : { id, face: selected?.face ?? 'east', floor: selected?.floor ?? 'OG', material, from: 25, to: 75, bottom: 0, top: 100 }
    onChange([...areas, area]); onSelect(area)
  }
  const editArea = (patch: Partial<TimberArea>) => onChange(areas.map(area => area.id === selected?.id ? { ...area, ...patch } : area))
  return <div className="timber-coverage">
    <div className="timber-coverage-grid" role="group" aria-label="Holz nach Seite und Geschoss">
      <span />{faces.map(face => <strong key={face.id}>{face.name}</strong>)}
      {levels.map(floor => <div className="timber-coverage-row" key={floor}><strong>{floor}</strong>{faces.map(face => {
        const { full, partial } = cellState(areas, face.id, floor)
        return <label key={face.id} className={partial ? 'partial' : ''} title={`${face.name} · ${floor}`}><input type="checkbox" aria-label={`Holz ${face.name} ${floor}`} checked={full} ref={input => { if (input) input.indeterminate = partial }} onChange={event => setCell(face.id, floor, event.target.checked)} /></label>
      })}</div>)}
    </div>
    <div className="timber-area-actions"><button onClick={() => addArea('wood')}><Plus size={15} />Holzfläche</button><button onClick={() => addArea('plaster')}><Plus size={15} />Putzausschnitt</button></div>
    {selected ? <>
      <label htmlFor="timber-area">Fläche</label><select id="timber-area" value={selected.id} onChange={event => onSelect(areas.find(area => area.id === event.target.value))}>{areas.map((area, index) => <option key={area.id} value={area.id}>{index + 1} · {area.material === 'wood' ? 'Holz' : 'Putz'} · {faces.find(face => face.id === area.face)?.name} · {area.floor}</option>)}</select>
      <div className="timber-area-toolbar"><label className="check-setting"><input type="checkbox" checked={selected.enabled !== false} onChange={event => editArea({ enabled: event.target.checked })} />Fläche aktiv</label><button className="icon-button" aria-label="Fläche duplizieren" title="Fläche duplizieren" onClick={() => addArea(selected.material, true)}><Copy size={16} /></button><button className="icon-button" aria-label="Fläche löschen" title="Fläche löschen" onClick={() => onChange(areas.filter(area => area.id !== selected.id))}><Trash2 size={16} /></button></div>
      <div className="timber-area-fields"><label>Seite<select aria-label="Fläche Seite" value={selected.face} onChange={event => editArea({ face: event.target.value as TimberArea['face'] })}>{faces.map(face => <option key={face.id} value={face.id}>{face.name}</option>)}</select></label><label>Geschoss<select aria-label="Fläche Geschoss" value={selected.floor} onChange={event => editArea({ floor: event.target.value as TimberArea['floor'] })}>{levels.map(floor => <option key={floor}>{floor}</option>)}</select></label></div>
      <label htmlFor="timber-area-material">Material</label><select id="timber-area-material" value={selected.material} onChange={event => editArea({ material: event.target.value as TimberArea['material'] })}><option value="wood">Holz</option><option value="plaster">Putz / Ausschnitt</option></select>
      <AreaRanges area={selected} onChange={editArea} />
    </> : <output className="timber-coverage-empty">Keine Holzflächen</output>}
  </div>
}

function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const activePointerId = useRef<number | null>(null)
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)

  const updatePosition = (clientX: number, clientY: number) => {
    if (!baseRef.current) return
    const rect = baseRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = clientX - centerX
    const dy = clientY - centerY

    const knobWidth = knobRef.current ? knobRef.current.offsetWidth : 44
    const maxRadius = Math.max(10, (rect.width - knobWidth) / 2)
    const distance = Math.hypot(dx, dy)
    const clampedDistance = Math.min(distance, maxRadius)
    const angle = Math.atan2(dy, dx)

    const knobX = Math.cos(angle) * clampedDistance
    const knobY = Math.sin(angle) * clampedDistance

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`
    }

    if (clampedDistance < 3) {
      onMove(0, 0)
      return
    }

    const normX = knobX / maxRadius
    const normY = -knobY / maxRadius
    onMove(normX, normY)
  }

  const reset = () => {
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)'
    }
    onMove(0, 0)
  }

  return (
    <div
      ref={baseRef}
      className="joystick-base"
      aria-label="Virtueller Joystick zum Gehen"
      role="group"
      onPointerDown={event => {
        event.stopPropagation()
        activePointerId.current = event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId)
        updatePosition(event.clientX, event.clientY)
      }}
      onPointerMove={event => {
        if (activePointerId.current === event.pointerId) {
          updatePosition(event.clientX, event.clientY)
        }
      }}
      onPointerUp={event => {
        if (activePointerId.current === event.pointerId) {
          activePointerId.current = null
          reset()
        }
      }}
      onPointerCancel={event => {
        if (activePointerId.current === event.pointerId) {
          activePointerId.current = null
          reset()
        }
      }}
    >
      <div className="joystick-ring" />
      <div className="joystick-arrow joystick-arrow-up" />
      <div className="joystick-arrow joystick-arrow-down" />
      <div className="joystick-arrow joystick-arrow-left" />
      <div className="joystick-arrow joystick-arrow-right" />
      <div ref={knobRef} className="joystick-knob" />
    </div>
  )
}

export default function HouseScene({ floorId, mode, furnished, roof, cutWalls, selected, reset, settings, onSettings, captureImage, designs }: { floorId: FloorId; mode: 'orbit' | 'walk'; furnished: boolean; roof: boolean; cutWalls: boolean; selected: string; reset: number; settings: SceneSettings; onSettings: (settings: SceneSettings) => void; captureImage: RefObject<(() => Promise<Blob>) | null>; designs: Omit<SceneDesignControlsProps, 'settings' | 'onSettings'> }) {
  const container = useRef<HTMLDivElement>(null)
  const commands = useRef<{ captureImage: () => Promise<Blob>; key: (key: string, down: boolean) => void; move: (x: number, y: number) => void; door: (id?: string) => boolean; opening: (id: string, amount: number) => void; lock: () => void; home: () => void; facade: () => void; settings: (value: SceneSettings) => void; facadeFrame: (frame: FacadeFrame | null) => void; viewInset: (pixels: number) => void } | null>(null)
  const facadeEditing = useRef<{ pick: (pick: FacadePick) => void; drag: (house: House, id: string, patch: Partial<TimberArea>) => void } | null>(null)
  const frameRef = useRef<FacadeFrame | null>(null), insetRef = useRef(0), overlayRef = useRef<HTMLElement>(null)
  useImperativeHandle(captureImage, () => async () => {
    if (!commands.current) throw new Error('Die Ansicht ist noch nicht bereit. Bitte erneut versuchen.')
    return commands.current.captureImage()
  }, [])
  const latestSettings = useRef(settings)
  const [materialHouse, setMaterialHouse] = useState<'east' | 'west'>('east')
  const [facadeTarget, setFacadeTarget] = useState<FacadeTarget | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<Record<House, string>>({ east: '', west: '' })
  const [lightHouse, setLightHouse] = useState<'east' | 'west'>('east')
  const [lightFloor, setLightFloor] = useState<FloorId>(floorId)
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [currentFloor, setCurrentFloor] = useState<string>(floorId)
  useEffect(() => { latestSettings.current = settings; commands.current?.settings(settings) }, [settings])
  useEffect(() => {
    const host = container.current!
    let cancelled = false, cleanup: (() => void) | undefined
    const start = async () => {
      const physics = mode === 'walk' ? await import('./walk') : null
      if (physics) await physics.initializePhysics()
      if (cancelled) return
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: import.meta.env.DEV })
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.setClearColor('#f1f4eb'); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1
      host.appendChild(renderer.domElement); renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', 'Interaktives Raummodell')
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#f1f4eb')
      renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true
      const camera = new THREE.PerspectiveCamera(55, 1, .04, 150)
      const ambient = new THREE.HemisphereLight('#e5efff', '#7c8179', .12); scene.add(ambient)
      const sky = new THREE.DirectionalLight('#e5efff', .55); sky.position.set(-8, 35, -12); sky.target.position.set(0, 0, 5)
      sky.castShadow = true; sky.shadow.mapSize.set(2048, 2048); sky.shadow.camera.left = -18; sky.shadow.camera.right = 18; sky.shadow.camera.top = 18; sky.shadow.camera.bottom = -18; sky.shadow.camera.far = 70; sky.shadow.normalBias = .015; sky.shadow.bias = -.0001; scene.add(sky, sky.target)
      const sun = new THREE.DirectionalLight('#fff4d9', 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -24; sun.shadow.camera.right = 24; sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24; sun.shadow.camera.far = 100; sun.shadow.normalBias = .025; sun.shadow.bias = -.00015; sun.target.position.set(1, 0, 6); scene.add(sun, sun.target)
      const model = buildScene(floorId, mode === 'walk', roof, furnished, cutWalls, true, { east: latestSettings.current.entryCanopy, west: latestSettings.current.west.entryCanopy }); scene.add(model.group)
      const people = createScalePeople(mode === 'walk' || roof ? floorIds : [floorId], furnished)
      people.group.position.set(housePlacement.x, 0, housePlacement.z)
      scene.add(people.group)
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const outdoorLighting = createOutdoorLighting(model.group)
      const globalFill = new THREE.Group(); scene.add(globalFill)
      if (mode === 'walk') for (const level of floorIds) for (const west of [false, true]) {
        const light = new THREE.PointLight('#fff5db', 22, 12, 1.8)
        light.position.set(west ? -4.3 : 4.3, elevations[level] + 2.5, 5 + (west ? 1.2 : 0)); globalFill.add(light)
      }
      const lightsOff = Object.fromEntries(lightingCircuits.flatMap(circuit => [[circuit.id, false], [`west-${circuit.id}`, false]]))
      let lightingFloor = floorId
      const applyRoomLights = (value: SceneSettings) => model.setLighting(value.lightingMode === 'global' ? lightsOff : value.lights, lightingFloor)
      let renderRequested = true
      const applySettings = (value: SceneSettings) => {
        renderRequested = true
        people.set(value.people, value.peopleMoving && !reducedMotion)
        renderer.shadowMap.needsUpdate = true
        const solar = sunPosition(value.hour, value.season)
        const levels = daylightLevels(solar.altitude, value.lightingMode)
        outdoorLighting.update(levels.exterior)
        model.setDaylight(levels.interior)
        renderer.toneMappingExposure = value.lightingMode === 'global' ? 1.25 : 1
        globalFill.visible = value.lightingMode === 'global'
        sun.position.set(-Math.sin(solar.azimuth) * Math.cos(solar.altitude) * 45 + 1, Math.sin(solar.altitude) * 45, Math.cos(solar.azimuth) * Math.cos(solar.altitude) * 45 + 6)
        sun.intensity = levels.sun; sky.intensity = levels.sky
        sun.color.set(solar.altitude < .25 ? '#ffd2a3' : '#fff7e9'); ambient.intensity = levels.ambient
        applyRoomLights(value)
        for (const key of ['facade', 'roof', 'roofTrim', 'entryDoor', 'frame', 'frameInside'] as const) model.setFinish(key, value[key])
        model.setCladding(value.composition, value.woodTone, value.woodProfile, 'east', value.timber)
        for (const key of ['facade', 'roof', 'roofTrim', 'entryDoor', 'frame', 'frameInside'] as const) model.setFinish(key, value.west[key], 'west')
        model.setCladding(value.west.composition, value.west.woodTone, value.west.woodProfile, 'west', value.west.timber)
        for (const side of ['east', 'west'] as const) model.setFinish('interiorDoor', value.interiorDoor, side)
        model.setRaffstores(value.raffstoreExtension, value.raffstoreTilt)
        model.setGroundOpacity(value.transparentGround ? .2 : 1)
        const neighborhood = model.group.getObjectByName('neighborhood'), garden = model.group.getObjectByName('landscaping')
        if (neighborhood) neighborhood.visible = value.surroundings
        if (garden) garden.visible = value.landscaping
        scene.background = levels.background
        scene.fog = value.surroundings ? new THREE.Fog(levels.background, 48, 115) : null
      }
      applySettings(latestSettings.current)
      const updateOpenings = () => { renderer.shadowMap.needsUpdate = true }
      updateOpenings()
      const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enabled = mode === 'orbit'; controls.maxPolarAngle = Math.PI * .48; controls.minDistance = 3; controls.maxDistance = 100
      const pointer = new PointerLockControls(camera, renderer.domElement); pointer.pointerSpeed = .65
      const room = makeFloor(floorId).rooms.find(room => room.id === selected)
      const spawn = new THREE.Vector3((room?.spawn[0] ?? 3.32) + housePlacement.x, elevations[floorId], (room?.spawn[1] ?? 6.95) + housePlacement.z)
      const walker = physics ? physics.createWalker(model, camera, spawn) : null
      const toggleOpening = (id?: string) => {
        const result = walker ? walker.toggleDoor(id) : id ? model.toggleOpening(id) : false
        updateOpenings(); return result
      }
      const home = () => {
        if (walker) { walker.teleport(spawn); camera.rotation.set(0, Math.PI, 0, 'YXZ') }
        else {
          if (roof) {
            const aspect = host.clientWidth / Math.max(1, host.clientHeight), vertical = (aspect < .75 ? 67 : 55) * Math.PI / 180
            const bounds = new THREE.Box3().setFromPoints(siteBoundary.flatMap(([east, south]) => [new THREE.Vector3(east, -.14, south), new THREE.Vector3(east, 9.7, south)]))
            const center = bounds.getCenter(new THREE.Vector3()), radius = bounds.getSize(new THREE.Vector3()).length() / 2
            const distance = radius / Math.sin(Math.min(vertical, 2 * Math.atan(Math.tan(vertical / 2) * aspect)) / 2)
            controls.target.copy(center); camera.position.copy(center).addScaledVector(new THREE.Vector3(1, 1.1, 1.25).normalize(), distance)
          } else {
            const centerHeight = elevations[floorId] + .5; controls.target.set(0, centerHeight, 6.1); camera.position.set(18, centerHeight + 19, 25)
            const aspect = host.clientWidth / Math.max(1, host.clientHeight)
            if (aspect < .75) { const distance = 11 / Math.sin(Math.atan(Math.tan(67 * Math.PI / 360) * aspect)); camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(1, 1.15, 1.1).normalize(), distance) }
          }
          controls.update()
        }
      }
      home()
      let viewInset = insetRef.current
      const applyView = () => { if (viewInset > 0 && mode === 'orbit') camera.setViewOffset(host.clientWidth, host.clientHeight, 0, viewInset / 2, host.clientWidth, host.clientHeight); else camera.clearViewOffset() }
      const resize = () => { renderRequested = true; renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); if (mode === 'orbit' && camera.aspect < .75) { camera.fov = 67; camera.updateProjectionMatrix() } applyView() }
      const observer = new ResizeObserver(resize); observer.observe(host); resize()
      const houseObject = (house: House) => model.group.getObjectByName(house === 'east' ? 'house-east' : 'house-west')
      const houseProfile = (house: House) => (house === 'east' ? latestSettings.current : latestSettings.current.west).woodProfile
      const rayAt = (x: number, y: number) => {
        const bounds = renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster()
        ray.setFromCamera(new THREE.Vector2((x - bounds.left) / bounds.width * 2 - 1, -(y - bounds.top) / bounds.height * 2 + 1), camera)
        return ray
      }
      const screenOf = (world: THREE.Vector3) => {
        const bounds = renderer.domElement.getBoundingClientRect(), point = world.clone().project(camera)
        return { x: bounds.left + (point.x + 1) / 2 * bounds.width, y: bounds.top + (1 - point.y) / 2 * bounds.height }
      }
      const doorOf = (hit: THREE.Intersection) => hit.object.userData.opening ?? model.doors.find(door => { let object: THREE.Object3D | null = hit.object; while (object) { if (object === door.pivot) return true; object = object.parent } return false })
      const facadePick = (hit: THREE.Intersection): FacadePick | null => {
        if (/^(main-|roof-|attic-)/.test(hit.object.name) || doorOf(hit)) return null
        let object: THREE.Object3D | null = hit.object, house: House | undefined
        while (object && !house) { if (object.name === 'house-east') house = 'east'; else if (object.name === 'house-west') house = 'west'; object = object.parent }
        const target = house && houseObject(house)
        if (!house || !target) return null
        const local = target.worldToLocal(hit.point.clone()), envelope = houseEnvelope()
        const sides = ([['east', local.x - envelope.x - envelope.width, local.z], ['north', envelope.z - local.z, local.x], ['south', local.z - envelope.z - envelope.depth, local.x]] as const).filter(([, distance]) => distance > -.2 && distance < .4).sort((left, right) => right[1] - left[1])
        const percent = (value: number, start: number, end: number) => Math.round(THREE.MathUtils.clamp((value - start) / (end - start) * 100, 0, 100) * 10) / 10
        for (const [face, , along] of sides) for (const floor of ['EG', 'OG', 'DG'] as const) {
          const extent = timberAreaExtent(face, floor, houseProfile(house))
          if (local.y < extent.bottom - .02 || local.y > extent.top + .02 || along < extent.left - .2 || along > extent.right + .2) continue
          return { house, face, floor, along: percent(along, extent.left, extent.right), height: percent(local.y, extent.bottom, extent.top) }
        }
        return null
      }
      const editor = new THREE.Group(); editor.name = 'facade-editor'; editor.matrixAutoUpdate = false; editor.visible = false; scene.add(editor)
      const editorMaterial = (color: string, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
      const cellLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9, depthTest: false }))
      const areaLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#173f2a', depthTest: false }))
      const areaFillMaterial = editorMaterial('#3f8a5a', .24), areaFill = new THREE.Mesh(new THREE.BufferGeometry(), areaFillMaterial)
      for (const [order, object] of [cellLine, areaFill, areaLine].entries()) { object.renderOrder = 990 + order; object.frustumCulled = false; editor.add(object) }
      const handleGeometry = new THREE.SphereGeometry(1, 18, 12)
      const handleMaterials = [editorMaterial('#173f2a'), editorMaterial('#ffffff'), editorMaterial('#3f8a5a'), new THREE.MeshBasicMaterial({ visible: false })]
      const handles = (['from', 'to', 'bottom', 'top', 'move'] as const).map(kind => {
        const handle = new THREE.Group(); handle.userData.kind = kind
        const outline = new THREE.Mesh(handleGeometry, handleMaterials[0]); outline.scale.setScalar(1.3); outline.renderOrder = 995
        const inner = new THREE.Mesh(handleGeometry, handleMaterials[kind === 'move' ? 2 : 1]); inner.renderOrder = 996
        const target = new THREE.Mesh(handleGeometry, handleMaterials[3]); target.scale.setScalar(2.4); target.userData.kind = kind
        handle.add(outline, inner, target); editor.add(handle); return handle
      })
      const handleTargets = handles.map(handle => handle.children[2])
      const scaleHandles = () => {
        if (!editor.visible) return
        editor.updateMatrixWorld(true)
        for (const handle of handles) handle.scale.setScalar(Math.max(.03, camera.position.distanceTo(handle.getWorldPosition(new THREE.Vector3())) * .011))
      }
      const setLine = (line: THREE.LineLoop, points: THREE.Vector3[]) => { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(points) }
      let frame: FacadeFrame | null = null
      const showFrame = (value: FacadeFrame | null) => {
        frame = value; renderRequested = true
        const target = value && mode === 'orbit' ? houseObject(value.house) : undefined
        editor.visible = !!target
        if (!value || !target) return
        target.updateWorldMatrix(true, false); editor.matrix.copy(target.matrixWorld); editor.matrixWorldNeedsUpdate = true
        const extent = timberAreaExtent(value.face, value.floor, value.profile)
        const point = (along: number, height: number) => facadeLocal(value.face, extent.left + (extent.right - extent.left) * along / 100, extent.bottom + (extent.top - extent.bottom) * height / 100, .12)
        const corners = (from: number, to: number, bottom: number, top: number) => [point(from, bottom), point(to, bottom), point(to, top), point(from, top)]
        setLine(cellLine, corners(0, 100, 0, 100))
        const area = value.area
        areaLine.visible = areaFill.visible = !!area
        for (const handle of handles) handle.visible = !!area
        if (area) {
          const box = corners(area.from, area.to, area.bottom, area.top)
          setLine(areaLine, box)
          areaFill.geometry.dispose(); areaFill.geometry = new THREE.BufferGeometry().setFromPoints([box[0], box[1], box[2], box[0], box[2], box[3]])
          areaFillMaterial.color.set(area.material === 'wood' ? '#3f8a5a' : '#c46a4b'); areaFillMaterial.opacity = area.enabled === false ? .08 : .24
          const along = (area.from + area.to) / 2, height = (area.bottom + area.top) / 2
          const positions: Record<FacadeHandle, THREE.Vector3> = { from: point(area.from, height), to: point(area.to, height), bottom: point(along, area.bottom), top: point(along, area.top), move: point(along, height) }
          for (const handle of handles) handle.position.copy(positions[handle.userData.kind as FacadeHandle])
        }
        scaleHandles()
      }
      const facadePercent = (x: number, y: number) => {
        const target = frame && houseObject(frame.house)
        if (!frame || !target) return null
        const envelope = houseEnvelope(), ray = rayAt(x, y).ray.clone().applyMatrix4(target.matrixWorld.clone().invert())
        const plane = frame.face === 'east' ? new THREE.Plane(new THREE.Vector3(1, 0, 0), -(envelope.x + envelope.width + .12)) : new THREE.Plane(new THREE.Vector3(0, 0, 1), -(frame.face === 'north' ? envelope.z - .12 : envelope.z + envelope.depth + .12))
        const hit = ray.intersectPlane(plane, new THREE.Vector3())
        if (!hit) return null
        const extent = timberAreaExtent(frame.face, frame.floor, frame.profile), along = frame.face === 'east' ? hit.z : hit.x
        return { along: (along - extent.left) / (extent.right - extent.left) * 100, height: (hit.y - extent.bottom) / (extent.top - extent.bottom) * 100 }
      }
      const handleAt = (x: number, y: number) => {
        if (mode !== 'orbit' || !editor.visible || !frame?.area) return undefined
        editor.updateMatrixWorld(true)
        return rayAt(x, y).intersectObjects(handleTargets, false).find(hit => hit.object.parent?.visible)?.object.userData.kind as FacadeHandle | undefined
      }
      let drag: { kind: FacadeHandle; pointerId: number; start: { along: number; height: number }; area: TimberArea } | null = null
      let pendingDrag: Partial<TimberArea> | null = null, lastCommit = 0, commitTimer = 0
      const commitDrag = () => {
        commitTimer = 0
        if (!pendingDrag || !frame?.area) return
        lastCommit = performance.now(); facadeEditing.current?.drag(frame.house, frame.area.id, pendingDrag); pendingDrag = null
      }
      const dragDown = (event: PointerEvent) => {
        const kind = handleAt(event.clientX, event.clientY), start = kind && facadePercent(event.clientX, event.clientY)
        if (!kind || !start || !frame?.area) return
        event.stopImmediatePropagation(); event.preventDefault()
        drag = { kind, pointerId: event.pointerId, start, area: { ...frame.area } }
        controls.enabled = false; renderer.domElement.setPointerCapture(event.pointerId); renderer.domElement.style.cursor = 'grabbing'
      }
      const dragMove = (event: PointerEvent) => {
        if (!drag) { if (event.buttons === 0 && mode === 'orbit') renderer.domElement.style.cursor = handleAt(event.clientX, event.clientY) ? 'grab' : ''; return }
        if (event.pointerId !== drag.pointerId) return
        event.stopImmediatePropagation()
        const point = facadePercent(event.clientX, event.clientY)
        if (!point || !frame?.area) return
        pendingDrag = dragFacadeArea(drag.kind, drag.area, drag.start, point)
        showFrame({ ...frame, area: { ...frame.area, ...pendingDrag } })
        if (!commitTimer) commitTimer = window.setTimeout(commitDrag, Math.max(0, 90 - (performance.now() - lastCommit)))
      }
      const dragUp = (event: PointerEvent) => {
        if (!drag || event.pointerId !== drag.pointerId) return
        event.stopImmediatePropagation()
        window.clearTimeout(commitTimer); drag = null; commitDrag()
        controls.enabled = mode === 'orbit'; renderer.domElement.style.cursor = ''
        if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
      }
      renderer.domElement.addEventListener('pointerdown', dragDown, { capture: true }); renderer.domElement.addEventListener('pointermove', dragMove, { capture: true })
      renderer.domElement.addEventListener('pointerup', dragUp, { capture: true }); renderer.domElement.addEventListener('pointercancel', dragUp, { capture: true })
      let dragging: { x: number; y: number } | null = null
      let press: { x: number; y: number } | null = null
      const down = (event: PointerEvent) => { press = { x: event.clientX, y: event.clientY }; if (mode === 'walk') { renderer.domElement.focus(); if (!pointer.isLocked) { dragging = { x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture(event.pointerId) } } }
      const move = (event: PointerEvent) => { if (dragging && !pointer.isLocked) { camera.rotation.order = 'YXZ'; camera.rotation.y -= (event.clientX - dragging.x) * .004; camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - (event.clientY - dragging.y) * .004, -1.35, 1.35); dragging = { x: event.clientX, y: event.clientY } } }
      const up = (event: PointerEvent) => {
        if (event.type !== 'pointercancel' && press && Math.hypot(event.clientX - press.x, event.clientY - press.y) < 5) {
          const bounds = renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster()
          ray.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera)
          const hit = ray.intersectObjects(model.group.children, true)[0]
          if (hit && model.activateVehicle(hit.object)) renderRequested = true
          else if (hit) {
            const door = doorOf(hit)
            const pick = mode === 'orbit' ? facadePick(hit) : null
            if (door) toggleOpening(door.id)
            else if (pick) facadeEditing.current?.pick(pick)
          }
        }
        press = null; dragging = null
      }
      const clear = () => { if (walker) { walker.keys.clear(); walker.moveVector.x = 0; walker.moveVector.y = 0 }; dragging = null }
      const wheel = (event: WheelEvent) => {
        if (!walker) return
        event.preventDefault()
        const ray = new THREE.Raycaster(); ray.far = 3
        ray.setFromCamera(new THREE.Vector2(0, 0), camera)
        const hit = ray.intersectObjects(model.group.children, true)[0]
        if (!hit) return
        const opening = hit.object.userData.opening ?? model.doors.find(door => { let object: THREE.Object3D | null = hit.object; while (object) { if (object === door.pivot) return true; object = object.parent } return false })
        if (!opening) return
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? host.clientHeight : 1)
        const result = walker.setOpening(opening.id, THREE.MathUtils.clamp(opening.amount - delta * .001, 0, 1))
        updateOpenings(); return result
      }
      const keydown = (event: KeyboardEvent) => { if (!walker || (event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName))) return; if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); walker.keys.add(event.code) } if (event.code === 'KeyE' && !event.repeat) toggleOpening(); if (event.code === 'Escape') clear() }
      const keyup = (event: KeyboardEvent) => walker?.keys.delete(event.code)
      window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear)
      renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('pointercancel', up)
      pointer.addEventListener('unlock', clear)
      renderer.domElement.addEventListener('wheel', wheel, { passive: false })
      const facadeView = () => {
        renderRequested = true
        const aspect = host.clientWidth / Math.max(1, host.clientHeight), vertical = camera.fov * Math.PI / 180
        const distance = 11 / Math.sin(Math.min(vertical, 2 * Math.atan(Math.tan(vertical / 2) * aspect)) / 2)
        controls.target.set(0, 4.5, 5.6); camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(1, .55, 1.1).normalize(), distance); controls.update()
      }
      commands.current = { captureImage() { const visible = editor.visible; editor.visible = false; renderer.render(scene, camera); const image = canvasPng(renderer.domElement); editor.visible = visible; renderRequested = true; return image }, key(key, pressed) { if (pressed) walker?.keys.add(key); else walker?.keys.delete(key) }, move(x, y) { if (walker) { walker.moveVector.x = x; walker.moveVector.y = y } }, door: toggleOpening, opening(id, amount) { const result = walker ? walker.setOpening(id, amount) : model.setOpening(id, amount); updateOpenings(); return result }, lock() { if (pointer.isLocked) pointer.unlock(); else pointer.lock() }, home, facade: facadeView, settings: applySettings, facadeFrame(value) { if (!drag) showFrame(value) }, viewInset(pixels) { viewInset = pixels; applyView(); scaleHandles(); renderRequested = true } }
      showFrame(frameRef.current)
      let last = performance.now(), accumulator = 0, lastFloor = floorId as string
      renderer.setAnimationLoop(() => {
        const now = performance.now(), delta = Math.min((now - last) / 1000, .1); accumulator += delta; last = now
        while (accumulator >= 1 / 60) { walker?.tick(); accumulator -= 1 / 60 }
        if (walker) { const elevation = walker.position().y - .9; const found = elevation > 5.75 ? 'DG' : elevation > 2.8 ? 'OG' : elevation > -.15 ? 'EG' : 'KG'; if (found !== lastFloor) { lastFloor = found; lightingFloor = found; applyRoomLights(latestSettings.current); renderer.shadowMap.needsUpdate = true; setCurrentFloor(found); setLightFloor(found) } }
        const moved = mode === 'orbit' && controls.update()
        if (editor.visible && (moved || renderRequested)) scaleHandles()
        const animated = model.updateAnimations(reducedMotion ? 0 : now / 1000) && !reducedMotion && (floorId === 'KG' || mode === 'walk')
        const peopleAnimated = people.update(now / 1000)
        if (peopleAnimated) renderer.shadowMap.needsUpdate = true
        if (model.updateVehicle(delta, reducedMotion)) {
          renderer.shadowMap.needsUpdate = true
          const car = model.group.getObjectByName('seat-leon-st-grey')
          if (car && mode === 'orbit') {
            for (let adjustment = 0; adjustment < (reducedMotion ? 24 : 1); adjustment++) {
              const corners = [-1, 1].flatMap(east => [0, 1.45].flatMap(height => [-2.33, 2.33].map(south => car.localToWorld(new THREE.Vector3(east, height, south)).project(camera))))
              if (corners.every(point => Math.max(Math.abs(point.x), Math.abs(point.y)) <= .86)) break
              camera.position.sub(controls.target).multiplyScalar(1.04).add(controls.target); controls.update()
            }
          }
        }
        if (walker || moved || animated || peopleAnimated || renderRequested || renderer.shadowMap.needsUpdate) { renderer.render(scene, camera); renderRequested = false }
      })
      if (import.meta.env.DEV) { let meshes = 0; model.group.traverse(object => { if (object instanceof THREE.Mesh) meshes++ }); window.__house = { position: () => walker?.position() ?? camera.position, teleport: (x, y, z) => walker?.teleport(new THREE.Vector3(x, y, z)), look: yaw => { camera.rotation.set(0, yaw, 0, 'YXZ') }, door: toggleOpening, mode, meshes, snapshot: () => ({ openings: model.doors.map(door => ({ id: door.id, open: door.open, rotation: door.pivot.quaternion.toArray(), tip: door.center.clone().multiplyScalar(2).applyMatrix4(door.pivot.matrixWorld).toArray() })), sun: sun.position.toArray(), slabs: model.group.children.filter(object => object.name.endsWith('-slab')).map(object => { const mesh = object as THREE.Mesh; const materials = mesh.material as THREE.MeshStandardMaterial[]; return { name: mesh.name, colors: materials.map(material => material.color.getHexString()), maps: materials.map(material => !!material.map) } }), site: !!model.group.getObjectByName('site-ground') }) } }
      setLoading(false)
      if (import.meta.env.DEV && window.__house) {
        window.__house.facadePoint = (house, face, floor, along, height, offset = 0) => {
          const target = houseObject(house)
          if (!target) return null
          const extent = timberAreaExtent(face, floor, houseProfile(house))
          const screen = screenOf(target.localToWorld(facadeLocal(face, extent.left + (extent.right - extent.left) * along / 100, extent.bottom + (extent.top - extent.bottom) * height / 100, offset)))
          const hit = rayAt(screen.x, screen.y).intersectObjects(model.group.children, true)[0]
          return { ...screen, pick: hit ? facadePick(hit) : null }
        }
        window.__house.facadeHandles = () => editor.visible ? handles.filter(handle => handle.visible).map(handle => ({ kind: handle.userData.kind as FacadeHandle, ...screenOf(handle.getWorldPosition(new THREE.Vector3())) })) : []
      }
      if (import.meta.env.DEV && window.__house) window.__house.people = () => ({ visible: people.group.visible, positions: people.group.children.map(person => person.position.toArray()) })
      if (import.meta.env.DEV && window.__house) window.__house.vehicle = () => {
        const car = model.group.getObjectByName('seat-leon-st-grey')
        if (!car) return null
        const rear = car.localToWorld(new THREE.Vector3(0, .58, -2.322)).project(camera)
        return { position: car.position.toArray(), screen: [rear.x, rear.y] }
      }
      cleanup = () => { window.clearTimeout(commitTimer); commands.current = null; delete window.__house; renderer.setAnimationLoop(null); observer.disconnect(); pointer.unlock(); pointer.dispose(); controls.dispose(); walker?.dispose(); people.dispose(); model.dispose(); for (const object of [cellLine, areaLine, areaFill]) object.geometry.dispose(); for (const material of [cellLine.material, areaLine.material, areaFillMaterial, ...handleMaterials]) material.dispose(); handleGeometry.dispose(); sun.dispose(); sky.dispose(); renderer.dispose(); renderer.domElement.remove(); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear) }
    }
    start().catch(reason => { if (!cancelled) { setError(reason instanceof Error ? reason.message : '3D konnte nicht gestartet werden.'); setLoading(false) } })
    return () => { cancelled = true; cleanup?.() }
  }, [floorId, mode, furnished, roof, cutWalls, selected, reset, settings.entryCanopy, settings.west.entryCanopy])
  const update = (patch: Partial<SceneSettings>) => onSettings({ ...settings, ...patch, ...(patch.lights ? { lightingMode: 'room' as const } : {}) })
  const [compareTimber, setCompareTimber] = useState(false)
  const lightPrefix = lightHouse === 'west' ? 'west-' : ''
  const setFloorLights = (on: boolean) => update({ lights: { ...settings.lights, ...Object.fromEntries(lightingCircuits.filter(circuit => circuit.floor === lightFloor).map(circuit => [lightPrefix + circuit.id, on])) } })
  const appearance = materialHouse === 'east' ? settings : settings.west
  const updateAppearance = (patch: Partial<HouseAppearance>) => update(materialHouse === 'east' ? patch : { west: { ...settings.west, ...patch } })
  const houseSettings = (house: House) => house === 'east' ? settings : settings.west
  const editableAreas = (house: House) => { const value = houseSettings(house); return value.composition === 'custom' ? value.timber?.areas ?? [] : timberPresetAreas(value.composition, value.woodProfile) }
  const setHouseAreas = (house: House, areas: TimberArea[]) => {
    const patch = { composition: 'custom' as const, timber: { ...houseSettings(house).timber, areas } }
    update(house === 'east' ? patch : { west: { ...settings.west, ...patch } })
  }
  const focusArea = (house: House, area?: TimberArea) => {
    setSelectedAreas(previous => ({ ...previous, [house]: area?.id ?? '' }))
    if (area) setFacadeTarget(previous => ({ house, face: area.face, floor: area.floor, along: (area.from + area.to) / 2, height: (area.bottom + area.top) / 2, overlay: previous?.overlay ?? false }))
  }
  useEffect(() => {
    facadeEditing.current = {
      pick(pick) {
        const hit = editableAreas(pick.house).filter(area => area.face === pick.face && area.floor === pick.floor && area.enabled !== false && pick.along >= area.from && pick.along <= area.to && pick.height >= area.bottom && pick.height <= area.top).sort((left, right) => (left.to - left.from) * (left.top - left.bottom) - (right.to - right.from) * (right.top - right.bottom))[0]
        setMaterialHouse(pick.house)
        setSelectedAreas(previous => ({ ...previous, [pick.house]: hit?.id ?? '' }))
        setFacadeTarget({ ...pick, overlay: true })
      },
      drag(house, id, patch) { setHouseAreas(house, editableAreas(house).map(area => area.id === id ? { ...area, ...patch } : area)) },
    }
  })
  const frameTarget = facadeTarget && mode === 'orbit' ? facadeTarget : null
  const frameKey = frameTarget ? JSON.stringify({ house: frameTarget.house, face: frameTarget.face, floor: frameTarget.floor, profile: houseSettings(frameTarget.house).woodProfile, area: editableAreas(frameTarget.house).find(area => area.id === selectedAreas[frameTarget.house] && area.face === frameTarget.face && area.floor === frameTarget.floor) }) : ''
  useEffect(() => {
    const value = frameKey ? JSON.parse(frameKey) as FacadeFrame : null
    frameRef.current = value; commands.current?.facadeFrame(value)
  }, [frameKey])
  const overlayKey = facadeTarget?.overlay && mode === 'orbit' ? `${facadeTarget.house}-${facadeTarget.face}-${facadeTarget.floor}` : ''
  useEffect(() => {
    const measure = () => {
      const overlay = overlayRef.current, host = container.current
      insetRef.current = overlay && host && overlay.offsetWidth > host.clientWidth * .6 ? Math.max(0, host.getBoundingClientRect().bottom - overlay.getBoundingClientRect().top) : 0
      commands.current?.viewInset(insetRef.current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const element of [overlayRef.current, container.current]) if (element) observer.observe(element)
    return () => { observer.disconnect(); insetRef.current = 0; commands.current?.viewInset(0) }
  }, [overlayKey])
  const solar = sunPosition(settings.hour, settings.season)
  const clock = `${String(Math.floor(settings.hour)).padStart(2, '0')}:${String(Math.round(settings.hour % 1 * 60)).padStart(2, '0')}`
  return <><div ref={container} className="scene-container" />
    {!loading && !error && <details className="scene-settings" onToggle={event => { if (!event.currentTarget.open) setFacadeTarget(previous => previous?.overlay ? previous : null) }}><summary title="Sonne, Materialien und Öffnungen" aria-label="Szeneneinstellungen"><Settings2 size={18} /><span>Szene</span></summary><div className="settings-body">
      <SceneDesignControls {...designs} settings={settings} onSettings={onSettings} />
      <fieldset className="finish-settings"><legend>Maßstabsfiguren</legend><label className="check-setting"><input type="checkbox" checked={settings.people} onChange={event => update({ people: event.target.checked })} />Personen</label><label className="check-setting"><input type="checkbox" checked={settings.peopleMoving} disabled={!settings.people} onChange={event => update({ peopleMoving: event.target.checked })} />Bewegung</label><output>175 · 165 · 120 · 95 cm</output></fieldset>
      <div className="settings-heading"><Sun size={16} /><strong>Sonnenstand</strong><output>{clock}</output></div>
      <div className="lighting-mode" role="group" aria-label="Beleuchtungsmodus"><button aria-pressed={settings.lightingMode === 'room'} onClick={() => update({ lightingMode: 'room' })}>{lightingCircuits.length ? 'Raumlicht' : 'Tageslicht'}</button><button aria-pressed={settings.lightingMode === 'global'} onClick={() => update({ lightingMode: 'global' })}>Global</button></div>
      <fieldset className="sun-settings"><legend>Sonnenlicht</legend><label htmlFor="sun-hour">Ortszeit</label><input id="sun-hour" type="range" min="0" max="23.75" step=".25" value={settings.hour} onChange={event => update({ hour: Number(event.target.value) })} /><label htmlFor="sun-season">Datum</label><select id="sun-season" value={settings.season} onChange={event => update({ season: event.target.value as SceneSettings['season'] })}><option value="spring">20. März · MEZ</option><option value="summer">21. Juni · MESZ</option><option value="winter">21. Dezember · MEZ</option></select><output className="sun-altitude">{solar.altitude > 0 ? `Sonnenhöhe ${Math.round(solar.altitude * 180 / Math.PI)}°` : 'Sonne unter dem Horizont'}</output></fieldset>
      {lightingCircuits.length > 0 && settings.lightingMode === 'room' && <fieldset className="finish-settings"><legend>Raumbeleuchtung</legend><label htmlFor="light-house">Licht · Haushälfte</label><select id="light-house" value={lightHouse} onChange={event => setLightHouse(event.target.value as 'east' | 'west')}><option value="east">Haus Ost</option><option value="west">Haus West</option></select><label htmlFor="light-floor">Licht · Geschoss</label><select id="light-floor" value={lightFloor} onChange={event => setLightFloor(event.target.value as FloorId)}>{['KG', 'EG', 'OG', 'DG'].map(level => <option key={level} value={level}>{level}</option>)}</select><div className="settings-heading"><strong>{lightFloor} · {lightHouse === 'east' ? 'Ost' : 'West'}</strong><button className="icon-button" aria-label="Geschosslicht einschalten" title="Alle Leuchten dieses Geschosses einschalten" onClick={() => setFloorLights(true)}><Lightbulb size={18} /></button><button className="icon-button" aria-label="Geschosslicht ausschalten" title="Alle Leuchten dieses Geschosses ausschalten" onClick={() => setFloorLights(false)}><LightbulbOff size={18} /></button></div>{lightingCircuits.filter(circuit => circuit.floor === lightFloor).map(circuit => <label className="check-setting" key={circuit.id}><input type="checkbox" checked={settings.lights[lightPrefix + circuit.id] ?? circuit.defaultOn} onChange={event => update({ lights: { ...settings.lights, [lightPrefix + circuit.id]: event.target.checked } })} />{circuit.label}</label>)}</fieldset>}
      <fieldset className="finish-settings"><legend>Oberflächen</legend>
        <label htmlFor="material-house">Haushälfte</label><select id="material-house" value={materialHouse} onChange={event => setMaterialHouse(event.target.value as 'east' | 'west')}><option value="east">Haus Ost</option><option value="west">Haus West</option></select>
        <div className="facade-label"><label htmlFor="facade-composition">Fassadenentwurf</label>{mode === 'orbit' && roof && <button className="icon-button" title="Gebäude heranzoomen" aria-label="Fassadenansicht" onClick={() => commands.current?.facade()}><House size={18} /></button>}</div><select id="facade-composition" value={appearance.composition} onChange={event => {
          const composition = event.target.value as FacadeComposition
          updateAppearance({ composition, ...(composition === 'custom' ? { timber: { ...appearance.timber, areas: appearance.timber?.areas ?? timberPresetAreas(appearance.composition, appearance.woodProfile) } } : {}) })
        }}>{facadeCompositions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
        {appearance.composition === 'custom' ? <TimberCoverageEditor key={materialHouse} house={materialHouse} areas={appearance.timber?.areas ?? []} selectedId={selectedAreas[materialHouse]} onSelect={area => focusArea(materialHouse, area)} onChange={areas => updateAppearance({ timber: { ...appearance.timber, areas } })} /> : <button className="timber-area-preset" onClick={() => updateAppearance({ composition: 'custom', timber: { ...appearance.timber, areas: timberPresetAreas(appearance.composition, appearance.woodProfile) } })}><Copy size={15} />Vorlage als Holzflächen</button>}
        {appearance.composition !== 'plaster' && <div className="finish-row wood-tone"><span>Holzton</span><div>{woodTones.map((tone, index) => <button key={tone.name} className="color-swatch" style={{ backgroundColor: tone.color }} title={tone.name} aria-label={`Holz ${tone.name}`} aria-pressed={appearance.woodTone === index} onClick={() => updateAppearance({ woodTone: index })} />)}</div></div>}
        {(['facade', 'roof', 'roofTrim', 'entryDoor', 'frame', 'frameInside'] as const).map(key => <div className="finish-row" key={key}><span>{{ facade: 'Putzfarbe', roof: 'Dach', roofTrim: 'Dachunterbau', entryDoor: 'Haustür', frame: 'Fenster außen', frameInside: 'Fenster innen' }[key]}</span><div>{finishes[key === 'frameInside' ? 'frame' : key].map(finish => <button key={finish.color} className="color-swatch" style={{ backgroundColor: finish.color }} title={finish.name} aria-label={`${{ facade: 'Fassade', roof: 'Dach', roofTrim: 'Dachunterbau', entryDoor: 'Haustür', frame: 'Fenster außen', frameInside: 'Fenster innen' }[key]} ${finish.name}`} aria-pressed={appearance[key] === finish.color} onClick={() => updateAppearance({ [key]: finish.color })} />)}</div></div>)}
      </fieldset>
      <fieldset className="finish-settings"><legend>Innentüren · alle Geschosse</legend><div className="finish-row"><span>Türen & Zargen</span><div>{finishes.interiorDoor.map(finish => <button key={finish.color} className="color-swatch" style={{ backgroundColor: finish.color }} title={finish.name} aria-label={`Innentüren ${finish.name}`} aria-pressed={settings.interiorDoor === finish.color} onClick={() => update({ interiorDoor: finish.color })} />)}</div></div></fieldset>
      <fieldset className="finish-settings"><legend>Sonnenschutz · beide Häuser</legend><label htmlFor="raffstore-extension">Absenkung <output>{Math.round(settings.raffstoreExtension * 100)} %</output></label><input id="raffstore-extension" type="range" min="0" max="1" step=".01" value={settings.raffstoreExtension} onChange={event => update({ raffstoreExtension: Number(event.target.value) })} /><label htmlFor="raffstore-tilt">Raffstore-Lamellenwinkel <output>{settings.raffstoreTilt}°</output></label><input id="raffstore-tilt" type="range" min="0" max="75" step="5" value={settings.raffstoreTilt} onChange={event => update({ raffstoreTilt: Number(event.target.value) })} /></fieldset>
      <label className="check-setting"><input type="checkbox" checked={settings.transparentGround} onChange={event => update({ transparentGround: event.target.checked })} />Gelände transparent</label>
      <label className="check-setting"><input type="checkbox" checked={settings.surroundings} onChange={event => update({ surroundings: event.target.checked })} />Nachbarschaft</label><label className="check-setting"><input type="checkbox" checked={settings.landscaping} onChange={event => update({ landscaping: event.target.checked })} />Garten, Hecke und Zaun</label>
      <fieldset className="finish-settings"><legend>Holzfassade · 3D</legend>
        <label className="check-setting"><input type="checkbox" checked={appearance.entryCanopy ?? true} onChange={event => updateAppearance({ entryCanopy: event.target.checked })} />Eingangsüberdachung</label>
        <label htmlFor="wood-profile">Holzprofil</label><select id="wood-profile" value={appearance.woodProfile} onChange={event => updateAppearance({ woodProfile: event.target.value as WoodProfile })}>{woodProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
        <label htmlFor="wood-species">Holzart / Farbton</label><select id="wood-species" value={appearance.woodTone} onChange={event => updateAppearance({ woodTone: Number(event.target.value) })}>{woodTones.map((tone, index) => <option key={tone.name} value={index}>{tone.name}</option>)}</select>
        <label htmlFor="wood-surface">Oberfläche</label><select id="wood-surface" value={appearance.timber?.surface ?? 'fresh'} onChange={event => updateAppearance({ timber: { ...appearance.timber, surface: event.target.value as WoodSurface } })}><option value="fresh">Naturbelassen</option><option value="oiled">Leicht geölt</option><option value="weathered">Silbergrau bewittert</option></select>
        <label htmlFor="wood-windows">Fensteranschluss</label><select id="wood-windows" value={appearance.timber?.windows ?? 'none'} onChange={event => updateAppearance({ timber: { ...appearance.timber, windows: event.target.value as WindowTimber } })}><option value="none">Metallanschluss</option><option value="reveals">Holzlaibung</option><option value="screen">Partieller Fensterschirm</option></select>
        <button className="timber-compare-button" onClick={() => setCompareTimber(true)}><Columns3 size={17} />Fassadenvergleich</button>
      </fieldset>
      {appearance.composition === 'plaster' && <div className="finish-row wood-tone"><span>Vordach</span><div>{woodTones.map((tone, index) => <button key={tone.name} className="color-swatch" style={{backgroundColor: tone.color}} title={tone.name} aria-label={`Holz ${tone.name}`} aria-pressed={appearance.woodTone === index} onClick={() => updateAppearance({woodTone: index})} />)}</div></div>}
    </div></details>}
    {facadeTarget?.overlay && mode === 'orbit' && !loading && !error && <FacadeOverlay panelRef={overlayRef} target={facadeTarget} areas={editableAreas(facadeTarget.house)} template={houseSettings(facadeTarget.house).composition === 'custom' ? undefined : facadeCompositions.find(option => option.id === houseSettings(facadeTarget.house).composition)?.name} selectedId={selectedAreas[facadeTarget.house]} onSelect={area => focusArea(facadeTarget.house, area)} onAreas={areas => setHouseAreas(facadeTarget.house, areas)} onClose={() => setFacadeTarget(null)} />}
    {compareTimber && <Suspense fallback={null}><TimberComparison onClose={() => setCompareTimber(false)} /></Suspense>}
    {loading && <div className="loading">Raummodell wird aufgebaut…</div>}{error && <div className="scene-error"><strong>3D ist hier nicht verfügbar.</strong><p>{error}</p><p>Der 2D-Grundriss bleibt verfügbar.</p></div>}{mode === 'walk' && !loading && !error && <><div className="crosshair" /><Joystick onMove={(x, y) => commands.current?.move(x, y)} /><div className="walk-actions"><button className="icon-button" title="Nächste Tür öffnen/schließen (E)" aria-label="Tür öffnen oder schließen" onClick={() => commands.current?.door()}><DoorOpen size={19} /></button><button className="icon-button" title="Mausblick aktivieren; Escape zum Freigeben" aria-label="Mausblick" onClick={() => commands.current?.lock()}><MousePointer2 size={19} /></button><button className="icon-button" title="Zum Raumeinstieg zurück" aria-label="Zum Raumeinstieg" onClick={() => commands.current?.home()}><RotateCcw size={19} /></button></div><div className="walk-floor">{currentFloor}</div></>}</>
}