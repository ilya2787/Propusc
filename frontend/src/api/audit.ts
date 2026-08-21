export type PassAuditAction = 'pass.created' | 'pass.printed'
import { apiUrl } from './server'

export const recordPassEvent = async (action: PassAuditAction, templateId: string, count: number) => {
	try {
		await fetch(apiUrl('/Audit/PassEvent'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ action, templateId, count }),
		})
	} catch (error) {
		console.error('Не удалось записать событие пропуска:', error)
	}
}
