import { createHash } from 'node:crypto'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { Connection, RowDataPacket } from 'mysql2/promise'
import type { UserRole } from './schema.js'

export const SESSION_COOKIE = 'propusk_session'

export type AuthUser = {
	id: string
	username: string
	displayName: string
	role: UserRole
	sessionId: string
}

declare global {
	namespace Express {
		interface Request {
			authUser?: AuthUser
		}
	}
}

type AuthRow = RowDataPacket & {
	id: string
	username: string
	display_name: string
	role: UserRole
	session_id: string
}

export const hashSessionToken = (token: string) => createHash('sha256').update(token).digest('hex')

export const requireAuth = (database: Connection): RequestHandler => async (req, res, next) => {
	try {
		const token = typeof req.cookies?.[SESSION_COOKIE] === 'string' ? req.cookies[SESSION_COOKIE] : ''
		if (!token) return res.status(401).json({ message: 'Требуется авторизация' })
		const [rows] = await database.execute<AuthRow[]>(`
			SELECT s.id AS session_id, u.id, u.username, u.display_name, u.role
			FROM user_sessions s
			JOIN users u ON u.id = s.user_id
			WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.is_active = TRUE
			LIMIT 1
		`, [hashSessionToken(token)])
		const row = rows[0]
		if (!row) return res.status(401).json({ message: 'Сессия истекла или недействительна' })
		req.authUser = { id: row.id, username: row.username, displayName: row.display_name, role: row.role, sessionId: row.session_id }
		return next()
	} catch (error) {
		return next(error)
	}
}

export const requireRole = (...roles: UserRole[]): RequestHandler =>
	(req: Request, res: Response, next: NextFunction) => {
		if (!req.authUser) return res.status(401).json({ message: 'Требуется авторизация' })
		if (!roles.includes(req.authUser.role)) return res.status(403).json({ message: 'Недостаточно прав для выполнения действия' })
		return next()
	}
