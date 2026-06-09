import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { Notifications } from '@mantine/notifications'
import '@mantine/notifications/styles.css'
import { createContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { ICON } from './components/icon/Icon'
import { warning } from './components/natificationMesseg/natificationMessag'
import { ROUTES } from './model/routes'
import './style/App.scss'

type TypeContext = {
	theme: string
}

export const AppContext = createContext<TypeContext>({
	theme: '',
})

function App() {
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

	const IconDarkMode = useRef<HTMLSpanElement>(null)
	const SpanThemeActive = useRef<HTMLSpanElement>(null)
	const [ActiveIconTheme, setActiveIconTheme] = useState<boolean>(false)

	useEffect(() => {
		if (ActiveIconTheme) {
			SpanThemeActive.current?.classList.add('Active')
			SpanThemeActive.current?.classList.remove('Close')
			IconDarkMode.current?.classList.add('Active')
			IconDarkMode.current?.classList.remove('Close')
		} else {
			SpanThemeActive.current?.classList.add('Close')
			SpanThemeActive.current?.classList.remove('Active')
			IconDarkMode.current?.classList.remove('Active')
			IconDarkMode.current?.classList.add('Close')
		}
	}, [ActiveIconTheme])

	useEffect(() => {
		if (theme === 'Dark') {
			setActiveIconTheme(true)
			document.body.classList.add('Dark')
			document.body.classList.remove('Light')
		}
		if (theme === 'Light') {
			setActiveIconTheme(false)
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
				<div className='MainContent__header--Logo' id={theme}>
					<span>{ICON.Document}</span>
					<h1>Пропуска</h1>
				</div>
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
					<button
						onClick={() => {
							warning()
						}}
						className='MainContent__header--Menu--Link'
						id={theme}
					>
						<span>{ICON.Editor}</span>
						<p>Шаблон</p>
					</button>
				</div>
				<div className='MainContent__header--theme'>
					<input
						onChange={switchTheme}
						type='checkbox'
						name=''
						id='InputTheme'
						onChangeCapture={e => setActiveIconTheme(e.target.checked)}
					/>
					<div className='MainContent__header--theme--icon'>
						<span ref={IconDarkMode}>{ICON.DarkMode}</span>
					</div>
					<label htmlFor='InputTheme'>
						<span ref={SpanThemeActive}></span>
					</label>
				</div>
			</div>
			<div className='MainContent_content' id={theme}>
				<AppContext.Provider value={{ theme }}>
					<Outlet />
				</AppContext.Provider>
			</div>
		</div>
	)
}

export default App
