import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	DEFAULT_TEMPLATES,
	TEMPLATE_CHANGE_EVENT,
	loadTemplates,
	persistTemplates,
	saveTemplates,
	type PassTemplate,
} from './templates'

class MemoryStorage implements Storage {
	private values = new Map<string, string>()
	get length() { return this.values.size }
	clear() { this.values.clear() }
	getItem(key: string) { return this.values.get(key) ?? null }
	key(index: number) { return [...this.values.keys()][index] ?? null }
	removeItem(key: string) { this.values.delete(key) }
	setItem(key: string, value: string) { this.values.set(key, value) }
}

const storage = new MemoryStorage()
const dispatchEvent = vi.fn(() => true)

beforeEach(() => {
	storage.clear()
	dispatchEvent.mockClear()
	vi.stubGlobal('localStorage', storage)
	vi.stubGlobal('window', { dispatchEvent })
	vi.restoreAllMocks()
})

describe('template local storage', () => {
	it('returns built-in templates when storage is empty or corrupted', () => {
		expect(loadTemplates()).toEqual(DEFAULT_TEMPLATES)
		storage.setItem('pass-templates-v1', '{broken')
		expect(loadTemplates()).toEqual(DEFAULT_TEMPLATES)
	})

	it('restores edited built-ins and appends custom templates', () => {
		const edited = { ...DEFAULT_TEMPLATES[0], name: 'Изменённый пропуск' }
		const custom: PassTemplate = { ...DEFAULT_TEMPLATES[0], id: 'custom-pass', name: 'Свой', isBuiltIn: false }
		storage.setItem('pass-templates-v1', JSON.stringify([edited, custom]))
		const loaded = loadTemplates()
		expect(loaded.find(item => item.id === edited.id)?.name).toBe('Изменённый пропуск')
		expect(loaded.at(-1)).toMatchObject({ id: 'custom-pass', isBuiltIn: false })
	})

	it('migrates legacy preset backgrounds to regular background images', () => {
		const legacyPass: PassTemplate = {
			...DEFAULT_TEMPLATES[0],
			design: { ...DEFAULT_TEMPLATES[0].design, backgroundImage: undefined, backgroundImageName: undefined, background: 'emblem' },
		}
		const legacyCertificate: PassTemplate = {
			...DEFAULT_TEMPLATES[1],
			design: { ...DEFAULT_TEMPLATES[1].design, frontBackgroundImage: undefined, frontBackgroundImageName: undefined, backBackgroundImage: undefined, backBackgroundImageName: undefined, frontBackground: 'flag', backBackground: 'emblem' },
		}
		storage.setItem('pass-templates-v1', JSON.stringify([legacyPass, legacyCertificate]))
		const loaded = loadTemplates()
		expect(loaded[0].design).toMatchObject({ backgroundImage: 'builtin:emblem', backgroundImageName: 'Герб.png' })
		expect(loaded[1].design).toMatchObject({ frontBackgroundImage: 'builtin:flag', backBackgroundImage: 'builtin:emblem' })
		expect(loaded[0].design.background).toBeUndefined()
	})

	it('saves templates and announces the change', () => {
		saveTemplates(DEFAULT_TEMPLATES)
		expect(JSON.parse(storage.getItem('pass-templates-v1') ?? '[]')).toEqual(DEFAULT_TEMPLATES)
		expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: TEMPLATE_CHANGE_EVENT }))
	})
})

describe('template server persistence', () => {
	it('stores a local copy after a successful server response', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true })
		vi.stubGlobal('fetch', fetchMock)
		await persistTemplates(DEFAULT_TEMPLATES)
		expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/TemplatesSync'), expect.objectContaining({ method: 'POST' }))
		expect(loadTemplates()).toEqual(DEFAULT_TEMPLATES)
	})

	it('returns the backend message when saving fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Ошибка проверки' }) }))
		await expect(persistTemplates(DEFAULT_TEMPLATES)).rejects.toThrow('Ошибка проверки')
	})
})
