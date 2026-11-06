import { useRef, useState } from 'react'
import { Download, Pencil, Save, Trash2, Upload } from 'lucide-react'
import { initialSettings } from './context'
import type { SceneSettings } from './context'
import { downloadBlob } from './exportImage'
import { deleteDesign, mergeDesigns, parseDesignLibrary, readSceneSettings, savedSnapshot, settingsSignature, writeDesignStorage } from './sceneDesigns'
import type { SceneDesignLibrary } from './sceneDesigns'

export type SceneDesignControlsProps = {
  library: SceneDesignLibrary
  onLibrary: (library: SceneDesignLibrary) => void
  selectedId: string
  onSelect: (id: string) => void
  settings: SceneSettings
  onSettings: (settings: SceneSettings) => void
  storageError: string
}

export default function SceneDesignControls({ library, onLibrary, selectedId, onSelect, settings, onSettings, storageError }: SceneDesignControlsProps) {
  const selected = library.designs.find(design => design.id === selectedId)
  const [name, setName] = useState(selected?.name ?? 'Entwurf 1')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(storageError)
  const fileInput = useRef<HTMLInputElement>(null)
  const dirty = settingsSignature(settings) !== settingsSignature(selected?.settings ?? initialSettings)
  const commit = (next: SceneDesignLibrary) => {
    try {
      const validated = writeDesignStorage(window.localStorage, next)
      onLibrary(validated); setError(''); return true
    } catch (reason) {
      setError(reason instanceof DOMException ? 'Speichern im Browser fehlgeschlagen. Bitte die Entwürfe als JSON exportieren.' : reason instanceof Error ? reason.message : 'Speichern fehlgeschlagen.')
      return false
    }
  }
  const load = (id: string) => {
    if (dirty && !window.confirm('Ungespeicherte Änderungen verwerfen und den anderen Entwurf laden?')) return
    const design = library.designs.find(entry => entry.id === id)
    onSettings(readSceneSettings(design?.settings ?? initialSettings)); onSelect(id)
    setName(design?.name ?? `Entwurf ${library.designs.length + 1}`); setMessage('')
  }
  const save = () => {
    try {
      const next = savedSnapshot(library, name, settings)
      if (commit(next)) { onSelect(next.lastSavedId!); setName(name.trim()); setMessage('Neuer Entwurf gespeichert. Startet beim nächsten Laden.') }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Speichern fehlgeschlagen.') }
  }
  const rename = () => {
    if (!selected || !name.trim()) return
    if (commit({ ...library, designs: library.designs.map(design => design.id === selected.id ? { ...design, name: name.trim() } : design) })) setMessage('Entwurf umbenannt.')
  }
  const remove = () => {
    if (!selected || !window.confirm(`Gespeicherten Entwurf „${selected.name}“ löschen?`)) return
    if (commit(deleteDesign(library, selected.id))) { onSelect(''); setMessage('Entwurf gelöscht. Die aktuelle Szene bleibt unverändert.') }
  }
  const exportDesigns = () => {
    try {
      const exported = !selected || dirty ? savedSnapshot(library, name.trim() || 'Aktueller Entwurf', settings) : library
      const validated = parseDesignLibrary(JSON.stringify(exported))
      downloadBlob(new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' }), 'Hausentwurf-Szene.json')
      setMessage('Entwürfe einschließlich der aktuellen Szene exportiert.'); setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Export fehlgeschlagen.') }
  }
  const importDesigns = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > 5_000_000) throw new Error('Entwurfsdatei ist zu groß (maximal 5 MB).')
      const imported = parseDesignLibrary(await file.text())
      if (!imported.designs.length) throw new Error('Die Datei enthält keine Entwürfe.')
      if (commit(mergeDesigns(library, imported))) setMessage(`${imported.designs.length} Entwürfe importiert. Die aktuelle Szene bleibt unverändert.`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Import fehlgeschlagen.') }
  }
  return <section className="scene-designs" aria-label="Gespeicherte Szenenentwürfe">
    <div className="settings-heading"><Save size={16} /><strong>Meine Entwürfe</strong></div>
    <label htmlFor="scene-design">Gespeicherter Entwurf</label>
    <select id="scene-design" value={selectedId} onChange={event => load(event.target.value)}>
      <option value="">{dirty ? 'Ungespeicherter Entwurf' : 'Grundeinstellung'}</option>
      {[...library.designs].reverse().map(design => <option key={design.id} value={design.id}>{design.name}{design.id === library.lastSavedId ? ' · Start' : ''} · {new Date(design.savedAt).toLocaleString('de-DE')}</option>)}
    </select>
    <output className={`scene-design-state${dirty ? ' is-dirty' : ''}`}>{dirty ? 'Ungespeicherte Änderungen' : selected ? selected.id === library.lastSavedId ? 'Gespeichert · Startentwurf' : 'Gespeichert' : 'Noch kein Entwurf gespeichert'}</output>
    <label htmlFor="scene-design-name">Entwurfsname</label>
    <input id="scene-design-name" type="text" maxLength={80} value={name} onChange={event => setName(event.target.value)} />
    <button className="scene-design-save" onClick={save} disabled={!name.trim()}><Save size={16} />Als neuen Entwurf speichern</button>
    <div className="scene-design-actions">
      <button className="icon-button" title="Entwurf umbenennen" aria-label="Entwurf umbenennen" disabled={!selected || !name.trim() || name.trim() === selected.name} onClick={rename}><Pencil size={17} /></button>
      <button className="icon-button" title="Entwurf löschen" aria-label="Entwurf löschen" disabled={!selected} onClick={remove}><Trash2 size={17} /></button>
      <button className="icon-button" title="Entwürfe als JSON exportieren" aria-label="Entwürfe als JSON exportieren" onClick={exportDesigns}><Download size={17} /></button>
      <button className="icon-button" title="Entwürfe aus JSON importieren" aria-label="Entwürfe aus JSON importieren" onClick={() => fileInput.current?.click()}><Upload size={17} /></button>
    </div>
    <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Entwurfsdatei" hidden onChange={event => { void importDesigns(event.target.files?.[0]); event.target.value = '' }} />
    {error && <p className="scene-design-error" role="alert">{error}</p>}
    {message && <p className="scene-design-message" role="status">{message}</p>}
  </section>
}