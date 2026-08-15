import type { Request } from 'express'
import type { Connection } from 'mysql2/promise'

type AuditEvent = {
	actorUserId?: string | null
	action: string
	entityType?: string | null
	entityId?: string | null
	details?: Record<string, unknown> | null
}

export const writeAuditLog = async (database: Connection, req: Request, event: AuditEvent) => {
	try {
		await database.execute(`
			INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, details, ip_address, user_agent)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, [
			event.actorUserId ?? req.authUser?.id ?? null,
			event.action.slice(0, 80),
			event.entityType?.slice(0, 80) ?? null,
			event.entityId?.slice(0, 191) ?? null,
			event.details ? JSON.stringify(event.details) : null,
			req.ip?.slice(0, 45) || null,
			req.get('user-agent')?.slice(0, 500) || null,
		])
	} catch (error) {
		console.error('Не удалось записать событие аудита:', error)
	}
}
