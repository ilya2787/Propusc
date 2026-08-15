export type PassAuditAction = 'pass.created' | 'pass.printed'

const serverUrl = () => import.meta.env.VITE_APP_SERVER

export const recordPassEvent = async (action: PassAuditAction, templateId: string, count: number) => {
	try {
		await fetch(`${serverUrl()}/Audit/PassEvent`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ action, templateId, count }),
		})
	} catch (error) {
		console.error('Не удалось записать событие пропуска:', error)
	}
}
