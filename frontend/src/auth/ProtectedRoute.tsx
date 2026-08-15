import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { ROUTES } from '../model/routes'
import { useAuth, type UserRole } from './AuthContext'

export const ProtectedRoute = () => {
	const { user, loading } = useAuth()
	const location = useLocation()
	if (loading) return <div className='AuthLoading'>Проверяем сессию…</div>
	if (!user) return <Navigate to={ROUTES.Login} replace state={{ from: location.pathname }} />
	return <Outlet />
}

export const RequireRole = ({ role, children }: { role: UserRole; children: ReactNode }) => {
	const { user } = useAuth()
	if (!user || user.role !== role) return <Navigate to={ROUTES.HOME} replace />
	return children
}
