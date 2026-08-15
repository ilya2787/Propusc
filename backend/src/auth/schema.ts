import type { Connection } from 'mysql2/promise'

export type UserRole = 'admin' | 'operator'

export const ensureAuthSchema = async (connection: Connection) => {
	await connection.query(`
		CREATE TABLE IF NOT EXISTS users (
			id CHAR(36) PRIMARY KEY,
			username VARCHAR(64) NOT NULL UNIQUE,
			password_hash VARCHAR(255) NOT NULL,
			display_name VARCHAR(255) NOT NULL,
			role ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			last_login_at TIMESTAMP NULL DEFAULT NULL
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`)
	await connection.query("UPDATE users SET role = 'operator', is_active = FALSE WHERE role = 'viewer'")
	await connection.query("ALTER TABLE users MODIFY role ENUM('admin', 'operator') NOT NULL DEFAULT 'operator'")

	await connection.query(`
		CREATE TABLE IF NOT EXISTS user_sessions (
			id CHAR(36) PRIMARY KEY,
			user_id CHAR(36) NOT NULL,
			token_hash CHAR(64) NOT NULL UNIQUE,
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			revoked_at TIMESTAMP NULL DEFAULT NULL,
			ip_address VARCHAR(45) NULL,
			user_agent VARCHAR(500) NULL,
			INDEX idx_user_sessions_user_id (user_id),
			INDEX idx_user_sessions_expires_at (expires_at),
			CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`)

	await connection.query(`
		CREATE TABLE IF NOT EXISTS audit_log (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
			actor_user_id CHAR(36) NULL,
			action VARCHAR(80) NOT NULL,
			entity_type VARCHAR(80) NULL,
			entity_id VARCHAR(191) NULL,
			details JSON NULL,
			ip_address VARCHAR(45) NULL,
			user_agent VARCHAR(500) NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_audit_log_created_at (created_at),
			INDEX idx_audit_log_actor (actor_user_id),
			INDEX idx_audit_log_action (action),
			CONSTRAINT fk_audit_log_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`)

	await connection.query(`
		CREATE TABLE IF NOT EXISTS login_rate_limits (
			identifier_hash CHAR(64) PRIMARY KEY,
			failed_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
			window_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			blocked_until TIMESTAMP NULL DEFAULT NULL,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			INDEX idx_login_rate_limits_updated (updated_at),
			INDEX idx_login_rate_limits_blocked (blocked_until)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`)
}
