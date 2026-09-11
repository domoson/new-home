import { useState } from 'react'
import { Ruler, Trash2 } from 'lucide-react'
import { house, floorIds, floorSlabs, makeFloor, roofHeight, roofPanels, roofWindows, stairFor, stairSolids, wallSolids } from './model'
import type { FloorId, Rect } from './model'
import { distance, furnitureName, metres } from './measure'
import type { PlanPoint } from './measure'
import { sectionSpan } from './section'
import type { SectionAxis } from './section'

export default function SectionView({ furnished, zoom, floorId }: { furnished: boolean; zoom: number; floorId: FloorId }) {
  const [axis, setAxis] = useState<SectionAxis>('NS')
  const [position, setPosition] = useState(.9)
  const [heightProbe, setHeightProbe] = useState<number | null>(null)
  const [measuring, setMeasuring] = useState(false)
  const [origin, setOrigin] = useState<PlanPoint | null>(null)
  const [cursor, setCursor] = useState<PlanPoint | null>(null)
  const [lines, setLines] = useState<{ start: PlanPoint; end: PlanPoint }[]>([])
  const length = axis === 'NS' ? house.depth : house.width
  const roofTop = (south: number) => 5.9 + .5 + Math.min(south - .365, 9.635 - south) * Math.tan(35 * Math.PI / 180)
  const span = (bounds: Rect) => sectionSpan(bounds, axis, position)
  const block = (bounds: Rect, bottom: number, height: number, color: string, label: string, key: string) => {
    const interval = span(bounds)
    if (!interval || height <= 0) return null
    return <rect key={key} x={interval[0]} y={-bottom - height} width={interval[1] - interval[0]} height={height} fill={color} stroke="#657269" strokeWidth=".012"><title>{label}: {metres(interval[1] - interval[0])} × {metres(height)}; Unterkante {metres(bottom)} / Oberkante {metres(bottom + height)}</title></rect>
  }
  const width = (length + 4.6) / zoom, height = 15.2 / zoom
  const core = stairFor()
  const pointAt = (svg: SVGSVGElement, clientX: number, clientY: number, lock: boolean): PlanPoint => {
    const point = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    if (lock && origin) return Math.abs(point.x - origin.x) > Math.abs(point.y - origin.z) ? { x: point.x, z: origin.z } : { x: origin.x, z: point.y }
    return { x: point.x, z: point.y }
  }
  return <><div className="section-measure-tools"><button className={`icon-button ${measuring ? 'on' : ''}`} aria-label="Maßband im Schnitt" aria-pressed={measuring} title="Maßband: zwei Punkte setzen; Shift sperrt die Achse" onClick={() => { setMeasuring(!measuring); setOrigin(null); setHeightProbe(null) }}><Ruler size={19} /></button><button className="icon-button" aria-label="Schnittmessungen löschen" title="Schnittmessungen löschen" disabled={!lines.length && !origin} onClick={() => { setLines([]); setOrigin(null) }}><Trash2 size={18} /></button></div><div className="section-options"><label htmlFor="section-axis">Schnittachse</label><select id="section-axis" value={axis} onChange={event => { const next = event.target.value as SectionAxis; setAxis(next); setPosition(next === 'NS' ? .9 : core.z + .5); setHeightProbe(null); setLines([]); setOrigin(null) }}><option value="NS">A–A · Nord–Süd</option><option value="EW">B–B · West–Ost</option></select><label htmlFor="section-position">{axis === 'NS' ? 'Abstand von West' : 'Abstand von Nord'} <output>{metres(position)}</output></label><input id="section-position" type="range" min=".05" max={axis === 'NS' ? house.width - .05 : house.depth - .05} step=".05" value={position} onChange={event => { setPosition(Number(event.target.value)); setLines([]); setOrigin(null) }} /></div>
    <svg className="floor-plan section-view" role="img" tabIndex={0} aria-label={`Gebäudeschnitt ${axis === 'NS' ? 'Nord–Süd' : 'West–Ost'}`} viewBox={`${length / 2 - width / 2} ${-3.3 - height / 2} ${width} ${height}`} onPointerMove={event => { const point = pointAt(event.currentTarget, event.clientX, event.clientY, event.shiftKey); setCursor(point); setHeightProbe(!measuring && point.x >= .365 && point.x <= length - .365 ? point.x : null) }} onPointerDown={event => { if (!measuring) return; event.currentTarget.focus(); const point = pointAt(event.currentTarget, event.clientX, event.clientY, event.shiftKey); setCursor(point); if (origin) { if (distance(origin, point) > .001) setLines([...lines, { start: origin, end: point }]); setOrigin(null) } else setOrigin(point) }} onKeyDown={event => { if (event.key === 'Escape') setOrigin(null); if (event.key === 'Delete') { setLines([]); setOrigin(null) } }} onPointerLeave={() => setHeightProbe(null)} style={{cursor: measuring ? 'crosshair' : undefined, touchAction: 'none'}}>
      <line x1="-.8" x2={length + .6} y1=".14" y2=".14" stroke="#84967c" strokeWidth=".04" />
      {floorIds.map(id => {
        const floor = makeFloor(id), base = floor.elevation
        return <g key={id} opacity={id === floorId ? 1 : .82}>
          {floorSlabs(id).map((slab, index) => block(slab, base - .3, .3, '#69766c', `${id} Deckenpaket`, `${id}-slab-${index}`))}
          {floor.walls.flatMap(wall => wallSolids(wall, id === 'DG' ? roofHeight(5) : floor.height).map((solid, index) => {
            const interval = span(solid); if (!interval) return null
            const low = base + solid.bottom
            const top = (coordinate: number) => base + Math.min(solid.bottom + solid.height, id === 'DG' ? roofHeight(axis === 'NS' ? coordinate : position) : floor.height)
            const peak = axis === 'NS' && interval[0] < 5 && interval[1] > 5 ? `5,${-top(5)} ` : ''
            if (Math.max(top(interval[0]), top(interval[1]), peak ? top(5) : -Infinity) <= low) return null
            return <polygon key={`${wall.id}-${index}`} points={`${interval[0]},${-low} ${interval[1]},${-low} ${interval[1]},${-Math.max(low, top(interval[1]))} ${peak}${interval[0]},${-Math.max(low, top(interval[0]))}`} fill="#9eaaa0" stroke="#536358" strokeWidth=".015"><title>{id} Wand; Länge {metres(interval[1] - interval[0])}, Unterkante {metres(low)}, Höhe bis {metres(Math.max(top(interval[0]), top(interval[1])) - base)}</title></polygon>
          }))}
          {id !== 'DG' && stairSolids(id === 'KG' ? 2.7 : 2.95).map(solid => block(solid, base + solid.bottom, solid.height, '#c7ab7f', `${id} ${solid.id.startsWith('landing') ? 'Podest' : 'Stufe'}`, `${id}-${solid.id}`))}
          {furnished && floor.furniture.map(item => block(item, base + (item.bottom ?? 0), item.height, '#d6dfd0', furnitureName(item), `${id}-${item.id}`))}
          <line x1="-.6" x2={length + .15} y1={-base} y2={-base} stroke="#8da49c" strokeWidth=".01" strokeDasharray=".12 .06" />
          <text x="-.2" y={-base - .1} textAnchor="end" fontSize=".4" fill="#2c4a3b">{id}<tspan x="-.2" dy=".44">{base > 0 ? '+' : ''}{metres(base)}</tspan></text>
          {id !== 'DG' && <g stroke="#577c7b" strokeWidth=".018" fill="#315f60"><path d={`M${length + .28} ${-base} h.18 m-.09 0 v${-floor.height} m-.09 0 h.18`} /><text x={length + .55} y={-base - floor.height / 2} fontSize=".44" stroke="none">{metres(floor.height)}</text></g>}
        </g>
      })}
      {roofPanels().map((panel, index) => { const interval = span(panel); if (!interval) return null; const first = roofTop(axis === 'NS' ? interval[0] : position), last = roofTop(axis === 'NS' ? interval[1] : position), thickness = .25 / Math.cos(35 * Math.PI / 180); return <polygon key={index} points={`${interval[0]},${-first} ${interval[1]},${-last} ${interval[1]},${-last - thickness} ${interval[0]},${-first - thickness}`} fill="#52605c" stroke="#36463e" strokeWidth=".02"><title>Dachpaket 25 cm normal zur Dachfläche</title></polygon> })}
      {roofWindows.map(window => { const interval = span(window); if (!interval) return null; return <line key={window.id} x1={interval[0]} y1={-roofTop(axis === 'NS' ? interval[0] : position)} x2={interval[1]} y2={-roofTop(axis === 'NS' ? interval[1] : position)} stroke="#459fa9" strokeWidth=".045"><title>{window.name}</title></line> })}
      <text x={length / 2} y="3.65" fontSize=".38" textAnchor="middle" fill="#3a6155">{axis === 'NS' ? 'A–A · Nord → Süd' : 'B–B · West → Ost'} · {metres(length)}</text>
      <text x={length / 2} y="-10.5" fontSize=".36" textAnchor="middle" fill="#3a6155">{axis === 'NS' ? `First innen +${metres(5.9 + roofHeight(5))}` : `DG lichte Höhe ${metres(roofHeight(position))}`}<tspan x={length / 2} dy=".44">35° · Kniestock 0,50 m</tspan></text>
      <text x={length / 2} y="4.15" fontSize=".32" textAnchor="middle" fill="#738178">FFB EG ±0,00 m · Deckenpaket 0,30 m</text>
      {heightProbe !== null && <g pointerEvents="none"><line x1={heightProbe} x2={heightProbe} y1="-5.9" y2={-5.9 - roofHeight(axis === 'NS' ? heightProbe : position)} stroke="#b44736" strokeWidth=".025" /><text x={heightProbe} y={-5.9 - roofHeight(axis === 'NS' ? heightProbe : position) / 2} textAnchor="middle" fontSize=".4" fill="#a23f31" stroke="#fff" strokeWidth=".07" paintOrder="stroke">{metres(roofHeight(axis === 'NS' ? heightProbe : position))}</text></g>}
      <g pointerEvents="none">{[...lines, ...(origin && cursor ? [{start: origin, end: cursor}] : [])].map(({start, end}, index) => <g key={index}><line x1={start.x} y1={start.z} x2={end.x} y2={end.z} stroke="#b44736" strokeWidth=".03" />{[start, end].map((point, pointIndex) => <circle key={pointIndex} cx={point.x} cy={point.z} r=".04" fill="#b44736" />)}<text data-section-measurement={index < lines.length ? 'saved' : 'preview'} x={(start.x + end.x) / 2} y={(start.z + end.z) / 2 - .12} textAnchor="middle" fontSize=".4" fill="#a23f31" stroke="#fff" strokeWidth=".07" paintOrder="stroke">{metres(distance(start, end))}</text></g>)}</g>
    </svg></>
}