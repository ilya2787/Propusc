import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import mysql, { type RowDataPacket } from 'mysql2/promise'
import { ensureAuthSchema } from '../src/auth/schema.js'

dotenv.config()

const username = process.env.INITIAL_ADMIN_USERNAME?.trim().toLowerCase() ?? ''
const password = process.env.INITIAL_ADMIN_PASSWORD ?? ''
const displayName = process.env.INITIAL_ADMIN_NAME?.trim() ?? ''

if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
	throw new Error('INITIAL_ADMIN_USERNAME должен содержать от 3 до 64 латинских букв, цифр или символов . _ -')
}
if (password.length < 12 || password.length > 128) {
	throw new Error('INITIAL_ADMIN_PASSWORD должен содержать от 12 до 128 символов')
}
if (displayName.length < 2 || displayName.length > 255) {
	throw new Error('INITIAL_ADMIN_NAME должен содержать от 2 до 255 символов')
}

const connection = await mysql.createConnection({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT || 3306),
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
})

try {
	await ensureAuthSchema(connection)
	const [rows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM users')
	if (Number(rows[0]?.count ?? 0) > 0) {
		throw new Error('Первый администратор не создан: в таблице users уже есть пользователи')
	}
	const passwordHash = await bcrypt.hash(password, 12)
	await connection.execute(
		'INSERT INTO users (id, username, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
		[crypto.randomUUID(), username, passwordHash, displayName, 'admin'],
	)
	console.log(`Первый администратор «${username}» успешно создан`)
} finally {
	await connection.end()
}
