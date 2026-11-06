import { facadeCompositions, initialSettings, woodProfiles, woodTones } from './context'
import type { HouseAppearance, SceneSettings } from './context'
import type { TimberArea } from './timberCladding'

export const sceneDesignStorageKey = 'grundriss.scene-designs.v1'
export type SceneDesign = { id: string; name: string; savedAt: string; settings: SceneSettings }
export type SceneDesignLibrary = { format: 'grundriss-scene-designs'; version: 1; lastSavedId: string | null; designs: SceneDesign[] }
export const emptyDesignLibrary = (): SceneDesignLibrary => ({ format: 'grundriss-scene-designs', version: 1, lastSavedId: null, designs: [] })

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ungültige Entwurfsdaten.')
  return value as Record<string, unknown>
}
function text(value: unknown, max = 128): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Ungültiger oder zu langer Name.')
  return value.trim()
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Wert außerhalb des zulässigen Bereichs.')
  return value
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Ungültiger Schalterwert.')
  return value
}
function choice<const Choice extends string>(value: unknown, choices: readonly Choice[]): Choice {
  if (typeof value !== 'string' || !choices.includes(value as Choice)) throw new Error('Unbekannte Entwurfsoption.')
  return value as Choice
}
function color(value: unknown): string {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new Error('Ungültige Farbe.')
  return value.toLowerCase()
}
function readArea(value: unknown): TimberArea {
  const area = record(value)
  const result: TimberArea = {
    id: text(area.id), face: choice(area.face, ['east', 'north', 'south']), floor: choice(area.floor, ['EG', 'OG', 'DG']),
    from: number(area.from, 0, 100), to: number(area.to, 0, 100), bottom: number(area.bottom, 0, 100), top: number(area.top, 0, 100),
    material: choice(area.material, ['wood', 'plaster']), enabled: area.enabled === undefined ? true : boolean(area.enabled),
  }
  if (result.to <= result.from || result.top <= result.bottom) throw new Error('Ungültige Holzflächen-Grenzen.')
  return result
}
function readHouse(value: unknown): HouseAppearance {
  const house = record(value), timber = house.timber === undefined ? {} : record(house.timber)
  if (timber.areas !== undefined && (!Array.isArray(timber.areas) || timber.areas.length > 300)) throw new Error('Zu viele oder ungültige Holzflächen.')
  const areas = (timber.areas as unknown[] | undefined)?.map(readArea) ?? []
  if (new Set(areas.map(area => area.id)).size !== areas.length) throw new Error('Doppelte Holzflächen-ID.')
  const woodTone = number(house.woodTone, 0, woodTones.length - 1)
  if (!Number.isInteger(woodTone)) throw new Error('Ungültiger Holzton.')
  return {
    facade: color(house.facade), roof: color(house.roof), roofTrim: color(house.roofTrim), entryDoor: color(house.entryDoor),
    frame: color(house.frame), frameInside: color(house.frameInside), composition: choice(house.composition, facadeCompositions.map(option => option.id)),
    woodTone, woodProfile: choice(house.woodProfile, woodProfiles.map(option => option.id)), entryCanopy: house.entryCanopy === undefined ? true : boolean(house.entryCanopy),
    timber: { surface: timber.surface === undefined ? 'fresh' : choice(timber.surface, ['fresh', 'oiled', 'weathered']), windows: timber.windows === undefined ? 'none' : choice(timber.windows, ['none', 'reveals', 'screen']), ...(timber.areas === undefined ? {} : { areas }) },
  }
}
export function readSceneSettings(value: unknown): SceneSettings {
  const settings = record(value), lights = record(settings.lights)
  if (Object.keys(lights).length > 500) throw new Error('Zu viele Lichtkreise.')
  return {
    ...readHouse(settings), west: readHouse(settings.west), interiorDoor: color(settings.interiorDoor),
    people: boolean(settings.people), peopleMoving: boolean(settings.peopleMoving), surroundings: boolean(settings.surroundings), landscaping: boolean(settings.landscaping), transparentGround: boolean(settings.transparentGround),
    hour: number(settings.hour, 0, 23.75), season: choice(settings.season, ['summer', 'spring', 'winter']), lightingMode: choice(settings.lightingMode, ['room', 'global']),
    raffstoreExtension: number(settings.raffstoreExtension, 0, 1), raffstoreTilt: number(settings.raffstoreTilt, 0, 75),
    lights: Object.fromEntries(Object.entries(lights).sort(([left], [right]) => left.localeCompare(right)).map(([key, enabled]) => [text(key), boolean(enabled)])),
  }
}
export function settingsSignature(settings: SceneSettings): string {
  return JSON.stringify(readSceneSettings(settings))
}
export function parseDesignLibrary(source: string): SceneDesignLibrary {
  if (source.length > 5_000_000) throw new Error('Entwurfsdatei ist zu groß (maximal 5 MB).')
  const data = record(JSON.parse(source))
  if (data.format !== 'grundriss-scene-designs' || data.version !== 1) throw new Error('Unbekanntes Entwurfsformat oder nicht unterstützte Version.')
  if (!Array.isArray(data.designs) || data.designs.length > 200) throw new Error('Ungültige Entwurfsliste (maximal 200 Einträge).')
  const designs = data.designs.map(value => {
    const design = record(value), savedAt = text(design.savedAt)
    if (!Number.isFinite(Date.parse(savedAt))) throw new Error('Ungültiges Speicherdatum.')
    return { id: text(design.id), name: text(design.name, 80), savedAt, settings: readSceneSettings(design.settings) }
  })
  if (new Set(designs.map(design => design.id)).size !== designs.length) throw new Error('Doppelte Entwurfs-ID.')
  const lastSavedId = data.lastSavedId === null ? null : text(data.lastSavedId)
  if (lastSavedId !== null && !designs.some(design => design.id === lastSavedId)) throw new Error('Der Startentwurf fehlt in der Datei.')
  return { format: 'grundriss-scene-designs', version: 1, lastSavedId, designs }
}
export function readDesignStorage(storage: Pick<Storage, 'getItem'>): { library: SceneDesignLibrary; error: string } {
  try {
    const value = storage.getItem(sceneDesignStorageKey)
    return { library: value ? parseDesignLibrary(value) : emptyDesignLibrary(), error: '' }
  } catch {
    return { library: emptyDesignLibrary(), error: 'Gespeicherte Entwürfe konnten nicht gelesen werden. Die vorhandenen Browserdaten wurden nicht verändert.' }
  }
}
export function writeDesignStorage(storage: Pick<Storage, 'setItem'>, library: SceneDesignLibrary): SceneDesignLibrary {
  const validated = parseDesignLibrary(JSON.stringify(library))
  storage.setItem(sceneDesignStorageKey, JSON.stringify(validated))
  return validated
}
export function startupScene(library: SceneDesignLibrary): SceneSettings {
  return readSceneSettings(library.designs.find(design => design.id === library.lastSavedId)?.settings ?? initialSettings)
}
export function savedSnapshot(library: SceneDesignLibrary, name: string, settings: SceneSettings, id: string = crypto.randomUUID(), savedAt = new Date().toISOString()): SceneDesignLibrary {
  return { ...library, lastSavedId: id, designs: [...library.designs, { id, name: text(name, 80), savedAt, settings: readSceneSettings(settings) }] }
}
export function deleteDesign(library: SceneDesignLibrary, id: string): SceneDesignLibrary {
  const designs = library.designs.filter(design => design.id !== id)
  return { ...library, designs, lastSavedId: library.lastSavedId === id ? designs.at(-1)?.id ?? null : library.lastSavedId }
}
export function mergeDesigns(library: SceneDesignLibrary, imported: SceneDesignLibrary): SceneDesignLibrary {
  const ids = new Set(library.designs.map(design => design.id)), remapped = new Map<string, string>()
  const additions = imported.designs.map(design => {
    let id = design.id
    while (ids.has(id)) id = crypto.randomUUID()
    ids.add(id); remapped.set(design.id, id)
    return { ...design, id }
  })
  return { ...library, designs: [...library.designs, ...additions], lastSavedId: library.lastSavedId ?? (imported.lastSavedId ? remapped.get(imported.lastSavedId) ?? null : null) }
}