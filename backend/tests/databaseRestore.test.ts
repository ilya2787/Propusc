import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { inspectDatabaseBackup, prepareDatabaseRestore } from '../src/databaseRestore.js'

const archive = (database = 'PassCard') => `-- Format: propusk-database-backup-v1
-- Резервная копия базы данных проекта «Пропуска»
-- Создана: 2026-08-16T10:20:30.000Z
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4;
USE \`${database}\`;

DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (\`id\` char(36) PRIMARY KEY);
DROP TABLE IF EXISTS \`user_sessions\`;
CREATE TABLE \`user_sessions\` (\`id\` char(36) PRIMARY KEY);
DROP TABLE IF EXISTS \`pass_templates\`;
CREATE TABLE \`pass_templates\` (\`id\` varchar(191) PRIMARY KEY);
SET FOREIGN_KEY_CHECKS = 1;
`

describe('проверка архива восстановления', () => {
	it('принимает архив проекта и удаляет команды выбора базы перед выполнением', () => {
		const inspected = inspectDatabaseBackup(archive(), 'PassCard')
		assert.equal(inspected.databaseName, 'PassCard')
		assert.deepEqual(inspected.tables, ['users', 'user_sessions', 'pass_templates'])
		const prepared = prepareDatabaseRestore(archive(), 'PassCard')
		assert.doesNotMatch(prepared.sql, /CREATE DATABASE|USE `PassCard`/)
	})

	it('отклоняет чужую базу, неизвестную таблицу и опасные команды', () => {
		assert.throws(() => inspectDatabaseBackup(archive('Other'), 'PassCard'), /другой базы/)
		assert.throws(() => inspectDatabaseBackup(archive().replace('CREATE TABLE `users`', 'CREATE TABLE `foreign_table`'), 'PassCard'), /неизвестные таблицы/)
		assert.throws(() => inspectDatabaseBackup(`${archive()}\nDROP DATABASE PassCard;`, 'PassCard'), /недопустимые SQL-команды/)
	})

	it('отклоняет обычный SQL без метки формата', () => {
		assert.throws(() => inspectDatabaseBackup('SELECT 1;', 'PassCard'), /не является резервной копией/)
	})
})
