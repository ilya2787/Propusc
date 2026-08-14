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
app.use(
	cors({
		origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
		methods: ['POST', 'GET', 'PUT', 'DELETE'],
		credentials: true,
	}),
)
app.use(express.json())
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

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
	if (!(error instanceof Error)) return next(error)
	if (error.message.includes('File too large')) return res.status(413).json({ message: 'Размер изображения не должен превышать 5 МБ' })
	return res.status(400).json({ message: error.message })
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
	const templates = req.body?.templates as PassTemplatePayload[]
	if (!Array.isArray(templates) || templates.some(template => !template.id || !template.name || !['pass', 'certificate'].includes(template.kind))) {
		return res.status(400).json({ message: 'Некорректные данные шаблонов' })
	}

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

app.get('/AllListOrganization', (reg, res) => {
	const sql = 'SELECT * FROM Organization'
	DB.query(sql, (err, data) => {
		if (err) return res.json(err)
		return res.json(data)
	})
})

app.get('/AllListPost', (reg, res) => {
	const sql = 'SELECT * FROM Post'
	DB.query(sql, (err, data) => {
		if (err) return res.json(err)
		return res.json(data)
	})
})

app.post('/AddOrganization', (reg, res) => {
	const sql = 'INSERT INTO Organization (value, label) VALUE (?)'
	const value = [reg.body.value, reg.body.label]
	DB.query(sql, [value], (err, data) => {
		if (err) return res.json(err)
		return res.json(data)
	})
})

app.post('/AddPost', (reg, res) => {
	const sql = 'INSERT INTO Post (value, label) VALUE (?)'
	const value = [reg.body.value, reg.body.label]
	DB.query(sql, [value], (err, data) => {
		if (err) return res.json(err)
		return res.json(data)
	})
})

app.get('/Director', (reg, res) => {
	const sql = 'SELECT * FROM director'
	DB.query(sql, (err, data) => {
		if(err) return res.json(err)
			return res.json(data)
	})
})

app.post('/DirectorUpdate', (reg, res) => {
	const sql = 'UPDATE director SET Name = ?, Post = ? WHERE id = ?'
	const value = [reg.body.Name, reg.body.Post, reg.body.id]
	DB.query(sql, value, (err, data) => {
		if (err) return res.json(err)
			return res.json({Status: 'success'})
	})	
})

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
