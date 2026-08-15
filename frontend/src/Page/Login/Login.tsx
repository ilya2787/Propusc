import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { IoMoonOutline, IoSunnyOutline } from 'react-icons/io5'
import mascotLogo from '../../assets/pass-mascot-logo-v2.png'
import { useAuth } from '../../auth/AuthContext'
import { ROUTES } from '../../model/routes'
import PasswordField from '../../components/PasswordField/PasswordField'
import './Login.scss'

const Login = () => {
	const { user, login } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [theme, setTheme] = useState<'Light' | 'Dark'>(() => {
		try { return JSON.parse(localStorage.getItem('mode') || '"Light"') === 'Dark' ? 'Dark' : 'Light' } catch { return 'Light' }
	})
	const target = (location.state as { from?: string } | null)?.from || ROUTES.HOME

	useEffect(() => {
		document.body.classList.toggle('Dark', theme === 'Dark')
		document.body.classList.toggle('Light', theme === 'Light')
		localStorage.setItem('mode', JSON.stringify(theme))
	}, [theme])

	if (user) return <Navigate to={ROUTES.HOME} replace />
	const submit = async (event: FormEvent) => {
		event.preventDefault()
		setSubmitting(true)
		setError('')
		try {
			await login(username, password)
			navigate(target, { replace: true })
		} catch (loginError) {
			setError(loginError instanceof Error ? loginError.message : 'Не удалось войти')
		} finally {
			setSubmitting(false)
		}
	}

	return <main className='LoginPage' id={theme}>
		<button type='button' className='LoginPage__theme' onClick={() => setTheme(current => current === 'Light' ? 'Dark' : 'Light')} title={theme === 'Light' ? 'Включить тёмную тему' : 'Включить светлую тему'} aria-label={theme === 'Light' ? 'Включить тёмную тему' : 'Включить светлую тему'}>
			{theme === 'Light' ? <IoMoonOutline aria-hidden='true' /> : <IoSunnyOutline aria-hidden='true' />}
			<span>{theme === 'Light' ? 'Тёмная тема' : 'Светлая тема'}</span>
		</button>
		<form className='LoginCard' onSubmit={submit}>
			<img src={mascotLogo} alt='' aria-hidden='true' />
			<p className='LoginCard__eyebrow'>Бюро пропусков</p>
			<h1>Вход в систему</h1>
			<p className='LoginCard__subtitle'>Введите данные учётной записи, выданные администратором.</p>
			<label>Логин<input autoFocus autoComplete='username' value={username} onChange={event => setUsername(event.target.value)} /></label>
			<label>Пароль<PasswordField autoComplete='current-password' value={password} onChange={event => setPassword(event.target.value)} /></label>
			{error && <p className='LoginCard__error' role='alert'>{error}</p>}
			<button type='submit' disabled={submitting || !username.trim() || !password}>{submitting ? 'Входим…' : 'Войти'}</button>
		</form>
	</main>
}

export default Login
