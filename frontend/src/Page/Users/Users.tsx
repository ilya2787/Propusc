import { useContext, useEffect, useState, type FormEvent } from 'react'
import { AppContext } from '../../App'
import { serverUrl } from '../../api/server'
import type { UserRole } from '../../auth/AuthContext'
import { useAuth } from '../../auth/AuthContext'
import PasswordField from '../../components/PasswordField/PasswordField'
import './Users.scss'

type ManagedUser = {
	id: string
	username: string
	displayName: string
	role: UserRole
	isActive: boolean
	createdAt: string
	lastLoginAt: string | null
}

const formatDate = (value: string | null) => value
	? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
	: 'Ещё не входил'

const Users = () => {
	const { theme } = useContext(AppContext)
	const { user: currentUser } = useAuth()
	const [users, setUsers] = useState<ManagedUser[]>([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [updatingId, setUpdatingId] = useState<string | null>(null)
	const [error, setError] = useState('')
	const [notice, setNotice] = useState('')
	const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null)
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [username, setUsername] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [password, setPassword] = useState('')
	const [role, setRole] = useState<UserRole>('operator')

	useEffect(() => {
		void fetch(`${serverUrl()}/Admin/Users`, { credentials: 'include' })
			.then(async response => {
				const data = await response.json() as { users?: ManagedUser[]; message?: string }
				if (!response.ok) throw new Error(data.message || 'Не удалось загрузить пользователей')
				setUsers(data.users || [])
			})
			.catch(cause => setError(cause instanceof Error ? cause.message : 'Не удалось загрузить пользователей'))
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => {
		const closeOutside = (event: PointerEvent) => {
			document.querySelectorAll<HTMLDetailsElement>('.UsersPage__actions[open]').forEach(menu => {
				if (!menu.contains(event.target as Node)) menu.removeAttribute('open')
			})
		}
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return
			document.querySelectorAll<HTMLDetailsElement>('.UsersPage__actions[open]').forEach(menu => menu.removeAttribute('open'))
		}
		document.addEventListener('pointerdown', closeOutside)
		document.addEventListener('keydown', closeOnEscape)
		return () => {
			document.removeEventListener('pointerdown', closeOutside)
			document.removeEventListener('keydown', closeOnEscape)
		}
	}, [])

	const createUser = async (event: FormEvent) => {
		event.preventDefault()
		setSaving(true)
		setError('')
		setNotice('')
		try {
			const response = await fetch(`${serverUrl()}/Admin/Users`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ username, displayName, password, role }),
			})
			const data = await response.json() as { user?: ManagedUser; message?: string }
			if (!response.ok || !data.user) throw new Error(data.message || 'Не удалось создать пользователя')
			setUsers(current => [...current, data.user as ManagedUser])
			setUsername('')
			setDisplayName('')
			setPassword('')
			setRole('operator')
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось создать пользователя')
		} finally {
			setSaving(false)
		}
	}

	const updateUser = async (id: string, changes: Partial<Pick<ManagedUser, 'role' | 'isActive'>>) => {
		setUpdatingId(id)
		setError('')
		setNotice('')
		try {
			const response = await fetch(`${serverUrl()}/Admin/Users/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(changes),
			})
			const data = await response.json() as { user?: ManagedUser; message?: string }
			if (!response.ok || !data.user) throw new Error(data.message || 'Не удалось изменить пользователя')
			setUsers(current => current.map(user => user.id === id ? data.user as ManagedUser : user))
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось изменить пользователя')
		} finally {
			setUpdatingId(null)
		}
	}

	const resetPassword = async (event: FormEvent) => {
		event.preventDefault()
		if (!passwordUser) return
		if (newPassword !== confirmPassword) return setError('Пароли не совпадают')
		setUpdatingId(passwordUser.id)
		setError('')
		setNotice('')
		try {
			const response = await fetch(`${serverUrl()}/Admin/Users/${passwordUser.id}/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ password: newPassword }),
			})
			const data = await response.json() as { message?: string }
			if (!response.ok) throw new Error(data.message || 'Не удалось сбросить пароль')
			setNotice(`Пароль пользователя «${passwordUser.displayName}» изменён. Его активные сессии завершены.`)
			setPasswordUser(null)
			setNewPassword('')
			setConfirmPassword('')
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось сбросить пароль')
		} finally {
			setUpdatingId(null)
		}
	}

	const openPasswordReset = (user: ManagedUser) => {
		setError('')
		setNotice('')
		setNewPassword('')
		setConfirmPassword('')
		setPasswordUser(user)
	}

	const revokeSessions = async (user: ManagedUser) => {
		if (!window.confirm(`Завершить все активные сессии пользователя «${user.displayName}»? Ему потребуется снова войти в систему.`)) return
		setUpdatingId(user.id)
		setError('')
		setNotice('')
		try {
			const response = await fetch(`${serverUrl()}/Admin/Users/${user.id}/revoke-sessions`, {
				method: 'POST',
				credentials: 'include',
			})
			const data = await response.json() as { message?: string; revokedSessions?: number }
			if (!response.ok) throw new Error(data.message || 'Не удалось завершить сессии пользователя')
			const count = data.revokedSessions ?? 0
			setNotice(count > 0
				? `Активные сессии пользователя «${user.displayName}» завершены: ${count}.`
				: `У пользователя «${user.displayName}» нет активных сессий.`)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось завершить сессии пользователя')
		} finally {
			setUpdatingId(null)
		}
	}

	const toggleUser = (user: ManagedUser) => {
		const action = user.isActive ? 'заблокировать' : 'разблокировать'
		if (user.isActive && !window.confirm(`Вы уверены, что хотите ${action} пользователя «${user.displayName}»? Все его активные сессии будут завершены.`)) return
		void updateUser(user.id, { isActive: !user.isActive })
	}

	return <main className='UsersPage' data-theme={theme.toLowerCase()}>
		<header className='UsersPage__header'>
			<div><span>Администрирование</span><h1>Пользователи</h1><p>Создавайте учётные записи и контролируйте доступ к приложению.</p></div>
			<strong>{users.length}<small>учётных записей</small></strong>
		</header>
		{error && <div className='UsersPage__error' role='alert'>{error}</div>}
		{notice && <div className='UsersPage__notice' role='status'>{notice}</div>}
		<section className='UsersPage__layout'>
			<form className='UsersPage__create' onSubmit={createUser}>
				<div><span>Новый пользователь</span><h2>Создать учётную запись</h2></div>
				<label>Имя пользователя<input value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={2} maxLength={255} required placeholder='Например, Анна Смирнова' /></label>
				<label>Логин<input value={username} onChange={event => setUsername(event.target.value.toLowerCase())} minLength={3} maxLength={64} pattern='[a-z0-9._-]+' required placeholder='anna.smirnova' /></label>
				<label>Роль<select value={role} onChange={event => setRole(event.target.value as UserRole)}><option value='operator'>Оператор</option><option value='admin'>Администратор</option></select></label>
				<label>Временный пароль<PasswordField value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={128} required autoComplete='new-password' placeholder='Не менее 8 символов' /></label>
				<p className='UsersPage__hint'>Передайте логин и временный пароль пользователю безопасным способом.</p>
				<button type='submit' disabled={saving}>{saving ? 'Создание…' : 'Создать пользователя'}</button>
			</form>
			<section className='UsersPage__list'>
				<div className='UsersPage__listHeader'><div><span>Команда</span><h2>Все пользователи</h2></div></div>
					{loading ? <div className='UsersPage__skeleton' role='status' aria-label='Загрузка пользователей'>{Array.from({ length: 4 }, (_, index) => <div className='UsersPage__skeletonRow' key={index}><i /><span><b /><small /></span><em /><strong /></div>)}</div> : users.length === 0 ? <div className='UsersPage__empty'><strong>Пользователей пока нет</strong><span>Создайте первую учётную запись с помощью формы слева.</span></div> : users.map(user => <article className='UsersPage__user' key={user.id}>
					<span className='UsersPage__avatar'>{user.displayName.slice(0, 1).toUpperCase()}</span>
					<div className='UsersPage__userInfo'><strong>{user.displayName}</strong><small>@{user.username}</small></div>
					<span className={`UsersPage__status ${user.isActive ? '' : 'UsersPage__status--blocked'}`}>{user.isActive ? 'Активен' : 'Заблокирован'}</span>
					<small className='UsersPage__login'>Последний вход<br /><b>{formatDate(user.lastLoginAt)}</b></small>
					<details className='UsersPage__actions'>
						<summary><span>Управление</span><b aria-hidden='true'>•••</b></summary>
						<div className='UsersPage__actionsMenu'>
							<label>Роль<select value={user.role} disabled={updatingId === user.id || currentUser?.id === user.id} onChange={event => void updateUser(user.id, { role: event.target.value as UserRole })} aria-label={`Роль пользователя ${user.displayName}`}><option value='operator'>Оператор</option><option value='admin'>Администратор</option></select></label>
							<div className='UsersPage__actionsDivider' />
							<button type='button' className={user.isActive ? 'danger' : ''} disabled={updatingId === user.id || currentUser?.id === user.id} onClick={() => toggleUser(user)}>{updatingId === user.id ? 'Сохранение…' : user.isActive ? 'Заблокировать' : 'Разблокировать'}</button>
							<button type='button' disabled={updatingId === user.id || currentUser?.id === user.id} onClick={() => openPasswordReset(user)}>Сбросить пароль</button>
							<button type='button' disabled={updatingId === user.id || currentUser?.id === user.id} onClick={() => void revokeSessions(user)}>Завершить сессии</button>
							{currentUser?.id === user.id && <small>Своей учётной записью здесь управлять нельзя</small>}
						</div>
					</details>
				</article>)}
			</section>
		</section>
		{passwordUser && <div className='UsersPage__modalBackdrop' role='presentation' onMouseDown={event => { if (event.target === event.currentTarget) setPasswordUser(null) }}>
			<form className='UsersPage__passwordModal' onSubmit={resetPassword} role='dialog' aria-modal='true' aria-labelledby='reset-password-title'>
				<button className='UsersPage__modalClose' type='button' onClick={() => setPasswordUser(null)} aria-label='Закрыть'>×</button>
				<span>Безопасность</span>
				<h2 id='reset-password-title'>Сбросить пароль</h2>
				<p>Задайте новый временный пароль для пользователя <strong>{passwordUser.displayName}</strong>. После сохранения все его активные сессии завершатся.</p>
				{error && <p className='UsersPage__modalError' role='alert'>{error}</p>}
				<label>Новый пароль<PasswordField autoFocus minLength={8} maxLength={128} required value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete='new-password' placeholder='Не менее 8 символов' /></label>
				<label>Повторите пароль<PasswordField minLength={8} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete='new-password' placeholder='Введите пароль ещё раз' /></label>
				<div><button type='button' onClick={() => setPasswordUser(null)}>Отмена</button><button type='submit' disabled={updatingId === passwordUser.id}>{updatingId === passwordUser.id ? 'Сохранение…' : 'Сохранить пароль'}</button></div>
			</form>
		</div>}
	</main>
}

export default Users
