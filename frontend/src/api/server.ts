export const serverUrl = () => {
	const configured = String(import.meta.env.VITE_APP_SERVER || '').trim()
	return configured.replace(/\/$/, '') || '/api'
}

export const apiUrl = (path: string) => `${serverUrl()}${path.startsWith('/') ? path : `/${path}`}`
