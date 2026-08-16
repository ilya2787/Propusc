import type { Connection } from 'mysql2/promise'

const FORMAT_MARKER = '-- Format: propusk-database-backup-v1'
const EXPECTED_TABLES = new Set([
	'audit_log', 'director', 'login_rate_limits', 'Organization', 'pass_templates', 'Post', 'user_sessions', 'users',
])
const FORBIDDEN_SQL = /\b(DROP\s+DATABASE|ALTER\s+USER|CREATE\s+USER|DROP\s+USER|GRANT|REVOKE|LOAD\s+DATA|INTO\s+OUTFILE|INSTALL\s+PLUGIN|UNINSTALL\s+PLUGIN|SHUTDOWN|DELIMITER|SOURCE)\b/i

export type RestoreArchiveInfo = {
	createdAt: string
	databaseName: string
	tables: string[]
	sizeBytes: number
}

export const inspectDatabaseBackup = (source: string, expectedDatabase: string): RestoreArchiveInfo => {
	const sizeBytes = Buffer.byteLength(source, 'utf8')
	if (sizeBytes === 0 || sizeBytes > 50 * 1024 * 1024) throw new Error('Размер SQL-файла должен быть не более 50 МБ')
	if (!source.startsWith(FORMAT_MARKER)) throw new Error('Файл не является резервной копией проекта «Пропуска»')
	if (FORBIDDEN_SQL.test(source)) throw new Error('Файл содержит недопустимые SQL-команды')

	const createdAt = source.match(/^-- Создана: (.+)$/m)?.[1]?.trim() ?? ''
	if (!createdAt || Number.isNaN(Date.parse(createdAt))) throw new Error('В резервной копии отсутствует корректная дата создания')
	const databaseName = source.match(/^USE `([^`]+)`;$/m)?.[1] ?? ''
	if (databaseName !== expectedDatabase) throw new Error(`Копия предназначена для другой базы данных: «${databaseName || 'не указана'}»`)

	const tables = [...source.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map(match => match[1])
	if (tables.length === 0 || new Set(tables).size !== tables.length) throw new Error('В резервной копии отсутствует корректная структура таблиц')
	if (tables.some(table => !EXPECTED_TABLES.has(table))) throw new Error('В резервной копии обнаружены неизвестные таблицы')
	for (const requiredTable of ['users', 'user_sessions', 'pass_templates']) {
		if (!tables.includes(requiredTable)) throw new Error(`В резервной копии отсутствует таблица ${requiredTable}`)
	}

	const referencedTables = [...source.matchAll(/^(?:DROP TABLE IF EXISTS|CREATE TABLE|INSERT INTO) `([^`]+)`/gm)].map(match => match[1])
	if (referencedTables.some(table => !EXPECTED_TABLES.has(table))) throw new Error('SQL-файл обращается к неизвестной таблице')
	return { createdAt, databaseName, tables, sizeBytes }
}

export const prepareDatabaseRestore = (source: string, expectedDatabase: string) => {
	const info = inspectDatabaseBackup(source, expectedDatabase)
	const sql = source
		.replace(/^CREATE DATABASE IF NOT EXISTS `[^`]+` CHARACTER SET utf8mb4;\r?\n/m, '')
		.replace(/^USE `[^`]+`;\r?\n/m, '')
	return { info, sql }
}

export const restoreDatabaseBackup = async (connection: Connection, source: string, expectedDatabase: string) => {
	const prepared = prepareDatabaseRestore(source, expectedDatabase)
	await connection.query(prepared.sql)
	return prepared.info
}
