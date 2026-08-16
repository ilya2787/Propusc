import { lazy, Suspense, type ReactNode } from 'react'
import { RequireRole } from './auth/ProtectedRoute'

const Home = lazy(() => import('./Page/Home'))
const CardAll = lazy(() => import('./Page/Card/CardAll'))
const TemplateEditor = lazy(() => import('./Page/Templates/TemplateEditor'))
const NotFound = lazy(() => import('./Page/NotFound/NotFound'))
const Login = lazy(() => import('./Page/Login/Login'))
const Users = lazy(() => import('./Page/Users/Users'))
const Audit = lazy(() => import('./Page/Audit/Audit'))

const RouteLoader = () => <div className='RouteLoader' role='status' aria-live='polite'>
	<span className='RouteLoader__mark' aria-hidden='true' />
	<span>Загрузка раздела…</span>
</div>

const Deferred = ({ children }: { children: ReactNode }) => <Suspense fallback={<RouteLoader />}>{children}</Suspense>

export const LoginPage = () => <Deferred><Login /></Deferred>
export const HomePage = () => <Deferred><Home /></Deferred>
export const CardPage = () => <Deferred><CardAll /></Deferred>
export const TemplatesPage = () => <Deferred><RequireRole role='admin'><TemplateEditor /></RequireRole></Deferred>
export const UsersPage = () => <Deferred><RequireRole role='admin'><Users /></RequireRole></Deferred>
export const AuditPage = () => <Deferred><RequireRole role='admin'><Audit /></RequireRole></Deferred>
export const NotFoundPage = () => <Deferred><NotFound /></Deferred>
