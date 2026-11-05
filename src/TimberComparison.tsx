import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'
import * as THREE from 'three'
import { buildScene } from './scene'
import { woodProfiles, woodTones } from './context'
import type { WoodProfile } from './context'
import type { TimberOptions } from './timberCladding'
import './timber-comparison.css'

type Variant = { id: string; name: string; profile: WoodProfile; tone: number; options?: TimberOptions }
type Overview = 'profiles' | 'species' | 'windows' | 'weathering'
type Rendered = Variant & { full: string; detail: string }
const overviews: { id: Overview; name: string }[] = [{ id: 'profiles', name: 'Profile A–J' }, { id: 'species', name: 'Holzarten' }, { id: 'windows', name: 'Fensterdetails' }, { id: 'weathering', name: 'Bewitterung' }]
const profileName = (profile: WoodProfile) => woodProfiles.find(option => option.id === profile)!.name
function variants(overview: Overview): Variant[] {
  if (overview === 'profiles') return woodProfiles.filter(profile => profile.id !== 'open-slats').map(profile => ({ id: profile.id, name: profile.name, profile: profile.id, tone: 0 }))
  if (overview === 'species') return (['boards', 'rhombus'] as const).flatMap(profile => [8, 0, 9, 10].map(tone => ({ id: `${profile}-${tone}`, name: `${woodTones[tone].name} · ${profile === 'boards' ? 'A' : 'C'}`, profile, tone })))
  if (overview === 'windows') return (['none', 'reveals', 'screen'] as const).map(windows => ({ id: windows, name: { none: 'Metallanschluss', reveals: 'Holzlaibung', screen: 'Partieller Fensterschirm' }[windows], profile: 'rhombus', tone: 0, options: { windows } }))
  return (['fresh', 'oiled', 'weathered'] as const).map(surface => ({ id: surface, name: { fresh: 'Naturbelassen', oiled: 'Leicht geölt', weathered: 'Silbergrau bewittert' }[surface], profile: 'boards', tone: 0, options: { surface } }))
}

export default function TimberComparison({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [overview, setOverview] = useState<Overview>('profiles')
  const [images, setImages] = useState<Rendered[]>([])
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState<{ source: string; name: string } | null>(null)
  const choices = variants(overview)
  useEffect(() => { dialog.current?.showModal() }, [])
  useEffect(() => {
    let cancelled = false
    const urls: string[] = []
    const controller = new AbortController()
    const render = async () => {
      let renderer: THREE.WebGLRenderer | undefined
      let model: ReturnType<typeof buildScene> | undefined
      let ground: THREE.Mesh | undefined
      let sun: THREE.DirectionalLight | undefined
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
        renderer.setSize(840, 700)
        renderer.setPixelRatio(1)
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15
        const scene = new THREE.Scene(); scene.background = new THREE.Color('#edf0ef')
        scene.add(new THREE.HemisphereLight('#f4f6ff', '#c0b9a9', 1.8))
        sun = new THREE.DirectionalLight('#fff4df', 3.4)
        sun.position.set(16, 20, 1); sun.target.position.set(3, 4, 5)
        sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096)
        Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .1, far: 70 })
        sun.shadow.bias = -.00001; sun.shadow.normalBias = .001
        scene.add(sun, sun.target)
        model = buildScene('EG', false, true, false)
        for (const child of model.group.children) child.visible = child.name === 'house-east'
        model.setFinish('facade', '#eeeae0'); model.setFinish('roof', '#424749')
        model.setFinish('roofTrim', '#bcbdb7'); model.setFinish('frame', '#9ba69b'); model.setFinish('entryDoor', '#bcbdb7')
        scene.add(model.group)
        ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: '#e0e3de', roughness: 1 }))
        ground.rotation.x = -Math.PI / 2; ground.position.y = -.2; ground.receiveShadow = true; scene.add(ground)
        const camera = new THREE.PerspectiveCamera(36, 840 / 700, .1, 100)
        const capture = async (detail: boolean) => {
          if (detail && overview === 'windows') { camera.position.set(11.6, 5.5, 7.6); camera.lookAt(6.7, 4.3, 4.8) }
          else if (detail) { camera.position.set(12.6, 7.5, 9.2); camera.lookAt(6.7, 5.8, 5.4) }
          else { camera.position.set(19.5, 11.5, 23); camera.lookAt(3.3, 4.8, 5.3) }
          renderer!.render(scene, camera)
          const blob = await new Promise<Blob>((resolve, reject) => renderer!.domElement.toBlob(value => value ? resolve(value) : reject(new Error('PNG-Export fehlgeschlagen'))))
          const url = URL.createObjectURL(blob); urls.push(url); return url
        }
        for (const variant of variants(overview)) {
          await new Promise<void>(resolve => { requestAnimationFrame(() => resolve()) })
          if (cancelled) break
          model.setCladding('upper', variant.tone, variant.profile, 'east', variant.options)
          const full = await capture(false), detail = await capture(true)
          if (!cancelled) setImages(previous => [...previous, { ...variant, full, detail }])
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Rendering fehlgeschlagen')
      } finally {
        model?.dispose(); ground?.geometry.dispose(); (ground?.material as THREE.Material | undefined)?.dispose(); sun?.dispose(); renderer?.dispose(); renderer?.forceContextLoss()
        if (cancelled) for (const url of urls) URL.revokeObjectURL(url)
      }
    }
    const schedule = requestAnimationFrame(() => { if (!controller.signal.aborted) void render() })
    return () => { cancelled = true; controller.abort(); cancelAnimationFrame(schedule); for (const url of urls) URL.revokeObjectURL(url) }
  }, [overview])
  return <dialog className="timber-comparison" ref={dialog} onCancel={event => { event.preventDefault(); if (zoom) setZoom(null); else onClose() }}>
    <header><div><h2>Holzfassaden</h2><span>OG + DG · heller Putz · graugrüne Fenster</span></div><button className="icon-button" title="Vergleich schließen" aria-label="Vergleich schließen" onClick={onClose}><X size={20} /></button></header>
    <nav aria-label="Fassadenvergleich">{overviews.map(option => <button key={option.id} aria-pressed={overview === option.id} onClick={() => { if (overview !== option.id) { setImages([]); setError(''); setZoom(null); setOverview(option.id) } }}>{option.name}</button>)}</nav>
    <div className="timber-comparison-status" role="status">{error || `${images.length} / ${choices.length}`}</div>
    <div className={`timber-comparison-grid ${overview === 'species' ? 'species-grid' : ''}`} aria-busy={images.length < choices.length && !error}>
      {choices.map(variant => {
        const image = images.find(image => image.id === variant.id)
        return <figure key={variant.id}>
          <figcaption><strong>{variant.name}</strong><span>{overview === 'species' ? profileName(variant.profile).split(' · ').slice(0, 2).join(' · ') : woodTones[variant.tone].name}</span></figcaption>
          {(['full', 'detail'] as const).map(view => <div className="timber-render" key={view}>{image ? <><button className="timber-image" aria-label={`${variant.name} ${view === 'full' ? 'Gesamtansicht' : 'Detail'} vergrößern`} onClick={() => setZoom({ source: image[view], name: variant.name })}><img src={image[view]} alt={`${variant.name}, ${view === 'full' ? 'Gesamtansicht' : 'Fenster und Profil'}`} /></button><a href={image[view]} download={`Holzfassade-${overview}-${variant.id}-${view}.png`} title="PNG herunterladen" aria-label={`${variant.name} ${view} PNG herunterladen`}><Download size={16} /></a></> : <span className="timber-render-pending" />}</div>)}
        </figure>
      })}
    </div>
    {zoom && <div className="timber-zoom" onClick={() => setZoom(null)}><button className="icon-button" title="Detail schließen" aria-label="Detail schließen" onClick={() => setZoom(null)}><X size={20} /></button><img src={zoom.source} alt={zoom.name} /></div>}
  </dialog>
}