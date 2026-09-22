import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, Box, BrickWall, ChevronDown, Footprints, Info, Layers2, Maximize, Minus, Plus, Ruler, Scissors, Sofa, Trees, X } from 'lucide-react'
import { area, floorIds, format, house, makeFloor, roomArea, stairOpeningParts } from './model'
import type { FloorId } from './model'
import FloorPlan from './FloorPlan'
import SectionView from './SectionView'
import SitePlan from './SitePlan'
import SetbackDetails from './SetbackDetails'
import { siteItems } from './sitePlanModel'
import type { SiteItem } from './sitePlanModel'
import { initialSettings, siteArea } from './context'
import { referenceAreas } from './providerPlan'
import ProviderDetails from './ProviderDetails'
import './App.css'

const HouseScene = lazy(() => import('./HouseScene'))
export default function App() {
  const [floorId, setFloorId] = useState<FloorId>('EG')
  const [exterior, setExterior] = useState(false)
  const [siteItem, setSiteItem] = useState<SiteItem>(siteItems.find(item => item.id === 'carport-west')!)
  const [settings, setSettings] = useState(initialSettings)
  const [mode, setMode] = useState<'plan' | 'orbit' | 'walk'>('plan')
  const [selected, setSelected] = useState('living')
  const [dimensions, setDimensions] = useState(true)
  const [section, setSection] = useState(false)
  const [furnished, setFurnished] = useState(true)
  const [roof, setRoof] = useState(false)
  const [cutWalls, setCutWalls] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [reset, setReset] = useState(0)
  const [info, setInfo] = useState(false)
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [versions, setVersions] = useState<Array<{ id: string; name: string }>>([])
  const [currentVersion, setCurrentVersion] = useState('latest')
  const canvasArea = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Detect current version from URL path
    const pathParts = window.location.pathname.replace(/\/+$/, '').split('/')
    const lastPart = pathParts[pathParts.length - 1]
    
    fetch('./versions.json')
      .then(res => res.json())
      .then((data: Array<{ id: string; name: string }>) => {
        if (Array.isArray(data)) {
          setVersions(data)
          const matched = data.find(v => v.id === lastPart)
          if (matched) {
            setCurrentVersion(matched.id)
          } else if (lastPart === 'latest' || lastPart === '') {
            setCurrentVersion('latest')
          }
        }
      })
      .catch(() => {})
  }, [])

  const switchVersion = (targetVersionId: string) => {
    if (targetVersionId === currentVersion) return
    const isRootOrLatest = currentVersion === 'latest' && !window.location.pathname.includes('/latest')
    let targetPath = ''
    if (isRootOrLatest) {
      targetPath = targetVersionId === 'latest' ? './' : `./${targetVersionId}/`
    } else {
      targetPath = targetVersionId === 'latest' ? '../latest/' : `../${targetVersionId}/`
    }
    window.location.href = targetPath
  }

  useEffect(() => {
    if (mode !== 'plan') return
    const host = canvasArea.current!
    const wheel = (event: WheelEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.floor-plan')) return
      event.preventDefault()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? host.clientHeight : 1)
      setZoom(value => Math.max(.7, Math.min(2.6, value * Math.exp(-delta * .0015))))
    }
    host.addEventListener('wheel', wheel, { passive: false })
    return () => host.removeEventListener('wheel', wheel)
  }, [mode])
  const floor = makeFloor(floorId)
  const activeRoom = floor.rooms.find(room => room.id === selected) ?? floor.rooms[0]
  const total = floor.rooms.reduce((sum, room) => sum + roomArea(room, floorId).floor, 0)
  const living = floor.rooms.reduce((sum, room) => sum + roomArea(room, floorId).living, 0)
  const changeFloor = (next: FloorId) => { setExterior(false); setFloorId(next); setSelected(next === 'EG' ? 'living' : next === 'DG' ? 'bedroom' : 'bath'); setZoom(1); setSettings(value => ({ ...value, transparentGround: next === 'KG' })) }
  const inspect = (id: string) => { setSelected(id); setRoomsOpen(false) }
  const download = () => {
    const svg = document.querySelector('.floor-plan')
    if (!svg) return
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }))
    const link = document.createElement('a'); link.href = url; link.download = `Hausentwurf-${exterior ? 'Aussenanlagen' : section ? 'Schnitt' : floorId}.svg`; link.click(); URL.revokeObjectURL(url)
  }
  return <div className="app">
    <header className="header">
      <div className="brand-mark"><Layers2 size={24} strokeWidth={1.6} /></div>
      <div className="brand">
        <h1>Doppelhausentwurf <span>Ost</span></h1>
        <p>DOPPELHAUSHÄLFTE · VORENTWURF</p>
      </div>
      <div className="project-state">
        {versions.length > 0 ? (
          <div className="version-selector-wrap">
            <span className="status-dot" />
            <span className="version-label">Stand:</span>
            <div className="version-select-box">
              <select
                className="version-select"
                value={currentVersion}
                onChange={e => switchVersion(e.target.value)}
                aria-label="Entwurfsstand auswählen"
              >
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="version-select-arrow" />
            </div>
          </div>
        ) : (
          <><span className="status-dot" /> Vorentwurf <span className="revision">01</span></>
        )}
      </div>
      <button className="icon-button" onClick={() => setInfo(true)} title="Planungsannahmen" aria-label="Planungsannahmen"><Info size={20} /></button>
    </header>
    <div className="workspace">
      <aside className={`sidebar ${roomsOpen ? 'is-open' : ''}`}>
        {exterior ? <><div className="sidebar-heading"><span className="eyebrow">GRUNDSTÜCK</span><span className="small-index">OST + WEST</span></div><div className="floor-heading"><h2>Außenanlagen</h2></div><div className="level-metrics"><div><strong>{format(siteArea)}<small> m²</small></strong><span>Grundstück gesamt</span></div><div><strong>4</strong><span>Stellplätze</span></div></div><div className="room-list" aria-label="Außenobjekte">{siteItems.filter(item => !item.id.startsWith('approach') && !item.id.startsWith('access')).map(item => <button key={item.id} className={`room-row ${siteItem.id === item.id ? 'active' : ''}`} aria-pressed={siteItem.id === item.id} onClick={() => setSiteItem(item)}><span className="room-swatch" style={{ background: item.color }} /><span>{item.name}</span></button>)}</div><section className="room-detail" aria-live="polite"><div className="eyebrow">AUSSENMASSE</div><h3>{siteItem.name}</h3><p>{siteItem.details}</p>{siteItem.id.startsWith('carport') && <p>3,00 m Mindestabstand zur Südgrenze. Rückwand geschlossen; Tonnenfläche dahinter.</p>}{siteItem.id.startsWith('bins') && <p>Kompost, Restmüll, Papier: je eine schematische 240-l-Tonne, 60 × 75 cm. Bedienfläche davor 0,90 m tief.</p>}{siteItem.id.startsWith('open') && <p>5,00 m Stellplatzlänge plus mindestens 0,45 m Vorfläche zur schrägen Südgrenze.</p>}</section></> : <>
        <div className="sidebar-heading"><span className="eyebrow">ENTWURF</span><span className="small-index">01 / OST</span></div>
        <div className="variant-label">7,00 × 10,60 m · Osthälfte</div>
        <div className="floor-heading"><h2>{floor.name}</h2><span>{floorId}</span></div>
        <div className="level-metrics"><div><strong>{format(total)}<small> m²</small></strong><span>Lichte Raumflächen</span></div><div><strong>{floorId === 'DG' ? '35°' : floor.height.toLocaleString('de-DE', { minimumFractionDigits: 2 })}<small>{floorId === 'DG' ? '' : ' m'}</small></strong><span>{floorId === 'DG' ? 'Dachneigung' : 'Lichte Höhe'}</span></div></div>
        <div className="room-list" aria-label="Räume">{floor.rooms.map((room, index) => <button key={room.id} className={`room-row ${activeRoom.id === room.id ? 'active' : ''}`} onClick={() => inspect(room.id)} aria-pressed={activeRoom.id === room.id}><span className="room-number">{String(index + 1).padStart(2, '0')}</span><span className="room-swatch" style={{ background: room.color }} /><span>{room.name}</span><strong>{format(roomArea(room, floorId).floor)}<small> m²</small></strong></button>)}</div>
        <section className="room-detail" aria-live="polite"><div className="eyebrow">RAUMDETAIL</div><h3>{activeRoom.name}</h3><p>{activeRoom.note}</p><dl><div><dt>Lichte Grundfläche</dt><dd>{format(roomArea(activeRoom, floorId).floor)} m²</dd></div>{referenceAreas[floorId]?.[activeRoom.id] !== undefined && <div><dt>Beschriftung der Vorlage</dt><dd>{format(referenceAreas[floorId]![activeRoom.id])} m²</dd></div>}<div><dt>Wohnfläche, überschlägig</dt><dd>{format(roomArea(activeRoom, floorId).living)} m²</dd></div>{activeRoom.parts.length === 1 && <div><dt>Lichte Abmessungen</dt><dd>{format(activeRoom.parts[0].width)} × {format(activeRoom.parts[0].depth)} m</dd></div>}</dl><button className="text-button" onClick={() => { setMode('walk'); setReset(value => value + 1) }}><Footprints size={17} /> Raum betreten <ArrowUpRight size={16} /></button></section>
        <div className="sidebar-foot"><span className="material-dot" /> Eiche natur · Matte Oberflächen</div>
        </>}
        {exterior && (siteItem.id === 'house-east' || siteItem.id === 'house-west') && <SetbackDetails side={siteItem.id === 'house-east' ? 'east' : 'west'} />}
      </aside>
      <main className="drawing-area">
        <div className="toolbar"><nav className="floor-tabs" aria-label="Geschoss">{floorIds.map(id => <button key={id} aria-pressed={!exterior && floorId === id} onClick={() => changeFloor(id)}>{id}</button>)}<button aria-label="Außenanlagen" title="Außenanlagen" aria-pressed={exterior} onClick={() => { setExterior(true); setMode('plan'); setSection(false); setZoom(1) }}><Trees size={18} /></button></nav><div className="mode-tabs" aria-label="Ansicht"><button aria-pressed={mode === 'plan'} onClick={() => setMode('plan')}><Layers2 size={16} />2D</button><button aria-pressed={mode === 'orbit'} onClick={() => { setMode('orbit'); if (exterior) { setRoof(true); setSettings(value => ({ ...value, transparentGround: false })) } }}><Box size={16} />3D</button><button aria-label="Rundgang" aria-pressed={mode === 'walk'} onClick={() => setMode('walk')}><Footprints size={16} /><span>Rundgang</span></button></div></div>
        <div className="canvas-area" ref={canvasArea}><div className="drawing-title"><span className="eyebrow">{mode === 'plan' ? exterior ? 'AUSSENANLAGEN' : section ? 'GEBÄUDESCHNITT' : 'GRUNDRISS' : mode === 'orbit' ? 'RAUMMODELL' : 'AUGENHÖHE · 1,65 M'}</span><span>{exterior ? 'Grundstück Ost + West' : mode === 'plan' && section ? 'Alle Geschosse' : floor.name} <i>/</i> Hauptentwurf</span></div>
          {mode === 'plan' ? exterior ? <SitePlan key={reset} dimensions={dimensions} zoom={zoom} selected={siteItem.id} onSelect={item => { setSiteItem(item); setRoomsOpen(true) }} /> : section ? <SectionView key={reset} floorId={floorId} furnished={furnished} zoom={zoom} /> : <FloorPlan key={`${floorId}-${reset}`} floor={floor} selected={activeRoom.id} onSelect={inspect} dimensions={dimensions} furnished={furnished} zoom={zoom} /> : <Suspense fallback={<div className="loading">Raummodell wird aufgebaut…</div>}><HouseScene key={`${floorId}-${mode}-${furnished}-${roof}-${cutWalls}-${activeRoom.id}-${reset}`} floorId={floorId} mode={mode} furnished={furnished} roof={roof} cutWalls={cutWalls} selected={activeRoom.id} reset={reset} settings={settings} onSettings={setSettings} /></Suspense>}
          {mode === 'orbit' && !roof && <button className={`icon-button section-toggle ${cutWalls ? 'on' : ''}`} title={cutWalls ? 'Volle Wandhöhe anzeigen' : 'Wände auf 1,05 m schneiden'} aria-label="Wände schneiden" aria-pressed={cutWalls} onClick={() => setCutWalls(!cutWalls)}><BrickWall size={19} /></button>}
          {mode === 'plan' && !exterior && <button className={`icon-button section-toggle ${section ? 'on' : ''}`} title={section ? 'Zurück zum Grundriss' : 'Gebäudeschnitt öffnen'} aria-label="Querschnitt" aria-pressed={section} onClick={() => { setSection(!section); setZoom(1) }}>{section ? <Layers2 size={19} /> : <Scissors size={19} />}</button>}
          <div className="drawing-controls"><button className={`icon-button ${dimensions ? 'on' : ''}`} title="Bemaßung ein-/ausblenden" aria-label="Bemaßung" aria-pressed={dimensions} onClick={() => setDimensions(!dimensions)}><Ruler size={19} /></button><button className={`icon-button ${furnished ? 'on' : ''}`} title="Möblierung ein-/ausblenden" aria-label="Möblierung" aria-pressed={furnished} onClick={() => setFurnished(!furnished)}><Sofa size={19} /></button>{mode === 'orbit' && <button className={`icon-button ${roof ? 'on' : ''}`} title="Dach ein-/ausblenden" aria-label="Dach" aria-pressed={roof} onClick={() => setRoof(!roof)}><Layers2 size={19} /></button>}<span className="control-separator" />{mode === 'plan' && <><button className="icon-button" title="Vergrößern" aria-label="Vergrößern" onClick={() => setZoom(Math.min(zoom + .2, 2.6))}><Plus size={19} /></button><button className="icon-button" title="Verkleinern" aria-label="Verkleinern" onClick={() => setZoom(Math.max(zoom - .2, .7))}><Minus size={19} /></button></>}<button className="icon-button" title="Ansicht zurücksetzen" aria-label="Ansicht zurücksetzen" onClick={() => { setZoom(1); setReset(value => value + 1) }}><Maximize size={18} /></button>{mode === 'plan' && <button className="icon-button" title="Plan als SVG herunterladen" aria-label="Plan herunterladen" onClick={download}><ArrowDownToLine size={18} /></button>}</div>
        </div>
        <footer className="drawing-footer"><span>{exterior ? 'Außenanlagen · Ost + West' : <><b>{house.width.toLocaleString('de-DE', { minimumFractionDigits: 2 })} × {house.depth.toLocaleString('de-DE', { minimumFractionDigits: 2 })} m</b> Außenmaß</>}</span><span>{exterior ? `${format(siteArea)} m² Grundstück` : floorId === 'KG' ? 'Nutzkeller' : `${format(living)} m² Wohnfläche*`}</span><span className="footer-extra">{exterior ? 'Rekonstruierte Grenzen' : `Treppenöffnung ${format(area(stairOpeningParts))} m² separat`}</span><button onClick={() => setInfo(true)}>Vorentwurf · ungeprüft <Info size={14} /></button></footer>
      </main>
    </div>
    <button className="mobile-room-toggle" onClick={() => setRoomsOpen(!roomsOpen)}>{roomsOpen ? <X size={18} /> : <Layers2 size={18} />}{roomsOpen ? 'Schließen' : exterior ? 'Objekte & Maße' : 'Räume & Flächen'}</button>
    {info && <div className="modal-backdrop" onClick={() => setInfo(false)}><section className="modal" role="dialog" aria-modal="true" aria-label="Planungsannahmen" onClick={event => event.stopPropagation()}>
      <button className="icon-button modal-close" autoFocus aria-label="Schließen" onClick={() => setInfo(false)}><X size={20} /></button><span className="eyebrow">PLANUNGSANNAHMEN</span><h2>Ein Entwurf. Kein Bauplan.</h2>
      <ProviderDetails />
    </section></div>}
  </div>
}