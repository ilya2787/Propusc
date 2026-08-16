import dotenv from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import mysql from 'mysql2'
import { createBackupFilename, createDatabaseBackup } from '../src/databaseBackup.js'

dotenv.config()

const database = process.env.DB_NAME
if (!database) throw new Error('В backend/.env не указано значение DB_NAME')

const connection = mysql.createConnection({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT || 3306),
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD,
	database,
}).promise()

const backupDirectory = resolve('backups')
const backupPath = resolve(backupDirectory, createBackupFilename())

try {
	const backup = await createDatabaseBackup(connection, database)
	await mkdir(backupDirectory, { recursive: true })
	await writeFile(backupPath, backup.sql, { encoding: 'utf8', mode: 0o600 })
	console.log(`Резервная копия создана: ${backupPath}`)
	console.log(`Таблиц сохранено: ${backup.tableCount}`)
} finally {
	await connection.end()
}
