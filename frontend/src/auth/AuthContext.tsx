import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiUrl } from '../api/server'

export type UserRole = 'admin' | 'operator'
export type AuthUser = { id: string; username: string; displayName: string; role: UserRole }
type AuthResponse = { user: AuthUser; expiresAt: string }
type AuthContextValue = {
	user: AuthUser | null
	loading: boolean
	login: (username: string, password: string) => Promise<void>
	logout: () => Promise<void>
}

export const AUTH_EXPIRED_EVENT = 'propusk-auth-expired'
const AuthContext = createContext<AuthContextValue | null>(null)

const responseMessage = async (response: Response, fallback: string) => {
	const data = await response.json().catch(() => ({})) as { message?: string }
	return data.message || fallback
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<AuthUser | null>(null)
	const [loading, setLoading] = useState(true)

	const loadUser = useCallback(async () => {
		try {
			const response = await fetch(apiUrl('/Auth/Me'), { credentials: 'include' })
			if (!response.ok) return setUser(null)
			const data = await response.json() as AuthResponse
			setUser(data.user)
		} catch {
			setUser(null)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		const timer = window.setTimeout(() => { void loadUser() }, 0)
		return () => window.clearTimeout(timer)
	}, [loadUser])
	useEffect(() => {
		const expire = () => setUser(null)
		window.addEventListener(AUTH_EXPIRED_EVENT, expire)
		return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expire)
	}, [])

	const login = async (username: string, password: string) => {
		const response = await fetch(apiUrl('/Auth/Login'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ username, password }),
		})
		if (!response.ok) throw new Error(await responseMessage(response, 'Не удалось войти'))
		const data = await response.json() as AuthResponse
		setUser(data.user)
	}

	const logout = async () => {
		try {
			await fetch(apiUrl('/Auth/Logout'), { method: 'POST', credentials: 'include' })
		} finally {
			setUser(null)
		}
	}

	return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
	const context = useContext(AuthContext)
	if (!context) throw new Error('useAuth должен использоваться внутри AuthProvider')
	return context
}
