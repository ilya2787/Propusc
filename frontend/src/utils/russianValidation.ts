const validationMessage = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
	const { validity } = field
	if (validity.valueMissing) return 'Заполните это поле.'
	if (validity.typeMismatch) return 'Введите значение в правильном формате.'
	if (validity.patternMismatch) return 'Используйте указанный формат.'
	if (validity.tooShort && field instanceof HTMLInputElement) return `Введите не менее ${field.minLength} символов.`
	if (validity.tooLong && field instanceof HTMLInputElement) return `Введите не более ${field.maxLength} символов.`
	if (validity.rangeUnderflow && field instanceof HTMLInputElement) return `Значение должно быть не меньше ${field.min}.`
	if (validity.rangeOverflow && field instanceof HTMLInputElement) return `Значение должно быть не больше ${field.max}.`
	if (validity.stepMismatch) return 'Введите допустимое значение.'
	if (validity.badInput) return 'Введите корректное значение.'
	return 'Проверьте правильность заполнения поля.'
}

const isFormField = (target: EventTarget | null): target is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
	target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement

export const enableRussianValidationMessages = () => {
	document.addEventListener('invalid', event => {
		if (!isFormField(event.target)) return
		event.target.setCustomValidity(validationMessage(event.target))
	}, true)

	document.addEventListener('input', event => {
		if (isFormField(event.target)) event.target.setCustomValidity('')
	}, true)

	document.addEventListener('change', event => {
		if (isFormField(event.target)) event.target.setCustomValidity('')
	}, true)
}
