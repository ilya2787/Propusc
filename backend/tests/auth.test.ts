import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser'
import express from 'express'
import type { Connection } from 'mysql2/promise'
import request from 'supertest'
import { createAuthRouter } from '../src/auth/router.js'
import { requireAuth, requireRole } from '../src/auth/middleware.js'
import { clearLoginFailures, getLoginRestriction, loginIdentifier, registerFailedLogin } from '../src/auth/loginProtection.js'
import { createUsersRouter } from '../src/auth/usersRouter.js'

type LimitState = { failed_attempts: number; window_started_at: Date; blocked_until: Date | null }

class RateLimitDatabase {
	state = new Map<string, LimitState>()
	async execute(sql: string, parameters: unknown[] = []) {
		const id = String(parameters[0] ?? '')
		if (sql.includes('SELECT failed_attempts')) return [[this.state.get(id)].filter(Boolean), []]
		if (sql.includes('INSERT INTO login_rate_limits')) {
			this.state.set(id, { failed_attempts: Number(parameters[1]), window_started_at: parameters[2] as Date, blocked_until: parameters[3] as Date | null })
			return [{ affectedRows: 1 }, []]
		}
		if (sql.includes('DELETE FROM login_rate_limits')) {
			this.state.delete(id)
			return [{ affectedRows: 1 }, []]
		}
		throw new Error(`Неожиданный SQL в тесте: ${sql}`)
	}
}

class AuthDatabase extends RateLimitDatabase {
	passwordHash = ''
	auditActions: string[] = []
	sessionsCreated = 0
	async execute(sql: string, parameters: unknown[] = []) {
		if (sql.includes('FROM users WHERE username')) return [[{
			id: 'user-1', username: 'admin', password_hash: this.passwordHash, display_name: 'Администратор', role: 'admin', is_active: 1,
		}], []]
		if (sql.includes('INSERT INTO user_sessions')) {
			this.sessionsCreated += 1
			return [{ affectedRows: 1 }, []]
		}
		if (sql.includes('INSERT INTO audit_log')) {
			this.auditActions.push(String(parameters[1]))
			return [{ affectedRows: 1 }, []]
		}
		if (sql.includes('user_sessions') || sql.includes('UPDATE users')) return [{ affectedRows: 1 }, []]
		return super.execute(sql, parameters)
	}
}

class UsersDatabase {
	target = { id: 'target-1', username: 'operator', display_name: 'Оператор', role: 'operator', is_active: 1, created_at: new Date(), last_login_at: null }
	insertedPasswordHash = ''
	sessionsRevoked = 0
	async beginTransaction() {}
	async commit() {}
	async rollback() {}
	async execute(sql: string, parameters: unknown[] = []) {
		if (sql.includes('INSERT INTO users')) {
			this.insertedPasswordHash = String(parameters[2])
			this.target = { ...this.target, id: String(parameters[0]), username: String(parameters[1]), display_name: String(parameters[3]), role: parameters[4] as 'admin' | 'operator' }
			return [{ affectedRows: 1 }, []]
		}
		if (sql.includes('SELECT COUNT(*)')) return [[{ count: 1 }], []]
		if (sql.includes('SELECT id, username') && sql.includes('WHERE id')) return [[this.target], []]
		if (sql.includes('UPDATE user_sessions')) {
			this.sessionsRevoked += 1
			return [{ affectedRows: 1 }, []]
		}
		if (sql.includes('UPDATE users')) {
			this.target = { ...this.target, role: parameters[0] as 'admin' | 'operator', is_active: parameters[1] ? 1 : 0 }
			return [{ affectedRows: 1 }, []]
		}
		if (sql.includes('INSERT INTO audit_log')) return [{ affectedRows: 1 }, []]
		throw new Error(`Неожиданный SQL в тесте пользователей: ${sql}`)
	}
}

const asConnection = (database: object) => database as Connection

describe('защита от перебора пароля', () => {
	it('блокирует вход после пяти неудачных попыток и очищается после успеха', async () => {
		const database = new RateLimitDatabase()
		const connection = asConnection(database)
		const identifier = loginIdentifier('admin', '127.0.0.1')
		for (let attempt = 1; attempt <= 4; attempt += 1) {
			assert.equal(await registerFailedLogin(connection, identifier), 0)
		}
		assert.equal(await registerFailedLogin(connection, identifier), 900)
		assert.ok(await getLoginRestriction(connection, identifier) > 0)
		await clearLoginFailures(connection, identifier)
		assert.equal(await getLoginRestriction(connection, identifier), 0)
	})
})

describe('маршрут авторизации', () => {
	it('создаёт сессию и httpOnly cookie при правильном пароле', async () => {
		const database = new AuthDatabase()
		database.passwordHash = await bcrypt.hash('secure-password', 4)
		const app = express().use(express.json()).use(cookieParser()).use('/Auth', createAuthRouter(asConnection(database)))
		const response = await request(app).post('/Auth/Login').send({ username: 'admin', password: 'secure-password' })
		assert.equal(response.status, 200)
		assert.equal(response.body.user.role, 'admin')
		assert.match(response.headers['set-cookie'][0], /HttpOnly/)
		assert.equal(database.sessionsCreated, 1)
		assert.ok(database.auditActions.includes('auth.login_success'))
	})

	it('отклоняет неправильный пароль и записывает событие', async () => {
		const database = new AuthDatabase()
		database.passwordHash = await bcrypt.hash('secure-password', 4)
		const app = express().use(express.json()).use(cookieParser()).use('/Auth', createAuthRouter(asConnection(database)))
		const response = await request(app).post('/Auth/Login').send({ username: 'admin', password: 'wrong-password' })
		assert.equal(response.status, 401)
		assert.equal(response.body.message, 'Неверный логин или пароль')
		assert.ok(database.auditActions.includes('auth.login_failed'))
	})
})

describe('защищённые маршруты и роли', () => {
	it('не пропускает запрос без сессионной cookie', async () => {
		const database = { execute: async () => [[], []] }
		const app = express().get('/protected', requireAuth(asConnection(database)), (_req, res) => res.json({ ok: true }))
		const response = await request(app).get('/protected')
		assert.equal(response.status, 401)
	})

	it('разрешает администратору и запрещает оператору административный маршрут', async () => {
		const app = express()
		app.get('/admin', (req, _res, next) => {
			req.authUser = { id: '1', username: 'admin', displayName: 'Admin', role: req.query.role === 'admin' ? 'admin' : 'operator', sessionId: 'session' }
			next()
		}, requireRole('admin'), (_req, res) => res.json({ ok: true }))
		assert.equal((await request(app).get('/admin?role=admin')).status, 200)
		assert.equal((await request(app).get('/admin?role=operator')).status, 403)
	})
})

describe('управление пользователями', () => {
	const usersApp = (database: UsersDatabase, actorId = 'admin-1') => {
		const app = express().use(express.json())
		app.use((req, _res, next) => {
			req.authUser = { id: actorId, username: 'admin', displayName: 'Администратор', role: 'admin', sessionId: 'session' }
			next()
		})
		app.use('/users', createUsersRouter(asConnection(database)))
		return app
	}

	it('создаёт пользователя и сохраняет только хеш пароля', async () => {
		const database = new UsersDatabase()
		const response = await request(usersApp(database)).post('/users').send({ username: 'new.operator', displayName: 'Новый оператор', password: 'temporary-password', role: 'operator' })
		assert.equal(response.status, 201)
		assert.notEqual(database.insertedPasswordHash, 'temporary-password')
		assert.equal(await bcrypt.compare('temporary-password', database.insertedPasswordHash), true)
	})

	it('не позволяет понизить последнего активного администратора', async () => {
		const database = new UsersDatabase()
		database.target = { ...database.target, id: 'last-admin', role: 'admin', username: 'last-admin' }
		const response = await request(usersApp(database, 'another-admin')).patch('/users/last-admin').send({ role: 'operator' })
		assert.equal(response.status, 409)
		assert.match(response.body.message, /последнего активного администратора/)
	})

	it('при блокировке пользователя отзывает его сессии', async () => {
		const database = new UsersDatabase()
		const response = await request(usersApp(database)).patch('/users/target-1').send({ isActive: false })
		assert.equal(response.status, 200)
		assert.equal(response.body.user.isActive, false)
		assert.equal(database.sessionsRevoked, 1)
	})

	it('не позволяет администратору сбросить собственный пароль через панель', async () => {
		const database = new UsersDatabase()
		const response = await request(usersApp(database, 'admin-1')).post('/users/admin-1/reset-password').send({ password: 'new-secure-password' })
		assert.equal(response.status, 400)
		assert.match(response.body.message, /собственного пароля/)
	})
})
