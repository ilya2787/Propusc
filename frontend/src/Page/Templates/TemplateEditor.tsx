import { useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useBlocker } from 'react-router'
import axios from 'axios'
import { AppContext } from '../../App'
import { AUTH_EXPIRED_EVENT } from '../../auth/AuthContext'
import { deleteUploadedImage, uploadImage } from '../../api/images'
import { apiUrl } from '../../api/server'
import type { TDirector } from '../../components/type/Type'
import LayoutCardPass from '../../components/LayoutCard/LayoutCardPass'
import LayoutCardPassVip from '../../components/LayoutCard/LayoutCardPassVip'
import {
	DEFAULT_TEMPLATES,
	DEFAULT_CARD_SIZE,
	DEFAULT_FIXED_TEXTS,
	DEFAULT_FONT_SIZES,
	DEFAULT_ELEMENT_LAYOUTS,
	DEFAULT_PHOTO_SETTINGS,
	createTemplateArchive,
	fetchTemplates,
	loadTemplates,
	parseTemplateArchive,
	persistTemplates,
	saveTemplates,
	type PassTemplate,
	type TemplateFontSizes,
	type TemplateElementKey,
	type TemplateElementLayout,
	type TemplatePhotoSettings,
	type TemplateTextStyle,
	type TemplateCustomText,
	type TemplateImage,
} from '../../model/templates'
import { getA4PrintLayout, getCardDimensions } from '../../components/LayoutCard/cardDimensions'
import { formatDate } from '../../components/FormatDate/FormatDate'
import './TemplateEditor.scss'

const example = {
	Number_Tabs: '01042',
	NewDate: '2026-08-14',
	CurrentSingleOrganization: 'Организация «Пример»',
	CurrentSinglePost: 'Специалист',
	LastName: 'Смирнов',
	FirstName: 'Алексей',
	Patronymic: 'Андреевич',
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
const certificateElements = [...certificateFrontElements, ...certificateBackElements]
const defaultCertificateSide = (key: TemplateElementKey): 'front' | 'back' => certificateBackElements.includes(key) ? 'back' : 'front'
const fixedTextElements = new Set<TemplateElementKey>([
	'passTitle', 'passNumber', 'certificateTitle', 'certificateNumber', 'certificateIntro', 'certificateDate',
])

const customElementTitle = (item: TemplateCustomText, index: number) => {
	if (item.contentType === 'block') return `Цветной блок ${index + 1}`
	if (item.contentType === 'field') return `Поле: ${item.fieldLabel?.trim() || 'без названия'}`
	return `Текст: ${item.text.trim() || 'без содержимого'}`
}

const customElementType = (item: TemplateCustomText) => {
	if (item.contentType === 'block') return 'Фоновая фигура'
	if (item.contentType === 'field') return 'Заполняется при создании пропуска'
	return 'Постоянная надпись'
}

type CoordinateInputProps = {
	label: string
	value: number
	min: number
	max: number
	onChange: (value: number) => void
}

type DraftNumberInputProps = {
	value: number
	min: number
	max: number
	step?: number
	ariaLabel: string
	onCommit: (value: number) => void
}

const DraftNumberInput = ({ value, min, max, step = 1, ariaLabel, onCommit }: DraftNumberInputProps) => {
	const [draft, setDraft] = useState(String(value))
	const [focused, setFocused] = useState(false)

	const commit = () => {
		const parsed = Number(draft.replace(',', '.'))
		if (!Number.isFinite(parsed)) {
			setDraft(String(value))
			return
		}
		const nextValue = Math.min(max, Math.max(min, parsed))
		setDraft(String(nextValue))
		onCommit(nextValue)
	}
	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			commit()
			event.currentTarget.blur()
		}
		if (event.key === 'Escape') {
			setDraft(String(value))
			event.currentTarget.blur()
		}
	}

	return <input
		type='number'
		min={min}
		max={max}
		step={step}
		value={focused ? draft : String(value)}
		onChange={event => setDraft(event.target.value)}
		onFocus={() => { setDraft(String(value)); setFocused(true) }}
		onBlur={() => { commit(); setFocused(false) }}
		onKeyDown={handleKeyDown}
		aria-label={ariaLabel}
	/>
}

const CoordinateInput = ({ label, value, min, max, onChange }: CoordinateInputProps) => {
	const setClampedValue = (nextValue: number) => {
		if (Number.isFinite(nextValue)) onChange(Math.min(max, Math.max(min, nextValue)))
	}

	return <div className='TemplateEditor__coordinateField'>
		<span>{label}</span>
		<span className='TemplateEditor__numberInput TemplateEditor__coordinateNumber'>
			<button type='button' onClick={() => setClampedValue(value - 1)} disabled={value <= min} aria-label={`Уменьшить: ${label}`}>−</button>
			<span><DraftNumberInput value={value} min={min} max={max} ariaLabel={label} onCommit={setClampedValue} /></span>
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
	const [inspectorTab, setInspectorTab] = useState<'content' | 'appearance' | 'position'>('content')
	const [selectedElement, setSelectedElement] = useState<TemplateElementKey>()
	const [selectedCustomId, setSelectedCustomId] = useState<string>()
	const [selectedImageId, setSelectedImageId] = useState<string>()
	const [drag, setDrag] = useState<{ key?: TemplateElementKey; customId?: string; imageId?: string; pointerX: number; pointerY: number; x: number; y: number; width: number; height: number; resize: boolean }>()
	const [backgroundError, setBackgroundError] = useState('')
	const [previewPhoto, setPreviewPhoto] = useState('')
	const [serverError, setServerError] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const [showGrid, setShowGrid] = useState(true)
	const [snapToGrid, setSnapToGrid] = useState(false)
	const [gridStep, setGridStep] = useState(5)
	const [addElementOpen, setAddElementOpen] = useState(false)
	const importInputRef = useRef<HTMLInputElement>(null)
	const fileMenuRef = useRef<HTMLDetailsElement>(null)
	const undoHistory = useRef<PassTemplate[][]>([])
	const redoHistory = useRef<PassTemplate[][]>([])
	const skipHistory = useRef(false)
	const dragSnapshot = useRef<PassTemplate[] | undefined>(undefined)
	const previewCanvasRef = useRef<HTMLDivElement>(null)
	const [previewMaxWidth, setPreviewMaxWidth] = useState(514)
	const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false })
	const [director, setDirector] = useState({ post: '', name: '' })
	const navigationBlocker = useBlocker(!saved)
	const selected = useMemo(
		() => templates.find(template => template.id === selectedId) ?? templates[0],
		[templates, selectedId],
	)
	const cardSize = selected.design.cardSize ?? DEFAULT_CARD_SIZE
	const previewDimensions = getCardDimensions(selected, false, previewMaxWidth, 363)
	const printLayout = getA4PrintLayout(selected, selected.kind)
	useEffect(() => {
		axios.get<TDirector[]>(apiUrl('/Director')).then(response => {
			const current = response.data[0]
			if (current) setDirector({ post: current.Post, name: current.Name })
		}).catch(() => undefined)
	}, [])
	const recordHistory = useCallback((snapshot: PassTemplate[]) => {
		undoHistory.current.push(snapshot)
		if (undoHistory.current.length > 50) undoHistory.current.shift()
		redoHistory.current = []
		setHistoryState({ canUndo: true, canRedo: false })
	}, [])

	useEffect(() => {
		fetchTemplates().then(items => {
			undoHistory.current = []
			redoHistory.current = []
			setHistoryState({ canUndo: false, canRedo: false })
			setTemplates(items)
			setSelectedId(current => items.some(item => item.id === current) ? current : items[0].id)
		}).catch(() => setServerError('Не удалось загрузить шаблоны с сервера. Используется локальная копия.'))
	}, [])

	useEffect(() => {
		if (saved) return
		const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
		window.addEventListener('beforeunload', warnBeforeUnload)
		return () => window.removeEventListener('beforeunload', warnBeforeUnload)
	}, [saved])

	useEffect(() => {
		const preserveUnsavedTemplates = () => {
			if (!saved) saveTemplates(templates)
		}
		window.addEventListener(AUTH_EXPIRED_EVENT, preserveUnsavedTemplates)
		return () => window.removeEventListener(AUTH_EXPIRED_EVENT, preserveUnsavedTemplates)
	}, [saved, templates])

	useEffect(() => {
		const canvas = previewCanvasRef.current
		if (!canvas) return
		const updatePreviewWidth = () => setPreviewMaxWidth(Math.min(514, Math.max(240, canvas.clientWidth - 32)))
		updatePreviewWidth()
		const observer = new ResizeObserver(updatePreviewWidth)
		observer.observe(canvas)
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		const closeFileMenu = (event: MouseEvent) => {
			if (!fileMenuRef.current?.contains(event.target as Node)) fileMenuRef.current?.removeAttribute('open')
		}
		document.addEventListener('pointerdown', closeFileMenu)
		return () => document.removeEventListener('pointerdown', closeFileMenu)
	}, [])

	const update = useCallback((patch: Partial<PassTemplate>) => {
		setSaved(false)
		setTemplates(items => {
			if (!skipHistory.current) recordHistory(items)
			return items.map(item => (item.id === selected.id ? { ...item, ...patch } : item))
		})
	}, [recordHistory, selected.id])

	const updateDesign = useCallback((patch: Partial<PassTemplate['design']>) =>
		update({ design: { ...selected.design, ...patch } }), [selected.design, update])
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
		const limits = field === 'widthMm' ? { min: 30, max: 210 } : { min: 20, max: 297 }
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
			if (side === 'pass') updateDesign({ backgroundImage: uploaded.url, backgroundImageName: uploaded.name, backgroundMode: 'image' })
			if (side === 'front') updateDesign({ frontBackgroundImage: uploaded.url, frontBackgroundImageName: uploaded.name, frontBackgroundMode: 'image' })
			if (side === 'back') updateDesign({ backBackgroundImage: uploaded.url, backBackgroundImageName: uploaded.name, backBackgroundMode: 'image' })
			setBackgroundError('')
		} catch (error) {
			setBackgroundError(error instanceof Error ? error.message : 'Не удалось загрузить фон')
		}
	}
	const clearBackground = async (side: 'pass' | 'front' | 'back') => {
		const currentUrl = side === 'pass' ? selected.design.backgroundImage : side === 'front' ? selected.design.frontBackgroundImage : selected.design.backBackgroundImage
		try {
			await deleteUploadedImage(currentUrl ?? undefined)
		} catch (error) {
			setBackgroundError(error instanceof Error ? error.message : 'Не удалось удалить фон')
			return
		}
		if (side === 'pass') updateDesign({ backgroundImage: null, backgroundImageName: undefined })
		if (side === 'front') updateDesign({ frontBackgroundImage: null, frontBackgroundImageName: undefined })
		if (side === 'back') updateDesign({ backBackgroundImage: null, backBackgroundImageName: undefined })
		setBackgroundError('')
	}
	const backgroundSettings = selected.kind === 'pass' || editorSide === 'front'
		? selected.kind === 'pass'
			? { side: 'pass' as const, label: 'Фон пропуска', mode: selected.design.backgroundMode ?? 'image', color: selected.design.backgroundColor ?? '#ffffff' }
			: { side: 'front' as const, label: 'Фон лицевой стороны', mode: selected.design.frontBackgroundMode ?? 'image', color: selected.design.frontBackgroundColor ?? '#ffffff' }
		: { side: 'back' as const, label: 'Фон оборотной стороны', mode: selected.design.backBackgroundMode ?? 'image', color: selected.design.backBackgroundColor ?? '#ffffff' }
	const setBackgroundMode = (mode: 'image' | 'color') => {
		if (backgroundSettings.side === 'pass') updateDesign({ backgroundMode: mode })
		if (backgroundSettings.side === 'front') updateDesign({ frontBackgroundMode: mode })
		if (backgroundSettings.side === 'back') updateDesign({ backBackgroundMode: mode })
	}
	const setBackgroundColor = (color: string) => {
		if (backgroundSettings.side === 'pass') updateDesign({ backgroundColor: color, backgroundMode: 'color' })
		if (backgroundSettings.side === 'front') updateDesign({ frontBackgroundColor: color, frontBackgroundMode: 'color' })
		if (backgroundSettings.side === 'back') updateDesign({ backBackgroundColor: color, backBackgroundMode: 'color' })
	}
	const selectPreviewPhoto = (file?: File) => {
		if (!file || !file.type.startsWith('image/')) return
		const reader = new FileReader()
		reader.onload = () => setPreviewPhoto(String(reader.result))
		reader.readAsDataURL(file)
	}
	const availableElements = selected.kind === 'pass'
		? passElements
		: certificateElements.filter(key => (selected.design.elementSides?.[key] ?? defaultCertificateSide(key)) === editorSide)
	const selectedLayout = selectedElement
		? selected.design.elements?.[selectedElement] ?? DEFAULT_ELEMENT_LAYOUTS[selectedElement]
		: undefined
	const selectedFontFields = selectedElement ? elementFontFields[selectedElement] ?? [] : []
	const selectedTextStyle = selectedElement ? selected.design.textStyles?.[selectedElement] ?? {} : {}
	const hasIndividualCorners = selectedTextStyle.borderTopLeftRadius !== undefined
	const selectedFixedText = selectedElement && fixedTextElements.has(selectedElement)
		? selected.design.fixedTexts?.[selectedElement] ?? DEFAULT_FIXED_TEXTS[selectedElement] ?? ''
		: undefined
	const toggleIndividualCorners = () => {
		if (!selectedElement) return
		if (hasIndividualCorners) {
			updateTextStyle(selectedElement, {
				borderRadius: selectedTextStyle.borderTopLeftRadius ?? selectedTextStyle.borderRadius ?? 0,
				borderTopLeftRadius: undefined,
				borderTopRightRadius: undefined,
				borderBottomRightRadius: undefined,
				borderBottomLeftRadius: undefined,
			})
			return
		}
		const radius = selectedTextStyle.borderRadius ?? 0
		updateTextStyle(selectedElement, {
			borderTopLeftRadius: radius,
			borderTopRightRadius: radius,
			borderBottomRightRadius: radius,
			borderBottomLeftRadius: radius,
		})
	}
	const selectedPhotoKey = selectedElement === 'passPhoto' || selectedElement === 'certificatePhoto' ? selectedElement : undefined
	const selectedPhoto = selectedPhotoKey
		? { ...DEFAULT_PHOTO_SETTINGS, ...selected.design.photos?.[selectedPhotoKey] }
		: undefined
	const currentCustomSide: TemplateCustomText['side'] = selected.kind === 'pass' ? 'pass' : editorSide
	const currentCustomTexts = selected.design.customTexts?.filter(item => item.side === currentCustomSide) ?? []
	const selectedCustomText = currentCustomTexts.find(item => item.id === selectedCustomId)
	const currentImages = selected.design.images?.filter(item => item.side === currentCustomSide) ?? []
	const selectedImage = currentImages.find(item => item.id === selectedImageId)
	const hasInspectorSelection = Boolean(selectedElement || selectedCustomText || selectedImage)
	const hasInspectorContent = Boolean(
		selectedCustomText || selectedImage || selectedFixedText !== undefined || selectedPhotoKey
		|| selectedElement === 'passDate' || selectedElement === 'certificateDate',
	)
	const hasInspectorAppearance = Boolean(selectedCustomText || selectedImage || selectedFontFields.length)
	const activeInspectorTab = inspectorTab === 'content' && !hasInspectorContent
		? (hasInspectorAppearance ? 'appearance' : 'position')
		: inspectorTab === 'appearance' && !hasInspectorAppearance
			? (hasInspectorContent ? 'content' : 'position')
			: inspectorTab
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
	const moveFixedElementToOtherSide = (key: TemplateElementKey) => {
		if (selected.kind !== 'certificate') return
		const target = editorSide === 'front' ? 'back' : 'front'
		const layout = selected.design.elements?.[key] ?? DEFAULT_ELEMENT_LAYOUTS[key]
		updateDesign({
			elementSides: { ...selected.design.elementSides, [key]: target },
			elements: { ...selected.design.elements, [key]: { ...layout, x: Math.min(514 - layout.width, Math.max(0, layout.x)), y: Math.min(363 - (layout.height ?? 40), Math.max(0, layout.y)) } },
		})
		setEditorSide(target)
	}
	const updateElement = useCallback((key: TemplateElementKey, patch: Partial<TemplateElementLayout>) => {
		const current = selected.design.elements?.[key] ?? DEFAULT_ELEMENT_LAYOUTS[key]
		updateDesign({ elements: { ...selected.design.elements, [key]: { ...current, ...patch } } })
	}, [selected.design.elements, updateDesign])
	const updatePhoto = (key: 'passPhoto' | 'certificatePhoto', patch: Partial<TemplatePhotoSettings>) => {
		const current = { ...DEFAULT_PHOTO_SETTINGS, ...selected.design.photos?.[key] }
		updateDesign({ photos: { ...selected.design.photos, [key]: { ...current, ...patch } } })
	}
	const updateCustomText = useCallback((id: string, patch: Partial<TemplateCustomText>) =>
		updateDesign({ customTexts: (selected.design.customTexts ?? []).map(item => item.id === id ? { ...item, ...patch } : item) }), [selected.design.customTexts, updateDesign])
	const updateTemplateImage = useCallback((id: string, patch: Partial<TemplateImage>) =>
		updateDesign({ images: (selected.design.images ?? []).map(item => item.id === id ? { ...item, ...patch } : item) }), [selected.design.images, updateDesign])
	const wantsResize = (event: PointerEvent<HTMLElement>, alreadySelected: boolean) => {
		if (!alreadySelected) return false
		const bounds = event.currentTarget.getBoundingClientRect()
		return event.clientX >= bounds.right - 18 && event.clientY >= bounds.bottom - 18
	}
	const startElementDrag = (key: TemplateElementKey, event: PointerEvent<HTMLElement>) => {
		event.preventDefault()
		event.currentTarget.setPointerCapture(event.pointerId)
		dragSnapshot.current = templates
		skipHistory.current = true
		const current = selected.design.elements?.[key] ?? DEFAULT_ELEMENT_LAYOUTS[key]
		setSelectedElement(key)
		setSelectedCustomId(undefined)
		setSelectedImageId(undefined)
		setDrag({ key, pointerX: event.clientX, pointerY: event.clientY, x: current.x, y: current.y, width: current.width, height: key === 'passPhoto' || key === 'certificatePhoto' ? ({ ...DEFAULT_PHOTO_SETTINGS, ...selected.design.photos?.[key] }).height : current.height ?? 40, resize: wantsResize(event, selectedElement === key) })
	}
	const startCustomTextDrag = (id: string, event: PointerEvent<HTMLElement>) => {
		const current = selected.design.customTexts?.find(item => item.id === id)
		if (!current) return
		event.preventDefault()
		event.currentTarget.setPointerCapture(event.pointerId)
		dragSnapshot.current = templates
		skipHistory.current = true
		setSelectedElement(undefined)
		setSelectedCustomId(id)
		setSelectedImageId(undefined)
		setDrag({ customId: id, pointerX: event.clientX, pointerY: event.clientY, x: current.layout.x, y: current.layout.y, width: current.layout.width, height: current.layout.height ?? 40, resize: wantsResize(event, selectedCustomId === id) })
	}
	const startImageDrag = (id: string, event: PointerEvent<HTMLElement>) => {
		const current = selected.design.images?.find(item => item.id === id)
		if (!current) return
		event.preventDefault()
		event.currentTarget.setPointerCapture(event.pointerId)
		dragSnapshot.current = templates
		skipHistory.current = true
		setSelectedElement(undefined)
		setSelectedCustomId(undefined)
		setSelectedImageId(id)
		setDrag({ imageId: id, pointerX: event.clientX, pointerY: event.clientY, x: current.layout.x, y: current.layout.y, width: current.layout.width, height: current.layout.height ?? current.layout.width, resize: wantsResize(event, selectedImageId === id) })
	}
	const moveElement = (event: PointerEvent<HTMLDivElement>) => {
		if (!drag) return
		if (dragSnapshot.current) {
			recordHistory(dragSnapshot.current)
			dragSnapshot.current = undefined
		}
		const snap = (value: number) => snapToGrid ? Math.round(value / gridStep) * gridStep : Math.round(value)
		const dx = (event.clientX - drag.pointerX) / previewDimensions.scaleX
		const dy = (event.clientY - drag.pointerY) / previewDimensions.scaleY
		if (drag.resize) {
			const size = { width: snap(Math.min(514 - drag.x, Math.max(20, drag.width + dx))), height: snap(Math.min(363 - drag.y, Math.max(20, drag.height + dy))) }
			if (drag.key) {
				updateElement(drag.key, { width: size.width, ...(drag.key === 'passPhoto' || drag.key === 'certificatePhoto' ? {} : { height: size.height }) })
				if (drag.key === 'passPhoto' || drag.key === 'certificatePhoto') updatePhoto(drag.key, { height: size.height })
			}
			if (drag.customId) {
				const current = selected.design.customTexts?.find(item => item.id === drag.customId)
				if (current) updateCustomText(drag.customId, { layout: { ...current.layout, ...size } })
			}
			if (drag.imageId) {
				const current = selected.design.images?.find(item => item.id === drag.imageId)
				if (current) updateTemplateImage(drag.imageId, { layout: { ...current.layout, ...size } })
			}
			return
		}
		const position = {
			x: snap(Math.min(514, Math.max(0, drag.x + dx))),
			y: snap(Math.min(363, Math.max(0, drag.y + dy))),
		}
		if (drag.key) updateElement(drag.key, position)
		if (drag.customId) {
			const current = selected.design.customTexts?.find(item => item.id === drag.customId)
			if (current) updateCustomText(drag.customId, { layout: { ...current.layout, ...position } })
		}
		if (drag.imageId) {
			const current = selected.design.images?.find(item => item.id === drag.imageId)
			if (current) updateTemplateImage(drag.imageId, { layout: { ...current.layout, ...position } })
		}
	}
	const finishElementDrag = () => {
		dragSnapshot.current = undefined
		skipHistory.current = false
		setDrag(undefined)
	}
	const createCustomText = () => {
		const item: TemplateCustomText = { id: `text-${Date.now()}`, text: 'Пример значения', contentType: 'static', dataType: 'text', side: currentCustomSide, layout: { x: 120, y: 120, width: 220, align: 'center', zIndex: 1 }, fontSize: 20, lineHeight: 1.2, style: { color: '#111111' } }
		updateDesign({ customTexts: [...(selected.design.customTexts ?? []), item] })
		setSelectedElement(undefined)
		setSelectedCustomId(item.id)
		setAddElementOpen(false)
	}
	const createColorBlock = () => {
		const item: TemplateCustomText = { id: `block-${Date.now()}`, text: '', contentType: 'block', side: currentCustomSide, layout: { x: 140, y: 120, width: 180, height: 90, align: 'center', zIndex: 1 }, fontSize: 16, lineHeight: 1, style: { backgroundColor: selected.design.accentColor, backgroundOpacity: 1, borderRadius: 4 } }
		updateDesign({ customTexts: [...(selected.design.customTexts ?? []), item] })
		setSelectedElement(undefined)
		setSelectedImageId(undefined)
		setSelectedCustomId(item.id)
		setAddElementOpen(false)
	}
	const duplicateCustomText = (source: TemplateCustomText) => {
		const existingIds = new Set((selected.design.customTexts ?? []).map(item => item.id))
		let copyNumber = 1
		let copyId = `${source.id}-copy-${copyNumber}`
		while (existingIds.has(copyId)) copyId = `${source.id}-copy-${++copyNumber}`
		const item: TemplateCustomText = {
			...source,
			id: copyId,
			text: `${source.text} — копия`,
			layout: { ...source.layout, x: Math.min(514 - source.layout.width, source.layout.x + 16), y: Math.min(363, source.layout.y + 16), zIndex: Math.min(100, (source.layout.zIndex ?? 0) + 1) },
			style: source.style ? { ...source.style } : undefined,
		}
		updateDesign({ customTexts: [...(selected.design.customTexts ?? []), item] })
		setSelectedElement(undefined)
		setSelectedCustomId(item.id)
	}
	const removeCustomText = (id: string) => {
		updateDesign({ customTexts: (selected.design.customTexts ?? []).filter(item => item.id !== id) })
		setSelectedCustomId(undefined)
	}
	const oppositeSide = currentCustomSide === 'front' ? 'back' : 'front'
	const moveCustomTextToOtherSide = (item: TemplateCustomText) => {
		if (selected.kind !== 'certificate') return
		updateCustomText(item.id, { side: oppositeSide, layout: { ...item.layout, x: Math.min(514 - item.layout.width, Math.max(0, item.layout.x)), y: Math.min(363 - (item.layout.height ?? 40), Math.max(0, item.layout.y)) } })
		setSelectedCustomId(undefined)
		setEditorSide(oppositeSide)
	}
	const moveImageToOtherSide = (item: TemplateImage) => {
		if (selected.kind !== 'certificate') return
		updateTemplateImage(item.id, { side: oppositeSide, layout: { ...item.layout, x: Math.min(514 - item.layout.width, Math.max(0, item.layout.x)), y: Math.min(363 - (item.layout.height ?? item.layout.width), Math.max(0, item.layout.y)) } })
		setSelectedImageId(undefined)
		setEditorSide(oppositeSide)
	}
	const addTemplateImage = async (file?: File) => {
		if (!file) return
		try {
			const uploaded = await uploadImage(file, 'background')
			const item: TemplateImage = { id: `image-${Date.now()}`, name: uploaded.name, source: uploaded.url, side: currentCustomSide, layout: { x: 140, y: 110, width: 160, height: 120, align: 'center', zIndex: 1 }, opacity: 1, rotation: 0, borderRadius: 0 }
			updateDesign({ images: [...(selected.design.images ?? []), item] })
			setSelectedElement(undefined)
			setSelectedCustomId(undefined)
			setSelectedImageId(item.id)
			setBackgroundError('')
			setAddElementOpen(false)
		} catch (error) {
			setBackgroundError(error instanceof Error ? error.message : 'Не удалось добавить изображение')
		}
	}
	const removeTemplateImage = async (item: TemplateImage) => {
		try { await deleteUploadedImage(item.source) } catch { /* Keep editor usable if the file was already removed. */ }
		updateDesign({ images: (selected.design.images ?? []).filter(image => image.id !== item.id) })
		setSelectedImageId(undefined)
	}
	const replaceTemplateImage = async (item: TemplateImage, file?: File) => {
		if (!file) return
		try {
			const uploaded = await uploadImage(file, 'background')
			updateTemplateImage(item.id, { source: uploaded.url, name: uploaded.name })
			try { await deleteUploadedImage(item.source) } catch { /* The previous file may already be absent. */ }
			setBackgroundError('')
		} catch (error) {
			setBackgroundError(error instanceof Error ? error.message : 'Не удалось заменить изображение')
		}
	}

	useEffect(() => {
		const handleEditorKeyDown = (event: globalThis.KeyboardEvent) => {
			const target = event.target as HTMLElement | null
			if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) return
			if (!selectedElement && !selectedCustomText) return
			const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
			if (!isArrow) return

			if ((event.ctrlKey || event.metaKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
				event.preventDefault()
				const direction = event.key === 'ArrowUp' ? 1 : -1
				if (selectedElement && selectedLayout) updateElement(selectedElement, { zIndex: Math.min(100, Math.max(0, (selectedLayout.zIndex ?? 0) + direction)) })
				if (selectedCustomText) updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, zIndex: Math.min(100, Math.max(0, (selectedCustomText.layout.zIndex ?? 0) + direction)) } })
				return
			}

			event.preventDefault()
			const step = event.shiftKey ? 10 : 1
			const move = (layout: TemplateElementLayout) => {
				const width = layout.width ?? 0
				const height = layout.height ?? 0
				const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
				const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
				return {
					x: Math.min(Math.max(0, 514 - width), Math.max(0, layout.x + dx)),
					y: Math.min(Math.max(0, 363 - height), Math.max(0, layout.y + dy)),
				}
			}
			if (selectedElement && selectedLayout) updateElement(selectedElement, move(selectedLayout))
			if (selectedCustomText) updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, ...move(selectedCustomText.layout) } })
		}
		window.addEventListener('keydown', handleEditorKeyDown)
		return () => window.removeEventListener('keydown', handleEditorKeyDown)
	}, [selectedElement, selectedLayout, selectedCustomText, updateCustomText, updateElement])

	const createTemplate = () => {
		const copy: PassTemplate = {
			...selected,
			id: `template-${Date.now()}`,
			name: `${selected.name} — копия`,
			isBuiltIn: false,
			design: { ...selected.design },
		}
		const next = [...templates, copy]
		recordHistory(templates)
		setTemplates(next)
		setSelectedId(copy.id)
		setSaved(false)
	}

	const removeTemplate = () => {
		if (templates.length <= 1) return
		const next = templates.filter(item => item.id !== selected.id)
		recordHistory(templates)
		setTemplates(next)
		setSelectedId(next[0].id)
		setSaved(false)
	}

	const resetBuiltIns = () => {
		const custom = templates.filter(item => !item.isBuiltIn)
		const next = [...DEFAULT_TEMPLATES, ...custom]
		recordHistory(templates)
		setTemplates(next)
		setSelectedId(current => next.some(item => item.id === current) ? current : DEFAULT_TEMPLATES[0].id)
		setSaved(false)
	}
	const saveAllTemplates = async () => {
		setIsSaving(true)
		setServerError('')
		try {
			await persistTemplates(templates)
			setSaved(true)
			return true
		} catch (error) {
			saveTemplates(templates)
			setServerError(error instanceof Error ? error.message : 'Не удалось сохранить шаблоны')
			return false
		} finally {
			setIsSaving(false)
		}
	}
	const saveAndLeave = async () => {
		if (await saveAllTemplates()) navigationBlocker.proceed?.()
	}
	const exportTemplates = () => {
		const blob = new Blob([JSON.stringify(createTemplateArchive(templates), null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = `propusk-templates-${new Date().toISOString().slice(0, 10)}.json`
		anchor.click()
		URL.revokeObjectURL(url)
		fileMenuRef.current?.removeAttribute('open')
	}
	const importTemplates = async (file?: File) => {
		if (!file) return
		setServerError('')
		try {
			const imported = parseTemplateArchive(await file.text())
			const existingIds = new Set(templates.map(item => item.id))
			const stamp = Date.now()
			const copies = imported.map((item, index) => {
				let id = item.id
				if (existingIds.has(id)) id = `${id}-imported-${stamp}-${index + 1}`
				existingIds.add(id)
				return { ...item, id, name: existingIds.has(item.id) && id !== item.id ? `${item.name} — импорт` : item.name, isBuiltIn: false }
			})
			recordHistory(templates)
			setTemplates(current => [...current, ...copies])
			setSelectedId(copies[0].id)
			setSaved(false)
			setServerError(`Импортировано шаблонов: ${copies.length}. Проверьте их и нажмите «Сохранить».`)
		} catch (error) {
			setServerError(error instanceof Error ? error.message : 'Не удалось импортировать шаблоны')
		} finally {
			if (importInputRef.current) importInputRef.current.value = ''
		}
	}
	const undo = useCallback(() => {
		const previous = undoHistory.current.pop()
		if (!previous) return
		redoHistory.current.push(templates)
		setTemplates(previous)
		setSelectedId(current => previous.some(item => item.id === current) ? current : previous[0].id)
		setSaved(false)
		setHistoryState({ canUndo: undoHistory.current.length > 0, canRedo: true })
	}, [templates])
	const redo = useCallback(() => {
		const next = redoHistory.current.pop()
		if (!next) return
		undoHistory.current.push(templates)
		setTemplates(next)
		setSelectedId(current => next.some(item => item.id === current) ? current : next[0].id)
		setSaved(false)
		setHistoryState({ canUndo: true, canRedo: redoHistory.current.length > 0 })
	}, [templates])

	useEffect(() => {
		const handleHistoryShortcut = (event: globalThis.KeyboardEvent) => {
			const target = event.target as HTMLElement | null
			if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
			if (!(event.ctrlKey || event.metaKey)) return
			const key = event.key.toLowerCase()
			if (key !== 'z' && key !== 'y') return
			event.preventDefault()
			if (key === 'y' || event.shiftKey) redo()
			else undo()
		}
		window.addEventListener('keydown', handleHistoryShortcut)
		return () => window.removeEventListener('keydown', handleHistoryShortcut)
	}, [redo, undo])

	return (
		<main className='TemplateEditor' data-theme={theme.toLowerCase()}>
			{navigationBlocker.state === 'blocked' && <div className='TemplateEditor__leaveOverlay' role='presentation'>
				<div className='TemplateEditor__leaveDialog' role='dialog' aria-modal='true' aria-labelledby='leave-dialog-title'>
					<h2 id='leave-dialog-title'>Сохранить изменения?</h2>
					<p>В шаблонах есть несохранённые изменения. Сохранить их перед переходом?</p>
					<div>
						<button type='button' className='secondary' onClick={() => navigationBlocker.reset?.()} disabled={isSaving}>Отмена</button>
						<button type='button' className='danger' onClick={() => navigationBlocker.proceed?.()} disabled={isSaving}>Не сохранять</button>
						<button type='button' className='primary' onClick={saveAndLeave} disabled={isSaving}>{isSaving ? 'Сохранение…' : 'Сохранить'}</button>
					</div>
				</div>
			</div>}
			<header className='TemplateEditor__header'>
				<div>
					<p className='TemplateEditor__eyebrow'>Конструктор</p>
					<h1>Шаблоны пропусков</h1>
					<p>Настройте оформление, создайте вариант и сразу проверьте результат.</p>
				</div>
				<div className='TemplateEditor__actions'>
					<input ref={importInputRef} hidden type='file' accept='application/json,.json' onChange={event => void importTemplates(event.target.files?.[0])} />
					<details ref={fileMenuRef} className='TemplateEditor__fileMenu'>
						<summary aria-label='Открыть меню импорта и экспорта'>Файл</summary>
						<div>
							<button type='button' onClick={() => { fileMenuRef.current?.removeAttribute('open'); importInputRef.current?.click() }}><span aria-hidden='true'>↑</span><span><strong>Импортировать</strong><small>Добавить шаблоны из JSON</small></span></button>
							<button type='button' onClick={exportTemplates}><span aria-hidden='true'>↓</span><span><strong>Экспортировать</strong><small>Сохранить резервную копию</small></span></button>
						</div>
					</details>
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
			{serverError && <div className='TemplateEditor__serverError' role='alert'>{serverError}</div>}

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
				<section className={`TemplateEditor__settings panel${settingsTab === 'layout' ? ' TemplateEditor__settings--layout' : ''}`}>
					<div className='TemplateEditor__sectionTitle'>
						<span>2</span>
						<div><h2>Настройте шаблон</h2><p>{selected.name}</p></div>
					</div>
					<nav className='TemplateEditor__settingsTabs' aria-label='Разделы настроек' role='tablist'>
						<button type='button' role='tab' aria-selected={settingsTab === 'main'} className={settingsTab === 'main' ? 'active' : ''} onClick={() => setSettingsTab('main')}>Основное</button>
						<button type='button' role='tab' aria-selected={settingsTab === 'appearance'} className={settingsTab === 'appearance' ? 'active' : ''} onClick={() => setSettingsTab('appearance')}>Оформление</button>
						<button type='button' role='tab' aria-selected={settingsTab === 'layout'} className={settingsTab === 'layout' ? 'active' : ''} onClick={() => setSettingsTab('layout')}>Элементы</button>
					</nav>
					{selected.kind === 'certificate' && <div className='TemplateEditor__tabs'>
						<button className={editorSide === 'front' ? 'active' : ''} onClick={() => setEditorSide('front')}>Лицевая</button>
						<button className={editorSide === 'back' ? 'active' : ''} onClick={() => setEditorSide('back')}>Оборотная</button>
					</div>}
					{settingsTab === 'main' && <div className='TemplateEditor__tabContent'>
						<h3>Основные данные</h3>
						<label>Название<input value={selected.name} onChange={e => update({ name: e.target.value })} /></label>
						<label>Описание<textarea value={selected.description} onChange={e => update({ description: e.target.value })} /></label>
						<label>Тип<select value={selected.kind} onChange={e => update({ kind: e.target.value as PassTemplate['kind'] })}><option value='pass'>Односторонний пропуск</option><option value='certificate'>Двухсторонний пропуск</option></select></label>
						<label>Значок в списке<select value={selected.design.icon ?? (selected.kind === 'certificate' ? 'double' : 'single')} onChange={e => updateDesign({ icon: e.target.value as NonNullable<PassTemplate['design']['icon']> })}><option value='single'>Односторонний</option><option value='double'>Двухсторонний</option><option value='vehicle'>Автопропуск</option></select></label>
						{selected.kind === 'certificate' && <label>Компоновка печати<select value={selected.design.printLayout ?? 'horizontal'} onChange={e => updateDesign({ printLayout: e.target.value as NonNullable<PassTemplate['design']['printLayout']> })}><option value='horizontal'>Стороны рядом</option><option value='vertical'>Лицевая над обратной</option><option value='duplex'>Двухсторонняя печать</option></select></label>}
						<div className='TemplateEditor__sizeSettings'>
							<h3>Физический размер</h3>
							<div className='TemplateEditor__row'>
								<div className='TemplateEditor__sizeField'><span>Ширина</span><div className='TemplateEditor__numberInput TemplateEditor__sizeNumber'><button type='button' onClick={() => updateCardSize('widthMm', cardSize.widthMm - 1)} disabled={cardSize.widthMm <= 30} aria-label='Уменьшить ширину'>−</button><span><DraftNumberInput value={cardSize.widthMm} min={30} max={210} step={0.1} onCommit={value => updateCardSize('widthMm', value)} ariaLabel='Ширина пропуска в миллиметрах' /><small>мм</small></span><button type='button' onClick={() => updateCardSize('widthMm', cardSize.widthMm + 1)} disabled={cardSize.widthMm >= 210} aria-label='Увеличить ширину'>+</button></div></div>
								<div className='TemplateEditor__sizeField'><span>Высота</span><div className='TemplateEditor__numberInput TemplateEditor__sizeNumber'><button type='button' onClick={() => updateCardSize('heightMm', cardSize.heightMm - 1)} disabled={cardSize.heightMm <= 20} aria-label='Уменьшить высоту'>−</button><span><DraftNumberInput value={cardSize.heightMm} min={20} max={250} step={0.1} onCommit={value => updateCardSize('heightMm', value)} ariaLabel='Высота пропуска в миллиметрах' /><small>мм</small></span><button type='button' onClick={() => updateCardSize('heightMm', cardSize.heightMm + 1)} disabled={cardSize.heightMm >= 250} aria-label='Увеличить высоту'>+</button></div></div>
							</div>
							<button type='button' className='TemplateEditor__sizePreset TemplateEditor__resetButton' onClick={() => updateDesign({ cardSize: { ...DEFAULT_CARD_SIZE } })}><span aria-hidden='true'>↺</span> Стандартный размер 70 × 48 мм</button>
							<p className='TemplateEditor__hint'>В предпросмотре размер автоматически масштабируется. Значения в миллиметрах применяются без масштабирования только при печати.</p>
							{!printLayout.fits && <p className='TemplateEditor__error'>Размер {printLayout.itemWidthMm} × {printLayout.itemHeightMm} мм с учётом двух сторон удостоверения не помещается в печатную область A4.</p>}
						</div>
						<div className='TemplateEditor__danger'><button onClick={resetBuiltIns}>Сбросить стандартные</button><button onClick={removeTemplate} disabled={templates.length <= 1} title={templates.length <= 1 ? 'Нужен хотя бы один шаблон' : undefined}>Удалить шаблон</button></div>
					</div>}
					{settingsTab === 'appearance' && <div className='TemplateEditor__tabContent'>
					<h3>{selected.kind === 'certificate' ? (editorSide === 'front' ? 'Лицевая сторона' : 'Оборотная сторона') : 'Оформление пропуска'}</h3>
					<div className='TemplateEditor__backgroundUpload'>
						<span>{backgroundSettings.label}</span>
						<div className='TemplateEditor__backgroundModes' role='group' aria-label='Тип фона'><button type='button' className={backgroundSettings.mode === 'image' ? 'active' : ''} onClick={() => setBackgroundMode('image')}>Изображение</button><button type='button' className={backgroundSettings.mode === 'color' ? 'active' : ''} onClick={() => setBackgroundMode('color')}>Цвет</button></div>
						{backgroundSettings.mode === 'image' ? <><label className='TemplateEditor__fileButton'><input type='file' accept='image/png,image/jpeg,image/webp' onChange={e => uploadBackground(e.target.files?.[0], backgroundSettings.side)} />{(backgroundSettings.side === 'pass' ? selected.design.backgroundImage : backgroundSettings.side === 'front' ? selected.design.frontBackgroundImage : selected.design.backBackgroundImage) ? 'Заменить' : 'Выбрать файл'}</label><small>{(backgroundSettings.side === 'pass' ? selected.design.backgroundImageName : backgroundSettings.side === 'front' ? selected.design.frontBackgroundImageName : selected.design.backBackgroundImageName) || 'PNG, JPG или WebP, до 5 МБ'}</small>{(backgroundSettings.side === 'pass' ? selected.design.backgroundImage : backgroundSettings.side === 'front' ? selected.design.frontBackgroundImage : selected.design.backBackgroundImage) && <button type='button' onClick={() => clearBackground(backgroundSettings.side)}>Убрать изображение</button>}</> : <label className='TemplateEditor__backgroundColor'><input type='color' value={backgroundSettings.color} onChange={e => setBackgroundColor(e.target.value)} /><span>{backgroundSettings.color.toUpperCase()}</span></label>}
					</div>
					<label>Шрифт<select value={selected.design.fontFamily} onChange={e => updateDesign({ fontFamily: e.target.value })}><option value='Times New Roman'>Times New Roman</option><option value='Arial'>Arial</option><option value='Georgia'>Georgia</option></select></label>
					<label>Скругление: {selected.design.borderRadius}px<input type='range' min='0' max='24' value={selected.design.borderRadius} onChange={e => updateDesign({ borderRadius: Number(e.target.value) })} /></label>
					<div className='TemplateEditor__outlineSettings'>
						<label><input type='checkbox' checked={Boolean(selected.design.borderColor)} onChange={e => updateDesign({ borderColor: e.target.checked ? '#111111' : undefined })} /><span>Обводка всего пропуска</span></label>
						<div className='TemplateEditor__colorField'><span>Цвет обводки</span><input type='color' value={selected.design.borderColor ?? '#111111'} disabled={!selected.design.borderColor} onChange={e => updateDesign({ borderColor: e.target.value })} aria-label='Выбрать цвет обводки пропуска' /></div>
					</div>
					{backgroundError && <p className='TemplateEditor__error' role='alert'>{backgroundError}</p>}
					</div>}
					{settingsTab === 'layout' && <div className='TemplateEditor__tabContent'>
					<div className='TemplateEditor__elementSettings'>
						<h3>Расположение элементов</h3>
						<div className='TemplateEditor__fieldVisibility'><h4>Поля на пропуске</h4>{availableElements.map(key => <label key={key}><span>{elementLabels[key]}</span><input type='checkbox' checked={isElementVisible(key)} onChange={() => toggleElementVisibility(key)} /><i aria-hidden='true'></i></label>)}</div>
						<section className='TemplateEditor__customTextLibrary' aria-labelledby='custom-text-title'>
							<div className='TemplateEditor__customTextLibraryHeader'>
								<div><h4 id='custom-text-title'>Дополнительные элементы</h4><span>{currentCustomTexts.length + currentImages.length ? `${currentCustomTexts.length + currentImages.length} на этой стороне` : 'Текст, цветной блок или изображение'}</span></div>
								<button type='button' className='TemplateEditor__addTextButton' aria-expanded={addElementOpen} onClick={() => setAddElementOpen(value => !value)}><span aria-hidden='true'>＋</span> Добавить элемент</button>
							</div>
							{addElementOpen && <div className='TemplateEditor__elementPicker'>
								<button type='button' onClick={createCustomText}><strong>Текст</strong><span>Подпись или заполняемое поле</span></button>
								<button type='button' onClick={createColorBlock}><strong>Цветной блок</strong><span>Пустая фигура для фона и акцентов</span></button>
								<label><input type='file' accept='image/png,image/jpeg,image/webp' onChange={event => { void addTemplateImage(event.target.files?.[0]); event.currentTarget.value = '' }} /><strong>Изображение</strong><span>PNG, JPG или WebP</span></label>
							</div>}
							{currentCustomTexts.length > 0
								? <div className='TemplateEditor__customTextList'>{currentCustomTexts.map((item, index) => {
									const title = customElementTitle(item, index)
									return <div key={item.id} className={`TemplateEditor__customTextListItem ${selectedCustomId === item.id ? 'active' : ''}`}>
										<button type='button' className='TemplateEditor__customTextSelect' onClick={event => { setSelectedElement(undefined); setSelectedCustomId(item.id); event.currentTarget.blur() }}><span>{index + 1}</span><div><strong>{title}</strong><small>{customElementType(item)} · {item.layout.width} × {item.layout.height ?? 40}px</small></div></button>
										<div className='TemplateEditor__customTextQuickActions'><button type='button' onClick={() => duplicateCustomText(item)} title='Дублировать элемент' aria-label={`Дублировать «${title}»`}>⧉</button><button type='button' className='danger' onClick={() => removeCustomText(item.id)} title='Удалить элемент' aria-label={`Удалить «${title}»`}>×</button></div>
									</div>
								})}</div>
								: <p className='TemplateEditor__customTextEmpty'>Дополнительных текстовых блоков пока нет.</p>}
							{currentImages.length > 0 && <><h5 className='TemplateEditor__elementListTitle'>Изображения</h5>
							{currentImages.length ? <div className='TemplateEditor__customTextList'>{currentImages.map((item, index) => <div key={item.id} className={`TemplateEditor__customTextListItem ${selectedImageId === item.id ? 'active' : ''}`}><button type='button' className='TemplateEditor__customTextSelect' onClick={() => { setSelectedElement(undefined); setSelectedCustomId(undefined); setSelectedImageId(item.id) }}><span>{index + 1}</span><div><strong>Изображение: {item.name}</strong><small>Графический элемент · {item.layout.width} × {item.layout.height ?? item.layout.width}px</small></div></button><div className='TemplateEditor__customTextQuickActions'><button type='button' className='danger' onClick={() => void removeTemplateImage(item)} aria-label={`Удалить изображение «${item.name}»`}>×</button></div></div>)}</div> : <p className='TemplateEditor__customTextEmpty'>Изображений на этой стороне пока нет.</p>}
							</>}
						</section>
						<label>Выбранный блок<select value={selectedElement && availableElements.includes(selectedElement) ? selectedElement : ''} onChange={e => { setSelectedElement(e.target.value as TemplateElementKey || undefined); setSelectedCustomId(undefined); e.currentTarget.blur() }}><option value=''>Выберите на макете…</option>{availableElements.map(key => <option key={key} value={key}>{elementLabels[key]}{isElementVisible(key) ? '' : ' (скрыто)'}</option>)}</select></label>
						{hasInspectorSelection && <nav className='TemplateEditor__inspectorTabs' aria-label='Параметры выбранного элемента' role='tablist'>
							<button type='button' role='tab' aria-selected={activeInspectorTab === 'content'} className={activeInspectorTab === 'content' ? 'active' : ''} disabled={!hasInspectorContent} onClick={() => setInspectorTab('content')}>Содержимое</button>
							<button type='button' role='tab' aria-selected={activeInspectorTab === 'appearance'} className={activeInspectorTab === 'appearance' ? 'active' : ''} disabled={!hasInspectorAppearance} onClick={() => setInspectorTab('appearance')}>Оформление</button>
							<button type='button' role='tab' aria-selected={activeInspectorTab === 'position'} className={activeInspectorTab === 'position' ? 'active' : ''} onClick={() => setInspectorTab('position')}>Положение</button>
						</nav>}
						{(selectedElement || selectedCustomText) && <div className='TemplateEditor__keyboardHint'><strong>Точное перемещение</strong><span><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> на 1 px</span><span><kbd>Shift</kbd> + стрелки на 10 px</span><span><kbd>Ctrl/⌘</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd> выше или ниже</span></div>}
						{selectedLayout && availableElements.includes(selectedElement!) && <div className='TemplateEditor__editorInspector'>
							{selected.kind === 'certificate' && <button type='button' className='TemplateEditor__moveSideButton' onClick={() => moveFixedElementToOtherSide(selectedElement!)}>Перенести на {editorSide === 'front' ? 'обратную' : 'лицевую'} сторону</button>}
							{(selectedElement === 'passDate' || selectedElement === 'certificateDate') && <details className='TemplateEditor__settingsGroup TemplateEditor__inspectorPanel' open hidden={activeInspectorTab !== 'content'}>
								<summary>Содержимое даты</summary><div className='TemplateEditor__settingsGroupBody'>
									<label>Формат отображения<select value={selected.design.dateFormat ?? 'numeric'} onChange={e => updateDesign({ dateFormat: e.target.value as NonNullable<PassTemplate['design']['dateFormat']> })}><option value='numeric'>21.08.2026</option><option value='long'>21 августа 2026</option><option value='nominative'>«21» августа 2026 года</option></select></label>
									<p className='TemplateEditor__hint'>Формат применяется к дате в предпросмотре, на готовом пропуске и при печати.</p>
								</div>
							</details>}
							{selectedFixedText !== undefined && <details className='TemplateEditor__settingsGroup TemplateEditor__inspectorPanel' open hidden={activeInspectorTab !== 'content'}>
								<summary>Содержимое</summary><div className='TemplateEditor__settingsGroupBody TemplateEditor__fixedTextSettings'>
								<label>Содержимое<textarea value={selectedFixedText} rows={3} onChange={e => updateFixedText(selectedElement!, e.target.value)} /></label>
								<button type='button' className='TemplateEditor__resetButton' onClick={() => updateFixedText(selectedElement!, DEFAULT_FIXED_TEXTS[selectedElement!] ?? '')}><span aria-hidden='true'>↺</span> Вернуть исходный текст</button>
								</div></details>}
							{selectedPhotoKey && selectedPhoto && <details className='TemplateEditor__settingsGroup TemplateEditor__inspectorPanel' open hidden={activeInspectorTab !== 'content'}>
								<summary>Фотография</summary><div className='TemplateEditor__settingsGroupBody TemplateEditor__photoSettings'>
								<label>Содержимое блока<select value={selectedPhoto.mode} onChange={e => updatePhoto(selectedPhotoKey, { mode: e.target.value as TemplatePhotoSettings['mode'] })}><option value='photo'>Фотография</option><option value='qr'>QR-код с ключом</option></select></label>
								{selectedPhoto.mode === 'photo' ? <>
									<label className='TemplateEditor__fileButton'><input type='file' accept='image/png,image/jpeg,image/webp' onChange={e => selectPreviewPhoto(e.target.files?.[0])} />{previewPhoto ? 'Заменить тестовое фото' : 'Выбрать тестовое фото'}</label>
									<label>Заполнение<select value={selectedPhoto.fit} onChange={e => updatePhoto(selectedPhotoKey, { fit: e.target.value as TemplatePhotoSettings['fit'] })}><option value='cover'>Заполнить рамку</option><option value='contain'>Показать полностью</option></select></label>
									<label>Масштаб: {selectedPhoto.scale}%<input type='range' min='50' max='200' value={selectedPhoto.scale} onChange={e => updatePhoto(selectedPhotoKey, { scale: Number(e.target.value) })} /></label>
									<div className='TemplateEditor__row'><label>Позиция X: {selectedPhoto.positionX}%<input type='range' min='0' max='100' value={selectedPhoto.positionX} onChange={e => updatePhoto(selectedPhotoKey, { positionX: Number(e.target.value) })} /></label><label>Позиция Y: {selectedPhoto.positionY}%<input type='range' min='0' max='100' value={selectedPhoto.positionY} onChange={e => updatePhoto(selectedPhotoKey, { positionY: Number(e.target.value) })} /></label></div>
									</> : <div className='TemplateEditor__qrSettings'>
									<p className='TemplateEditor__hint'>Для настройки внешнего вида используется тестовое значение <strong>ТЕСТОВЫЙ-QR-КЛЮЧ</strong>. Настоящий ключ вводится при заполнении пропуска.</p>
									<div className='TemplateEditor__row'><div className='TemplateEditor__colorField'><span>Цвет кода</span><input type='color' value={selectedPhoto.qrDarkColor} onChange={e => updatePhoto(selectedPhotoKey, { qrDarkColor: e.target.value })} aria-label='Цвет QR-кода' /></div><div className='TemplateEditor__colorField'><span>Цвет фона QR</span><input type='color' value={selectedPhoto.qrLightColor} onChange={e => updatePhoto(selectedPhotoKey, { qrLightColor: e.target.value })} aria-label='Цвет фона QR-кода' /></div></div>
								</div>}
								<label>Скругление рамки: {selectedPhoto.borderRadius}px<input type='range' min='0' max='40' value={selectedPhoto.borderRadius} onChange={e => updatePhoto(selectedPhotoKey, { borderRadius: Number(e.target.value) })} /></label>
								</div></details>}
							{selectedFontFields.length > 0 && <details className='TemplateEditor__settingsGroup TemplateEditor__inspectorPanel' open hidden={activeInspectorTab !== 'appearance'}>
								<summary>Текст и оформление</summary><div className='TemplateEditor__settingsGroupBody TemplateEditor__fontSizes TemplateEditor__selectedFontSizes'>
								<h4 className='TemplateEditor__optionGroupTitle TemplateEditor__typographyTitle'>Текст</h4>
								<div className='TemplateEditor__textToolbar'>
									<div className='TemplateEditor__colorField'><span>Цвет текста</span><input type='color' value={selectedTextStyle.color ?? '#111111'} onChange={e => updateTextStyle(selectedElement!, { color: e.target.value })} aria-label='Выбрать цвет текста' /></div>
									<div className='TemplateEditor__formatButtons' aria-label='Начертание текста'>
										<button type='button' className={(selectedTextStyle.fontWeight ?? 400) >= 700 ? 'active' : ''} onClick={() => updateTextStyle(selectedElement!, { fontWeight: (selectedTextStyle.fontWeight ?? 400) >= 700 ? 400 : 700 })} aria-pressed={(selectedTextStyle.fontWeight ?? 400) >= 700}><strong>Ж</strong></button>
										<button type='button' className={selectedTextStyle.fontStyle === 'italic' ? 'active' : ''} onClick={() => updateTextStyle(selectedElement!, { fontStyle: selectedTextStyle.fontStyle === 'italic' ? 'normal' : 'italic' })} aria-pressed={selectedTextStyle.fontStyle === 'italic'}><em>К</em></button>
									</div>
								</div>
								<h4 className='TemplateEditor__optionGroupTitle TemplateEditor__blockTitle'>Блок</h4>
								<div className='TemplateEditor__fillSettings'>
									<div className='TemplateEditor__colorField'><span>Заливка блока</span><input type='color' value={selectedTextStyle.backgroundColor ?? '#ffffff'} onChange={e => updateTextStyle(selectedElement!, { backgroundColor: e.target.value })} aria-label='Выбрать цвет заливки блока' /></div>
									{selectedTextStyle.backgroundColor
										? <button type='button' onClick={() => updateTextStyle(selectedElement!, { backgroundColor: undefined })}>Убрать заливку</button>
										: <button type='button' onClick={() => updateTextStyle(selectedElement!, { backgroundColor: '#ffffff' })}>Добавить заливку</button>}
								</div>
								<div className='TemplateEditor__outlineSettings'>
									<label><input type='checkbox' checked={Boolean(selectedTextStyle.borderColor)} onChange={e => updateTextStyle(selectedElement!, { borderColor: e.target.checked ? '#111111' : undefined })} /><span>Обводка блока</span></label>
									<div className='TemplateEditor__colorField'><span>Цвет обводки</span><input type='color' value={selectedTextStyle.borderColor ?? '#111111'} disabled={!selectedTextStyle.borderColor} onChange={e => updateTextStyle(selectedElement!, { borderColor: e.target.value })} aria-label='Выбрать цвет обводки блока' /></div>
								</div>
								<label className='TemplateEditor__fillOpacity'>Прозрачность заливки: {Math.round((selectedTextStyle.backgroundOpacity ?? 1) * 100)}%<input type='range' min='0' max='1' step='.05' value={selectedTextStyle.backgroundOpacity ?? 1} disabled={!selectedTextStyle.backgroundColor} onChange={e => updateTextStyle(selectedElement!, { backgroundOpacity: Number(e.target.value) })} /></label>
								<label className='TemplateEditor__blockPadding'>Внутренний отступ: {selectedTextStyle.padding ?? 0}px<input type='range' min='0' max='40' value={selectedTextStyle.padding ?? 0} onChange={e => updateTextStyle(selectedElement!, { padding: Number(e.target.value) })} /></label>
								<div className='TemplateEditor__cornerSettings'>
									<div className='TemplateEditor__cornerMode'><span>Скругление углов</span><button type='button' className={!hasIndividualCorners ? 'active' : ''} onClick={() => hasIndividualCorners && toggleIndividualCorners()}>Все вместе</button><button type='button' className={hasIndividualCorners ? 'active' : ''} onClick={() => !hasIndividualCorners && toggleIndividualCorners()}>По отдельности</button></div>
									{!hasIndividualCorners
										? <label>Все углы: {selectedTextStyle.borderRadius ?? 0}px<input type='range' min='0' max='40' value={selectedTextStyle.borderRadius ?? 0} onChange={e => updateTextStyle(selectedElement!, { borderRadius: Number(e.target.value) })} /></label>
										: <div className='TemplateEditor__cornerGrid'>
											<label>Верхний левый: {selectedTextStyle.borderTopLeftRadius ?? 0}px<input type='range' min='0' max='40' value={selectedTextStyle.borderTopLeftRadius ?? 0} onChange={e => updateTextStyle(selectedElement!, { borderTopLeftRadius: Number(e.target.value) })} /></label>
											<label>Верхний правый: {selectedTextStyle.borderTopRightRadius ?? 0}px<input type='range' min='0' max='40' value={selectedTextStyle.borderTopRightRadius ?? 0} onChange={e => updateTextStyle(selectedElement!, { borderTopRightRadius: Number(e.target.value) })} /></label>
											<label>Нижний левый: {selectedTextStyle.borderBottomLeftRadius ?? 0}px<input type='range' min='0' max='40' value={selectedTextStyle.borderBottomLeftRadius ?? 0} onChange={e => updateTextStyle(selectedElement!, { borderBottomLeftRadius: Number(e.target.value) })} /></label>
											<label>Нижний правый: {selectedTextStyle.borderBottomRightRadius ?? 0}px<input type='range' min='0' max='40' value={selectedTextStyle.borderBottomRightRadius ?? 0} onChange={e => updateTextStyle(selectedElement!, { borderBottomRightRadius: Number(e.target.value) })} /></label>
										</div>}
								</div>
								<label className='TemplateEditor__blockOpacity'>Прозрачность блока: {Math.round((selectedTextStyle.opacity ?? 1) * 100)}%<input type='range' min='.1' max='1' step='.05' value={selectedTextStyle.opacity ?? 1} onChange={e => updateTextStyle(selectedElement!, { opacity: Number(e.target.value) })} /></label>
								<label className='TemplateEditor__textTransform'>Регистр<select value={selectedTextStyle.textTransform ?? 'none'} onChange={e => updateTextStyle(selectedElement!, { textTransform: e.target.value as TemplateTextStyle['textTransform'] })}><option value='none'>Как введено</option><option value='uppercase'>ПРОПИСНЫЕ</option><option value='lowercase'>строчные</option></select></label>
								<label className='TemplateEditor__letterSpacing'>Межбуквенный интервал: {selectedTextStyle.letterSpacing ?? 0}px<input type='range' min='-2' max='8' step='.1' value={selectedTextStyle.letterSpacing ?? 0} onChange={e => updateTextStyle(selectedElement!, { letterSpacing: Number(e.target.value) })} /></label>
								<label className='TemplateEditor__textRotation'>Поворот текста<span><input type='range' min='-180' max='180' value={selectedTextStyle.rotation ?? 0} onChange={e => updateTextStyle(selectedElement!, { rotation: Number(e.target.value) })} /><span className='TemplateEditor__rotationNumber'><DraftNumberInput value={selectedTextStyle.rotation ?? 0} min={-180} max={180} ariaLabel='Угол поворота текста' onCommit={value => updateTextStyle(selectedElement!, { rotation: value })} /><small>°</small></span></span></label>
								{selectedFontFields.map(([field, label]) => {
									const value = selected.design.fontSizes?.[field] ?? DEFAULT_FONT_SIZES[field]
									const lineHeight = selected.design.lineHeights?.[field] ?? 1.2
									return <div className='TemplateEditor__textFieldSettings' key={field}>
										<label>Размер шрифта<span><input type='range' min='8' max='42' value={value} onChange={e => updateFontSize(field, Number(e.target.value))} /><span className='TemplateEditor__numberInput'><button type='button' onClick={() => updateFontSize(field, normalizeFontSize(value - 1))} disabled={value <= 8} aria-label={`Уменьшить размер: ${label}`}>−</button><span><DraftNumberInput value={value} min={8} max={42} onCommit={nextValue => updateFontSize(field, normalizeFontSize(nextValue))} ariaLabel={`Размер шрифта: ${label}`} /><small>px</small></span><button type='button' onClick={() => updateFontSize(field, normalizeFontSize(value + 1))} disabled={value >= 42} aria-label={`Увеличить размер: ${label}`}>+</button></span></span></label>
										<label>Межстрочный интервал<span><input type='range' min='.8' max='2' step='.05' value={lineHeight} onChange={e => updateLineHeight(field, Number(e.target.value))} /><span className='TemplateEditor__lineHeightValue'>{lineHeight.toFixed(2)}</span></span></label>
									</div>
								})}
								<button type='button' className='TemplateEditor__resetTextStyle TemplateEditor__resetButton' onClick={() => resetTextStyle(selectedElement!)}><span aria-hidden='true'>↺</span> Сбросить оформление текста</button>
								</div></details>}
							<details className='TemplateEditor__settingsGroup TemplateEditor__inspectorPanel' open hidden={activeInspectorTab !== 'position'}>
								<summary>Положение и размеры</summary><div className='TemplateEditor__settingsGroupBody'>
							<div className='TemplateEditor__coordinates'>
								<CoordinateInput label='X, px' min={0} max={514} value={selectedLayout.x} onChange={value => updateElement(selectedElement!, { x: value })} />
								<CoordinateInput label='Y, px' min={0} max={363} value={selectedLayout.y} onChange={value => updateElement(selectedElement!, { y: value })} />
								<CoordinateInput label='Ширина' min={30} max={514} value={selectedLayout.width} onChange={value => updateElement(selectedElement!, { width: value })} />
								{selectedPhotoKey && selectedPhoto
									? <CoordinateInput label='Высота' min={60} max={300} value={selectedPhoto.height} onChange={value => updatePhoto(selectedPhotoKey, { height: value })} />
									: <CoordinateInput label='Высота' min={10} max={363} value={selectedLayout.height ?? 40} onChange={value => updateElement(selectedElement!, { height: value })} />}
							</div>
							<div className='TemplateEditor__layerControls'>
								<span>Порядок отображения</span>
								<div><button type='button' disabled={(selectedLayout.zIndex ?? 0) <= 0} onClick={() => updateElement(selectedElement!, { zIndex: Math.max(0, (selectedLayout.zIndex ?? 0) - 1) })}>На слой ниже</button><strong>{selectedLayout.zIndex ?? 0}</strong><button type='button' disabled={(selectedLayout.zIndex ?? 0) >= 100} onClick={() => updateElement(selectedElement!, { zIndex: Math.min(100, (selectedLayout.zIndex ?? 0) + 1) })}>На слой выше</button></div>
								<small>Используйте, если элементы перекрывают друг друга</small>
							</div>
							<label>Выравнивание<select value={selectedLayout.align} onChange={e => updateElement(selectedElement!, { align: e.target.value as TemplateElementLayout['align'] })}><option value='left'>По левому краю</option><option value='center'>По центру</option><option value='right'>По правому краю</option></select></label>
								</div></details>
						</div>}
						{selectedCustomText && <div className={`TemplateEditor__customTextSettings TemplateEditor__customTextSettings--${activeInspectorTab}`}>
							<p className='TemplateEditor__customBadge'>{selectedCustomText.contentType === 'field' ? 'Заполняемое поле' : selectedCustomText.contentType === 'block' ? 'Цветной блок' : 'Текст'}</p>
							{selectedCustomText.contentType === 'block' && <details className='TemplateEditor__settingsGroup' open><summary>Содержимое</summary><div className='TemplateEditor__settingsGroupBody'><div className='TemplateEditor__colorField'><span>Цвет блока</span><input type='color' value={selectedCustomText.style?.backgroundColor ?? selected.design.accentColor} onChange={event => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, backgroundColor: event.target.value } })} aria-label='Цвет блока' /></div><label>Прозрачность заливки: {Math.round((selectedCustomText.style?.backgroundOpacity ?? 1) * 100)}%<input type='range' min='0' max='1' step='.05' value={selectedCustomText.style?.backgroundOpacity ?? 1} onChange={event => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, backgroundOpacity: Number(event.target.value) } })} /></label></div></details>}
							{selectedCustomText.contentType !== 'block' && <details className='TemplateEditor__settingsGroup' open><summary>Содержимое</summary><div className='TemplateEditor__settingsGroupBody'>
								<label>Тип блока<select value={selectedCustomText.contentType ?? 'static'} onChange={e => updateCustomText(selectedCustomText.id, { contentType: e.target.value as 'static' | 'field' })}><option value='static'>Постоянный текст</option><option value='field'>Заполняемое поле</option></select></label>
								{selectedCustomText.contentType === 'field' && <><label>Название в форме<input value={selectedCustomText.fieldLabel ?? ''} onChange={e => updateCustomText(selectedCustomText.id, { fieldLabel: e.target.value })} placeholder='Например, номер кабинета' /></label><label>Тип данных<select value={selectedCustomText.dataType ?? 'text'} onChange={e => updateCustomText(selectedCustomText.id, { dataType: e.target.value as 'text' | 'number' })}><option value='text'>Текст</option><option value='number'>Число</option></select></label></>}
								<label>{selectedCustomText.contentType === 'field' ? 'Пример на пропуске' : 'Текст'}<textarea rows={3} value={selectedCustomText.text} onChange={e => updateCustomText(selectedCustomText.id, { text: e.target.value })} /></label>
							</div></details>}
								<details className='TemplateEditor__settingsGroup' open><summary>Текст и оформление</summary><div className='TemplateEditor__settingsGroupBody'>
								<h4 className='TemplateEditor__optionGroupTitle TemplateEditor__typographyTitle'>Текст</h4>
								<div className='TemplateEditor__textToolbar'><div className='TemplateEditor__colorField'><span>Цвет текста</span><input type='color' value={selectedCustomText.style?.color ?? '#111111'} onChange={e => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, color: e.target.value } })} aria-label='Цвет произвольного текста' /></div><div className='TemplateEditor__formatButtons'><button type='button' className={(selectedCustomText.style?.fontWeight ?? 400) >= 700 ? 'active' : ''} onClick={() => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, fontWeight: (selectedCustomText.style?.fontWeight ?? 400) >= 700 ? 400 : 700 } })}><strong>Ж</strong></button><button type='button' className={selectedCustomText.style?.fontStyle === 'italic' ? 'active' : ''} onClick={() => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, fontStyle: selectedCustomText.style?.fontStyle === 'italic' ? 'normal' : 'italic' } })}><em>К</em></button></div></div>
								<label className='TemplateEditor__customFontSize'>Размер шрифта: {selectedCustomText.fontSize}px<input type='range' min='8' max='72' value={selectedCustomText.fontSize} onChange={e => updateCustomText(selectedCustomText.id, { fontSize: Number(e.target.value) })} /></label>
								<label className='TemplateEditor__customLineHeight'>Межстрочный интервал: {selectedCustomText.lineHeight.toFixed(2)}<input type='range' min='.8' max='2' step='.05' value={selectedCustomText.lineHeight} onChange={e => updateCustomText(selectedCustomText.id, { lineHeight: Number(e.target.value) })} /></label>
								<label className='TemplateEditor__letterSpacing'>Межбуквенный интервал: {selectedCustomText.style?.letterSpacing ?? 0}px<input type='range' min='-2' max='8' step='.1' value={selectedCustomText.style?.letterSpacing ?? 0} onChange={e => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, letterSpacing: Number(e.target.value) } })} /></label>
								<label className='TemplateEditor__textTransform'>Регистр<select value={selectedCustomText.style?.textTransform ?? 'none'} onChange={e => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, textTransform: e.target.value as TemplateTextStyle['textTransform'] } })}><option value='none'>Как введено</option><option value='uppercase'>ПРОПИСНЫЕ</option><option value='lowercase'>строчные</option></select></label>
								<h4 className='TemplateEditor__optionGroupTitle TemplateEditor__blockTitle'>Блок</h4>
								<div className='TemplateEditor__fillSettings'><div className='TemplateEditor__colorField'><span>Заливка блока</span><input type='color' value={selectedCustomText.style?.backgroundColor ?? '#ffffff'} onChange={e => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, backgroundColor: e.target.value } })} aria-label='Заливка произвольного текста' /></div>{selectedCustomText.style?.backgroundColor ? <button type='button' onClick={() => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, backgroundColor: undefined } })}>Убрать заливку</button> : <button type='button' onClick={() => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, backgroundColor: '#ffffff' } })}>Добавить заливку</button>}</div>
								<label>Скругление: {selectedCustomText.style?.borderRadius ?? 0}px<input type='range' min='0' max='60' value={selectedCustomText.style?.borderRadius ?? 0} onChange={event => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, borderRadius: Number(event.target.value) } })} /></label>
								<label className='TemplateEditor__textRotation'>Поворот: {selectedCustomText.style?.rotation ?? 0}°<input type='range' min='-180' max='180' value={selectedCustomText.style?.rotation ?? 0} onChange={e => updateCustomText(selectedCustomText.id, { style: { ...selectedCustomText.style, rotation: Number(e.target.value) } })} /></label>
							</div></details>
							<details className='TemplateEditor__settingsGroup' open><summary>Положение и размеры</summary><div className='TemplateEditor__settingsGroupBody'>
								<div className='TemplateEditor__coordinates'><CoordinateInput label='X, px' min={0} max={514} value={selectedCustomText.layout.x} onChange={value => updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, x: value } })} /><CoordinateInput label='Y, px' min={0} max={363} value={selectedCustomText.layout.y} onChange={value => updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, y: value } })} /><CoordinateInput label='Ширина' min={20} max={514} value={selectedCustomText.layout.width} onChange={value => updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, width: value } })} /><CoordinateInput label='Высота' min={20} max={363} value={selectedCustomText.layout.height ?? 40} onChange={value => updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, height: value } })} /></div>
								<div className='TemplateEditor__layerControls'><span>Порядок отображения</span><div><button type='button' disabled={(selectedCustomText.layout.zIndex ?? 0) <= 0} onClick={() => updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, zIndex: Math.max(0, (selectedCustomText.layout.zIndex ?? 0) - 1) } })}>На слой ниже</button><strong>{selectedCustomText.layout.zIndex ?? 0}</strong><button type='button' disabled={(selectedCustomText.layout.zIndex ?? 0) >= 100} onClick={() => updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, zIndex: Math.min(100, (selectedCustomText.layout.zIndex ?? 0) + 1) } })}>На слой выше</button></div></div>
								<label>Выравнивание<select value={selectedCustomText.layout.align} onChange={e => updateCustomText(selectedCustomText.id, { layout: { ...selectedCustomText.layout, align: e.target.value as TemplateElementLayout['align'] } })}><option value='left'>По левому краю</option><option value='center'>По центру</option><option value='right'>По правому краю</option></select></label>
							</div></details>
							<div className='TemplateEditor__customTextActions'>{selected.kind === 'certificate' && <button type='button' className='TemplateEditor__duplicateTextButton' onClick={() => moveCustomTextToOtherSide(selectedCustomText)}>На {oppositeSide === 'front' ? 'лицевую' : 'обратную'} сторону</button>}<button type='button' className='TemplateEditor__duplicateTextButton' onClick={() => duplicateCustomText(selectedCustomText)}>Дублировать блок</button><button type='button' className='TemplateEditor__removeTextButton' onClick={() => removeCustomText(selectedCustomText.id)}>Удалить блок</button></div>
						</div>}
						{selectedImage && <div className={`TemplateEditor__customTextSettings TemplateEditor__imageSettings--${activeInspectorTab}`}>
							<p className='TemplateEditor__customBadge'>Изображение</p>
							<details className='TemplateEditor__settingsGroup' open><summary>Содержимое</summary><div className='TemplateEditor__settingsGroupBody'><div className='TemplateEditor__backgroundUpload'><span>{selectedImage.name}</span><label className='TemplateEditor__fileButton'><input type='file' accept='image/png,image/jpeg,image/webp' onChange={event => { void replaceTemplateImage(selectedImage, event.target.files?.[0]); event.currentTarget.value = '' }} />Заменить изображение</label><small>PNG, JPG или WebP, до 5 МБ</small></div></div></details>
							<details className='TemplateEditor__settingsGroup' open><summary>Положение и размеры</summary><div className='TemplateEditor__settingsGroupBody'>
								<div className='TemplateEditor__coordinates'><CoordinateInput label='X, px' min={0} max={514} value={selectedImage.layout.x} onChange={value => updateTemplateImage(selectedImage.id, { layout: { ...selectedImage.layout, x: value } })} /><CoordinateInput label='Y, px' min={0} max={363} value={selectedImage.layout.y} onChange={value => updateTemplateImage(selectedImage.id, { layout: { ...selectedImage.layout, y: value } })} /><CoordinateInput label='Ширина' min={20} max={514} value={selectedImage.layout.width} onChange={value => updateTemplateImage(selectedImage.id, { layout: { ...selectedImage.layout, width: value } })} /><CoordinateInput label='Высота' min={20} max={363} value={selectedImage.layout.height ?? selectedImage.layout.width} onChange={value => updateTemplateImage(selectedImage.id, { layout: { ...selectedImage.layout, height: value } })} /></div>
								<div className='TemplateEditor__layerControls'><span>Порядок отображения</span><div><button type='button' disabled={(selectedImage.layout.zIndex ?? 0) <= 0} onClick={() => updateTemplateImage(selectedImage.id, { layout: { ...selectedImage.layout, zIndex: Math.max(0, (selectedImage.layout.zIndex ?? 0) - 1) } })}>На слой ниже</button><strong>{selectedImage.layout.zIndex ?? 0}</strong><button type='button' disabled={(selectedImage.layout.zIndex ?? 0) >= 100} onClick={() => updateTemplateImage(selectedImage.id, { layout: { ...selectedImage.layout, zIndex: Math.min(100, (selectedImage.layout.zIndex ?? 0) + 1) } })}>На слой выше</button></div></div>
							</div></details>
							<details className='TemplateEditor__settingsGroup' open><summary>Оформление</summary><div className='TemplateEditor__settingsGroupBody'><label>Скругление: {selectedImage.borderRadius ?? 0}px<input type='range' min='0' max='60' value={selectedImage.borderRadius ?? 0} onChange={event => updateTemplateImage(selectedImage.id, { borderRadius: Number(event.target.value) })} /></label><label>Поворот: {selectedImage.rotation}°<input type='range' min='-180' max='180' value={selectedImage.rotation} onChange={event => updateTemplateImage(selectedImage.id, { rotation: Number(event.target.value) })} /></label><label>Прозрачность: {Math.round(selectedImage.opacity * 100)}%<input type='range' min='0' max='1' step='.05' value={selectedImage.opacity} onChange={event => updateTemplateImage(selectedImage.id, { opacity: Number(event.target.value) })} /></label></div></details>
							{selected.kind === 'certificate' && <button type='button' className='TemplateEditor__duplicateTextButton' onClick={() => moveImageToOtherSide(selectedImage)}>Перенести на {oppositeSide === 'front' ? 'лицевую' : 'обратную'} сторону</button>}
						</div>}
					</div>
					</div>}
				</section>

				<section className='TemplateEditor__preview panel'>
					<div className='TemplateEditor__previewHeader'>
						<div className='TemplateEditor__sectionTitle'>
							<span>3</span>
							<div><h2>Предпросмотр</h2><p>{selected.kind === 'certificate' ? (editorSide === 'front' ? 'Лицевая сторона' : 'Оборотная сторона') : 'Изменения отображаются сразу'}</p></div>
						</div>
					<div className='TemplateEditor__previewControls'>
						<div className='TemplateEditor__gridControls' aria-label='Сетка макета'>
							<button type='button' className={showGrid ? 'active' : ''} onClick={() => setShowGrid(value => !value)} aria-pressed={showGrid}>Сетка</button>
							<button type='button' className={snapToGrid ? 'active' : ''} onClick={() => setSnapToGrid(value => !value)} aria-pressed={snapToGrid}>Привязка</button>
							<select value={gridStep} onChange={event => setGridStep(Number(event.target.value))} aria-label='Шаг сетки'><option value='5'>5 px</option><option value='10'>10 px</option><option value='20'>20 px</option></select>
						</div>
					<span className={`TemplateEditor__saveState ${saved ? 'saved' : ''}`} role='status' aria-live='polite'>{saved ? 'Все изменения сохранены' : 'Есть несохранённые изменения'}</span>
							<div className='TemplateEditor__historyActions'>
								<button type='button' onClick={undo} disabled={!historyState.canUndo} title='Отменить (Ctrl/⌘ + Z)' aria-label='Отменить последнее изменение'>↶</button>
								<button type='button' onClick={redo} disabled={!historyState.canRedo} title='Повторить (Ctrl/⌘ + Shift + Z)' aria-label='Повторить последнее изменение'>↷</button>
							</div>
						</div>
					</div>
					{selected.kind === 'certificate' && <div className='TemplateEditor__previewTabs TemplateEditor__tabs' aria-label='Сторона пропуска'><button className={editorSide === 'front' ? 'active' : ''} onClick={() => setEditorSide('front')}>Лицевая</button><button className={editorSide === 'back' ? 'active' : ''} onClick={() => setEditorSide('back')}>Обратная</button></div>}
					<div ref={previewCanvasRef} className={`TemplateEditor__canvas ${showGrid ? 'is-grid' : ''}`} style={{ '--editor-grid-step': `${gridStep * previewDimensions.scaleX}px` } as CSSProperties} tabIndex={0} aria-label='Макет шаблона. Используйте стрелки для перемещения выбранного элемента' onPointerDownCapture={event => event.currentTarget.focus({ preventScroll: true })} onPointerMove={moveElement} onPointerUp={finishElementDrag} onPointerCancel={finishElementDrag}>
						{selected.kind === 'pass'
							? <LayoutCardPass {...example} NewDate={formatDate(example.NewDate, selected.design.dateFormat)} FilePhoto={previewPhoto} template={selected} previewMaxWidth={previewMaxWidth} previewMaxHeight={363} editor={{ selected: selectedElement, selectedCustomId, selectedImageId, onSelect: startElementDrag, onSelectCustom: startCustomTextDrag, onSelectImage: startImageDrag }} director={director} />
							: <LayoutCardPassVip {...example} NewDate={formatDate(example.NewDate, selected.design.dateFormat)} FilePhoto={previewPhoto} template={selected} previewMaxWidth={previewMaxWidth} previewMaxHeight={363} previewSide={editorSide} editor={{ selected: selectedElement, selectedCustomId, selectedImageId, onSelect: startElementDrag, onSelectCustom: startCustomTextDrag, onSelectImage: startImageDrag }} director={director} />}
					</div>
				</section>
			</div>
		</main>
	)
}

export default TemplateEditor
