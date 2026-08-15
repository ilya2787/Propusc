import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { mkdirSync, unlink } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import mysql from 'mysql2'
dotenv.config()

const app = express()
app.disable('x-powered-by')
app.use(
	cors({
		origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
		methods: ['POST', 'GET', 'PUT', 'DELETE'],
		credentials: true,
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

app.post('/UploadImage', uploadImage.single('image'), (req, res) => {
	if (!req.file) return res.status(400).json({ message: 'Изображение не передано' })
	const folder = req.query.kind === 'background' ? 'backgrounds' : 'photos'
	return res.status(201).json({
		url: `/uploads/${folder}/${req.file.filename}`,
		name: decodeUploadName(req.file.originalname),
	})
})

app.delete('/UploadedImage', (req, res) => {
	const url = String(req.body?.url ?? '')
	const match = url.match(/^\/uploads\/(backgrounds|photos)\/([a-zA-Z0-9.-]+)$/)
	if (!match) return res.status(400).json({ message: 'Некорректный адрес изображения' })
	const filePath = join(uploadsDirectory, match[1], match[2])
	unlink(filePath, error => {
		if (error && error.code !== 'ENOENT') return res.status(500).json({ message: 'Не удалось удалить изображение' })
		return res.json({ status: 'success' })
	})
})

const PORT = parseInt(process.env.PORT || '5173', 10)

const DB = mysql.createConnection({
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '3306', 10),
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
})
DB.connect(err => {
	if (err) console.error('Ошибка подключения к базе данных:', err)
	else {
		console.log('Подключение к базе данных прошло успешно')
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

app.get('/Templates', (_req, res) => {
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

app.post('/TemplatesSync', (req, res) => {
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
			if (templates.length === 0) return DB.commit(commitError => commitError ? res.status(500).json({ message: 'Не удалось сохранить шаблоны' }) : res.json({ status: 'success' }))

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
					return res.json({ status: 'success', count: templates.length })
				})
			})
		})
	})
})

app.get('/AllListOrganization', (_req, res) => {
	const sql = 'SELECT * FROM Organization'
	DB.query(sql, (err, data) => {
		if (err) {
			console.error('Ошибка загрузки организаций:', err)
			return res.status(500).json({ message: 'Не удалось загрузить список организаций' })
		}
		return res.json(data)
	})
})

app.get('/AllListPost', (_req, res) => {
	const sql = 'SELECT * FROM Post'
	DB.query(sql, (err, data) => {
		if (err) {
			console.error('Ошибка загрузки должностей:', err)
			return res.status(500).json({ message: 'Не удалось загрузить список должностей' })
		}
		return res.json(data)
	})
})

app.post('/AddOrganization', (req, res) => {
	const payload = readOptionPayload(req.body)
	if (!payload) return res.status(400).json({ message: 'Укажите корректное название организации' })
	const sql = 'INSERT INTO Organization (value, label) VALUE (?)'
	const value = [payload.value, payload.label]
	DB.query(sql, [value], (err, data) => {
		if (err) {
			console.error('Ошибка добавления организации:', err)
			return res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: err.code === 'ER_DUP_ENTRY' ? 'Такая организация уже существует' : 'Не удалось добавить организацию' })
		}
		return res.status(201).json(data)
	})
})

app.post('/AddPost', (req, res) => {
	const payload = readOptionPayload(req.body)
	if (!payload) return res.status(400).json({ message: 'Укажите корректное название должности' })
	const sql = 'INSERT INTO Post (value, label) VALUE (?)'
	const value = [payload.value, payload.label]
	DB.query(sql, [value], (err, data) => {
		if (err) {
			console.error('Ошибка добавления должности:', err)
			return res.status(err.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: err.code === 'ER_DUP_ENTRY' ? 'Такая должность уже существует' : 'Не удалось добавить должность' })
		}
		return res.status(201).json(data)
	})
})

app.get('/Director', (_req, res) => {
	const sql = 'SELECT * FROM director'
	DB.query(sql, (err, data) => {
		if (err) {
			console.error('Ошибка загрузки руководителя:', err)
			return res.status(500).json({ message: 'Не удалось загрузить данные руководителя' })
		}
		return res.json(data)
	})
})

app.post('/DirectorUpdate', (req, res) => {
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
		return res.json({ status: 'success' })
	})
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

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
