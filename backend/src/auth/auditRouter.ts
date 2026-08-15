import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { writeAuditLog } from './audit.js'

type AuditRow = RowDataPacket & {
	id: number
	action: string
	entity_type: string | null
	entity_id: string | null
	details: string | Record<string, unknown> | null
	ip_address: string | null
	created_at: Date
	actor_username: string | null
	actor_display_name: string | null
}

type CountRow = RowDataPacket & { count: number }
const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
	(req, res, next: NextFunction) => { void handler(req, res).catch(next) }

const parseDetails = (value: AuditRow['details']) => {
	if (!value || typeof value !== 'string') return value
	try { return JSON.parse(value) as Record<string, unknown> } catch { return null }
}

export const createAuditRouter = (database: Connection) => {
	const router = Router()

	router.get('/', asyncRoute(async (req, res) => {
		const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
		const limit = Math.min(100, Math.max(10, Number.parseInt(String(req.query.limit ?? '25'), 10) || 25))
		const category = typeof req.query.category === 'string' && /^(auth|user|template|directory|pass)$/.test(req.query.category)
			? req.query.category
			: ''
		const where = category ? 'WHERE a.action LIKE ?' : ''
		const parameters = category ? [`${category}.%`] : []
		const [countRows] = await database.execute<CountRow[]>(`SELECT COUNT(*) AS count FROM audit_log a ${where}`, parameters)
		const [rows] = await database.execute<AuditRow[]>(`
			SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at,
				u.username AS actor_username, u.display_name AS actor_display_name
			FROM audit_log a
			LEFT JOIN users u ON u.id = a.actor_user_id
			${where}
			ORDER BY a.created_at DESC, a.id DESC
			LIMIT ${limit} OFFSET ${(page - 1) * limit}
		`, parameters)

		return res.json({
			events: rows.map(row => ({
				id: row.id,
				action: row.action,
				entityType: row.entity_type,
				entityId: row.entity_id,
				details: parseDetails(row.details),
				ipAddress: row.ip_address,
				createdAt: new Date(row.created_at).toISOString(),
				actor: row.actor_username ? { username: row.actor_username, displayName: row.actor_display_name } : null,
			})),
			page,
			limit,
			total: countRows[0].count,
		})
	}))

	router.delete('/', asyncRoute(async (req, res) => {
		const days = Number.parseInt(String(req.query.olderThanDays ?? ''), 10)
		if (![30, 90, 180].includes(days)) return res.status(400).json({ message: 'Выберите срок: 30, 90 или 180 дней' })
		const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
		const [result] = await database.execute<ResultSetHeader>('DELETE FROM audit_log WHERE created_at < ?', [cutoff])
		await writeAuditLog(database, req, { action: 'audit.cleaned', entityType: 'audit_log', details: { olderThanDays: days, deleted: result.affectedRows } })
		return res.json({ status: 'success', deleted: result.affectedRows })
	}))

	return router
}
