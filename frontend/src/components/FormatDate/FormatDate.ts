import type { TemplateDateFormat } from '../../model/templates'

export const formatDate = (date: string, format: TemplateDateFormat = 'numeric') => {
	const value = new Date(`${date}T00:00:00`)
	if (Number.isNaN(value.getTime())) return date
	if (format === 'nominative') {
		const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
		return `«${value.getDate()}» ${months[value.getMonth()]} ${value.getFullYear()} года`
	}
	return new Intl.DateTimeFormat('ru-RU', format === 'long'
		? { day: 'numeric', month: 'long', year: 'numeric' }
		: { day: '2-digit', month: '2-digit', year: 'numeric' },
	).format(value)
}
