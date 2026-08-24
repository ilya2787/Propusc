import { AUTH_EXPIRED_EVENT } from '../auth/AuthContext'
import { apiUrl, serverUrl } from './server'

const authenticatedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
	const response = await fetch(input, { ...init, credentials: 'include' })
	if (response.status === 401) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
	return response
}

export const resolveServerImageUrl = (source?: string) => {
	if (!source) return ''
	if (source.startsWith('data:') || source.startsWith('blob:') || /^https?:\/\//.test(source)) return source
	if (source.startsWith('/')) return `${serverUrl()}${source}`
	return source
}

export const uploadImage = async (file: File, kind: 'background' | 'photo') => {
	const body = new FormData()
	body.append('image', file)
	const response = await authenticatedFetch(apiUrl(`/UploadImage?kind=${kind}`), { method: 'POST', body })
	const data = await response.json().catch(() => ({}))
	if (!response.ok) throw new Error(data.message || 'Не удалось загрузить изображение')
	return data as { url: string; name: string }
}

export const downloadImageAsDataUrl = async (source?: string) => {
	if (!source || source.startsWith('builtin:') || source.startsWith('data:')) return source ?? ''
	const response = await authenticatedFetch(resolveServerImageUrl(source))
	if (!response.ok) throw new Error('Не удалось добавить изображение в файл шаблонов')
	const blob = await response.blob()
	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result ?? ''))
		reader.onerror = () => reject(new Error('Не удалось прочитать изображение для экспорта'))
		reader.readAsDataURL(blob)
	})
}

export const uploadEmbeddedImage = async (source: string, name: string) => {
	if (!source.startsWith('data:')) return source
	const blob = await fetch(source).then(response => response.blob())
	const file = new File([blob], name || 'image', { type: blob.type })
	return (await uploadImage(file, 'background')).url
}

export const deleteUploadedImage = async (url?: string) => {
	if (!url?.startsWith('/uploads/')) return
	const response = await authenticatedFetch(apiUrl('/UploadedImage'), {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ url }),
	})
	if (!response.ok) throw new Error('Не удалось удалить изображение')
}
