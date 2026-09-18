import { useState } from 'react'
import { Ruler, Trash2 } from 'lucide-react'
import { atticCeiling, atticCeilingPanels, ceilingHeight, construction, elevations, house, floorIds, floorSlabs, makeFloor, ridgeElevations, roofHeight, roofInnerElevation, roofOuterElevation, roofPanels, roofVerticalThickness, roofWindows, slabThickness, stairFor, stairSolids, storeyRise, wallSolids } from './model'
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
  const roofTop = roofInnerElevation
  const span = (bounds: Rect) => sectionSpan(bounds, axis, position)
  const block = (bounds: Rect, bottom: number, height: number, color: string, label: string, key: string) => {
    const interval = span(bounds)
    if (!interval || height <= 0) return null
    return <rect key={key} x={interval[0]} y={-bottom - height} width={interval[1] - interval[0]} height={height} fill={color} stroke="#657269" strokeWidth=".012"><title>{label}: {metres(interval[1] - interval[0])} × {metres(height)}; Unterkante {metres(bottom)} / Oberkante {metres(bottom + height)}</title></rect>
  }
  const width = (length + 4.6) / zoom, height = 17 / zoom
  const core = stairFor()
  const pointAt = (svg: SVGSVGElement, clientX: number, clientY: number, lock: boolean): PlanPoint => {
    const point = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    if (lock && origin) return Math.abs(point.x - origin.x) > Math.abs(point.y - origin.z) ? { x: point.x, z: origin.z } : { x: origin.x, z: point.y }
    return { x: point.x, z: point.y }
  }
  return <><div className="section-measure-tools"><button className={`icon-button ${measuring ? 'on' : ''}`} aria-label="Maßband im Schnitt" aria-pressed={measuring} title="Maßband: zwei Punkte setzen; Shift sperrt die Achse" onClick={() => { setMeasuring(!measuring); setOrigin(null); setHeightProbe(null) }}><Ruler size={19} /></button><button className="icon-button" aria-label="Schnittmessungen löschen" title="Schnittmessungen löschen" disabled={!lines.length && !origin} onClick={() => { setLines([]); setOrigin(null) }}><Trash2 size={18} /></button></div><div className="section-options"><label htmlFor="section-axis">Schnittachse</label><select id="section-axis" value={axis} onChange={event => { const next = event.target.value as SectionAxis; setAxis(next); setPosition(next === 'NS' ? .9 : core.z + .5); setHeightProbe(null); setLines([]); setOrigin(null) }}><option value="NS">A–A · Nord–Süd</option><option value="EW">B–B · West–Ost</option></select><label htmlFor="section-position">{axis === 'NS' ? 'Abstand von West' : 'Abstand von Nord'} <output>{metres(position)}</output></label><input id="section-position" type="range" min=".05" max={axis === 'NS' ? house.width - .05 : house.depth - .05} step=".05" value={position} onChange={event => { setPosition(Number(event.target.value)); setLines([]); setOrigin(null) }} /></div>
    <svg className="floor-plan section-view" role="img" tabIndex={0} aria-label={`Gebäudeschnitt ${axis === 'NS' ? 'Nord–Süd' : 'West–Ost'}`} viewBox={`${length / 2 - width / 2} ${-3.3 - height / 2} ${width} ${height}`} onPointerMove={event => { const point = pointAt(event.currentTarget, event.clientX, event.clientY, event.shiftKey); setCursor(point); setHeightProbe(!measuring && point.x >= .365 && point.x <= length - .365 ? point.x : null) }} onPointerDown={event => { if (!measuring) return; event.currentTarget.focus(); const point = pointAt(event.currentTarget, event.clientX, event.clientY, event.shiftKey); setCursor(point); if (origin) { if (distance(origin, point) > .001) setLines([...lines, { start: origin, end: point }]); setOrigin(null) } else setOrigin(point) }} onKeyDown={event => { if (event.key === 'Escape') setOrigin(null); if (event.key === 'Delete') { setLines([]); setOrigin(null) } }} onPointerLeave={() => setHeightProbe(null)} style={{cursor: measuring ? 'crosshair' : undefined, touchAction: 'none'}}>
      <line data-terrain="assumed" x1="-.8" x2={length + .6} y1={-construction.terrain} y2={-construction.terrain} stroke="#84967c" strokeWidth=".04"><title>OK Gelände / Urgelände angenommen, nicht vermessen: {metres(construction.terrain)}</title></line>
      <text x={length / 2} y={-construction.terrain + .36} fontSize=".28" textAnchor="middle" fill="#496044">OK Gelände / Urgelände {metres(construction.terrain)} · Annahme</text>
      {floorIds.map(id => {
        const floor = makeFloor(id), base = floor.elevation
        return <g key={id} opacity={id === floorId ? 1 : .82}>
          {floorSlabs(id).map((slab, index) => block(slab, base - slabThickness(id), slabThickness(id), '#69766c', id === 'KG' ? 'KG Boden-/Fundamentpaket (Annahme)' : `${id} Deckenpaket`, `${id}-slab-${index}`))}
          {floor.walls.flatMap(wall => wallSolids(wall, id === 'DG' ? ['north', 'south', 'east', 'west'].includes(wall.id) ? roofHeight(house.depth / 2) : atticCeiling.height : floor.height).map((solid, index) => {
            const interval = span(solid); if (!interval) return null
            const low = base + solid.bottom
            const top = (coordinate: number) => base + Math.min(solid.bottom + solid.height, id === 'DG' ? roofHeight(axis === 'NS' ? coordinate : position) : floor.height)
            const ridge = house.depth / 2
            const peak = axis === 'NS' && interval[0] < ridge && interval[1] > ridge ? `${ridge},${-top(ridge)} ` : ''
            if (Math.max(top(interval[0]), top(interval[1]), peak ? top(ridge) : -Infinity) <= low) return null
            return <polygon key={`${wall.id}-${index}`} points={`${interval[0]},${-low} ${interval[1]},${-low} ${interval[1]},${-Math.max(low, top(interval[1]))} ${peak}${interval[0]},${-Math.max(low, top(interval[0]))}`} fill="#9eaaa0" stroke="#536358" strokeWidth=".015"><title>{id} Wand; Länge {metres(interval[1] - interval[0])}, Unterkante {metres(low)}, Höhe bis {metres(Math.max(top(interval[0]), top(interval[1])) - base)}</title></polygon>
          }))}
          {id !== 'DG' && stairSolids(storeyRise(id)).map(solid => block(solid, base + solid.bottom, solid.height, '#c7ab7f', `${id} ${solid.id.startsWith('landing') ? 'Podest' : 'Stufe'}`, `${id}-${solid.id}`))}
          {furnished && floor.furniture.map(item => block(item, base + (item.bottom ?? 0), item.height, '#d6dfd0', furnitureName(item), `${id}-${item.id}`))}
          <line x1="-.6" x2={length + .15} y1={-base} y2={-base} stroke="#8da49c" strokeWidth=".01" strokeDasharray=".12 .06" />
          <text x="-.2" y={-base - .1} textAnchor="end" fontSize=".4" fill="#2c4a3b">{id}<tspan x="-.2" dy=".44">{base > 0 ? '+' : ''}{metres(base)}</tspan></text>
          {id !== 'DG' && <g stroke="#577c7b" strokeWidth=".018" fill="#315f60"><path d={`M${length + .28} ${-base} h.18 m-.09 0 v${-floor.height} m-.09 0 h.18`} /><text x={length + .55} y={-base - floor.height / 2} fontSize=".44" stroke="none">{metres(floor.height)}</text></g>}
        </g>
      })}
      {atticCeilingPanels().map((panel, index) => { const interval = span(panel); if (!interval) return null; const bottom = elevations.DG + atticCeiling.height; const top = (coordinate: number) => Math.min(bottom + atticCeiling.thickness, roofInnerElevation(axis === 'NS' ? coordinate : position)); return <polygon key={`ceiling-${index}`} data-attic-ceiling="true" points={`${interval[0]},${-bottom} ${interval[1]},${-bottom} ${interval[1]},${-top(interval[1])} ${interval[0]},${-top(interval[0])}`} fill="#69766c"><title>Kehlbalkendecke 24 cm; lichte DG-Höhe 2,77 m</title></polygon> })}
      {roofPanels().map((panel, index) => { const interval = span(panel); if (!interval) return null; const first = roofTop(axis === 'NS' ? interval[0] : position), last = roofTop(axis === 'NS' ? interval[1] : position), thickness = roofVerticalThickness; return <polygon key={index} points={`${interval[0]},${-first} ${interval[1]},${-last} ${interval[1]},${-last - thickness} ${interval[0]},${-first - thickness}`} fill="#52605c" stroke="#36463e" strokeWidth=".02"><title>Dachpaket {metres(construction.roofNormal)} normal / {metres(thickness)} vertikal</title></polygon> })}
      {axis === 'NS' ? <circle data-ridge-cap="true" cx={house.depth / 2} cy={-ridgeElevations.roofSurface} r={construction.ridgeCapAllowance} fill="#52605c"><title>Firstabschluss: 7 cm Zuschlag, Herstellermaß offen</title></circle> : Math.abs(position - house.depth / 2) <= construction.ridgeCapAllowance && <rect x="-.1" y={-ridgeElevations.roofSurface - Math.sqrt(construction.ridgeCapAllowance ** 2 - (position - house.depth / 2) ** 2)} width={house.width + .35} height={2 * Math.sqrt(construction.ridgeCapAllowance ** 2 - (position - house.depth / 2) ** 2)} fill="#52605c" />}
      {roofWindows.map(window => { const interval = span(window); if (!interval) return null; return <line key={window.id} x1={interval[0]} y1={-roofTop(axis === 'NS' ? interval[0] : position)} x2={interval[1]} y2={-roofTop(axis === 'NS' ? interval[1] : position)} stroke="#459fa9" strokeWidth=".045"><title>{window.name}</title></line> })}
      <text x={length / 2} y="3.65" fontSize=".38" textAnchor="middle" fill="#3a6155">{axis === 'NS' ? 'A–A · Nord → Süd' : 'B–B · West → Ost'} · {metres(length)}</text>
      <text x={length / 2} y="-11.25" fontSize=".34" textAnchor="middle" fill="#3a6155">First außen (OK Firstabschluss) +{metres(ridgeElevations.outside)}<tspan x={length / 2} dy=".42">First innen (UK Verkleidung) +{metres(ridgeElevations.inside)}</tspan><tspan x={length / 2} dy=".42">Höhe über Gelände {metres(ridgeElevations.outside - construction.terrain)}</tspan></text>
      <text x={length / 2} y="4.1" fontSize=".3" textAnchor="middle" fill="#738178">FFB EG ±0,00 m · Geschossdecken 20 cm · Kehlbalkendecke 24 cm</text>
      <text x={length / 2} y="4.5" fontSize=".3" textAnchor="middle" fill="#738178">{house.pitch}° · Innenknie {metres(house.knee)} · Dach normal {metres(construction.roofNormal)}</text>
      {axis === 'NS' && <g fill="#315f60" stroke="#577c7b" strokeWidth=".015"><path d={`M0 ${-roofOuterElevation(0)} h-.6`} /><text x="-.65" y={-roofOuterElevation(0) - .08} fontSize=".28" textAnchor="end" stroke="none">+{metres(roofOuterElevation(0))}<title>Außenkante Wand / Oberkante Dachfläche, nicht Unterkante Dachpaket</title></text><path d={`M${house.north} ${-elevations.DG} h.18 m-.09 0 v${-house.knee} m-.09 0 h.18`} /><text x={house.north + .28} y={-elevations.DG - .17} fontSize=".25" stroke="none">{metres(house.knee)}</text></g>}
      {axis === 'EW' && <text x={length / 2} y={-elevations.DG - ceilingHeight(position) / 2} fontSize=".32" textAnchor="middle" fill="#315f60">DG lichte Höhe {metres(ceilingHeight(position))}</text>}
      {heightProbe !== null && <g pointerEvents="none"><line x1={heightProbe} x2={heightProbe} y1={-elevations.DG} y2={-elevations.DG - ceilingHeight(axis === 'NS' ? heightProbe : position)} stroke="#b44736" strokeWidth=".025" /><text x={heightProbe} y={-elevations.DG - ceilingHeight(axis === 'NS' ? heightProbe : position) / 2} textAnchor="middle" fontSize=".4" fill="#a23f31" stroke="#fff" strokeWidth=".07" paintOrder="stroke">{metres(ceilingHeight(axis === 'NS' ? heightProbe : position))}</text></g>}
      <g pointerEvents="none">{[...lines, ...(origin && cursor ? [{start: origin, end: cursor}] : [])].map(({start, end}, index) => <g key={index}><line x1={start.x} y1={start.z} x2={end.x} y2={end.z} stroke="#b44736" strokeWidth=".03" />{[start, end].map((point, pointIndex) => <circle key={pointIndex} cx={point.x} cy={point.z} r=".04" fill="#b44736" />)}<text data-section-measurement={index < lines.length ? 'saved' : 'preview'} x={(start.x + end.x) / 2} y={(start.z + end.z) / 2 - .12} textAnchor="middle" fontSize=".4" fill="#a23f31" stroke="#fff" strokeWidth=".07" paintOrder="stroke">{metres(distance(start, end))}</text></g>)}</g>
    </svg></>
}