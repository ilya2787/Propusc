import mysql, { type RowDataPacket } from 'mysql2'
import type { Connection } from 'mysql2/promise'

const quoteIdentifier = (value: string) => `\`${value.replaceAll('`', '``')}\``
const escapeSqlValue = (value: unknown) => {
	if (value !== null && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
		return mysql.escape(JSON.stringify(value))
	}
	return mysql.escape(value as Parameters<typeof mysql.escape>[0])
}

export const createDatabaseBackup = async (connection: Connection, database: string) => {
	await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ')
	await connection.beginTransaction()
	try {
		const [tableRows] = await connection.query<RowDataPacket[]>(
			'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME',
			[database, 'BASE TABLE'],
		)
		const tables = tableRows.map(row => String(row.TABLE_NAME))
		const output = [
			'-- Format: propusk-database-backup-v1',
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
				const values = columns.map(column => escapeSqlValue(row[column])).join(', ')
				output.push(`INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${values});`)
			}
			output.push('')
		}

		output.push('SET FOREIGN_KEY_CHECKS = 1;', '')
		await connection.commit()
		return { sql: output.join('\n'), tableCount: tables.length }
	} catch (error) {
		await connection.rollback().catch(() => undefined)
		throw error
	}
}

export const createBackupFilename = (date = new Date()) =>
	`database-${date.toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')}.sql`
