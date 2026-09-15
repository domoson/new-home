import { useEffect, useRef, useState } from 'react'
import { DoorOpen, House, Lightbulb, LightbulbOff, MousePointer2, RotateCcw, Settings2, Sun } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { elevations, floorIds, makeFloor } from './model'
import type { FloorId } from './model'
import { buildScene } from './scene'
import { daylightLevels, lightingCircuits } from './lighting'
import { createOutdoorLighting } from './outdoorLighting'
import { facadeCompositions, finishes, siteBoundary, sunPosition, woodProfiles, woodTones } from './context'
import type { FacadeComposition, FinishKey, HouseAppearance, SceneSettings, WoodProfile } from './context'
import './scene-controls.css'

type SceneDebug = { vehicle?: () => { position: number[]; screen: number[] } | null; position: () => { x: number; y: number; z: number }; teleport: (x: number, y: number, z: number) => void; look: (yaw: number) => void; door: (id?: string) => boolean; mode: string; meshes: number; snapshot: () => { openings: { id: string; open: boolean; rotation: number[]; tip: number[] }[]; sun: number[]; slabs: { name: string; colors: string[]; maps: boolean[] }[]; site: boolean } }
declare global { interface Window { __house?: SceneDebug } }

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

export default function HouseScene({ floorId, mode, furnished, roof, cutWalls, selected, reset, settings, onSettings }: { floorId: FloorId; mode: 'orbit' | 'walk'; furnished: boolean; roof: boolean; cutWalls: boolean; selected: string; reset: number; settings: SceneSettings; onSettings: (settings: SceneSettings) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const commands = useRef<{ key: (key: string, down: boolean) => void; move: (x: number, y: number) => void; door: (id?: string) => boolean; opening: (id: string, amount: number) => void; lock: () => void; home: () => void; facade: () => void; settings: (value: SceneSettings) => void } | null>(null)
  const latestSettings = useRef(settings)
  const [materialHouse, setMaterialHouse] = useState<'east' | 'west'>('east')
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
      const model = buildScene(floorId, mode === 'walk', roof, furnished, cutWalls); scene.add(model.group)
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
        for (const key of ['facade', 'roof', 'frame'] as const) model.setFinish(key, value[key])
        model.setCladding(value.composition, value.woodTone, value.woodProfile)
        for (const key of ['facade', 'roof', 'frame'] as const) model.setFinish(key, value.west[key], 'west')
        model.setCladding(value.west.composition, value.west.woodTone, value.west.woodProfile, 'west')
        model.setCarportRoof(value.carportRoof)
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
      const spawn = new THREE.Vector3(room?.spawn[0] ?? 3.32, elevations[floorId], room?.spawn[1] ?? 6.95)
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
      const resize = () => { renderRequested = true; renderer.setSize(host.clientWidth, host.clientHeight); camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); if (mode === 'orbit' && camera.aspect < .75) { camera.fov = 67; camera.updateProjectionMatrix() } }
      const observer = new ResizeObserver(resize); observer.observe(host); resize()
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
          else if (hit) { const door = hit.object.userData.opening ?? model.doors.find(door => { let object: THREE.Object3D | null = hit.object; while (object) { if (object === door.pivot) return true; object = object.parent } return false }); if (door) toggleOpening(door.id) }
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
      commands.current = { key(key, pressed) { if (pressed) walker?.keys.add(key); else walker?.keys.delete(key) }, move(x, y) { if (walker) { walker.moveVector.x = x; walker.moveVector.y = y } }, door: toggleOpening, opening(id, amount) { const result = walker ? walker.setOpening(id, amount) : model.setOpening(id, amount); updateOpenings(); return result }, lock() { if (pointer.isLocked) pointer.unlock(); else pointer.lock() }, home, facade: facadeView, settings: applySettings }
      let last = performance.now(), accumulator = 0, lastFloor = floorId as string
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      renderer.setAnimationLoop(() => {
        const now = performance.now(), delta = Math.min((now - last) / 1000, .1); accumulator += delta; last = now
        while (accumulator >= 1 / 60) { walker?.tick(); accumulator -= 1 / 60 }
        if (walker) { const elevation = walker.position().y - .9; const found = elevation > 5.75 ? 'DG' : elevation > 2.8 ? 'OG' : elevation > -.15 ? 'EG' : 'KG'; if (found !== lastFloor) { lastFloor = found; lightingFloor = found; applyRoomLights(latestSettings.current); renderer.shadowMap.needsUpdate = true; setCurrentFloor(found); setLightFloor(found) } }
        const moved = mode === 'orbit' && controls.update()
        const animated = model.updateAnimations(reducedMotion ? 0 : now / 1000) && !reducedMotion && (floorId === 'KG' || mode === 'walk')
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
        if (walker || moved || animated || renderRequested || renderer.shadowMap.needsUpdate) { renderer.render(scene, camera); renderRequested = false }
      })
      if (import.meta.env.DEV) { let meshes = 0; model.group.traverse(object => { if (object instanceof THREE.Mesh) meshes++ }); window.__house = { position: () => walker?.position() ?? camera.position, teleport: (x, y, z) => walker?.teleport(new THREE.Vector3(x, y, z)), look: yaw => { camera.rotation.set(0, yaw, 0, 'YXZ') }, door: toggleOpening, mode, meshes, snapshot: () => ({ openings: model.doors.map(door => ({ id: door.id, open: door.open, rotation: door.pivot.quaternion.toArray(), tip: door.center.clone().multiplyScalar(2).applyMatrix4(door.pivot.matrixWorld).toArray() })), sun: sun.position.toArray(), slabs: model.group.children.filter(object => object.name.endsWith('-slab')).map(object => { const mesh = object as THREE.Mesh; const materials = mesh.material as THREE.MeshStandardMaterial[]; return { name: mesh.name, colors: materials.map(material => material.color.getHexString()), maps: materials.map(material => !!material.map) } }), site: !!model.group.getObjectByName('site-ground') }) } }
      setLoading(false)
      if (import.meta.env.DEV && window.__house) window.__house.vehicle = () => {
        const car = model.group.getObjectByName('seat-leon-st-grey')
        if (!car) return null
        const rear = car.localToWorld(new THREE.Vector3(0, .58, -2.322)).project(camera)
        return { position: car.position.toArray(), screen: [rear.x, rear.y] }
      }
      cleanup = () => { commands.current = null; delete window.__house; renderer.setAnimationLoop(null); observer.disconnect(); pointer.unlock(); pointer.dispose(); controls.dispose(); walker?.dispose(); model.dispose(); sun.dispose(); sky.dispose(); renderer.dispose(); renderer.domElement.remove(); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear) }
    }
    start().catch(reason => { if (!cancelled) { setError(reason instanceof Error ? reason.message : '3D konnte nicht gestartet werden.'); setLoading(false) } })
    return () => { cancelled = true; cleanup?.() }
  }, [floorId, mode, furnished, roof, cutWalls, selected, reset])
  const update = (patch: Partial<SceneSettings>) => onSettings({ ...settings, ...patch, ...(patch.lights ? { lightingMode: 'room' as const } : {}) })
  const lightPrefix = lightHouse === 'west' ? 'west-' : ''
  const setFloorLights = (on: boolean) => update({ lights: { ...settings.lights, ...Object.fromEntries(lightingCircuits.filter(circuit => circuit.floor === lightFloor).map(circuit => [lightPrefix + circuit.id, on])) } })
  const appearance = materialHouse === 'east' ? settings : settings.west
  const updateAppearance = (patch: Partial<HouseAppearance>) => update(materialHouse === 'east' ? patch : { west: { ...settings.west, ...patch } })
  const solar = sunPosition(settings.hour, settings.season)
  const clock = `${String(Math.floor(settings.hour)).padStart(2, '0')}:${String(Math.round(settings.hour % 1 * 60)).padStart(2, '0')}`
  return <><div ref={container} className="scene-container" />
    {!loading && !error && <details className="scene-settings"><summary title="Sonne, Materialien und Öffnungen" aria-label="Szeneneinstellungen"><Settings2 size={18} /><span>Szene</span></summary><div className="settings-body">
      <div className="settings-heading"><Sun size={16} /><strong>Sonnenstand</strong><output>{clock}</output></div>
      <div className="lighting-mode" role="group" aria-label="Beleuchtungsmodus"><button aria-pressed={settings.lightingMode === 'room'} onClick={() => update({ lightingMode: 'room' })}>Raumlicht</button><button aria-pressed={settings.lightingMode === 'global'} onClick={() => update({ lightingMode: 'global' })}>Global</button></div>
      <fieldset className="sun-settings"><legend>Sonnenlicht</legend><label htmlFor="sun-hour">Ortszeit</label><input id="sun-hour" type="range" min="0" max="23.75" step=".25" value={settings.hour} onChange={event => update({ hour: Number(event.target.value) })} /><label htmlFor="sun-season">Datum</label><select id="sun-season" value={settings.season} onChange={event => update({ season: event.target.value as SceneSettings['season'] })}><option value="spring">20. März · MEZ</option><option value="summer">21. Juni · MESZ</option><option value="winter">21. Dezember · MEZ</option></select><output className="sun-altitude">{solar.altitude > 0 ? `Sonnenhöhe ${Math.round(solar.altitude * 180 / Math.PI)}°` : 'Sonne unter dem Horizont'}</output></fieldset>
      {settings.lightingMode === 'room' && <fieldset className="finish-settings"><legend>Raumbeleuchtung</legend><label htmlFor="light-house">Licht · Haushälfte</label><select id="light-house" value={lightHouse} onChange={event => setLightHouse(event.target.value as 'east' | 'west')}><option value="east">Haus Ost</option><option value="west">Haus West</option></select><label htmlFor="light-floor">Licht · Geschoss</label><select id="light-floor" value={lightFloor} onChange={event => setLightFloor(event.target.value as FloorId)}>{['KG', 'EG', 'OG', 'DG'].map(level => <option key={level} value={level}>{level}</option>)}</select><div className="settings-heading"><strong>{lightFloor} · {lightHouse === 'east' ? 'Ost' : 'West'}</strong><button className="icon-button" aria-label="Geschosslicht einschalten" title="Alle Leuchten dieses Geschosses einschalten" onClick={() => setFloorLights(true)}><Lightbulb size={18} /></button><button className="icon-button" aria-label="Geschosslicht ausschalten" title="Alle Leuchten dieses Geschosses ausschalten" onClick={() => setFloorLights(false)}><LightbulbOff size={18} /></button></div>{lightingCircuits.filter(circuit => circuit.floor === lightFloor).map(circuit => <label className="check-setting" key={circuit.id}><input type="checkbox" checked={settings.lights[lightPrefix + circuit.id] ?? circuit.defaultOn} onChange={event => update({ lights: { ...settings.lights, [lightPrefix + circuit.id]: event.target.checked } })} />{circuit.label}</label>)}</fieldset>}
      <fieldset className="finish-settings"><legend>Oberflächen</legend><label htmlFor="material-house">Haushälfte</label><select id="material-house" value={materialHouse} onChange={event => setMaterialHouse(event.target.value as 'east' | 'west')}><option value="east">Haus Ost</option><option value="west">Haus West</option></select><div className="facade-label"><label htmlFor="facade-composition">Fassadenentwurf</label>{mode === 'orbit' && roof && <button className="icon-button" title="Gebäude heranzoomen" aria-label="Fassadenansicht" onClick={() => commands.current?.facade()}><House size={18} /></button>}</div><select id="facade-composition" value={appearance.composition} onChange={event => updateAppearance({ composition: event.target.value as FacadeComposition })}>{facadeCompositions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{appearance.composition !== 'plaster' && <div className="finish-row wood-tone"><span>Holzton</span><div>{woodTones.map((tone, index) => <button key={tone.name} className="color-swatch" style={{ backgroundColor: tone.color }} title={tone.name} aria-label={`Holz ${tone.name}`} aria-pressed={appearance.woodTone === index} onClick={() => updateAppearance({ woodTone: index })} />)}</div></div>}{(['facade', 'roof', 'frame'] as FinishKey[]).map(key => <div className="finish-row" key={key}><span>{{ facade: 'Putzfarbe', roof: 'Dach', frame: 'Fensterrahmen' }[key]}</span><div>{finishes[key].map(finish => <button key={finish.color} className="color-swatch" style={{ backgroundColor: finish.color }} title={finish.name} aria-label={`${{ facade: 'Fassade', roof: 'Dach', frame: 'Fensterrahmen' }[key]} ${finish.name}`} aria-pressed={appearance[key] === finish.color} onClick={() => updateAppearance({ [key]: finish.color })} />)}</div></div>)}</fieldset>
      <fieldset className="finish-settings"><legend>Carportdach</legend><label htmlFor="carport-roof">Ausführung</label><select id="carport-roof" value={settings.carportRoof} onChange={event => update({ carportRoof: event.target.value as SceneSettings['carportRoof'] })}><option value="metal">Wie aktuell</option><option value="green">Begrüntes Dach</option></select></fieldset>
      <label className="check-setting"><input type="checkbox" checked={settings.transparentGround} onChange={event => update({ transparentGround: event.target.checked })} />Gelände transparent</label>
      <label className="check-setting"><input type="checkbox" checked={settings.surroundings} onChange={event => update({ surroundings: event.target.checked })} />Nachbarschaft</label><label className="check-setting"><input type="checkbox" checked={settings.landscaping} onChange={event => update({ landscaping: event.target.checked })} />Garten, Hecke und Zaun</label>
      <label htmlFor="wood-profile">Holzprofil</label><select id="wood-profile" value={appearance.woodProfile} onChange={event => updateAppearance({ woodProfile: event.target.value as WoodProfile })}>{woodProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
      {appearance.composition === 'plaster' && <div className="finish-row wood-tone"><span>Vordach</span><div>{woodTones.map((tone, index) => <button key={tone.name} className="color-swatch" style={{backgroundColor: tone.color}} title={tone.name} aria-label={`Holz ${tone.name}`} aria-pressed={appearance.woodTone === index} onClick={() => updateAppearance({woodTone: index})} />)}</div></div>}
    </div></details>}
    {loading && <div className="loading">Raummodell wird aufgebaut…</div>}{error && <div className="scene-error"><strong>3D ist hier nicht verfügbar.</strong><p>{error}</p><p>Der 2D-Grundriss bleibt verfügbar.</p></div>}{mode === 'walk' && !loading && !error && <><div className="crosshair" /><Joystick onMove={(x, y) => commands.current?.move(x, y)} /><div className="walk-actions"><button className="icon-button" title="Nächste Tür öffnen/schließen (E)" aria-label="Tür öffnen oder schließen" onClick={() => commands.current?.door()}><DoorOpen size={19} /></button><button className="icon-button" title="Mausblick aktivieren; Escape zum Freigeben" aria-label="Mausblick" onClick={() => commands.current?.lock()}><MousePointer2 size={19} /></button><button className="icon-button" title="Zum Raumeinstieg zurück" aria-label="Zum Raumeinstieg" onClick={() => commands.current?.home()}><RotateCcw size={19} /></button></div><div className="walk-floor">{currentFloor}</div></>}</>
}