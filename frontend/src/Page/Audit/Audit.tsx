import { useCallback, useContext, useEffect, useState } from 'react'
import { AppContext } from '../../App'
import './Audit.scss'

type AuditEvent = {
	id: number
	action: string
	entityType: string | null
	details: Record<string, unknown> | null
	ipAddress: string | null
	createdAt: string
	actor: { username: string; displayName: string | null } | null
}

const actionLabels: Record<string, string> = {
	'auth.login_success': 'Успешный вход',
	'auth.login_failed': 'Неудачная попытка входа',
	'auth.login_blocked': 'Вход заблокированного пользователя',
	'auth.login_rate_limited': 'Вход временно ограничен',
	'user.created': 'Создан пользователь',
	'user.access_updated': 'Изменены права пользователя',
	'user.password_reset': 'Сброшен пароль',
	'user.sessions_revoked': 'Завершены сессии',
	'audit.cleaned': 'Очищен журнал',
	'template.synced': 'Сохранены шаблоны',
	'directory.organization_created': 'Добавлена организация',
	'directory.post_created': 'Добавлена должность',
	'directory.organization_deleted': 'Удалена организация',
	'directory.post_deleted': 'Удалена должность',
	'directory.director_updated': 'Изменены данные руководителя',
	'pass.created': 'Пропуск добавлен в очередь',
	'pass.printed': 'Пропуска отправлены на печать',
}
const serverUrl = () => import.meta.env.VITE_APP_SERVER
const formatDate = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))

const Audit = () => {
	const { theme } = useContext(AppContext)
	const [events, setEvents] = useState<AuditEvent[]>([])
	const [category, setCategory] = useState('')
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [notice, setNotice] = useState('')
	const [cleanupDays, setCleanupDays] = useState('180')
	const limit = 25
	const pages = Math.max(1, Math.ceil(total / limit))

	const loadEvents = useCallback(async () => {
		setLoading(true)
		setError('')
		try {
			const params = new URLSearchParams({ page: String(page), limit: String(limit) })
			if (category) params.set('category', category)
			const response = await fetch(`${serverUrl()}/Admin/Audit?${params}`, { credentials: 'include' })
			const data = await response.json() as { events?: AuditEvent[]; total?: number; message?: string }
			if (!response.ok) throw new Error(data.message || 'Не удалось загрузить журнал')
			setEvents(data.events || [])
			setTotal(data.total || 0)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось загрузить журнал')
		} finally {
			setLoading(false)
		}
	}, [category, page])

	useEffect(() => {
		const timer = window.setTimeout(() => { void loadEvents() }, 0)
		return () => window.clearTimeout(timer)
	}, [loadEvents])

	const cleanup = async () => {
		if (!window.confirm(`Удалить записи журнала старше ${cleanupDays} дней? Отменить это действие будет нельзя.`)) return
		setError('')
		setNotice('')
		try {
			const response = await fetch(`${serverUrl()}/Admin/Audit?olderThanDays=${cleanupDays}`, { method: 'DELETE', credentials: 'include' })
			const data = await response.json() as { deleted?: number; message?: string }
			if (!response.ok) throw new Error(data.message || 'Не удалось очистить журнал')
			setNotice(`Удалено записей: ${data.deleted ?? 0}.`)
			setPage(1)
			await loadEvents()
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось очистить журнал')
		}
	}

	return <main className='AuditPage' data-theme={theme.toLowerCase()}>
		<header className='AuditPage__header'><div><span>Безопасность</span><h1>Журнал действий</h1><p>Входы в систему и критичные действия администраторов.</p></div><strong>{total}<small>записей</small></strong></header>
		{error && <div className='AuditPage__error' role='alert'>{error}</div>}
		{notice && <div className='AuditPage__notice' role='status'>{notice}</div>}
		<section className='AuditPage__toolbar'>
			<label>Категория<select value={category} onChange={event => { setCategory(event.target.value); setPage(1) }}><option value=''>Все события</option><option value='auth'>Вход в систему</option><option value='user'>Пользователи</option><option value='template'>Шаблоны</option><option value='directory'>Справочники</option><option value='pass'>Пропуска</option></select></label>
			<div className='AuditPage__cleanup'><label>Удалить записи старше<select value={cleanupDays} onChange={event => setCleanupDays(event.target.value)}><option value='30'>30 дней</option><option value='90'>90 дней</option><option value='180'>180 дней</option></select></label><button type='button' onClick={() => void cleanup()}>Очистить</button></div>
		</section>
		<section className='AuditPage__list'>
				{loading ? <div className='AuditPage__skeleton' role='status' aria-label='Загрузка журнала'>{Array.from({ length: 6 }, (_, index) => <div className='AuditPage__skeletonRow' key={index}><i /><span><b /><small /></span><em /><strong /></div>)}</div> : events.length === 0 ? <div className='AuditPage__empty'><strong>Событий не найдено</strong><span>Попробуйте выбрать другую категорию журнала.</span></div> : events.map(event => <article className={`AuditPage__event AuditPage__event--${event.action.split('.')[0]}`} key={event.id}>
				<span className='AuditPage__marker' aria-hidden='true' />
				<div className='AuditPage__eventMain'><strong>{actionLabels[event.action] || event.action}</strong><small>{event.actor?.displayName || event.actor?.username || 'Неизвестный пользователь'}{event.actor?.username ? ` · @${event.actor.username}` : ''}</small></div>
				<small className='AuditPage__ip'>{event.ipAddress || 'IP не определён'}</small>
				<time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
			</article>)}
		</section>
		<footer className='AuditPage__pagination'><button disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}>Назад</button><span>Страница {page} из {pages}</span><button disabled={page >= pages || loading} onClick={() => setPage(current => current + 1)}>Вперёд</button></footer>
		<p className='AuditPage__retention'>Записи старше 180 дней удаляются автоматически при запуске сервера.</p>
	</main>
}

export default Audit
