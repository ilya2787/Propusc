import { resolveServerImageUrl } from '../../api/images'

export const resolvePhotoSource = (photo?: string) => {
	if (!photo) return ''
	if (photo.startsWith('data:') || photo.startsWith('blob:') || /^https?:\/\//.test(photo)) {
		return photo
	}
	if (photo.startsWith('/')) return resolveServerImageUrl(photo)
	return `${import.meta.env.VITE_APP_SERVER}/Photo/${encodeURIComponent(photo)}`
}
