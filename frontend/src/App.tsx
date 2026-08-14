import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { Notifications } from '@mantine/notifications'
import '@mantine/notifications/styles.css'
import { createContext, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import mascotLogo from './assets/pass-mascot-logo-v2.png'
import { ICON } from './components/icon/Icon'
import { ROUTES } from './model/routes'
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
	const isHomePage = pathname === ROUTES.HOME
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
		if (theme === 'Dark') {
			document.body.classList.add('Dark')
			document.body.classList.remove('Light')
		}
		if (theme === 'Light') {
			document.body.classList.remove('Dark')
			document.body.classList.add('Light')
		}
	}, [theme])

	return (
		<div className='MainContent' id={theme}>
			<MantineProvider>
				<Notifications />
			</MantineProvider>
			<div className='MainContent__header' id={theme}>
				<Link to={ROUTES.HOME} className='MainContent__header--Logo' id={theme}>
					<img src={mascotLogo} alt='' aria-hidden='true' />
					<div>
						<h1>Пропуска</h1>
						<p>Бюро пропусков</p>
					</div>
				</Link>
				<div className='MainContent__header--Menu'>
					<Link to={`/`} className='MainContent__header--Menu--Link' id={theme}>
						<span>{ICON.Home}</span>
						<p>Главный экран</p>
					</Link>
					<NavLink
						to={ROUTES.Card}
						className={({ isActive }) =>
							`MainContent__header--Menu--Link ${isActive ? 'Active' : ''}`
						}
						id={theme}
					>
						<span>{ICON.CardPass}</span>
						<p>Пропуска</p>
					</NavLink>
					<NavLink
						to={ROUTES.Templates}
						className={({ isActive }) =>
							`MainContent__header--Menu--Link ${isActive ? 'Active' : ''}`
						}
						id={theme}
					>
						<span>{ICON.Editor}</span>
						<p>Шаблон</p>
					</NavLink>
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
						<span className='visuallyHidden'>{theme === 'Dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
					</label>
				</div>
			</div>
			<div className={`MainContent_content ${isHomePage ? 'HomeBackground' : ''}`} id={theme}>
				<AppContext.Provider value={{ theme }}>
					<Outlet />
				</AppContext.Provider>
			</div>
		</div>
	)
}

export default App
