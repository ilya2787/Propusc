import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBackupFilename } from '../src/databaseBackup.js'

describe('резервная копия базы данных', () => {
	it('создаёт безопасное и читаемое имя SQL-файла', () => {
		assert.equal(
			createBackupFilename(new Date('2026-08-16T10:20:30.123Z')),
			'database-2026-08-16T10-20-30Z.sql',
		)
	})
})
