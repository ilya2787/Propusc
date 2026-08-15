import { createHash } from 'node:crypto'
import type { Connection, RowDataPacket } from 'mysql2/promise'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000

type LimitRow = RowDataPacket & {
	failed_attempts: number
	window_started_at: Date
	blocked_until: Date | null
}

export const loginIdentifier = (username: string, ipAddress: string) =>
	createHash('sha256').update(`${username}\0${ipAddress}`).digest('hex')

export const getLoginRestriction = async (database: Connection, identifier: string) => {
	const [rows] = await database.execute<LimitRow[]>(
		'SELECT failed_attempts, window_started_at, blocked_until FROM login_rate_limits WHERE identifier_hash = ? LIMIT 1',
		[identifier],
	)
	const row = rows[0]
	if (!row) return 0
	const now = Date.now()
	const blockedUntil = row.blocked_until ? new Date(row.blocked_until).getTime() : 0
	if (blockedUntil > now) return Math.ceil((blockedUntil - now) / 1000)
	if (now - new Date(row.window_started_at).getTime() >= WINDOW_MS) {
		await database.execute('DELETE FROM login_rate_limits WHERE identifier_hash = ?', [identifier])
	}
	return 0
}

export const registerFailedLogin = async (database: Connection, identifier: string) => {
	const [rows] = await database.execute<LimitRow[]>(
		'SELECT failed_attempts, window_started_at, blocked_until FROM login_rate_limits WHERE identifier_hash = ? LIMIT 1',
		[identifier],
	)
	const row = rows[0]
	const now = Date.now()
	const windowExpired = !row || now - new Date(row.window_started_at).getTime() >= WINDOW_MS
	const attempts = windowExpired ? 1 : row.failed_attempts + 1
	const blockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now + BLOCK_MS) : null
	await database.execute(`
		INSERT INTO login_rate_limits (identifier_hash, failed_attempts, window_started_at, blocked_until)
		VALUES (?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE failed_attempts = VALUES(failed_attempts), window_started_at = VALUES(window_started_at), blocked_until = VALUES(blocked_until)
	`, [identifier, attempts, windowExpired ? new Date(now) : row.window_started_at, blockedUntil])
	return blockedUntil ? Math.ceil(BLOCK_MS / 1000) : 0
}

export const clearLoginFailures = async (database: Connection, identifier: string) => {
	await database.execute('DELETE FROM login_rate_limits WHERE identifier_hash = ?', [identifier])
}
