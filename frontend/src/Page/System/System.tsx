import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../model/routes'
import './System.scss'

type SystemStatus = {
	database: 'connected'
	databaseName: string
	templates: number
	users: number
	organizations: number
	uploadedFiles: number
}
type RestoreInfo = { createdAt: string; databaseName: string; tables: string[]; sizeBytes: number }

const serverUrl = () => import.meta.env.VITE_APP_SERVER

const System = () => {
	const [status, setStatus] = useState<SystemStatus>()
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(true)
	const [backingUp, setBackingUp] = useState(false)
	const [notice, setNotice] = useState('')
	const [restoreFile, setRestoreFile] = useState<File>()
	const [restoreInfo, setRestoreInfo] = useState<RestoreInfo>()
	const [inspecting, setInspecting] = useState(false)
	const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
	const [restoreConfirmation, setRestoreConfirmation] = useState('')
	const [restoring, setRestoring] = useState(false)
	const [restoreComplete, setRestoreComplete] = useState<{ safetyFilename: string; restoredAt: string }>()

	const loadStatus = async () => {
		setLoading(true)
		setError('')
		try {
			const response = await fetch(`${serverUrl()}/Admin/System/Status`, { credentials: 'include' })
			if (!response.ok) throw new Error('Не удалось получить состояние системы')
			setStatus(await response.json() as SystemStatus)
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : 'Не удалось проверить систему')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		const timer = window.setTimeout(() => { void loadStatus() }, 0)
		return () => window.clearTimeout(timer)
	}, [])

	const downloadBackup = async () => {
		setBackingUp(true)
		setError('')
		setNotice('')
		try {
			const response = await fetch(`${serverUrl()}/Admin/System/Backup`, { method: 'POST', credentials: 'include' })
			if (!response.ok) {
				const data = await response.json().catch(() => ({})) as { message?: string }
				throw new Error(data.message || 'Не удалось создать резервную копию')
			}
			const disposition = response.headers.get('Content-Disposition') ?? ''
			const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'database-backup.sql'
			const url = URL.createObjectURL(await response.blob())
			const anchor = document.createElement('a')
			anchor.href = url
			anchor.download = filename
			anchor.click()
			URL.revokeObjectURL(url)
			setNotice('Резервная копия создана и сохранена в папку загрузок.')
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : 'Не удалось создать резервную копию')
		} finally {
			setBackingUp(false)
		}
	}

	const inspectRestoreFile = async (file?: File) => {
		setRestoreFile(undefined)
		setRestoreInfo(undefined)
		setError('')
		setNotice('')
		if (!file) return
		setInspecting(true)
		try {
			const form = new FormData()
			form.append('backup', file)
			const response = await fetch(`${serverUrl()}/Admin/System/Restore/Inspect`, { method: 'POST', credentials: 'include', body: form })
			const data = await response.json() as RestoreInfo & { message?: string }
			if (!response.ok) throw new Error(data.message || 'Не удалось проверить резервную копию')
			setRestoreFile(file)
			setRestoreInfo(data)
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : 'Не удалось проверить резервную копию')
		} finally {
			setInspecting(false)
		}
	}

	const restoreDatabase = async () => {
		if (!restoreFile || restoreConfirmation !== 'ВОССТАНОВИТЬ') return
		setRestoring(true)
		setError('')
		try {
			const form = new FormData()
			form.append('backup', restoreFile)
			form.append('confirmation', restoreConfirmation)
			const response = await fetch(`${serverUrl()}/Admin/System/Restore`, { method: 'POST', credentials: 'include', body: form })
			const data = await response.json() as { message?: string; safetyFilename?: string; restoredAt?: string }
			if (!response.ok) throw new Error(data.message || 'Не удалось восстановить базу данных')
			setRestoreComplete({ safetyFilename: data.safetyFilename ?? '', restoredAt: data.restoredAt ?? '' })
		} catch (requestError) {
			setRestoreDialogOpen(false)
			setError(requestError instanceof Error ? requestError.message : 'Не удалось восстановить базу данных')
		} finally {
			setRestoring(false)
		}
	}

	return <main className='SystemPage'>
		{restoreDialogOpen && <div className='SystemPage__restoreOverlay' role='presentation'>
			<section className='SystemPage__restoreDialog' role='dialog' aria-modal='true' aria-labelledby='restore-dialog-title'>
				{restoreComplete ? <>
					<span className='SystemPage__restoreResult' aria-hidden='true'>✓</span>
					<h2 id='restore-dialog-title'>База восстановлена</h2>
					<p>Все активные сессии завершены. Страховочная копия прежней базы сохранена как <strong>{restoreComplete.safetyFilename}</strong>.</p>
					<button className='SystemPage__primary' type='button' onClick={() => window.location.assign(ROUTES.Login)}>Перейти ко входу</button>
				</> : <>
					<h2 id='restore-dialog-title'>Восстановить базу данных?</h2>
					<p>Текущие данные будут заменены содержимым копии от <strong>{restoreInfo ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(restoreInfo.createdAt)) : ''}</strong>. Перед заменой сервер автоматически сохранит текущее состояние.</p>
					<label>Для подтверждения введите <strong>ВОССТАНОВИТЬ</strong><input autoFocus value={restoreConfirmation} onChange={event => setRestoreConfirmation(event.target.value)} autoComplete='off' /></label>
					<div><button type='button' onClick={() => { setRestoreDialogOpen(false); setRestoreConfirmation('') }} disabled={restoring}>Отмена</button><button className='danger' type='button' onClick={() => void restoreDatabase()} disabled={restoring || restoreConfirmation !== 'ВОССТАНОВИТЬ'}>{restoring ? 'Восстанавливаем…' : 'Заменить базу'}</button></div>
				</>}
			</section>
		</div>}
		<header className='SystemPage__header'>
			<div><h1>Система и перенос данных</h1><p>Проверка готовности нового компьютера и безопасное резервное копирование.</p></div>
			<button type='button' onClick={() => void loadStatus()} disabled={loading}>{loading ? 'Проверяем…' : 'Проверить снова'}</button>
		</header>

		{error && <p className='SystemPage__message SystemPage__message--error' role='alert'>{error}</p>}
		{notice && <p className='SystemPage__message SystemPage__message--success' role='status'>{notice}</p>}

		<section className='SystemPage__readiness' aria-labelledby='readiness-title'>
			<div><h2 id='readiness-title'>Первичная настройка</h2><p>Пройдите эти шаги после запуска проекта на другом ПК.</p></div>
			<ol>
				<li className={status?.database === 'connected' ? 'done' : ''}><span>1</span><div><strong>Подключение к базе</strong><small>{status ? `База «${status.databaseName}» доступна` : 'Ожидается проверка сервера'}</small></div></li>
				<li className={(status?.users ?? 0) > 0 ? 'done' : ''}><span>2</span><div><strong>Учётная запись администратора</strong><small>{status ? `Пользователей: ${status.users}` : 'Создаётся скриптом INIT_ADMIN.bat'}</small></div></li>
				<li className={(status?.templates ?? 0) > 0 ? 'done' : ''}><span>3</span><div><strong>Шаблоны пропусков</strong><small>{status ? `Доступно шаблонов: ${status.templates}` : 'Проверьте стандартные шаблоны'}</small></div></li>
				<li className={(status?.organizations ?? 0) > 0 ? 'done' : ''}><span>4</span><div><strong>Справочники</strong><small>{status ? `Организаций: ${status.organizations}` : 'Добавьте организации и должности'}</small></div></li>
			</ol>
		</section>

		<div className='SystemPage__columns'>
			<section>
				<h2>Резервная копия</h2>
				<p>Скачайте SQL-файл перед переносом, обновлением или изменением базы. Он содержит пользователей, шаблоны, справочники и журнал.</p>
				<button className='SystemPage__primary' type='button' onClick={downloadBackup} disabled={backingUp || !status}>{backingUp ? 'Создаём копию…' : 'Скачать копию базы'}</button>
				<small>Загруженные изображения хранятся отдельно в папке <code>backend/public/uploads</code> и входят в переносимую сборку.</small>
				<div className='SystemPage__restore'>
					<h3>Восстановление</h3>
					<p>Выберите SQL-копию, ранее созданную в этом разделе. Перед заменой текущая база будет сохранена автоматически.</p>
					<label className='SystemPage__fileButton'><input type='file' accept='.sql,application/sql,text/plain' onChange={event => void inspectRestoreFile(event.target.files?.[0])} />{inspecting ? 'Проверяем файл…' : restoreFile ? 'Выбрать другой файл' : 'Выбрать SQL-копию'}</label>
					{restoreInfo && <div className='SystemPage__restoreInfo'><strong>{restoreFile?.name}</strong><span>Создана {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(restoreInfo.createdAt))}</span><span>{restoreInfo.tables.length} таблиц · {(restoreInfo.sizeBytes / 1024).toFixed(1)} КБ</span></div>}
					<button className='SystemPage__restoreAction' type='button' disabled={!restoreInfo || inspecting} onClick={() => setRestoreDialogOpen(true)}>Восстановить из этой копии</button>
				</div>
			</section>
			<section>
				<h2>Что проверить перед работой</h2>
				<ul><li>Создайте тестовый пропуск.</li><li>Проверьте печать в масштабе 100% на A4.</li><li>Убедитесь, что фон и фотография отображаются.</li><li>Сохраните резервную копию вне папки проекта.</li></ul>
				<div className='SystemPage__links'><Link to={ROUTES.Card}>Создать тестовый пропуск</Link><Link to={ROUTES.Templates}>Проверить шаблоны</Link></div>
			</section>
		</div>
	</main>
}

export default System
