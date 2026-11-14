import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { DoorOpen, Focus, RotateCcw, X } from 'lucide-react'
import { floorIds, makeFloor } from './model'
import type { FloorId, WindowEdit } from './model'
import type { SceneSettings } from './context'
import { editableWindow, windowDraft } from './windowEdits'

export type WindowTarget = { house: 'east' | 'west'; floor: FloorId; id: string }

function Dimension({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const format = (value: number) => String(Math.round(value * 1000) / 10)
  const [draft, setDraft] = useState({ source: value, text: format(value) })
  const cancelled = useRef(false)
  const dirty = useRef(false)
  if (draft.source !== value) setDraft({ source: value, text: format(value) })
  return <label>{label}<input aria-label={label} type="number" step="0.5" value={draft.text} onChange={event => { dirty.current = true; setDraft({ source: value, text: event.target.value }) }} onBlur={() => { if (!cancelled.current && dirty.current) onCommit(draft.text.trim() ? Number(draft.text) / 100 : NaN); cancelled.current = false; dirty.current = false }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { cancelled.current = true; setDraft({ source: value, text: format(value) }); event.currentTarget.blur() } }} /></label>
}

const names: Record<string, string> = { 'wc-window': 'Gästebad', 'hall-window-fixed': 'Diele', 'kitchen-east-window': 'Küche', 'living-corner-fixed': 'Wohnen', 'garden-west-fixed': 'Wohnen', 'bath-window': 'Bad', 'child-north-window': 'Kind Nord', 'east-north': 'Kind Nord', 'south-west': 'Kind Süd', 'south-east': 'Kind Süd', 'gable-office': 'Dachgeschoss Nord', 'gable-parents': 'Dachgeschoss Süd' }

export default function WindowEditor({ panelRef, target, settings, floors, error, onSelect, onChange, onReset, onToggle, onFocus, onClose }: {
  panelRef: RefObject<HTMLElement | null>; target: WindowTarget | null; settings: SceneSettings; floors: FloorId[]; error: string;
  onSelect: (target: WindowTarget) => void; onChange: (target: WindowTarget, edit: WindowEdit) => void; onReset: (target: WindowTarget) => void; onToggle: (id: string) => void; onFocus: (target: WindowTarget) => void; onClose: () => void;
}) {
  const side = target?.house ?? 'east', appearance = side === 'east' ? settings : settings.west
  const choices = floorIds.filter(floor => floors.includes(floor)).flatMap(id => {
    const floor = makeFloor(id, side, appearance.windows)
    return floor.walls.flatMap(wall => wall.openings.filter(opening => editableWindow(floor, wall, opening)).map(opening => ({ floor: id, wall, opening, key: `${id}-${opening.id}` })))
  })
  const selected = choices.find(choice => choice.key === target?.id)
  const draft = selected && windowDraft(selected.opening)
  const change = (patch: Partial<WindowEdit>) => { if (draft && target) onChange(target, { ...draft, ...patch }) }
  const layout = draft?.windowLayout
  const reverse = (side === 'west') !== (selected?.wall.id === 'south')
  const fields = layout?.fields?.map((field, index) => ({ ...field, index })) ?? []
  if (reverse) fields.reverse()
  const faceName = (face: string) => face === 'east' ? side === 'east' ? 'Ost' : 'West' : face === 'south' ? 'Süd' : 'Nord'
  return <section ref={panelRef} className="facade-overlay window-editor" aria-label="Fenster bearbeiten">
    <header><strong>Fenster</strong><div>{selected && target && <button className="icon-button" title="Fenster heranzoomen" aria-label="Fenster heranzoomen" onClick={() => onFocus(target)}><Focus size={16} /></button>}<button className="icon-button" title="Schließen" aria-label="Fenstereditor schließen" onClick={onClose}><X size={16} /></button></div></header>
    <div className="window-selector">
      <select aria-label="Fenster Haushälfte" value={side} onChange={event => onSelect({ house: event.target.value as WindowTarget['house'], floor: target?.floor ?? floors[0], id: '' })}><option value="east">Haus Ost</option><option value="west">Haus West</option></select>
      <select aria-label="Fenster auswählen" value={selected?.key ?? ''} onChange={event => { const choice = choices.find(choice => choice.key === event.target.value); if (choice) onSelect({ house: side, floor: choice.floor, id: choice.key }) }}>
        <option value="">Fenster auswählen</option>{choices.map(choice => <option key={choice.key} value={choice.key}>{choice.floor} · {faceName(choice.wall.id)} · {names[choice.opening.id] ?? choice.opening.id} · {Math.round(choice.opening.width * 1000) / 10} cm</option>)}
      </select>
    </div>
    {selected && draft && layout && target && <>
      <div className="window-diagram" role="img" aria-label="Fensteraufteilung, Innenansicht" style={{ aspectRatio: `${Math.max(.7, Math.min(3, draft.width / draft.height))}`, gridTemplateColumns: fields.length === 2 ? `${reverse ? 1 - layout.split! : layout.split!}fr ${reverse ? layout.split! : 1 - layout.split!}fr` : '1fr' }}>
        {fields.map(field => <div key={field.index} className="window-diagram-column" style={{ gridTemplateRows: layout.lowerFixed ? `${draft.height - layout.lowerFixed}fr ${layout.lowerFixed}fr` : '1fr' }}><div className="window-diagram-pane">{!field.fixed && <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={(field.hinge === 'end') !== reverse ? 'M100 0 L0 50 L100 100' : 'M0 0 L100 50 L0 100'} /></svg>}<span>{field.fixed ? 'Fest' : 'Dreh'}</span></div>{!!layout.lowerFixed && <div className="window-diagram-pane"><span>Fest</span></div>}</div>)}
      </div>
      <div className="window-dimensions">
        <Dimension label="Breite (cm)" value={draft.width} onCommit={width => change({ width })} />
        <Dimension label="Höhe (cm)" value={draft.height} onCommit={height => change({ height })} />
        <Dimension label="Brüstung (cm)" value={draft.sill} onCommit={sill => change({ sill })} />
        <Dimension label="Ab Wandbeginn (cm)" value={draft.start} onCommit={start => change({ start })} />
      </div>
      <div className="lighting-mode" role="group" aria-label="Fensterteilung">{([1, 2] as const).map(columns => <button key={columns} aria-pressed={layout.columns === columns} onClick={() => change({ windowLayout: { ...layout, columns, fields: Array.from({ length: columns }, (_, index) => layout.fields?.[index] ?? { fixed: true, hinge: 'end' }), split: .5 } })}>{columns === 1 ? 'Einteilig' : 'Zweiteilig'}</button>)}</div>
      {fields.length === 2 && <label className="window-split">Linkes Feld <output>{Math.round((reverse ? 1 - layout.split! : layout.split!) * 100)} %</output><input aria-label="Breitenanteil linkes Feld" type="range" min="15" max="85" step="1" value={Math.round((reverse ? 1 - layout.split! : layout.split!) * 100)} onChange={event => change({ windowLayout: { ...layout, split: reverse ? 1 - Number(event.target.value) / 100 : Number(event.target.value) / 100 } })} /></label>}
      {fields.map((field, index) => <label className="window-field" key={field.index}>{fields.length === 1 ? 'Feld' : index === 0 ? 'Links' : 'Rechts'}<select aria-label={`Fensterfeld ${index + 1}`} value={field.fixed ? 'fixed' : (field.hinge === 'end') !== reverse ? 'right' : 'left'} onChange={event => change({ windowLayout: { ...layout, fields: layout.fields!.map((current, position) => position === field.index ? { fixed: event.target.value === 'fixed', hinge: (event.target.value === 'right') !== reverse ? 'end' : 'start' } : current) } })}><option value="fixed">Festverglasung</option><option value="left">Drehflügel · Band links</option><option value="right">Drehflügel · Band rechts</option></select><button className="icon-button" disabled={field.fixed} title="Flügel öffnen / schließen" aria-label={`Fensterflügel ${index + 1} öffnen oder schließen`} onClick={() => onToggle(`${side === 'west' ? 'west-' : ''}${target.id}${field.index ? '-secondary' : ''}`)}><DoorOpen size={16} /></button></label>)}
      <label className="check-setting"><input type="checkbox" checked={!!layout.lowerFixed} onChange={event => change({ windowLayout: { ...layout, lowerFixed: event.target.checked ? Math.min(.9, draft.height / 3) : 0 } })} />Festes Unterlicht</label>
      {!!layout.lowerFixed && <Dimension label="Unterlicht ab Rahmenunterkante (cm)" value={layout.lowerFixed} onCommit={lowerFixed => change({ windowLayout: { ...layout, lowerFixed } })} />}
      <button className="window-reset" disabled={!appearance.windows?.[target.id]} onClick={() => onReset(target)}><RotateCcw size={15} />Fenster zurücksetzen</button>
    </>}
    {error && <p className="scene-design-error" role="alert">{error}</p>}
  </section>
}