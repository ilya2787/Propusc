import dotenv from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import mysql, { type RowDataPacket } from 'mysql2'

dotenv.config()

const database = process.env.DB_NAME
if (!database) throw new Error('В backend/.env не указано значение DB_NAME')

const quoteIdentifier = (value: string) => `\`${value.replaceAll('`', '``')}\``
const connection = mysql.createConnection({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT || 3306),
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD,
	database,
}).promise()

const backupDirectory = resolve('backups')
const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')
const backupPath = resolve(backupDirectory, `database-${timestamp}.sql`)

try {
	await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ')
	await connection.beginTransaction()
	const [tableRows] = await connection.query<RowDataPacket[]>(
		'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
		[database, 'BASE TABLE'],
	)
	const tables = tableRows.map(row => String(row.TABLE_NAME))
	const output = [
		'-- Резервная копия базы данных проекта «Пропуска»',
		`-- Создана: ${new Date().toISOString()}`,
		'SET NAMES utf8mb4;',
		'SET FOREIGN_KEY_CHECKS = 0;',
		`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(database)} CHARACTER SET utf8mb4;`,
		`USE ${quoteIdentifier(database)};`,
		'',
	]

	for (const table of tables) {
		const quotedTable = quoteIdentifier(table)
		const [createRows] = await connection.query<RowDataPacket[]>(`SHOW CREATE TABLE ${quotedTable}`)
		const createStatement = String(createRows[0]?.['Create Table'] ?? '')
		if (!createStatement) throw new Error(`Не удалось получить структуру таблицы ${table}`)

		output.push(`DROP TABLE IF EXISTS ${quotedTable};`, `${createStatement};`, '')
		const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${quotedTable}`)
		if (rows.length === 0) continue
		const columns = Object.keys(rows[0])
		const quotedColumns = columns.map(quoteIdentifier).join(', ')
		for (const row of rows) {
			const values = columns.map(column => mysql.escape(row[column])).join(', ')
			output.push(`INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${values});`)
		}
		output.push('')
	}

	output.push('SET FOREIGN_KEY_CHECKS = 1;', '')
	await mkdir(backupDirectory, { recursive: true })
	await writeFile(backupPath, output.join('\n'), { encoding: 'utf8', mode: 0o600 })
	await connection.commit()
	console.log(`Резервная копия создана: ${backupPath}`)
	console.log(`Таблиц сохранено: ${tables.length}`)
} catch (error) {
	await connection.rollback().catch(() => undefined)
	throw error
} finally {
	await connection.end()
}
