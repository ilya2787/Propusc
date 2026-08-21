import { resolveServerImageUrl } from '../../api/images'
import { apiUrl } from '../../api/server'

export const resolvePhotoSource = (photo?: string) => {
	if (!photo) return ''
	if (photo.startsWith('data:') || photo.startsWith('blob:') || /^https?:\/\//.test(photo)) {
		return photo
	}
	if (photo.startsWith('/')) return resolveServerImageUrl(photo)
	return apiUrl(`/Photo/${encodeURIComponent(photo)}`)
}
