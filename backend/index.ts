import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { mkdirSync, readdirSync, unlink } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import mysql from 'mysql2'
import { requireAuth, requireRole } from './src/auth/middleware.js'
import { createAuthRouter } from './src/auth/router.js'
import { ensureAuthSchema } from './src/auth/schema.js'
import { createUsersRouter } from './src/auth/usersRouter.js'
import { createAuditRouter } from './src/auth/auditRouter.js'
import { writeAuditLog } from './src/auth/audit.js'
import { createBackupFilename, createDatabaseBackup } from './src/databaseBackup.js'
import { inspectDatabaseBackup, restoreDatabaseBackup } from './src/databaseRestore.js'
dotenv.config()

const app = express()
app.disable('x-powered-by')
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 'loopback')
const configuredOrigins = (process.env.CORS_ORIGINS || '')
	.split(',')
	.map(origin => origin.trim())
	.filter(Boolean)
const isAllowedOrigin = (origin?: string) => {
	if (!origin) return true
	if (configuredOrigins.includes(origin)) return true
	try {
		const url = new URL(origin)
		return process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)
	} catch {
		return false
	}
}

app.use(
	cors({
		origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
		methods: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'],
		credentials: true,
		exposedHeaders: ['Content-Disposition'],
	}),
)
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
const publicDirectory = fileURLToPath(new URL('./public', import.meta.url))
const uploadsDirectory = join(publicDirectory, 'uploads')
mkdirSync(join(uploadsDirectory, 'backgrounds'), { recursive: true })
mkdirSync(join(uploadsDirectory, 'photos'), { recursive: true })
app.use(express.static(publicDirectory))

const allowedImageTypes: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
}
const decodeUploadName = (name: string) => Buffer.from(name, 'latin1').toString('utf8')
const imageStorage = multer.diskStorage({
	destination: (req, _file, callback) => {
		const folder = req.query.kind === 'background' ? 'backgrounds' : 'photos'
		callback(null, join(uploadsDirectory, folder))
	},
	filename: (_req, file, callback) => {
		const extension = allowedImageTypes[file.mimetype] || extname(file.originalname).toLowerCase()
		callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`)
	},
})
const uploadImage = multer({
	storage: imageStorage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => {
		if (!allowedImageTypes[file.mimetype]) return callback(new Error('Поддерживаются только JPEG, PNG и WebP'))
		callback(null, true)
	},
})
const uploadRestore = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 50 * 1024 * 1024, files: 1 },
	fileFilter: (_req, file, callback) => {
		if (!file.originalname.toLowerCase().endsWith('.sql')) return callback(new Error('Выберите SQL-файл резервной копии'))
		callback(null, true)
	},
})

const PORT = parseInt(process.env.PORT || '5173', 10)
const HOST = process.env.HOST || '127.0.0.1'

const databaseConfig = {
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '3306', 10),
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
}
const DB = mysql.createConnection(databaseConfig)
DB.connect(err => {
	if (err) console.error('Ошибка подключения к базе данных:', err)
	else {
		console.log('Подключение к базе данных прошло успешно')
		void ensureAuthSchema(DB.promise())
			.then(async () => {
				console.log('Таблицы пользователей, сессий и аудита готовы к работе')
				const [result] = await DB.promise().execute<mysql.ResultSetHeader>('DELETE FROM audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY)')
				if (result.affectedRows) console.log(`Удалено устаревших записей аудита: ${result.affectedRows}`)
				await DB.promise().execute('DELETE FROM login_rate_limits WHERE updated_at < DATE_SUB(NOW(), INTERVAL 1 DAY)')
			})
			.catch(schemaError => console.error('Ошибка создания таблиц авторизации:', schemaError))
		DB.query(`
			CREATE TABLE IF NOT EXISTS pass_templates (
				id VARCHAR(191) PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				description TEXT NOT NULL,
				kind ENUM('pass', 'certificate') NOT NULL,
				is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
				design LONGTEXT NOT NULL,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			)
		`, tableError => {
			if (tableError) console.error('Ошибка создания таблицы шаблонов:', tableError)
			else console.log('Таблица шаблонов готова к работе')
		})
	}
})

const database = DB.promise()
const authenticated = requireAuth(database)
const administrator = requireRole('admin')
const editor = requireRole('admin', 'operator')

app.use('/Auth', createAuthRouter(database))
app.use('/Admin/Users', authenticated, administrator, createUsersRouter(database))
app.use('/Admin/Audit', authenticated, administrator, createAuditRouter(database))

app.get('/Admin/System/Status', authenticated, administrator, async (_req, res) => {
	try {
		const [[templateCount], [userCount], [organizationCount]] = await Promise.all([
			database.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count FROM pass_templates'),
			database.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count FROM users'),
			database.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count FROM Organization'),
		])
		const uploadedFiles = ['backgrounds', 'photos'].reduce((count, folder) => {
			try { return count + readdirSync(join(uploadsDirectory, folder), { withFileTypes: true }).filter(item => item.isFile()).length } catch { return count }
		}, 0)
		return res.json({
			database: 'connected',
			databaseName: process.env.DB_NAME || '',
			templates: Number(templateCount[0]?.count ?? 0),
			users: Number(userCount[0]?.count ?? 0),
			organizations: Number(organizationCount[0]?.count ?? 0),
			uploadedFiles,
		})
	} catch (error) {
		console.error('Ошибка проверки системы:', error)
		return res.status(500).json({ message: 'Не удалось проверить состояние системы' })
	}
})

app.post('/Admin/System/Backup', authenticated, administrator, async (req, res) => {
	const databaseName = process.env.DB_NAME
	if (!databaseName) return res.status(500).json({ message: 'В настройках сервера не указано имя базы данных' })
	const backupConnection = mysql.createConnection(databaseConfig).promise()
	try {
		const backup = await createDatabaseBackup(backupConnection, databaseName)
		const filename = createBackupFilename()
		void writeAuditLog(database, req, { action: 'system.backup_created', entityType: 'database', details: { tableCount: backup.tableCount } })
		res.setHeader('Content-Type', 'application/sql; charset=utf-8')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		return res.send(backup.sql)
	} catch (error) {
		console.error('Ошибка создания резервной копии:', error)
		return res.status(500).json({ message: 'Не удалось создать резервную копию' })
	} finally {
		await backupConnection.end().catch(() => undefined)
	}
})

app.post('/Admin/System/Restore/Inspect', authenticated, administrator, uploadRestore.single('backup'), (req, res) => {
	if (!req.file) return res.status(400).json({ message: 'Выберите SQL-файл резервной копии' })
	const databaseName = process.env.DB_NAME
	if (!databaseName) return res.status(500).json({ message: 'В настройках сервера не указано имя базы данных' })
	try {
		return res.json(inspectDatabaseBackup(req.file.buffer.toString('utf8'), databaseName))
	} catch (error) {
		return res.status(400).json({ message: error instanceof Error ? error.message : 'Некорректная резервная копия' })
	}
})

app.post('/Admin/System/Restore', authenticated, administrator, uploadRestore.single('backup'), async (req, res) => {
	if (!req.file) return res.status(400).json({ message: 'Выберите SQL-файл резервной копии' })
	if (req.body?.confirmation !== 'ВОССТАНОВИТЬ') return res.status(400).json({ message: 'Введите слово ВОССТАНОВИТЬ для подтверждения' })
	const databaseName = process.env.DB_NAME
	if (!databaseName) return res.status(500).json({ message: 'В настройках сервера не указано имя базы данных' })
	const source = req.file.buffer.toString('utf8')
	try {
		inspectDatabaseBackup(source, databaseName)
	} catch (error) {
		return res.status(400).json({ message: error instanceof Error ? error.message : 'Некорректная резервная копия' })
	}

	const currentBackupConnection = mysql.createConnection(databaseConfig).promise()
	let safetyBackup = ''
	let safetyFilename = ''
	try {
		const backup = await createDatabaseBackup(currentBackupConnection, databaseName)
		safetyBackup = backup.sql
		safetyFilename = `pre-restore-${createBackupFilename()}`
		const backupDirectory = resolve('backups')
		await mkdir(backupDirectory, { recursive: true })
		await writeFile(resolve(backupDirectory, safetyFilename), safetyBackup, { encoding: 'utf8', mode: 0o600 })
	} catch (error) {
		console.error('Не удалось создать страховочную копию:', error)
		return res.status(500).json({ message: 'Восстановление отменено: не удалось создать страховочную копию текущей базы' })
	} finally {
		await currentBackupConnection.end().catch(() => undefined)
	}

	const restoreConnection = mysql.createConnection({ ...databaseConfig, multipleStatements: true }).promise()
	try {
		const info = await restoreDatabaseBackup(restoreConnection, source, databaseName)
		await restoreConnection.execute('DELETE FROM user_sessions')
		await restoreConnection.execute(
			'INSERT INTO audit_log (actor_user_id, action, entity_type, details, ip_address, user_agent) VALUES (NULL, ?, ?, ?, ?, ?)',
			['system.database_restored', 'database', JSON.stringify({ restoredFrom: req.file.originalname, backupCreatedAt: info.createdAt, safetyFilename }), req.ip?.slice(0, 45) || null, req.get('user-agent')?.slice(0, 500) || null],
		)
		res.clearCookie('propusk_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
		return res.json({ status: 'success', safetyFilename, restoredAt: info.createdAt })
	} catch (error) {
		console.error('Ошибка восстановления базы:', error)
		try {
			await restoreDatabaseBackup(restoreConnection, safetyBackup, databaseName)
			console.warn(`Исходная база восстановлена из страховочной копии ${safetyFilename}`)
			return res.status(500).json({ message: 'Архив не удалось применить. Исходное состояние базы автоматически восстановлено.' })
		} catch (rollbackError) {
			console.error('Критическая ошибка отката базы:', rollbackError)
			return res.status(500).json({ message: `Восстановление и автоматический откат не выполнены. Используйте страховочную копию ${safetyFilename}.` })
		}
	} finally {
		await restoreConnection.end().catch(() => undefined)
	}
})

app.post('/UploadImage', authenticated, editor, (req, res, next) => {
	if (req.query.kind === 'background' && req.authUser?.role !== 'admin') return res.status(403).json({ message: 'Изменять фон шаблона может только администратор' })
	return uploadImage.single('image')(req, res, next)
}, (req, res) => {
	if (!req.file) return res.status(400).json({ message: 'Изображение не передано' })
	const folder = req.query.kind === 'background' ? 'backgrounds' : 'photos'
	return res.status(201).json({
		url: `/uploads/${folder}/${req.file.filename}`,
		name: decodeUploadName(req.file.originalname),
	})
})

app.delete('/UploadedImage', authenticated, editor, (req, res) => {
	const url = String(req.body?.url ?? '')
	const match = url.match(/^\/uploads\/(backgrounds|photos)\/([a-zA-Z0-9.-]+)$/)
	if (!match) return res.status(400).json({ message: 'Некорректный адрес изображения' })
	if (match[1] === 'backgrounds' && req.authUser?.role !== 'admin') return res.status(403).json({ message: 'Удалять фон шаблона может только администратор' })
	const filePath = join(uploadsDirectory, match[1], match[2])
	unlink(filePath, error => {
		if (error && error.code !== 'ENOENT') return res.status(500).json({ message: 'Не удалось удалить изображение' })
		return res.json({ status: 'success' })
	})
})

type PassTemplatePayload = {
	id: string
	name: string
	description: string
	kind: 'pass' | 'certificate'
	isBuiltIn: boolean
	design: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const validString = (value: unknown, maxLength: number) =>
	typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength

const validateTemplate = (value: unknown): value is PassTemplatePayload => {
	if (!isRecord(value)) return false
	return validString(value.id, 191)
		&& /^[a-zA-Z0-9_-]+$/.test(value.id as string)
		&& validString(value.name, 255)
		&& typeof value.description === 'string'
		&& value.description.length <= 5000
		&& (value.kind === 'pass' || value.kind === 'certificate')
		&& typeof value.isBuiltIn === 'boolean'
		&& isRecord(value.design)
}

const readOptionPayload = (body: unknown) => {
	if (!isRecord(body) || !validString(body.value, 191) || !validString(body.label, 255)) return undefined
	return { value: (body.value as string).trim(), label: (body.label as string).trim() }
}

app.get('/Templates', authenticated, (_req, res) => {
	DB.query('SELECT id, name, description, kind, is_built_in, design FROM pass_templates ORDER BY is_built_in DESC, name', (err, rows: any[]) => {
		if (err) return res.status(500).json({ message: 'Не удалось загрузить шаблоны' })
		try {
			return res.json(rows.map(row => ({
				id: row.id,
				name: row.name,
				description: row.description,
				kind: row.kind,
				isBuiltIn: Boolean(row.is_built_in),
				design: typeof row.design === 'string' ? JSON.parse(row.design) : row.design,
			})))
		} catch {
			return res.status(500).json({ message: 'В базе находится повреждённый шаблон' })
		}
	})
})

app.post('/TemplatesSync', authenticated, administrator, (req, res) => {
	const templates = isRecord(req.body) ? req.body.templates : undefined
	if (!Array.isArray(templates) || templates.length > 100 || templates.some(template => !validateTemplate(template))) {
		return res.status(400).json({ message: 'Некорректные данные шаблонов' })
	}
	const templateIds = new Set(templates.map(template => template.id))
	if (templateIds.size !== templates.length) return res.status(400).json({ message: 'Идентификаторы шаблонов не должны повторяться' })

	DB.beginTransaction(transactionError => {
		if (transactionError) return res.status(500).json({ message: 'Не удалось начать сохранение' })
		DB.query('DELETE FROM pass_templates', deleteError => {
			if (deleteError) return DB.rollback(() => res.status(500).json({ message: 'Не удалось обновить шаблоны' }))
			if (templates.length === 0) return DB.commit(commitError => {
				if (commitError) return res.status(500).json({ message: 'Не удалось сохранить шаблоны' })
				void writeAuditLog(database, req, { action: 'template.synced', entityType: 'template_collection', details: { count: 0 } })
				return res.json({ status: 'success' })
			})

			const values = templates.map(template => [
				template.id,
				template.name,
				template.description ?? '',
				template.kind,
				template.isBuiltIn ? 1 : 0,
				JSON.stringify(template.design),
			])
			DB.query('INSERT INTO pass_templates (id, name, description, kind, is_built_in, design) VALUES ?', [values], insertError => {
				if (insertError) return DB.rollback(() => res.status(500).json({ message: 'Не удалось записать шаблоны' }))
				DB.commit(commitError => {
					if (commitError) return DB.rollback(() => res.status(500).json({ message: 'Не удалось завершить сохранение' }))
					void writeAuditLog(database, req, { action: 'template.synced', entityType: 'template_collection', details: { count: templates.length, templateIds: templates.map(template => template.id) } })
					return res.json({ status: 'success', count: templates.length })
				})
			})
		})
	})
})

app.get('/AllListOrganization', authenticated, (_req, res) => {
	const sql = 'SELECT * FROM Organization'
	DB.query(sql, (err, data) => {
		if (err) {
			console.error('Ошибка загрузки организаций:', err)
			return res.status(500).json({ message: 'Не удалось загрузить список организаций' })
		}
		return res.json(data)
	})
})

app.get('/AllListPost', authenticated, (_req, res) => {
	const sql = 'SELECT * FROM Post'
	DB.query(sql, (err, data) => {
		if (err) {
			console.error('Ошибка загрузки должностей:', err)
			return res.status(500).json({ message: 'Не удалось загрузить список должностей' })
		}
		return res.json(data)
	})
})

app.post('/AddOrganization', authenticated, editor, (req, res) => {
	const payload = readOptionPayload(req.body)
	if (!payload) return res.status(400).json({ message: 'Укажите корректное название организации' })
	const sql = 'INSERT INTO Organization (value, label) VALUE (?)'
	const value = [payload.value, payload.label]
	DB.query(sql, [value], (err, data) => {
		if (err) {
			console.error('Ошибка добавления организации:', err)
			return res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: err.code === 'ER_DUP_ENTRY' ? 'Такая организация уже существует' : 'Не удалось добавить организацию' })
		}
		void writeAuditLog(database, req, { action: 'directory.organization_created', entityType: 'organization', entityId: payload.value })
		return res.status(201).json(data)
	})
})

app.post('/AddPost', authenticated, editor, (req, res) => {
	const payload = readOptionPayload(req.body)
	if (!payload) return res.status(400).json({ message: 'Укажите корректное название должности' })
	const sql = 'INSERT INTO Post (value, label) VALUE (?)'
	const value = [payload.value, payload.label]
	DB.query(sql, [value], (err, data) => {
		if (err) {
			console.error('Ошибка добавления должности:', err)
			return res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: err.code === 'ER_DUP_ENTRY' ? 'Такая должность уже существует' : 'Не удалось добавить должность' })
		}
		void writeAuditLog(database, req, { action: 'directory.post_created', entityType: 'post', entityId: payload.value })
		return res.status(201).json(data)
	})
})

app.delete('/DeleteOrganization', authenticated, editor, (req, res) => {
	if (!isRecord(req.body) || !validString(req.body.value, 191)) {
		return res.status(400).json({ message: 'Выберите организацию для удаления' })
	}
	const value = (req.body.value as string).trim()
	DB.query('DELETE FROM Organization WHERE value = ?', [value], (err, data: mysql.ResultSetHeader) => {
		if (err) {
			console.error('Ошибка удаления организации:', err)
			return res.status(500).json({ message: 'Не удалось удалить организацию' })
		}
		if (data.affectedRows === 0) return res.status(404).json({ message: 'Организация уже удалена или не найдена' })
		void writeAuditLog(database, req, { action: 'directory.organization_deleted', entityType: 'organization', entityId: value })
		return res.json({ status: 'success' })
	})
})

app.delete('/DeletePost', authenticated, editor, (req, res) => {
	if (!isRecord(req.body) || !validString(req.body.value, 191)) {
		return res.status(400).json({ message: 'Выберите должность для удаления' })
	}
	const value = (req.body.value as string).trim()
	DB.query('DELETE FROM Post WHERE value = ?', [value], (err, data: mysql.ResultSetHeader) => {
		if (err) {
			console.error('Ошибка удаления должности:', err)
			return res.status(500).json({ message: 'Не удалось удалить должность' })
		}
		if (data.affectedRows === 0) return res.status(404).json({ message: 'Должность уже удалена или не найдена' })
		void writeAuditLog(database, req, { action: 'directory.post_deleted', entityType: 'post', entityId: value })
		return res.json({ status: 'success' })
	})
})

app.get('/Director', authenticated, (_req, res) => {
	const sql = 'SELECT * FROM director'
	DB.query(sql, (err, data) => {
		if (err) {
			console.error('Ошибка загрузки руководителя:', err)
			return res.status(500).json({ message: 'Не удалось загрузить данные руководителя' })
		}
		return res.json(data)
	})
})

app.post('/DirectorUpdate', authenticated, administrator, (req, res) => {
	if (!isRecord(req.body) || !validString(req.body.Name, 255) || !validString(req.body.Post, 255) || !Number.isInteger(req.body.id) || (req.body.id as number) <= 0) {
		return res.status(400).json({ message: 'Некорректные данные руководителя' })
	}
	const sql = 'UPDATE director SET Name = ?, Post = ? WHERE id = ?'
	const value = [(req.body.Name as string).trim(), (req.body.Post as string).trim(), req.body.id]
	DB.query(sql, value, (err, data) => {
		if (err) {
			console.error('Ошибка обновления руководителя:', err)
			return res.status(500).json({ message: 'Не удалось обновить данные руководителя' })
		}
		const result = data as mysql.ResultSetHeader
		if (result.affectedRows === 0) return res.status(404).json({ message: 'Руководитель не найден' })
		void writeAuditLog(database, req, { action: 'directory.director_updated', entityType: 'director', entityId: String(req.body.id) })
		return res.json({ status: 'success' })
	})
})

app.post('/Audit/PassEvent', authenticated, editor, (req, res) => {
	if (!isRecord(req.body)) return res.status(400).json({ message: 'Некорректные данные события' })
	const action = req.body.action
	const templateId = typeof req.body.templateId === 'string' ? req.body.templateId.trim() : ''
	const count = req.body.count
	if ((action !== 'pass.created' && action !== 'pass.printed')
		|| !/^[a-zA-Z0-9_-]{1,191}$/.test(templateId)
		|| !Number.isInteger(count) || (count as number) < 1 || (count as number) > 1000) {
		return res.status(400).json({ message: 'Некорректные данные события' })
	}
	void writeAuditLog(database, req, {
		action,
		entityType: 'pass_batch',
		entityId: templateId,
		details: { templateId, count },
	}).then(() => res.status(201).json({ status: 'success' }))
})

app.use((_req, res) => res.status(404).json({ message: 'Маршрут не найден' }))

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
		return res.status(413).json({ message: 'Размер изображения не должен превышать 5 МБ' })
	}
	if (error instanceof SyntaxError) return res.status(400).json({ message: 'Некорректный формат JSON' })
	if (error instanceof Error && error.message === 'Поддерживаются только JPEG, PNG и WebP') {
		return res.status(400).json({ message: error.message })
	}
	console.error('Необработанная ошибка сервера:', error)
	return res.status(500).json({ message: 'Внутренняя ошибка сервера' })
})

app.listen(PORT, HOST, () => {
	console.log(`Сервер запущен по адресу http://${HOST}:${PORT}`)
})
