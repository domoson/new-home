import { describe, expect, it } from 'vitest'
import { initialSettings } from './context'
import { deleteDesign, emptyDesignLibrary, mergeDesigns, parseDesignLibrary, readDesignStorage, readSceneSettings, savedSnapshot, sceneDesignStorageKey, settingsSignature, startupScene, writeDesignStorage } from './sceneDesigns'

describe('saved scene designs', () => {
  it('stores complete independent snapshots and restores only the explicitly saved version', () => {
    const working = readSceneSettings(initialSettings)
    working.composition = 'custom'
    working.timber!.areas = [{ id: 'area', face: 'east', floor: 'OG', from: 12, to: 73, bottom: 20, top: 90, material: 'plaster' }]
    working.west.roof = '#123456'; working.frameInside = '#abcdef'; working.interiorDoor = '#fedcba'; working.lights = { 'OG-hall': false }; working.hour = 21
    let library = savedSnapshot(emptyDesignLibrary(), '  Holz Nord  ', working, 'first')
    working.timber!.areas![0].to = 81
    expect(library.designs[0].settings.timber!.areas![0].to).toBe(73)
    library = savedSnapshot(library, 'Abend', working, 'second')
    const browsed = readSceneSettings(library.designs[0].settings)
    browsed.west.roof = '#000000'
    expect(startupScene(library).timber!.areas![0].to).toBe(81)
    expect(startupScene(library).west.roof).toBe('#123456')
    expect(startupScene(library).frameInside).toBe('#abcdef')
    expect(startupScene(library).interiorDoor).toBe('#fedcba')
    expect(startupScene(library).hour).toBe(21)
    expect(library.designs[0].name).toBe('Holz Nord')
    expect(parseDesignLibrary(JSON.stringify(library))).toEqual(library)
  })
  it('normalizes optional defaults and light key order for dirty detection', () => {
    expect(readSceneSettings(initialSettings).timber?.areas).toBeUndefined()
    expect(readSceneSettings({ ...initialSettings, timber: { areas: [] } }).timber?.areas).toEqual([])
    expect(settingsSignature(initialSettings)).toBe(settingsSignature(readSceneSettings(initialSettings)))
    expect(settingsSignature({ ...initialSettings, lights: { north: true, south: false } })).toBe(settingsSignature({ ...initialSettings, lights: { south: false, north: true } }))
  })
  it('does not silently repair malformed or future imports', () => {
    const library = savedSnapshot(emptyDesignLibrary(), 'Test', initialSettings, 'one')
    const invalid = (mutate: (data: typeof library) => void) => { const data = structuredClone(library); mutate(data); expect(() => parseDesignLibrary(JSON.stringify(data))).toThrow() }
    expect(() => parseDesignLibrary('{broken')).toThrow()
    expect(() => parseDesignLibrary(JSON.stringify({ ...library, version: 999 }))).toThrow()
    invalid(data => { data.designs[0].settings.west.roof = 'url(javascript:bad)' })
    invalid(data => { data.designs[0].settings.hour = 40 })
    invalid(data => { data.designs[0].settings.woodTone = .5 })
    invalid(data => { data.lastSavedId = 'missing' })
    invalid(data => { data.designs.push(data.designs[0]) })
    invalid(data => { data.designs[0].settings.timber!.areas = [{ id: 'bad', face: 'east', floor: 'EG', material: 'wood', from: 80, to: 20, bottom: 0, top: 100 }] })
  })
  it('handles unavailable storage without destroying the stored data', () => {
    const library = savedSnapshot(emptyDesignLibrary(), 'Test', initialSettings)
    const storage = { getItem: () => '{corrupted', setItem: () => { throw new Error('quota') } }
    expect(readDesignStorage(storage).error).not.toBe('')
    expect(readDesignStorage(storage).library.designs).toEqual([])
    expect(() => writeDesignStorage(storage, library)).toThrow('quota')
    let stored = ''
    writeDesignStorage({ setItem(key, value) { expect(key).toBe(sceneDesignStorageKey); stored = value } }, library)
    expect(readDesignStorage({ getItem: () => stored }).library).toEqual(library)
  })
  it('preserves earlier designs during import and chooses a valid fallback after deletion', () => {
    const first = savedSnapshot(emptyDesignLibrary(), 'First', initialSettings, 'one')
    const second = savedSnapshot(first, 'Second', { ...initialSettings, hour: 20 }, 'two')
    const merged = mergeDesigns(second, first)
    expect(merged.designs).toHaveLength(3)
    expect(new Set(merged.designs.map(design => design.id)).size).toBe(3)
    expect(merged.lastSavedId).toBe('two')
    expect(deleteDesign(second, 'two').lastSavedId).toBe('one')
    expect(deleteDesign(first, 'one').lastSavedId).toBeNull()
    expect(startupScene(emptyDesignLibrary())).toEqual(readSceneSettings(initialSettings))
  })
})