import bcrypt from 'bcrypt'
import { randomBytes, randomUUID } from 'node:crypto'
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import type { Connection, RowDataPacket } from 'mysql2/promise'
import type { UserRole } from './schema.js'
import { hashSessionToken, SESSION_COOKIE } from './middleware.js'
import { writeAuditLog } from './audit.js'
import { clearLoginFailures, getLoginRestriction, loginIdentifier, registerFailedLogin } from './loginProtection.js'

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000
const SESSION_RENEWAL_THRESHOLD_MS = 2 * 60 * 60 * 1000

type UserRow = RowDataPacket & {
	id: string
	username: string
	password_hash: string
	display_name: string
	role: UserRole
	is_active: number
}

type SessionUserRow = UserRow & {
	session_id: string
	expires_at: Date
}

const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
	(req, res, next: NextFunction) => { void handler(req, res).catch(next) }

const newSessionToken = () => randomBytes(48).toString('base64url')
const cookieSecurityOptions = () => ({
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	path: '/',
})
const cookieOptions = () => ({ ...cookieSecurityOptions(), maxAge: SESSION_LIFETIME_MS })
const publicUser = (user: UserRow) => ({
	id: user.id,
	username: user.username,
	displayName: user.display_name,
	role: user.role,
})

export const createAuthRouter = (database: Connection) => {
	const router = Router()

	router.post('/Login', asyncRoute(async (req, res) => {
		const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : ''
		const password = typeof req.body?.password === 'string' ? req.body.password : ''
		if (!/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 1 || password.length > 128) {
			return res.status(400).json({ message: 'Укажите корректные логин и пароль' })
		}
		const identifier = loginIdentifier(username, req.ip || 'unknown')
		const retryAfter = await getLoginRestriction(database, identifier)
		if (retryAfter > 0) {
			res.set('Retry-After', String(retryAfter))
			await writeAuditLog(database, req, { action: 'auth.login_rate_limited', details: { username, retryAfter } })
			return res.status(429).json({ message: `Слишком много попыток входа. Повторите через ${Math.ceil(retryAfter / 60)} мин.` })
		}

		const [rows] = await database.execute<UserRow[]>(
			'SELECT id, username, password_hash, display_name, role, is_active FROM users WHERE username = ? LIMIT 1',
			[username],
		)
		const user = rows[0]
		if (!user || !(await bcrypt.compare(password, user.password_hash))) {
			const blockedFor = await registerFailedLogin(database, identifier)
			await writeAuditLog(database, req, {
				actorUserId: user?.id ?? null,
				action: 'auth.login_failed',
				entityType: 'user',
				entityId: user?.id ?? null,
				details: { username },
			})
			if (blockedFor > 0) {
				res.set('Retry-After', String(blockedFor))
				return res.status(429).json({ message: 'Слишком много попыток входа. Вход заблокирован на 15 минут.' })
			}
			return res.status(401).json({ message: 'Неверный логин или пароль' })
		}
		if (!user.is_active) {
			await writeAuditLog(database, req, { actorUserId: user.id, action: 'auth.login_blocked', entityType: 'user', entityId: user.id })
			return res.status(403).json({ message: 'Учётная запись заблокирована' })
		}

		const token = newSessionToken()
		const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)
		await database.execute('DELETE FROM user_sessions WHERE expires_at <= NOW() OR revoked_at IS NOT NULL')
		await database.execute(
			'INSERT INTO user_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
			[randomUUID(), user.id, hashSessionToken(token), expiresAt, req.ip?.slice(0, 45) || null, req.get('user-agent')?.slice(0, 500) || null],
		)
		await database.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])
		await clearLoginFailures(database, identifier)
		await writeAuditLog(database, req, { actorUserId: user.id, action: 'auth.login_success', entityType: 'user', entityId: user.id })

		res.cookie(SESSION_COOKIE, token, cookieOptions())
		return res.json({ user: publicUser(user), expiresAt: expiresAt.toISOString() })
	}))

	router.get('/Me', asyncRoute(async (req, res) => {
		const token = typeof req.cookies?.[SESSION_COOKIE] === 'string' ? req.cookies[SESSION_COOKIE] : ''
		if (!token) return res.status(401).json({ message: 'Требуется авторизация' })

		const [rows] = await database.execute<SessionUserRow[]>(`
			SELECT s.id AS session_id, s.expires_at, u.id, u.username, u.password_hash, u.display_name, u.role, u.is_active
			FROM user_sessions s
			JOIN users u ON u.id = s.user_id
			WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
			LIMIT 1
		`, [hashSessionToken(token)])
		const user = rows[0]
		if (!user || !user.is_active) {
			res.clearCookie(SESSION_COOKIE, cookieSecurityOptions())
			return res.status(401).json({ message: 'Сессия истекла или недействительна' })
		}

		let expiresAt = new Date(user.expires_at)
		if (expiresAt.getTime() - Date.now() < SESSION_RENEWAL_THRESHOLD_MS) {
			expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)
			await database.execute('UPDATE user_sessions SET expires_at = ?, last_used_at = NOW() WHERE id = ?', [expiresAt, user.session_id])
			res.cookie(SESSION_COOKIE, token, cookieOptions())
		} else {
			await database.execute('UPDATE user_sessions SET last_used_at = NOW() WHERE id = ?', [user.session_id])
		}
		return res.json({ user: publicUser(user), expiresAt: expiresAt.toISOString() })
	}))

	router.post('/Logout', asyncRoute(async (req, res) => {
		const token = typeof req.cookies?.[SESSION_COOKIE] === 'string' ? req.cookies[SESSION_COOKIE] : ''
		if (token) await database.execute('UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL', [hashSessionToken(token)])
		res.clearCookie(SESSION_COOKIE, cookieSecurityOptions())
		return res.json({ status: 'success' })
	}))

	return router
}
