import { useContext, useEffect, useMemo, useState, type PointerEvent } from 'react'
import { AppContext } from '../../App'
import { deleteUploadedImage, uploadImage } from '../../api/images'
import LayoutCardPass from '../../components/LayoutCard/LayoutCardPass'
import LayoutCardPassVip from '../../components/LayoutCard/LayoutCardPassVip'
import {
	DEFAULT_TEMPLATES,
	DEFAULT_CARD_SIZE,
	DEFAULT_FIXED_TEXTS,
	DEFAULT_FONT_SIZES,
	DEFAULT_ELEMENT_LAYOUTS,
	DEFAULT_PHOTO_SETTINGS,
	fetchTemplates,
	loadTemplates,
	persistTemplates,
	saveTemplates,
	type PassTemplate,
	type TemplateFontSizes,
	type TemplateElementKey,
	type TemplateElementLayout,
	type TemplatePhotoSettings,
	type TemplateTextStyle,
} from '../../model/templates'
import { getCardDimensions } from '../../components/LayoutCard/cardDimensions'
import './TemplateEditor.scss'

const example = {
	Number_Tabs: 1042,
	NewDate: '14.08.2026',
	CurrentSingleOrganization: 'Правительство Калининградской области',
	CurrentSinglePost: 'Главный специалист',
	LastName: 'Иванов',
	FirstName: 'Иван',
	Patronymic: 'Иванович',
	Print: false,
}

const elementFontFields: Partial<Record<TemplateElementKey, [keyof TemplateFontSizes, string][]>> = {
	passTitle: [['passTitle', 'Размер заголовка']],
	passNumber: [['passNumber', 'Размер номера']],
	passDate: [['passDate', 'Размер даты']],
	passOrganization: [['passOrganization', 'Размер организации']],
	passPost: [['passPost', 'Размер должности']],
	passName: [['passName', 'Размер ФИО сотрудника']],
	passDirectorPost: [['passDirectorPost', 'Должность руководителя']],
	passDirectorName: [['passDirectorName', 'ФИО руководителя']],
	certificateTitle: [['certificateTitle', 'Размер заголовка']],
	certificateNumber: [['certificateNumber', 'Размер номера']],
	certificateIntro: [['certificateIntro', 'Размер текста']],
	certificateName: [['certificateName', 'Размер ФИО сотрудника']],
	certificateDate: [['certificateDate', 'Размер даты']],
	certificateOrganization: [['certificateOrganization', 'Размер организации']],
	certificatePost: [['certificatePost', 'Размер должности']],
	certificateDirectorPost: [['certificateDirectorPost', 'Должность руководителя']],
	certificateDirectorName: [['certificateDirectorName', 'ФИО руководителя']],
}
const elementLabels: Record<TemplateElementKey, string> = {
	passTitle: 'Заголовок', passNumber: 'Номер', passDate: 'Дата', passOrganization: 'Организация',
	passPost: 'Должность', passName: 'ФИО сотрудника', passDirector: 'Руководитель (старый блок)', passDirectorPost: 'Должность руководителя', passDirectorName: 'ФИО руководителя', passPhoto: 'Фотография',
	certificateTitle: 'Заголовок', certificateNumber: 'Номер', certificateIntro: 'Текст предъявителя',
	certificateName: 'ФИО сотрудника', certificateDate: 'Дата', certificatePhoto: 'Фотография',
	certificateOrganization: 'Организация', certificatePost: 'Должность', certificateDirector: 'Руководитель (старый блок)', certificateDirectorPost: 'Должность руководителя', certificateDirectorName: 'ФИО руководителя',
}
const passElements: TemplateElementKey[] = ['passTitle', 'passNumber', 'passDate', 'passOrganization', 'passPost', 'passName', 'passDirectorPost', 'passDirectorName', 'passPhoto']
const certificateFrontElements: TemplateElementKey[] = ['certificateTitle', 'certificateNumber', 'certificateIntro', 'certificateName', 'certificateDate', 'certificatePhoto']
const certificateBackElements: TemplateElementKey[] = ['certificateOrganization', 'certificatePost', 'certificateDirectorPost', 'certificateDirectorName']
const fixedTextElements = new Set<TemplateElementKey>([
	'passTitle', 'passNumber', 'certificateTitle', 'certificateNumber', 'certificateIntro', 'certificateDate',
])

type CoordinateInputProps = {
	label: string
	value: number
	min: number
	max: number
	onChange: (value: number) => void
}

const CoordinateInput = ({ label, value, min, max, onChange }: CoordinateInputProps) => {
	const setClampedValue = (nextValue: number) => {
		if (Number.isFinite(nextValue)) onChange(Math.min(max, Math.max(min, nextValue)))
	}

	return <div className='TemplateEditor__coordinateField'>
		<span>{label}</span>
		<span className='TemplateEditor__numberInput TemplateEditor__coordinateNumber'>
			<button type='button' onClick={() => setClampedValue(value - 1)} disabled={value <= min} aria-label={`Уменьшить: ${label}`}>−</button>
			<span><input type='number' min={min} max={max} value={value} onChange={e => setClampedValue(Number(e.target.value))} aria-label={label} /></span>
			<button type='button' onClick={() => setClampedValue(value + 1)} disabled={value >= max} aria-label={`Увеличить: ${label}`}>+</button>
		</span>
	</div>
}

const TemplateEditor = () => {
	const { theme } = useContext(AppContext)
	const [templates, setTemplates] = useState(loadTemplates)
	const [selectedId, setSelectedId] = useState(templates[0].id)
	const [saved, setSaved] = useState(true)
	const [editorSide, setEditorSide] = useState<'front' | 'back'>('front')
	const [settingsTab, setSettingsTab] = useState<'main' | 'appearance' | 'layout'>('main')
	const [selectedElement, setSelectedElement] = useState<TemplateElementKey>()
	const [drag, setDrag] = useState<{ key: TemplateElementKey; pointerX: number; pointerY: number; x: number; y: number }>()
	const [backgroundError, setBackgroundError] = useState('')
	const [previewPhoto, setPreviewPhoto] = useState('')
	const [serverError, setServerError] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const selected = useMemo(
		() => templates.find(template => template.id === selectedId) ?? templates[0],
		[templates, selectedId],
	)
	const cardSize = selected.design.cardSize ?? DEFAULT_CARD_SIZE
	const previewDimensions = getCardDimensions(selected, false)

	useEffect(() => {
		fetchTemplates().then(items => {
			setTemplates(items)
			setSelectedId(current => items.some(item => item.id === current) ? current : items[0].id)
		}).catch(() => setServerError('Не удалось загрузить шаблоны с сервера. Используется локальная копия.'))
	}, [])

	const update = (patch: Partial<PassTemplate>) => {
		setSaved(false)
		setTemplates(items =>
			items.map(item => (item.id === selected.id ? { ...item, ...patch } : item)),
		)
	}

	const updateDesign = (patch: Partial<PassTemplate['design']>) =>
		update({ design: { ...selected.design, ...patch } })
	const updateFontSize = (field: keyof TemplateFontSizes, value: number) =>
		updateDesign({
			fontSizes: {
				...DEFAULT_FONT_SIZES,
				...selected.design.fontSizes,
				[field]: value,
			},
		})
	const updateLineHeight = (field: keyof TemplateFontSizes, value: number) =>
		updateDesign({
			lineHeights: { ...selected.design.lineHeights, [field]: value },
		})
	const updateFixedText = (key: TemplateElementKey, value: string) =>
		updateDesign({ fixedTexts: { ...selected.design.fixedTexts, [key]: value } })
	const updateTextStyle = (key: TemplateElementKey, patch: Partial<TemplateTextStyle>) => {
		const current = selected.design.textStyles?.[key] ?? {}
		updateDesign({ textStyles: { ...selected.design.textStyles, [key]: { ...current, ...patch } } })
	}
	const resetTextStyle = (key: TemplateElementKey) => {
		const textStyles = { ...selected.design.textStyles }
		delete textStyles[key]
		updateDesign({ textStyles })
	}
	const updateCardSize = (field: 'widthMm' | 'heightMm', value: number) => {
		if (!Number.isFinite(value)) return
		const limits = field === 'widthMm' ? { min: 30, max: 180 } : { min: 20, max: 250 }
		updateDesign({
			cardSize: {
				...cardSize,
				[field]: Math.min(limits.max, Math.max(limits.min, value)),
			},
		})
	}
	const normalizeFontSize = (value: number) => Math.min(42, Math.max(8, value))
	const uploadBackground = async (file: File | undefined, side: 'pass' | 'front' | 'back') => {
		if (!file) return
		if (!file.type.startsWith('image/')) {
			setBackgroundError('Выберите файл изображения.')
			return
		}
		if (file.size > 5 * 1024 * 1024) {
			setBackgroundError('Размер изображения не должен превышать 5 МБ.')
			return
		}
		try {
			const uploaded = await uploadImage(file, 'background')
			if (side === 'pass') updateDesign({ backgroundImage: uploaded.url, backgroundImageName: uploaded.name })
			if (side === 'front') updateDesign({ frontBackgroundImage: uploaded.url, frontBackgroundImageName: uploaded.name })
			if (side === 'back') updateDesign({ backBackgroundImage: uploaded.url, backBackgroundImageName: uploaded.name })
			setBackgroundError('')
		} catch (error) {
			setBackgroundError(error instanceof Error ? error.message : 'Не удалось загрузить фон')
		}
	}
	const clearBackground = async (side: 'pass' | 'front' | 'back') => {
		const currentUrl = side === 'pass' ? selected.design.backgroundImage : side === 'front' ? selected.design.frontBackgroundImage : selected.design.backBackgroundImage
		try {
			await deleteUploadedImage(currentUrl)
		} catch (error) {
			setBackgroundError(error instanceof Error ? error.message : 'Не удалось удалить фон')
			return
		}
		if (side === 'pass') updateDesign({ backgroundImage: undefined, backgroundImageName: undefined })
		if (side === 'front') updateDesign({ frontBackgroundImage: undefined, frontBackgroundImageName: undefined })
		if (side === 'back') updateDesign({ backBackgroundImage: undefined, backBackgroundImageName: undefined })
		setBackgroundError('')
	}
	const selectPreviewPhoto = (file?: File) => {
		if (!file || !file.type.startsWith('image/')) return
		const reader = new FileReader()
		reader.onload = () => setPreviewPhoto(String(reader.result))
		reader.readAsDataURL(file)
	}
	const availableElements = selected.kind === 'pass'
		? passElements
		: editorSide === 'front' ? certificateFrontElements : certificateBackElements
	const selectedLayout = selectedElement
		? selected.design.elements?.[selectedElement] ?? DEFAULT_ELEMENT_LAYOUTS[selectedElement]
		: undefined
	const selectedFontFields = selectedElement ? elementFontFields[selectedElement] ?? [] : []
	const selectedTextStyle = selectedElement ? selected.design.textStyles?.[selectedElement] ?? {} : {}
	const selectedFixedText = selectedElement && fixedTextElements.has(selectedElement)
		? selected.design.fixedTexts?.[selectedElement] ?? DEFAULT_FIXED_TEXTS[selectedElement] ?? ''
		: undefined
	const selectedPhotoKey = selectedElement === 'passPhoto' || selectedElement === 'certificatePhoto' ? selectedElement : undefined
	const selectedPhoto = selectedPhotoKey
		? { ...DEFAULT_PHOTO_SETTINGS, ...selected.design.photos?.[selectedPhotoKey] }
		: undefined
	const directorElementKeys: TemplateElementKey[] = selected.kind === 'pass'
		? ['passDirectorPost', 'passDirectorName']
		: ['certificateDirectorPost', 'certificateDirectorName']
	const isElementVisible = (key: TemplateElementKey) => {
		const hidden = selected.design.hiddenElements?.includes(key) ?? false
		return !hidden && (!directorElementKeys.includes(key) || selected.design.showDirector)
	}
	const toggleElementVisibility = (key: TemplateElementKey) => {
		const hidden = new Set(selected.design.hiddenElements ?? [])
		const currentlyVisible = isElementVisible(key)
		let showDirector = selected.design.showDirector
		if (currentlyVisible) {
			hidden.add(key)
		} else {
			hidden.delete(key)
			if (directorElementKeys.includes(key) && !showDirector) {
				directorElementKeys.forEach(directorKey => hidden.add(directorKey))
				hidden.delete(key)
				showDirector = true
			}
		}
		updateDesign({ hiddenElements: [...hidden], showDirector })
	}
	const updateElement = (key: TemplateElementKey, patch: Partial<TemplateElementLayout>) => {
		const current = selected.design.elements?.[key] ?? DEFAULT_ELEMENT_LAYOUTS[key]
		updateDesign({ elements: { ...selected.design.elements, [key]: { ...current, ...patch } } })
	}
	const updatePhoto = (key: 'passPhoto' | 'certificatePhoto', patch: Partial<TemplatePhotoSettings>) => {
		const current = { ...DEFAULT_PHOTO_SETTINGS, ...selected.design.photos?.[key] }
		updateDesign({ photos: { ...selected.design.photos, [key]: { ...current, ...patch } } })
	}
	const startElementDrag = (key: TemplateElementKey, event: PointerEvent<HTMLElement>) => {
		event.preventDefault()
		event.currentTarget.setPointerCapture(event.pointerId)
		const current = selected.design.elements?.[key] ?? DEFAULT_ELEMENT_LAYOUTS[key]
		setSelectedElement(key)
		setDrag({ key, pointerX: event.clientX, pointerY: event.clientY, x: current.x, y: current.y })
	}
	const moveElement = (event: PointerEvent<HTMLDivElement>) => {
		if (!drag) return
		updateElement(drag.key, {
			x: Math.round(Math.min(514, Math.max(0, drag.x + (event.clientX - drag.pointerX) / previewDimensions.scaleX))),
			y: Math.round(Math.min(363, Math.max(0, drag.y + (event.clientY - drag.pointerY) / previewDimensions.scaleY))),
		})
	}

	const createTemplate = () => {
		const copy: PassTemplate = {
			...selected,
			id: `template-${Date.now()}`,
			name: `${selected.name} — копия`,
			isBuiltIn: false,
			design: { ...selected.design },
		}
		const next = [...templates, copy]
		setTemplates(next)
		setSelectedId(copy.id)
		setSaved(false)
	}

	const removeTemplate = () => {
		if (selected.isBuiltIn) return
		const next = templates.filter(item => item.id !== selected.id)
		setTemplates(next)
		setSelectedId(next[0].id)
		void persistTemplates(next).catch(error => setServerError(error.message))
		setSaved(true)
	}

	const resetBuiltIns = () => {
		const custom = templates.filter(item => !item.isBuiltIn)
		const next = [...DEFAULT_TEMPLATES, ...custom]
		setTemplates(next)
		setSelectedId(DEFAULT_TEMPLATES[0].id)
		void persistTemplates(next).catch(error => setServerError(error.message))
		setSaved(true)
	}
	const saveAllTemplates = async () => {
		setIsSaving(true)
		setServerError('')
		try {
			await persistTemplates(templates)
			setSaved(true)
		} catch (error) {
			saveTemplates(templates)
			setServerError(error instanceof Error ? error.message : 'Не удалось сохранить шаблоны')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<main className='TemplateEditor' id={theme}>
			<header className='TemplateEditor__header'>
				<div>
					<p className='TemplateEditor__eyebrow'>Конструктор</p>
					<h1>Шаблоны пропусков</h1>
					<p>Настройте оформление, создайте вариант и сразу проверьте результат.</p>
				</div>
				<div className='TemplateEditor__actions'>
					<button className='secondary' onClick={createTemplate}>Создать копию</button>
					<button
						className='primary'
						onClick={saveAllTemplates}
						disabled={isSaving}
					>
						{isSaving ? 'Сохранение…' : saved ? 'Сохранено' : 'Сохранить'}
					</button>
				</div>
			</header>
			{serverError && <div className='TemplateEditor__serverError'>{serverError}</div>}

			<section className='TemplateEditor__selector panel'>
				<div className='TemplateEditor__sectionTitle'>
					<span>1</span>
					<div><h2>Выберите шаблон</h2><p>Начните со стандартного или продолжите редактировать свой</p></div>
				</div>
				<aside className='TemplateEditor__list panel'>
					{templates.map(template => (
						<button
							key={template.id}
							className={template.id === selected.id ? 'active' : ''}
							onClick={() => setSelectedId(template.id)}
						>
							<span>{template.name}</span>
							<small>{template.description || (template.kind === 'pass' ? 'Односторонний пропуск' : 'Двустороннее удостоверение')}</small>
						</button>
					))}
				</aside>
			</section>

			<div className='TemplateEditor__workspace'>
				<section className='TemplateEditor__settings panel'>
					<div className='TemplateEditor__sectionTitle'>
						<span>2</span>
						<div><h2>Настройте шаблон</h2><p>{selected.name}</p></div>
					</div>
					<nav className='TemplateEditor__settingsTabs' aria-label='Разделы настроек'>
						<button className={settingsTab === 'main' ? 'active' : ''} onClick={() => setSettingsTab('main')}>Основное</button>
						<button className={settingsTab === 'appearance' ? 'active' : ''} onClick={() => setSettingsTab('appearance')}>Оформление</button>
						<button className={settingsTab === 'layout' ? 'active' : ''} onClick={() => setSettingsTab('layout')}>Элементы</button>
					</nav>
					{selected.kind === 'certificate' && <div className='TemplateEditor__tabs'>
						<button className={editorSide === 'front' ? 'active' : ''} onClick={() => setEditorSide('front')}>Лицевая</button>
						<button className={editorSide === 'back' ? 'active' : ''} onClick={() => setEditorSide('back')}>Оборотная</button>
					</div>}
					{settingsTab === 'main' && <div className='TemplateEditor__tabContent'>
						<h3>Основные данные</h3>
						<label>Название<input value={selected.name} onChange={e => update({ name: e.target.value })} /></label>
						<label>Описание<textarea value={selected.description} onChange={e => update({ description: e.target.value })} /></label>
						<label>Тип<select value={selected.kind} onChange={e => update({ kind: e.target.value as PassTemplate['kind'] })}><option value='pass'>Односторонний пропуск</option><option value='certificate'>Удостоверение</option></select></label>
						<div className='TemplateEditor__sizeSettings'>
							<h3>Физический размер</h3>
							<div className='TemplateEditor__row'>
								<div className='TemplateEditor__sizeField'><span>Ширина</span><div className='TemplateEditor__numberInput TemplateEditor__sizeNumber'><button type='button' onClick={() => updateCardSize('widthMm', cardSize.widthMm - 1)} disabled={cardSize.widthMm <= 30} aria-label='Уменьшить ширину'>−</button><span><input type='number' min='30' max='180' step='.1' value={cardSize.widthMm} onChange={e => updateCardSize('widthMm', Number(e.target.value))} aria-label='Ширина пропуска в миллиметрах' /><small>мм</small></span><button type='button' onClick={() => updateCardSize('widthMm', cardSize.widthMm + 1)} disabled={cardSize.widthMm >= 180} aria-label='Увеличить ширину'>+</button></div></div>
								<div className='TemplateEditor__sizeField'><span>Высота</span><div className='TemplateEditor__numberInput TemplateEditor__sizeNumber'><button type='button' onClick={() => updateCardSize('heightMm', cardSize.heightMm - 1)} disabled={cardSize.heightMm <= 20} aria-label='Уменьшить высоту'>−</button><span><input type='number' min='20' max='250' step='.1' value={cardSize.heightMm} onChange={e => updateCardSize('heightMm', Number(e.target.value))} aria-label='Высота пропуска в миллиметрах' /><small>мм</small></span><button type='button' onClick={() => updateCardSize('heightMm', cardSize.heightMm + 1)} disabled={cardSize.heightMm >= 250} aria-label='Увеличить высоту'>+</button></div></div>
							</div>
							<button type='button' className='TemplateEditor__sizePreset TemplateEditor__resetButton' onClick={() => updateDesign({ cardSize: { ...DEFAULT_CARD_SIZE } })}><span aria-hidden='true'>↺</span> Стандартный размер 70 × 48 мм</button>
							<p className='TemplateEditor__hint'>В предпросмотре размер автоматически масштабируется. Значения в миллиметрах применяются без масштабирования только при печати.</p>
							{selected.kind === 'certificate' && cardSize.widthMm * 2 + 3 > 190 && <p className='TemplateEditor__error'>Две стороны удостоверения шириной {cardSize.widthMm} мм не помещаются рядом в печатную область A4.</p>}
						</div>
						<div className='TemplateEditor__danger'><button onClick={resetBuiltIns}>Сбросить стандартные</button>{!selected.isBuiltIn && <button onClick={removeTemplate}>Удалить шаблон</button>}</div>
					</div>}
					{settingsTab === 'appearance' && <div className='TemplateEditor__tabContent'>
					<h3>{selected.kind === 'certificate' ? (editorSide === 'front' ? 'Лицевая сторона' : 'Оборотная сторона') : 'Оформление пропуска'}</h3>
					{selected.kind === 'pass' && <>
						<label>Фон<select value={selected.design.background} onChange={e => updateDesign({ background: e.target.value as PassTemplate['design']['background'] })}><option value='flag'>Флаг</option><option value='emblem'>Герб</option></select></label>
						<div className='TemplateEditor__backgroundUpload'><span>Собственное изображение</span><label className='TemplateEditor__fileButton'><input type='file' accept='image/png,image/jpeg,image/webp' onChange={e => uploadBackground(e.target.files?.[0], 'pass')} />Выбрать файл</label>{selected.design.backgroundImage && <><small>{selected.design.backgroundImageName}</small><button onClick={() => clearBackground('pass')}>Удалить фон</button></>}</div>
						<label>Цвет основного текста<input type='color' value={selected.design.textColor ?? '#111111'} onChange={e => updateDesign({ textColor: e.target.value })} /></label>
						<div className='TemplateEditor__row'><label>Цвет полосы<input type='color' value={selected.design.accentColor} onChange={e => updateDesign({ accentColor: e.target.value })} /></label><label>Цвет заголовка<input type='color' value={selected.design.titleColor} onChange={e => updateDesign({ titleColor: e.target.value })} /></label></div>
						<label className='TemplateEditor__check'><input type='checkbox' checked={selected.design.showDirector} onChange={e => updateDesign({ showDirector: e.target.checked })} />Показывать подпись руководителя</label>
					</>}
					{selected.kind === 'certificate' && editorSide === 'front' && <>
						<label>Фон лицевой стороны<select value={selected.design.frontBackground ?? selected.design.background} onChange={e => updateDesign({ frontBackground: e.target.value as PassTemplate['design']['background'] })}><option value='flag'>Флаг</option><option value='emblem'>Герб</option></select></label>
						<div className='TemplateEditor__backgroundUpload'><span>Собственное изображение</span><label className='TemplateEditor__fileButton'><input type='file' accept='image/png,image/jpeg,image/webp' onChange={e => uploadBackground(e.target.files?.[0], 'front')} />Выбрать файл</label>{selected.design.frontBackgroundImage && <><small>{selected.design.frontBackgroundImageName}</small><button onClick={() => clearBackground('front')}>Удалить фон</button></>}</div>
						<label>Цвет текста лицевой стороны<input type='color' value={selected.design.frontTextColor ?? '#111111'} onChange={e => updateDesign({ frontTextColor: e.target.value })} /></label>
						<div className='TemplateEditor__row'><label>Акцентный цвет<input type='color' value={selected.design.accentColor} onChange={e => updateDesign({ accentColor: e.target.value })} /></label><label>Цвет заголовка<input type='color' value={selected.design.titleColor} onChange={e => updateDesign({ titleColor: e.target.value })} /></label></div>
					</>}
					{selected.kind === 'certificate' && editorSide === 'back' && <>
						<label>Фон оборотной стороны<select value={selected.design.backBackground ?? 'emblem'} onChange={e => updateDesign({ backBackground: e.target.value as PassTemplate['design']['background'] })}><option value='flag'>Флаг</option><option value='emblem'>Герб</option></select></label>
						<div className='TemplateEditor__backgroundUpload'><span>Собственное изображение</span><label className='TemplateEditor__fileButton'><input type='file' accept='image/png,image/jpeg,image/webp' onChange={e => uploadBackground(e.target.files?.[0], 'back')} />Выбрать файл</label>{selected.design.backBackgroundImage && <><small>{selected.design.backBackgroundImageName}</small><button onClick={() => clearBackground('back')}>Удалить фон</button></>}</div>
						<label>Цвет текста оборотной стороны<input type='color' value={selected.design.backTextColor ?? '#111111'} onChange={e => updateDesign({ backTextColor: e.target.value })} /></label>
						<label className='TemplateEditor__check'><input type='checkbox' checked={selected.design.showDirector} onChange={e => updateDesign({ showDirector: e.target.checked })} />Показывать подпись руководителя</label>
					</>}
					<label>Шрифт<select value={selected.design.fontFamily} onChange={e => updateDesign({ fontFamily: e.target.value })}><option value='Times New Roman'>Times New Roman</option><option value='Arial'>Arial</option><option value='Georgia'>Georgia</option></select></label>
					<label>Скругление: {selected.design.borderRadius}px<input type='range' min='0' max='24' value={selected.design.borderRadius} onChange={e => updateDesign({ borderRadius: Number(e.target.value) })} /></label>
					{backgroundError && <p className='TemplateEditor__error'>{backgroundError}</p>}
					</div>}
					{settingsTab === 'layout' && <div className='TemplateEditor__tabContent'>
					<div className='TemplateEditor__elementSettings'>
						<h3>Расположение элементов</h3>
						<div className='TemplateEditor__fieldVisibility'><h4>Поля на пропуске</h4>{availableElements.map(key => <label key={key}><span>{elementLabels[key]}</span><input type='checkbox' checked={isElementVisible(key)} onChange={() => toggleElementVisibility(key)} /><i aria-hidden='true'></i></label>)}</div>
						<label>Выбранный блок<select value={selectedElement && availableElements.includes(selectedElement) ? selectedElement : ''} onChange={e => setSelectedElement(e.target.value as TemplateElementKey || undefined)}><option value=''>Выберите на макете…</option>{availableElements.map(key => <option key={key} value={key}>{elementLabels[key]}{isElementVisible(key) ? '' : ' (скрыто)'}</option>)}</select></label>
						{selectedLayout && availableElements.includes(selectedElement!) && <>
							{selectedFixedText !== undefined && <div className='TemplateEditor__fixedTextSettings'>
								<h3>Текст блока</h3>
								<label>Содержимое<textarea value={selectedFixedText} rows={3} onChange={e => updateFixedText(selectedElement!, e.target.value)} /></label>
								<button type='button' className='TemplateEditor__resetButton' onClick={() => updateFixedText(selectedElement!, DEFAULT_FIXED_TEXTS[selectedElement!] ?? '')}><span aria-hidden='true'>↺</span> Вернуть исходный текст</button>
							</div>}
							{selectedPhotoKey && selectedPhoto && <div className='TemplateEditor__photoSettings'>
								<h3>Настройки фотографии</h3>
								<label className='TemplateEditor__fileButton'><input type='file' accept='image/png,image/jpeg,image/webp' onChange={e => selectPreviewPhoto(e.target.files?.[0])} />{previewPhoto ? 'Заменить тестовое фото' : 'Выбрать тестовое фото'}</label>
								<label>Высота рамки: {selectedPhoto.height}px<input type='range' min='60' max='300' value={selectedPhoto.height} onChange={e => updatePhoto(selectedPhotoKey, { height: Number(e.target.value) })} /></label>
								<label>Заполнение<select value={selectedPhoto.fit} onChange={e => updatePhoto(selectedPhotoKey, { fit: e.target.value as TemplatePhotoSettings['fit'] })}><option value='cover'>Заполнить рамку</option><option value='contain'>Показать полностью</option></select></label>
								<label>Масштаб: {selectedPhoto.scale}%<input type='range' min='50' max='200' value={selectedPhoto.scale} onChange={e => updatePhoto(selectedPhotoKey, { scale: Number(e.target.value) })} /></label>
								<div className='TemplateEditor__row'><label>Позиция X: {selectedPhoto.positionX}%<input type='range' min='0' max='100' value={selectedPhoto.positionX} onChange={e => updatePhoto(selectedPhotoKey, { positionX: Number(e.target.value) })} /></label><label>Позиция Y: {selectedPhoto.positionY}%<input type='range' min='0' max='100' value={selectedPhoto.positionY} onChange={e => updatePhoto(selectedPhotoKey, { positionY: Number(e.target.value) })} /></label></div>
								<label>Скругление рамки: {selectedPhoto.borderRadius}px<input type='range' min='0' max='40' value={selectedPhoto.borderRadius} onChange={e => updatePhoto(selectedPhotoKey, { borderRadius: Number(e.target.value) })} /></label>
							</div>}
							{selectedFontFields.length > 0 && <div className='TemplateEditor__fontSizes TemplateEditor__selectedFontSizes'>
								<h3>Параметры выбранного текста</h3>
								<div className='TemplateEditor__textToolbar'>
									<label>Цвет<input type='color' value={selectedTextStyle.color ?? '#111111'} onChange={e => updateTextStyle(selectedElement!, { color: e.target.value })} /></label>
									<div className='TemplateEditor__formatButtons' aria-label='Начертание текста'>
										<button type='button' className={(selectedTextStyle.fontWeight ?? 400) >= 700 ? 'active' : ''} onClick={() => updateTextStyle(selectedElement!, { fontWeight: (selectedTextStyle.fontWeight ?? 400) >= 700 ? 400 : 700 })} aria-pressed={(selectedTextStyle.fontWeight ?? 400) >= 700}><strong>Ж</strong></button>
										<button type='button' className={selectedTextStyle.fontStyle === 'italic' ? 'active' : ''} onClick={() => updateTextStyle(selectedElement!, { fontStyle: selectedTextStyle.fontStyle === 'italic' ? 'normal' : 'italic' })} aria-pressed={selectedTextStyle.fontStyle === 'italic'}><em>К</em></button>
									</div>
								</div>
								<label>Регистр<select value={selectedTextStyle.textTransform ?? 'none'} onChange={e => updateTextStyle(selectedElement!, { textTransform: e.target.value as TemplateTextStyle['textTransform'] })}><option value='none'>Как введено</option><option value='uppercase'>ПРОПИСНЫЕ</option><option value='lowercase'>строчные</option></select></label>
								<label>Межбуквенный интервал: {selectedTextStyle.letterSpacing ?? 0}px<input type='range' min='-2' max='8' step='.1' value={selectedTextStyle.letterSpacing ?? 0} onChange={e => updateTextStyle(selectedElement!, { letterSpacing: Number(e.target.value) })} /></label>
								{selectedFontFields.map(([field, label]) => {
									const value = selected.design.fontSizes?.[field] ?? DEFAULT_FONT_SIZES[field]
									const lineHeight = selected.design.lineHeights?.[field] ?? 1.2
									return <div className='TemplateEditor__textFieldSettings' key={field}>
										<label>{label}<span><input type='range' min='8' max='42' value={value} onChange={e => updateFontSize(field, Number(e.target.value))} /><span className='TemplateEditor__numberInput'><button type='button' onClick={() => updateFontSize(field, normalizeFontSize(value - 1))} disabled={value <= 8} aria-label={`Уменьшить размер: ${label}`}>−</button><span><input type='number' min='8' max='42' value={value} onChange={e => updateFontSize(field, normalizeFontSize(Number(e.target.value)))} aria-label={`Размер шрифта: ${label}`} /><small>px</small></span><button type='button' onClick={() => updateFontSize(field, normalizeFontSize(value + 1))} disabled={value >= 42} aria-label={`Увеличить размер: ${label}`}>+</button></span></span></label>
										<label>Межстрочный интервал<span><input type='range' min='.8' max='2' step='.05' value={lineHeight} onChange={e => updateLineHeight(field, Number(e.target.value))} /><span className='TemplateEditor__lineHeightValue'>{lineHeight.toFixed(2)}</span></span></label>
									</div>
								})}
								<button type='button' className='TemplateEditor__resetTextStyle TemplateEditor__resetButton' onClick={() => resetTextStyle(selectedElement!)}><span aria-hidden='true'>↺</span> Сбросить оформление текста</button>
							</div>}
							<div className='TemplateEditor__coordinates'>
								<CoordinateInput label='X, px' min={0} max={514} value={selectedLayout.x} onChange={value => updateElement(selectedElement!, { x: value })} />
								<CoordinateInput label='Y, px' min={0} max={363} value={selectedLayout.y} onChange={value => updateElement(selectedElement!, { y: value })} />
								<CoordinateInput label='Ширина' min={30} max={514} value={selectedLayout.width} onChange={value => updateElement(selectedElement!, { width: value })} />
							</div>
							<label>Выравнивание<select value={selectedLayout.align} onChange={e => updateElement(selectedElement!, { align: e.target.value as TemplateElementLayout['align'] })}><option value='left'>По левому краю</option><option value='center'>По центру</option><option value='right'>По правому краю</option></select></label>
						</>}
					</div>
					</div>}
				</section>

				<section className='TemplateEditor__preview panel'>
					<div className='TemplateEditor__previewHeader'>
						<div className='TemplateEditor__sectionTitle'>
							<span>3</span>
							<div><h2>Предпросмотр</h2><p>{selected.kind === 'certificate' ? (editorSide === 'front' ? 'Лицевая сторона' : 'Оборотная сторона') : 'Изменения отображаются сразу'}</p></div>
						</div>
						<span className={`TemplateEditor__saveState ${saved ? 'saved' : ''}`}>{saved ? 'Все изменения сохранены' : 'Есть несохранённые изменения'}</span>
					</div>
					{selected.kind === 'certificate' && <div className='TemplateEditor__previewTabs TemplateEditor__tabs'><button className={editorSide === 'front' ? 'active' : ''} onClick={() => setEditorSide('front')}>Лицевая сторона</button><button className={editorSide === 'back' ? 'active' : ''} onClick={() => setEditorSide('back')}>Оборотная сторона</button></div>}
					<div className='TemplateEditor__canvas' onPointerMove={moveElement} onPointerUp={() => setDrag(undefined)} onPointerCancel={() => setDrag(undefined)}>
						{selected.kind === 'pass'
							? <LayoutCardPass {...example} FilePhoto={previewPhoto} template={selected} editor={{ selected: selectedElement, onSelect: startElementDrag }} director={{ post: 'Руководитель аппарата', name: 'П. П. Петров' }} />
							: <LayoutCardPassVip {...example} FilePhoto={previewPhoto} template={selected} previewSide={editorSide} editor={{ selected: selectedElement, onSelect: startElementDrag }} director={{ post: 'Руководитель аппарата', name: 'П. П. Петров' }} />}
					</div>
				</section>
			</div>
		</main>
	)
}

export default TemplateEditor
