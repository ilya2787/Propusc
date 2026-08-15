import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { UserRole } from './schema.js'
import { writeAuditLog } from './audit.js'

type UserListRow = RowDataPacket & {
	id: string
	username: string
	display_name: string
	role: UserRole
	is_active: number
	created_at: Date
	last_login_at: Date | null
}

type CountRow = RowDataPacket & { count: number }

const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
	(req, res, next: NextFunction) => { void handler(req, res).catch(next) }

const publicUser = (user: UserListRow) => ({
	id: user.id,
	username: user.username,
	displayName: user.display_name,
	role: user.role,
	isActive: Boolean(user.is_active),
	createdAt: new Date(user.created_at).toISOString(),
	lastLoginAt: user.last_login_at ? new Date(user.last_login_at).toISOString() : null,
})

export const createUsersRouter = (database: Connection) => {
	const router = Router()

	router.get('/', asyncRoute(async (_req, res) => {
		const [rows] = await database.execute<UserListRow[]>(`
			SELECT id, username, display_name, role, is_active, created_at, last_login_at
			FROM users
			ORDER BY is_active DESC, role = 'admin' DESC, display_name, username
		`)
		return res.json({ users: rows.map(publicUser) })
	}))

	router.post('/', asyncRoute(async (req, res) => {
		const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : ''
		const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : ''
		const password = typeof req.body?.password === 'string' ? req.body.password : ''
		const role: UserRole = req.body?.role === 'admin' ? 'admin' : 'operator'

		if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
			return res.status(400).json({ message: 'Логин должен содержать от 3 до 64 латинских букв, цифр, точек, дефисов или подчёркиваний' })
		}
		if (displayName.length < 2 || displayName.length > 255) {
			return res.status(400).json({ message: 'Имя должно содержать от 2 до 255 символов' })
		}
		if (password.length < 8 || password.length > 128) {
			return res.status(400).json({ message: 'Пароль должен содержать от 8 до 128 символов' })
		}

		const passwordHash = await bcrypt.hash(password, 12)
		const id = randomUUID()
		try {
			await database.execute(
				'INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
				[id, username, passwordHash, displayName, role],
			)
		} catch (error) {
			if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
				return res.status(409).json({ message: 'Пользователь с таким логином уже существует' })
			}
			throw error
		}

		const [rows] = await database.execute<UserListRow[]>(`
			SELECT id, username, display_name, role, is_active, created_at, last_login_at
			FROM users WHERE id = ? LIMIT 1
		`, [id])
		await writeAuditLog(database, req, {
			action: 'user.created',
			entityType: 'user',
			entityId: id,
			details: { username, displayName, role },
		})
		return res.status(201).json({ user: publicUser(rows[0]) })
	}))

	router.patch('/:id', asyncRoute(async (req, res) => {
		const id = String(req.params.id)
		const hasRole = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'role')
		const hasActive = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'isActive')
		if (!hasRole && !hasActive) return res.status(400).json({ message: 'Не указаны изменения пользователя' })
		if (hasRole && req.body.role !== 'admin' && req.body.role !== 'operator') {
			return res.status(400).json({ message: 'Указана неизвестная роль пользователя' })
		}
		if (hasActive && typeof req.body.isActive !== 'boolean') {
			return res.status(400).json({ message: 'Некорректный статус пользователя' })
		}

		await database.beginTransaction()
		try {
			const [targetRows] = await database.execute<UserListRow[]>(`
				SELECT id, username, display_name, role, is_active, created_at, last_login_at
				FROM users WHERE id = ? LIMIT 1 FOR UPDATE
			`, [id])
			const target = targetRows[0]
			if (!target) {
				await database.rollback()
				return res.status(404).json({ message: 'Пользователь не найден' })
			}

			const nextRole: UserRole = hasRole ? req.body.role : target.role
			const nextActive = hasActive ? req.body.isActive : Boolean(target.is_active)
			const changesOwnAccess = req.authUser?.id === target.id
				&& (nextRole !== target.role || nextActive !== Boolean(target.is_active))
			if (changesOwnAccess) {
				await database.rollback()
				return res.status(400).json({ message: 'Нельзя изменить собственную роль или заблокировать свою учётную запись' })
			}

			if (target.role === 'admin' && Boolean(target.is_active) && (nextRole !== 'admin' || !nextActive)) {
				const [countRows] = await database.execute<CountRow[]>(
					"SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = TRUE",
				)
				if (countRows[0].count <= 1) {
					await database.rollback()
					return res.status(409).json({ message: 'Нельзя заблокировать или понизить последнего активного администратора' })
				}
			}

			await database.execute('UPDATE users SET role = ?, is_active = ? WHERE id = ?', [nextRole, nextActive, id])
			if (!nextActive) {
				await database.execute('UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [id])
			}
			await database.commit()
			await writeAuditLog(database, req, {
				action: 'user.access_updated',
				entityType: 'user',
				entityId: id,
				details: { previousRole: target.role, role: nextRole, previousActive: Boolean(target.is_active), isActive: nextActive },
			})
			return res.json({ user: publicUser({ ...target, role: nextRole, is_active: nextActive ? 1 : 0 }) })
		} catch (error) {
			await database.rollback()
			throw error
		}
	}))

	router.post('/:id/reset-password', asyncRoute(async (req, res) => {
		const id = String(req.params.id)
		const password = typeof req.body?.password === 'string' ? req.body.password : ''
		if (password.length < 8 || password.length > 128) {
			return res.status(400).json({ message: 'Пароль должен содержать от 8 до 128 символов' })
		}
		if (req.authUser?.id === id) {
			return res.status(400).json({ message: 'Для смены собственного пароля нужен отдельный профиль пользователя' })
		}

		const [rows] = await database.execute<UserListRow[]>('SELECT id FROM users WHERE id = ? LIMIT 1', [id])
		if (!rows[0]) return res.status(404).json({ message: 'Пользователь не найден' })

		const passwordHash = await bcrypt.hash(password, 12)
		await database.beginTransaction()
		try {
			await database.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id])
			await database.execute('UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [id])
			await database.commit()
			await writeAuditLog(database, req, { action: 'user.password_reset', entityType: 'user', entityId: id })
			return res.json({ status: 'success' })
		} catch (error) {
			await database.rollback()
			throw error
		}
	}))

	router.post('/:id/revoke-sessions', asyncRoute(async (req, res) => {
		const id = String(req.params.id)
		if (req.authUser?.id === id) {
			return res.status(400).json({ message: 'Нельзя завершить собственную сессию через панель управления' })
		}
		const [users] = await database.execute<UserListRow[]>('SELECT id FROM users WHERE id = ? LIMIT 1', [id])
		if (!users[0]) return res.status(404).json({ message: 'Пользователь не найден' })

		const [result] = await database.execute<ResultSetHeader>(
			'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()',
			[id],
		)
		await writeAuditLog(database, req, {
			action: 'user.sessions_revoked',
			entityType: 'user',
			entityId: id,
			details: { revokedSessions: result.affectedRows },
		})
		return res.json({ status: 'success', revokedSessions: result.affectedRows })
	}))

	return router
}
