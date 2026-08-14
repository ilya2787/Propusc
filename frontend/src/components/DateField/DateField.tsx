import { useEffect, useMemo, useRef, useState } from 'react'
import { IoCalendarOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5'
import './DateField.scss'

type DateFieldProps = { value: string; onChange: (value: string) => void; onFocus?: () => void }

const formatManualDate = (value: string) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
	return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
}
const parseManualDate = (value: string) => {
	const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim())
	if (!match) return undefined
	const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3])
	const date = new Date(year, month - 1, day)
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined
	return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}
const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const DateField = ({ value, onChange, onFocus }: DateFieldProps) => {
	const rootRef = useRef<HTMLDivElement>(null)
	const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined
	const [manualValue, setManualValue] = useState(formatManualDate(value))
	const [editingManual, setEditingManual] = useState(false)
	const [open, setOpen] = useState(false)
	const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date())

	useEffect(() => {
		if (!open) return
		const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
		const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
		document.addEventListener('pointerdown', closeOutside)
		document.addEventListener('keydown', closeOnEscape)
		return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
	}, [open])

	const calendarDays = useMemo(() => {
		const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
		const start = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - ((firstDay.getDay() + 6) % 7))
		return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
	}, [visibleMonth])
	const openCalendar = () => { setVisibleMonth(selectedDate ?? new Date()); setOpen(current => !current); onFocus?.() }
	const applyManualValue = () => {
		setEditingManual(false)
		if (!manualValue.trim()) { onChange(''); return }
		const parsed = parseManualDate(manualValue)
		if (parsed) onChange(parsed); else setManualValue(formatManualDate(value))
	}

	return <div className={`DateField ${open ? 'DateField--open' : ''}`} ref={rootRef}>
		<div className='DateField__control'>
			<input type='text' inputMode='numeric' placeholder='ДД.ММ.ГГГГ' value={editingManual ? manualValue : formatManualDate(value)} onChange={event => { setEditingManual(true); setManualValue(event.target.value) }} onBlur={applyManualValue} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} onFocus={() => { setManualValue(formatManualDate(value)); setEditingManual(true); onFocus?.() }} aria-label='Введите дату вручную' />
			<button type='button' className='DateField__trigger' onClick={openCalendar} aria-expanded={open} aria-label='Открыть календарь'><span>Выбрать дату</span><IoCalendarOutline aria-hidden='true' /></button>
		</div>
		{open && <div className='DateField__calendar' role='dialog' aria-label='Выбор даты'>
			<div className='DateField__header'>
				<button type='button' onClick={() => setVisibleMonth(date => new Date(date.getFullYear(), date.getMonth() - 1, 1))} aria-label='Предыдущий месяц'><IoChevronBack /></button>
				<strong>{new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(visibleMonth)}</strong>
				<button type='button' onClick={() => setVisibleMonth(date => new Date(date.getFullYear(), date.getMonth() + 1, 1))} aria-label='Следующий месяц'><IoChevronForward /></button>
			</div>
			<div className='DateField__weekdays'>{weekdays.map(day => <span key={day}>{day}</span>)}</div>
			<div className='DateField__days'>{calendarDays.map(date => {
				const iso = toIsoDate(date); const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
				return <button type='button' key={iso} className={`${iso === value ? 'selected' : ''} ${iso === toIsoDate(new Date()) ? 'today' : ''} ${!isCurrentMonth ? 'outside' : ''}`} onClick={() => { onChange(iso); setOpen(false) }}>{date.getDate()}</button>
			})}</div>
			<button type='button' className='DateField__today' onClick={() => { onChange(toIsoDate(new Date())); setOpen(false) }}>Сегодня</button>
		</div>}
	</div>
}

export default DateField
