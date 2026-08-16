import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { Notifications } from '@mantine/notifications'
import '@mantine/notifications/styles.css'
import { createContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import mascotLogo from './assets/pass-mascot-logo-v2.png'
import { ICON } from './components/icon/Icon'
import { ROUTES } from './model/routes'
import { useAuth } from './auth/AuthContext'
import './style/App.scss'

type TypeContext = {
	theme: string
}

// Context lives here because it is part of the root layout's public API.
// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<TypeContext>({
	theme: '',
})

function App() {
	const { pathname } = useLocation()
	const { user, logout } = useAuth()
	const isHomePage = pathname === ROUTES.HOME
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const mobileMenuCloseRef = useRef<HTMLButtonElement>(null)
	const [theme, setTheme] = useState<string>(() => {
		const mode = JSON.parse(localStorage.getItem('mode')!)
		return mode || 'Light'
	})
	const switchTheme = () => {
		setTheme(cur => {
			const NewTheme = cur === 'Light' ? 'Dark' : 'Light'
			localStorage.setItem('mode', JSON.stringify(NewTheme))
			return NewTheme
		})
	}

	useEffect(() => {
		document.documentElement.dataset.theme = theme.toLowerCase()
		document.body.dataset.theme = theme.toLowerCase()
		if (theme === 'Dark') {
			document.body.classList.add('Dark')
			document.body.classList.remove('Light')
		}
		if (theme === 'Light') {
			document.body.classList.remove('Dark')
			document.body.classList.add('Light')
		}
		return () => {
			delete document.documentElement.dataset.theme
			delete document.body.dataset.theme
		}
	}, [theme])

	useEffect(() => {
		if (!mobileMenuOpen) return
		mobileMenuCloseRef.current?.focus()
		const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileMenuOpen(false) }
		window.addEventListener('keydown', closeOnEscape)
		return () => window.removeEventListener('keydown', closeOnEscape)
	}, [mobileMenuOpen])

	return (
		<div className={`MainContent ${theme}`} data-theme={theme.toLowerCase()}>
			<MantineProvider>
				<Notifications />
			</MantineProvider>
			<div className={`MainContent__header ${theme}`}>
				<Link to={ROUTES.HOME} className={`MainContent__header--Logo ${theme}`}>
					<img src={mascotLogo} alt='' aria-hidden='true' />
					<div>
						<h1>Пропуска</h1>
						<p>Бюро пропусков</p>
					</div>
				</Link>
				<div className='MainContent__header--Menu'>
					<Link to={`/`} className={`MainContent__header--Menu--Link ${theme}`}>
						<span>{ICON.Home}</span>
						<p>Главный экран</p>
					</Link>
					<NavLink
						to={ROUTES.Card}
						className={({ isActive }) =>
							`MainContent__header--Menu--Link ${theme} ${isActive ? 'Active' : ''}`
						}
					>
						<span>{ICON.CardPass}</span>
						<p>Пропуска</p>
					</NavLink>
					{user?.role === 'admin' && <NavLink
						to={ROUTES.Templates}
						className={({ isActive }) =>
							`MainContent__header--Menu--Link ${theme} ${isActive ? 'Active' : ''}`
						}
					>
						<span>{ICON.Editor}</span>
						<p>Шаблон</p>
					</NavLink>}
					{user?.role === 'admin' && <NavLink
						to={ROUTES.Users}
						className={({ isActive }) =>
							`MainContent__header--Menu--Link MainContent__header--Menu--MoreItem ${theme} ${isActive ? 'Active' : ''}`
						}
					>
						<span>{ICON.Users}</span>
						<p>Пользователи</p>
					</NavLink>}
					{user?.role === 'admin' && <NavLink
						to={ROUTES.Audit}
						className={({ isActive }) =>
							`MainContent__header--Menu--Link MainContent__header--Menu--MoreItem ${theme} ${isActive ? 'Active' : ''}`
						}
					>
						<span>{ICON.Audit}</span>
						<p>Журнал</p>
					</NavLink>}
					{user?.role === 'admin' && <NavLink
						to={ROUTES.System}
						className={({ isActive }) =>
							`MainContent__header--Menu--Link MainContent__header--Menu--MoreItem ${theme} ${isActive ? 'Active' : ''}`
						}
					>
						<span>{ICON.Setting}</span>
						<p>Система</p>
					</NavLink>}
					{user?.role === 'admin' && <button type='button' className={`MainContent__header--Menu--Link MainContent__header--Menu--MoreButton ${theme} ${[ROUTES.Users, ROUTES.Audit, ROUTES.System].some(route => pathname === route) ? 'Active' : ''}`} onClick={() => setMobileMenuOpen(true)} aria-haspopup='dialog' aria-expanded={mobileMenuOpen}>
						<span aria-hidden='true'>•••</span>
						<p>Ещё</p>
					</button>}
				</div>
				<div className='MainContent__header--account'>
					<div className='MainContent__header--account--identity'>
						<span className='MainContent__header--account--avatar'>{user?.displayName.slice(0, 1).toUpperCase()}</span>
						<div className='MainContent__header--account--info'>
							<strong>{user?.displayName}</strong>
							<small>{user?.role === 'admin' ? 'Администратор' : 'Оператор'}</small>
						</div>
					</div>
					<button type='button' onClick={() => void logout()} title='Выйти из системы'>
						<svg aria-hidden='true' viewBox='0 0 24 24' fill='none'>
							<path d='M10 17l5-5-5-5M15 12H3M15 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3' />
						</svg>
						<small>Выйти</small>
					</button>
				</div>
				<div className='MainContent__header--theme'>
					<input
						onChange={switchTheme}
						type='checkbox'
						id='InputTheme'
						checked={theme === 'Dark'}
					/>
					<label htmlFor='InputTheme' title={theme === 'Dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}>
						<span className='themeThumb' aria-hidden='true'>
							<span className='themeIcon sun'>☀</span>
							<span className='themeIcon moon'>☾</span>
						</span>
						<span className='themeLabel'>{theme === 'Dark' ? 'Тёмная тема' : 'Светлая тема'}</span>
						<span className='visuallyHidden'>{theme === 'Dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
					</label>
				</div>
			</div>
			{mobileMenuOpen && <div className='MobileMore' role='presentation' onPointerDown={event => { if (event.target === event.currentTarget) setMobileMenuOpen(false) }}>
				<section className='MobileMore__sheet' role='dialog' aria-modal='true' aria-labelledby='mobile-more-title'>
					<div className='MobileMore__handle' aria-hidden='true' />
					<header><div><h2 id='mobile-more-title'>Ещё</h2><p>Управление системой</p></div><button ref={mobileMenuCloseRef} type='button' onClick={() => setMobileMenuOpen(false)} aria-label='Закрыть меню'>×</button></header>
					<nav aria-label='Дополнительные разделы'>
						<NavLink to={ROUTES.Users} onClick={() => setMobileMenuOpen(false)}><span>{ICON.Users}</span><span><strong>Пользователи</strong><small>Учётные записи и роли</small></span><b aria-hidden='true'>→</b></NavLink>
						<NavLink to={ROUTES.Audit} onClick={() => setMobileMenuOpen(false)}><span>{ICON.Audit}</span><span><strong>Журнал</strong><small>Входы и критичные действия</small></span><b aria-hidden='true'>→</b></NavLink>
						<NavLink to={ROUTES.System} onClick={() => setMobileMenuOpen(false)}><span>{ICON.Setting}</span><span><strong>Система</strong><small>Проверка и резервные копии</small></span><b aria-hidden='true'>→</b></NavLink>
					</nav>
					<button className='MobileMore__logout' type='button' onClick={() => void logout()}>{ICON.Exit}<span>Выйти из системы</span></button>
				</section>
			</div>}
			<div className={`MainContent_content ${theme} ${isHomePage ? 'HomeBackground' : ''}`}>
				<AppContext.Provider value={{ theme }}>
					<Outlet />
				</AppContext.Provider>
			</div>
		</div>
	)
}

export default App
