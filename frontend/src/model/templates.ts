export type TemplateKind = 'pass' | 'certificate'

export type TemplateCardSize = {
	widthMm: number
	heightMm: number
}

export const DEFAULT_CARD_SIZE: TemplateCardSize = {
	widthMm: 70,
	heightMm: 48,
}

export type TemplateElementLayout = {
	x: number
	y: number
	width: number
	height?: number
	zIndex?: number
	align: 'left' | 'center' | 'right'
}

export type TemplateTextStyle = {
	color?: string
	backgroundColor?: string
	backgroundOpacity?: number
	padding?: number
	borderRadius?: number
	borderTopLeftRadius?: number
	borderTopRightRadius?: number
	borderBottomRightRadius?: number
	borderBottomLeftRadius?: number
	opacity?: number
	rotation?: number
	fontWeight?: number
	fontStyle?: 'normal' | 'italic'
	letterSpacing?: number
	textTransform?: 'none' | 'uppercase' | 'lowercase'
}

export type TemplatePhotoSettings = {
	mode: 'photo' | 'qr'
	height: number
	fit: 'cover' | 'contain'
	scale: number
	positionX: number
	positionY: number
	borderRadius: number
	qrDarkColor: string
	qrLightColor: string
}

export type TemplateCustomText = {
	id: string
	text: string
	side: 'pass' | 'front' | 'back'
	layout: TemplateElementLayout
	fontSize: number
	lineHeight: number
	style?: TemplateTextStyle
}

export const DEFAULT_PHOTO_SETTINGS: TemplatePhotoSettings = {
	mode: 'photo',
	height: 227,
	fit: 'cover',
	scale: 100,
	positionX: 50,
	positionY: 50,
	borderRadius: 5,
	qrDarkColor: '#111111',
	qrLightColor: '#ffffff',
}

export type TemplateElementKey =
	| 'passTitle' | 'passNumber' | 'passDate' | 'passOrganization' | 'passPost' | 'passName' | 'passDirector' | 'passDirectorPost' | 'passDirectorName' | 'passPhoto'
	| 'certificateTitle' | 'certificateNumber' | 'certificateIntro' | 'certificateName' | 'certificateDate' | 'certificatePhoto'
	| 'certificateOrganization' | 'certificatePost' | 'certificateDirector' | 'certificateDirectorPost' | 'certificateDirectorName'

export const DEFAULT_FIXED_TEXTS: Partial<Record<TemplateElementKey, string>> = {
	passTitle: 'Пропуск',
	passNumber: '№',
	certificateTitle: 'Правительство\nКалининградской области',
	certificateNumber: 'Служебное удостоверение №',
	certificateIntro: 'Предъявитель настоящего удостоверения',
	certificateDate: 'Дата выдачи:',
}

export const DEFAULT_ELEMENT_LAYOUTS: Record<TemplateElementKey, TemplateElementLayout> = {
	passTitle: { x: 0, y: 0, width: 50, align: 'center' },
	passNumber: { x: 60, y: 10, width: 100, align: 'left' },
	passDate: { x: 270, y: 10, width: 150, align: 'left' },
	passOrganization: { x: 60, y: 40, width: 275, align: 'left' },
	passPost: { x: 60, y: 210, width: 275, align: 'left' },
	passName: { x: 60, y: 142, width: 275, align: 'left' },
	passDirector: { x: 60, y: 315, width: 444, align: 'left' },
	passDirectorPost: { x: 60, y: 315, width: 285, align: 'left' },
	passDirectorName: { x: 350, y: 335, width: 154, align: 'right' },
	passPhoto: { x: 339, y: 54, width: 170, align: 'center' },
	certificateTitle: { x: 8, y: 8, width: 498, align: 'center' },
	certificateNumber: { x: 95, y: 60, width: 325, align: 'center' },
	certificateIntro: { x: 8, y: 90, width: 498, align: 'center' },
	certificateName: { x: 20, y: 185, width: 300, align: 'center' },
	certificateDate: { x: 8, y: 315, width: 300, align: 'left' },
	certificatePhoto: { x: 339, y: 109, width: 170, align: 'center' },
	certificateOrganization: { x: 15, y: 20, width: 484, align: 'center' },
	certificatePost: { x: 15, y: 155, width: 484, align: 'center' },
	certificateDirector: { x: 15, y: 305, width: 484, align: 'left' },
	certificateDirectorPost: { x: 15, y: 305, width: 285, align: 'left' },
	certificateDirectorName: { x: 350, y: 335, width: 149, align: 'right' },
}

export type TemplateFontSizes = {
	passTitle: number
	passNumber: number
	passDate: number
	passOrganization: number
	passPost: number
	passName: number
	passDirectorPost: number
	passDirectorName: number
	certificateTitle: number
	certificateNumber: number
	certificateIntro: number
	certificateName: number
	certificateDate: number
	certificateOrganization: number
	certificatePost: number
	certificateDirectorPost: number
	certificateDirectorName: number
}

export const DEFAULT_FONT_SIZES: TemplateFontSizes = {
	passTitle: 29, passNumber: 22, passDate: 22, passOrganization: 18,
	passPost: 18, passName: 23, passDirectorPost: 15, passDirectorName: 15,
	certificateTitle: 22, certificateNumber: 23, certificateIntro: 20,
	certificateName: 28, certificateDate: 20, certificateOrganization: 22,
	certificatePost: 22, certificateDirectorPost: 15, certificateDirectorName: 15,
}

export type TemplateLineHeights = Partial<Record<keyof TemplateFontSizes, number>>

export type PassTemplate = {
	id: string
	name: string
	description: string
	kind: TemplateKind
	isBuiltIn: boolean
			design: {
		cardSize?: TemplateCardSize
		background: 'flag' | 'emblem'
		frontBackground?: 'flag' | 'emblem'
		backBackground?: 'flag' | 'emblem'
		backgroundImage?: string
		backgroundImageName?: string
		frontBackgroundImage?: string
		frontBackgroundImageName?: string
		backBackgroundImage?: string
		backBackgroundImageName?: string
		accentColor: string
		titleColor: string
		textColor?: string
		frontTextColor?: string
		backTextColor?: string
		fontFamily: string
		borderRadius: number
		showDirector: boolean
		fontSizes?: TemplateFontSizes
		lineHeights?: TemplateLineHeights
		fixedTexts?: Partial<Record<TemplateElementKey, string>>
		textStyles?: Partial<Record<TemplateElementKey, TemplateTextStyle>>
		customTexts?: TemplateCustomText[]
		photos?: Partial<Record<'passPhoto' | 'certificatePhoto', TemplatePhotoSettings>>
		hiddenElements?: TemplateElementKey[]
		elements?: Partial<Record<TemplateElementKey, TemplateElementLayout>>
	}
}

export const DEFAULT_TEMPLATES: PassTemplate[] = [
	{
		id: 'standard-pass',
		name: 'Пропуск',
		description: 'Односторонний пропуск с лицевой стороной',
		kind: 'pass',
		isBuiltIn: true,
		design: {
			cardSize: { ...DEFAULT_CARD_SIZE },
			background: 'flag',
			frontBackground: 'flag',
			backBackground: 'flag',
			accentColor: '#feec23',
			titleColor: '#f84a4a',
			textColor: '#111111',
			frontTextColor: '#111111',
			backTextColor: '#111111',
			fontFamily: 'Times New Roman',
			borderRadius: 5,
			showDirector: true,
			fontSizes: {
				...DEFAULT_FONT_SIZES,
				passDirectorPost: 14,
				passDirectorName: 14,
			},
			elements: {
				passName: { x: 60, y: 142, width: 275, align: 'left' },
				passPost: { x: 60, y: 227, width: 275, align: 'left' },
				passDirectorPost: { x: 60, y: 296, width: 285, height: 60, align: 'left' },
			},
			textStyles: {
				passName: { letterSpacing: 0 },
			},
			lineHeights: {
				passName: 1.55,
			},
		},
	},
	{
		id: 'service-certificate',
		name: 'Удостоверение',
		description: 'Двустороннее служебное удостоверение',
		kind: 'certificate',
		isBuiltIn: true,
		design: {
			cardSize: { ...DEFAULT_CARD_SIZE },
			background: 'flag',
			frontBackground: 'flag',
			backBackground: 'emblem',
			accentColor: '#315ea8',
			titleColor: '#111827',
			textColor: '#111111',
			frontTextColor: '#111111',
			backTextColor: '#111111',
			fontFamily: 'Times New Roman',
			borderRadius: 10,
			showDirector: true,
			fontSizes: { ...DEFAULT_FONT_SIZES },
			elements: {
				certificateNumber: { x: 7, y: 58, width: 498, align: 'center' },
				certificateIntro: { x: 8, y: 86, width: 498, align: 'center' },
				certificateName: { x: 19, y: 147, width: 300, align: 'center' },
				certificateDirectorPost: { x: 14, y: 294, width: 330, height: 60, align: 'left' },
			},
		},
	},
]

const STORAGE_KEY = 'pass-templates-v1'
export const TEMPLATE_CHANGE_EVENT = 'pass-templates-change'

export const loadTemplates = (): PassTemplate[] => {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
		if (!Array.isArray(saved)) return DEFAULT_TEMPLATES
		return DEFAULT_TEMPLATES.map(item =>
			saved.find((savedItem: PassTemplate) => savedItem.id === item.id) ?? item,
		).concat(saved.filter((item: PassTemplate) => !item.isBuiltIn))
	} catch {
		return DEFAULT_TEMPLATES
	}
}

export const saveTemplates = (templates: PassTemplate[]) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
	window.dispatchEvent(new Event(TEMPLATE_CHANGE_EVENT))
}

const serverUrl = () => import.meta.env.VITE_APP_SERVER

export const fetchTemplates = async (): Promise<PassTemplate[]> => {
	const localTemplates = loadTemplates()
	try {
		const response = await fetch(`${serverUrl()}/Templates`)
		if (!response.ok) throw new Error('Не удалось загрузить шаблоны')
		const templates = await response.json() as PassTemplate[]
		if (templates.length === 0) {
			await persistTemplates(localTemplates)
			return localTemplates
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
		return templates
	} catch {
		return localTemplates
	}
}

export const persistTemplates = async (templates: PassTemplate[]) => {
	const response = await fetch(`${serverUrl()}/TemplatesSync`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ templates }),
	})
	if (!response.ok) {
		const data = await response.json().catch(() => ({}))
		throw new Error(data.message || 'Не удалось сохранить шаблоны')
	}
	saveTemplates(templates)
}

export const getTemplate = (id?: string) =>
	loadTemplates().find(template => template.id === id) ?? DEFAULT_TEMPLATES[0]
