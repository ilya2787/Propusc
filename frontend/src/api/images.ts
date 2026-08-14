const serverUrl = () => import.meta.env.VITE_APP_SERVER

export const resolveServerImageUrl = (source?: string) => {
	if (!source) return ''
	if (source.startsWith('data:') || source.startsWith('blob:') || /^https?:\/\//.test(source)) return source
	if (source.startsWith('/')) return `${serverUrl()}${source}`
	return source
}

export const uploadImage = async (file: File, kind: 'background' | 'photo') => {
	const body = new FormData()
	body.append('image', file)
	const response = await fetch(`${serverUrl()}/UploadImage?kind=${kind}`, { method: 'POST', body })
	const data = await response.json().catch(() => ({}))
	if (!response.ok) throw new Error(data.message || 'Не удалось загрузить изображение')
	return data as { url: string; name: string }
}

export const deleteUploadedImage = async (url?: string) => {
	if (!url?.startsWith('/uploads/')) return
	const response = await fetch(`${serverUrl()}/UploadedImage`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ url }),
	})
	if (!response.ok) throw new Error('Не удалось удалить изображение')
}
