import { useState } from 'react'
import type { PointerEvent } from 'react'
import { MapPinned, Ruler, Trash2 } from 'lucide-react'
import { boundaryDistance, boundaryZ, siteBoundary, siteDivision } from './context'
import { distance, metres } from './measure'
import type { PlanPoint } from './measure'
import { parkingEntrance, rectCorners, siteParking } from './parking'
import { neighborItems, siteItems } from './sitePlanModel'
import type { SiteItem } from './sitePlanModel'
import { neighborhoodParcels, neighborhoodRoads } from './neighborhoodLayout'

type Point = [number, number]

const lineLength = (start: Point, end: Point) => Math.hypot(end[0] - start[0], end[1] - start[1])
const fenceSegments: { start: Point; end: Point; side: number }[] = []
for (let side = 0; side < 4; side++) {
  const start = siteBoundary[side], end = siteBoundary[(side + 1) % 4]
  if (side !== 2) { fenceSegments.push({ start, end, side }); continue }
  const edges = [start[0], end[0], ...siteParking.flatMap(({ carport, open, point, streetZ }) => {
    const xs = [carport.x, carport.x + carport.width, open.x, open.x + open.width].map(x => point(x, streetZ(x))[0])
    return [Math.min(...xs) - .1, Math.max(...xs) + .1]
  })].sort((first, second) => first - second)
  for (let index = 1; index < edges.length; index++) if (!parkingEntrance((edges[index - 1] + edges[index]) / 2)) fenceSegments.push({ start: [edges[index - 1], boundaryZ(edges[index - 1], 2)], end: [edges[index], boundaryZ(edges[index], 2)], side })
}

function Dimension({ start, end, offset = 0, label }: { start: Point; end: Point; offset?: number; label?: string }) {
  const length = lineLength(start, end), normal: Point = [-(end[1] - start[1]) / length, (end[0] - start[0]) / length]
  const first: Point = [start[0] + normal[0] * offset, start[1] + normal[1] * offset], last: Point = [end[0] + normal[0] * offset, end[1] + normal[1] * offset]
  const center: Point = [(first[0] + last[0]) / 2, (first[1] + last[1]) / 2]
  let angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI
  if (angle > 90 || angle < -90) angle += 180
  return <g className="site-dimension" pointerEvents="none" stroke="#52665e" strokeWidth=".025" fill="none">
    <path d={`M${start} L${first} L${last} L${end}`} />
    {[first, last].map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r=".055" fill="#52665e" />)}
    <text x={center[0]} y={center[1] - .12} transform={`rotate(${angle} ${center})`} textAnchor="middle" fill="#344f45" stroke="#f7f9f3" strokeWidth=".11" paintOrder="stroke" fontSize=".34">{label ?? metres(length)}</text>
  </g>
}

export default function SitePlan({ dimensions, zoom, selected, onSelect }: { dimensions: boolean; zoom: number; selected: string; onSelect: (item: SiteItem) => void }) {
  const [pan, setPan] = useState({ x: 0, z: 0 })
  const [overview, setOverview] = useState(false)
  const [drag, setDrag] = useState<{ clientX: number; clientY: number; pan: PlanPoint } | null>(null)
  const [measuring, setMeasuring] = useState(false)
  const [origin, setOrigin] = useState<PlanPoint | null>(null)
  const [cursor, setCursor] = useState<PlanPoint | null>(null)
  const [lines, setLines] = useState<{ start: PlanPoint; end: PlanPoint }[]>([])
  const location = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM()!
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    let point = { x: position.x, z: position.y }
    if (event.shiftKey && origin) return Math.abs(point.x - origin.x) > Math.abs(point.z - origin.z) ? { x: point.x, z: origin.z } : { x: origin.x, z: point.z }
    let minimum = 8 / Math.hypot(matrix.a, matrix.b)
    for (const [x, z] of [...siteBoundary, ...siteItems.flatMap(item => item.points), ...neighborItems.flatMap(item => item.points), ...neighborhoodParcels.flatMap(parcel => parcel.points)]) {
      const gap = distance(point, { x, z })
      if (gap < minimum) { minimum = gap; point = { x, z } }
    }
    return point
  }
  const width = (overview ? 112 : 35) / zoom, height = (overview ? 108 : 34) / zoom
  return <>
    <div className="measure-tools"><button className={`icon-button ${measuring ? 'on' : ''}`} aria-label="Maßband" title="Maßband" aria-pressed={measuring} onClick={() => { setMeasuring(!measuring); setOrigin(null) }}><Ruler size={19} /></button><button className="icon-button" aria-label="Messungen löschen" title="Messungen löschen" disabled={!lines.length && !origin} onClick={() => { setLines([]); setOrigin(null) }}><Trash2 size={18} /></button><button className={`icon-button ${overview ? 'on' : ''}`} aria-label="Nachbarschaft einpassen" title="Nachbarschaft einpassen" aria-pressed={overview} onClick={() => { setOverview(!overview); setPan({ x: 0, z: 0 }) }}><MapPinned size={19} /></button></div>
    <svg xmlns="http://www.w3.org/2000/svg" className="floor-plan site-plan" role="img" aria-label="Außenanlagenplan" tabIndex={0} viewBox={`${-width / 2 - pan.x} ${10 - height / 2 - pan.z} ${width} ${height}`} style={{ fontFamily: 'IBM Plex Sans, sans-serif', touchAction: 'none', cursor: measuring ? 'crosshair' : 'grab' }} onPointerDown={event => {
      event.currentTarget.focus()
      if (measuring) { const point = location(event); if (origin) { if (distance(origin, point) > .01) setLines([...lines, { start: origin, end: point }]); setOrigin(null) } else setOrigin(point); return }
      if (event.target instanceof Element && event.target.closest('[role="button"]')) return
      event.currentTarget.setPointerCapture(event.pointerId); setDrag({ clientX: event.clientX, clientY: event.clientY, pan })
    }} onPointerMove={event => { setCursor(location(event)); if (drag && !measuring) { const scale = event.currentTarget.getScreenCTM()!.a; setPan({ x: drag.pan.x + (event.clientX - drag.clientX) / scale, z: drag.pan.z + (event.clientY - drag.clientY) / scale }) } }} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onKeyDown={event => { if (event.key === 'Escape') setOrigin(null); if (event.key === 'Delete') { setLines([]); setOrigin(null) } }}>
      <defs><pattern id="site-grass" width=".6" height=".6" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#edf2e5" /><circle cx=".3" cy=".3" r=".018" fill="#aabb9a" /></pattern></defs>
      <g data-neighborhood-plan="true">
        {neighborhoodParcels.map(parcel => <polygon key={parcel.id} points={parcel.points.map(point => point.join(',')).join(' ')} fill="#e6ebdf" stroke="#a1ad9b" strokeWidth=".07" />)}
        {neighborhoodRoads.map(road => <polygon key={road.id} points={[...road.north, ...road.south.toReversed()].map(point => point.join(',')).join(' ')} fill="#f6f7f3" stroke="#b8c1b5" strokeWidth=".06" />)}
        {neighborItems.map(item => <g key={item.id} data-neighbor-object={item.id} role="button" tabIndex={0} aria-label={`${item.name}: ${item.details}`} onClick={() => { if (!measuring) onSelect(item) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(item) } }}>
          <title>{item.name}: {item.details}</title>
          <polygon points={item.points.map(point => point.join(',')).join(' ')} fill={item.color} stroke={selected === item.id ? '#247d7a' : '#899687'} strokeWidth={selected === item.id ? 2 : .7} vectorEffect="non-scaling-stroke" />
          {!item.id.includes('annex') && <text x={item.points.reduce((sum, point) => sum + point[0], 0) / 4} y={item.points.reduce((sum, point) => sum + point[1], 0) / 4} textAnchor="middle" fontSize={overview ? 1.15 : .55} fill="#51614f" pointerEvents="none">{item.name}</text>}
        </g>)}
        {overview && <text x="-12" y="-30" textAnchor="middle" fontSize="1.25" fill="#607068">Hallerstraße</text>}
      </g>
      <polygon points={siteBoundary.map(point => point.join(',')).join(' ')} fill="url(#site-grass)" stroke="#9da995" strokeWidth=".025" />
      <path d={`M${siteBoundary[3]} L${siteBoundary[2]}`} stroke="#d3d8d2" strokeWidth=".12" />
      <text x="0" y="25" textAnchor="middle" fontSize={overview ? 1.25 : .5} fill="#607068">An der Röth</text>
      <path d={`M${siteDivision[0]} L0,0 M0,11.2 L${siteDivision[1]}`} stroke="#809a72" strokeWidth=".45" />
      {siteItems.map(item => <g key={item.id} data-site-object={item.id} role="button" tabIndex={0} aria-label={`${item.name}: ${item.details}`} onClick={() => { if (!measuring) onSelect(item) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(item) } }}>
        <title>{item.name}: {item.details}</title>
        <polygon points={item.points.map(point => point.join(',')).join(' ')} fill={item.color} stroke={selected === item.id ? '#247d7a' : '#718276'} strokeWidth={selected === item.id ? 2 : .7} vectorEffect="non-scaling-stroke" />
        {!item.id.startsWith('approach') && !item.id.startsWith('path') && !item.id.startsWith('access') && <text x={item.points.reduce((sum, point) => sum + point[0], 0) / item.points.length} y={item.points.reduce((sum, point) => sum + point[1], 0) / item.points.length} textAnchor="middle" fontSize={item.id.startsWith('bins') ? '.26' : '.38'} fill="#314f42" pointerEvents="none">{item.name}</text>}
        {dimensions && item.width && item.depth && !item.id.startsWith('access') && <><Dimension start={(item.dimensionPoints ?? item.points)[0]} end={(item.dimensionPoints ?? item.points)[1]} offset={item.id.startsWith('bins') ? -.22 : .55} /><Dimension start={(item.dimensionPoints ?? item.points)[1]} end={(item.dimensionPoints ?? item.points)[2]} offset={.35} /></>}
        {dimensions && item.id.startsWith('path') && <Dimension start={[(item.points[0][0] + item.points[3][0]) / 2, (item.points[0][1] + item.points[3][1]) / 2]} end={[(item.points[1][0] + item.points[2][0]) / 2, (item.points[1][1] + item.points[2][1]) / 2]} label="0,90 m" />}
      </g>)}
      {siteParking.map(({ side, carport, bins, point, streetZ, open }) => <g key={side}>
        {[carport, open].flatMap((rectangle, index) => [rectangle.width / 2 - .95, rectangle.width / 2 + .5].map(offset => <polygon key={`${index}-${offset}`} points={[[rectangle.x + offset, rectangle.z + rectangle.depth], [rectangle.x + offset + .45, rectangle.z + rectangle.depth], [rectangle.x + offset + .45, streetZ(rectangle.x + offset + .45)], [rectangle.x + offset, streetZ(rectangle.x + offset)]].map(([x, z]) => point(x, z).join(',')).join(' ')} fill="#d8dfcd" stroke="#b1bba6" strokeWidth=".02" pointerEvents="none" />))}
        <path d={`M${point(carport.x, carport.z)} L${point(carport.x + carport.width, carport.z)}`} stroke="#55624b" strokeWidth=".12" />
        {[0, 1, 2].map(index => <polygon key={index} points={rectCorners({ x: bins.x + .075 + index * .75, z: bins.z + .04, width: .6, depth: .75 }).map(([x, z]) => point(x, z).join(',')).join(' ')} fill={['#71805d', '#565c59', '#4f7586'][index]} opacity=".7" pointerEvents="none" />)}
        {dimensions && (() => {
          const corners = rectCorners(carport).map(([x, z]) => point(x, z)), start = corners.reduce((best, corner) => boundaryDistance(corner, 2) < boundaryDistance(best, 2) ? corner : best)
          const south = siteBoundary[2], west = siteBoundary[3], length = lineLength(south, west), gap = boundaryDistance(start, 2)
          const end: Point = [start[0] + (west[1] - south[1]) / length * gap, start[1] - (west[0] - south[0]) / length * gap]
          return <Dimension start={start} end={end} />
        })()}
      </g>)}
      {fenceSegments.map(({ start, end, side }, index) => <g key={index} role="button" tabIndex={0} aria-label={`Zaun ${index + 1}: ${metres(lineLength(start, end))}`} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true })) } }} onClick={() => { if (!measuring) onSelect({ id: `fence-${index}`, name: `Zaun ${index + 1}`, points: [start, end], color: '#52665e', details: `${metres(lineLength(start, end))} Länge · 1,00 m Höhe, Pfosten 1,12 m` }) }}>
        <title>Zaun: {metres(lineLength(start, end))}</title><path d={`M${start} L${end}`} stroke="#52665e" strokeWidth=".1" strokeDasharray=".16 .07" />
        {dimensions && lineLength(start, end) > .5 && <Dimension start={start} end={end} offset={side === 2 ? .7 : -.8} label={`Zaun ${metres(lineLength(start, end))}`} />}
      </g>)}
      <g className="measurement-lines">{[...lines, ...(origin && cursor ? [{ start: origin, end: cursor }] : [])].map(({ start, end }, index) => <g key={index}><line x1={start.x} y1={start.z} x2={end.x} y2={end.z} stroke="#af493a" strokeWidth=".05" /><text data-measurement={index < lines.length ? 'saved' : 'preview'} x={(start.x + end.x) / 2} y={(start.z + end.z) / 2 - .18} fill="#9b3729" stroke="#fff" strokeWidth=".12" paintOrder="stroke" fontSize=".42" textAnchor="middle">{metres(distance(start, end))}</text></g>)}</g>
    </svg>
  </>
}