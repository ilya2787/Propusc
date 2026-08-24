import { useContext, type FC, type PointerEvent } from 'react'
import { Context } from '../../Page/Card/CardAll'
import { ICON } from '../icon/Icon'
import './StyleCard.scss'
import FlagBackground from '../../assets/Flag.jpg'
import EmblemBackground from '../../assets/gerbT.png'
import { DEFAULT_ELEMENT_LAYOUTS, DEFAULT_FIXED_TEXTS, DEFAULT_FONT_SIZES, DEFAULT_PHOTO_SETTINGS, getTemplate, type PassTemplate, type TemplateElementKey, type TemplateTextStyle } from '../../model/templates'
import { useAutoFitText } from './useAutoFitText'
import { resolvePhotoSource } from './resolvePhotoSource'
import { resolveServerImageUrl } from '../../api/images'
import { getCardDimensions } from './cardDimensions'
import QrCodeImage from './QrCodeImage'
import AutoFitTextBlock from './AutoFitTextBlock'

interface TypeProps {
	Number_Tabs: string
	NewDate: string
	CurrentSingleOrganization: string
	CurrentSinglePost: string
	LastName: string
	FirstName: string
	Patronymic: string
	FilePhoto?: string
	PhotoBrightness?: number
	PhotoContrast?: number
	QrKey?: string
	CustomFields?: Record<string, string>
	Print: boolean
	template?: PassTemplate
	director?: { post: string; name: string }
	previewMaxWidth?: number
	previewMaxHeight?: number
	previewSide?: 'front' | 'back'
	editor?: { selected?: TemplateElementKey; selectedCustomId?: string; selectedImageId?: string; onSelect: (key: TemplateElementKey, event: PointerEvent<HTMLElement>) => void; onSelectCustom?: (id: string, event: PointerEvent<HTMLElement>) => void; onSelectImage?: (id: string, event: PointerEvent<HTMLElement>) => void }
	flipped?: boolean
}

const colorWithOpacity = (color?: string, opacity = 1) => {
	if (!color || opacity >= 1) return color
	const match = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
	return match ? `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}, ${opacity})` : color
}

const textBorderRadius = (style: TemplateTextStyle | undefined, scale: number) => {
	if (style?.borderTopLeftRadius === undefined) return style?.borderRadius !== undefined ? `${style.borderRadius * scale}px` : undefined
	return `${style.borderTopLeftRadius * scale}px ${(style.borderTopRightRadius ?? 0) * scale}px ${(style.borderBottomRightRadius ?? 0) * scale}px ${(style.borderBottomLeftRadius ?? 0) * scale}px`
}

const LayoutCardPassVip: FC<TypeProps> = ({
	Number_Tabs,
	NewDate,
	CurrentSingleOrganization,
	CurrentSinglePost,
	LastName,
	FirstName,
	Patronymic,
	FilePhoto,
	PhotoBrightness = 100,
	PhotoContrast = 100,
	QrKey,
	CustomFields = {},
	Print,
	template,
	director,
	previewMaxWidth,
	previewMaxHeight,
	previewSide,
	editor,
	flipped = false,
}) => {
	const AllContext = useContext(Context)
	const NameDirector = director?.name ?? AllContext.NameDirector
	const PostDirector = director?.post ?? AllContext.PostDirector
	const activeTemplate = template ?? getTemplate('service-certificate')
	const printDimensions = getCardDimensions(activeTemplate, true)
	const dimensions = Print
		? printDimensions
		: getCardDimensions(activeTemplate, false, previewMaxWidth ?? 514, previewMaxHeight ?? 363)
	const borderWidth = Print ? 1 : Math.max(1, dimensions.contentScale)
	const sizes = { ...DEFAULT_FONT_SIZES, ...activeTemplate.design.fontSizes }
	const nameWidth = activeTemplate.design.elements?.certificateName?.width ?? DEFAULT_ELEMENT_LAYOUTS.certificateName.width
	const nameRef = useAutoFitText('--font-certificate-name-fit', sizes.certificateName, [LastName, FirstName, Patronymic, nameWidth], editor && !Print ? sizes.certificateName : 8)
	const resolveBackground = (source: string | null | undefined, legacy: 'flag' | 'emblem') => source === null
		? ''
		: source === 'builtin:flag' ? FlagBackground
			: source === 'builtin:emblem' ? EmblemBackground
				: resolveServerImageUrl(source) || (legacy === 'emblem' ? EmblemBackground : FlagBackground)
	const frontBackgroundSource = resolveBackground(activeTemplate.design.frontBackgroundImage, (activeTemplate.design.frontBackground ?? activeTemplate.design.background) === 'emblem' ? 'emblem' : 'flag')
	const backBackgroundSource = resolveBackground(activeTemplate.design.backBackgroundImage, (activeTemplate.design.backBackground ?? 'emblem') === 'flag' ? 'flag' : 'emblem')
	const photoSettings = { ...DEFAULT_PHOTO_SETTINGS, ...activeTemplate.design.photos?.certificatePhoto }
	const fixedText = (key: TemplateElementKey) => activeTemplate.design.fixedTexts?.[key] ?? DEFAULT_FIXED_TEXTS[key] ?? ''
	const cardStyle = {
		'--template-front-background': activeTemplate.design.frontBackgroundMode === 'color' ? 'none' : frontBackgroundSource ? `url("${frontBackgroundSource}")` : 'none',
		'--template-back-background': activeTemplate.design.backBackgroundMode === 'color' ? 'none' : backBackgroundSource ? `url("${backBackgroundSource}")` : 'none',
		'--template-accent': activeTemplate.design.accentColor,
		'--template-title': activeTemplate.design.titleColor,
		'--template-front-text': activeTemplate.design.frontTextColor ?? activeTemplate.design.textColor ?? '#111111',
		'--template-back-text': activeTemplate.design.backTextColor ?? activeTemplate.design.textColor ?? '#111111',
		'--template-font': activeTemplate.design.fontFamily,
		'--template-radius': `${activeTemplate.design.borderRadius}px`,
		'--card-font-scale': dimensions.contentScale,
		'--font-certificate-title': `${sizes.certificateTitle}px`,
		'--font-certificate-number': `${sizes.certificateNumber}px`,
		'--font-certificate-intro': `${sizes.certificateIntro}px`,
		'--font-certificate-name': `${sizes.certificateName}px`,
		'--font-certificate-date': `${sizes.certificateDate}px`,
		'--font-certificate-organization': `${sizes.certificateOrganization}px`,
		'--font-certificate-post': `${sizes.certificatePost}px`,
		'--font-certificate-director-post': `${sizes.certificateDirectorPost}px`,
		'--font-certificate-director-name': `${sizes.certificateDirectorName}px`,
		'--line-certificate-title': activeTemplate.design.lineHeights?.certificateTitle ?? 1.05,
		'--line-certificate-number': activeTemplate.design.lineHeights?.certificateNumber ?? 1.1,
		'--line-certificate-intro': activeTemplate.design.lineHeights?.certificateIntro ?? 1.15,
		'--line-certificate-name': activeTemplate.design.lineHeights?.certificateName ?? 1.15,
		'--line-certificate-date': activeTemplate.design.lineHeights?.certificateDate ?? 1.2,
		'--line-certificate-organization': activeTemplate.design.lineHeights?.certificateOrganization ?? 1.05,
		'--line-certificate-post': activeTemplate.design.lineHeights?.certificatePost ?? 1.05,
		'--line-certificate-director-post': activeTemplate.design.lineHeights?.certificateDirectorPost ?? 1.3,
		'--line-certificate-director-name': activeTemplate.design.lineHeights?.certificateDirectorName ?? 1.2,
	} as React.CSSProperties
	const defaultSide = (key: TemplateElementKey): 'front' | 'back' => ['certificateOrganization', 'certificatePost', 'certificateDirectorPost', 'certificateDirectorName'].includes(key) ? 'back' : 'front'
	const sideFor = (key: TemplateElementKey) => activeTemplate.design.elementSides?.[key] ?? defaultSide(key)
	const typographyField: Partial<Record<TemplateElementKey, keyof typeof sizes>> = {
		certificateTitle: 'certificateTitle', certificateNumber: 'certificateNumber', certificateIntro: 'certificateIntro', certificateName: 'certificateName', certificateDate: 'certificateDate', certificateOrganization: 'certificateOrganization', certificatePost: 'certificatePost', certificateDirectorPost: 'certificateDirectorPost', certificateDirectorName: 'certificateDirectorName',
	}
	const editable = (key: TemplateElementKey, renderSide = defaultSide(key)) => {
		const hidden = (activeTemplate.design.hiddenElements?.includes(key) ?? false) || sideFor(key) !== renderSide || (['certificateDirectorPost', 'certificateDirectorName'].includes(key) && !activeTemplate.design.showDirector)
		let configured = activeTemplate.design.elements?.[key]
		const legacyDirector = activeTemplate.design.elements?.certificateDirector
		if (!configured && legacyDirector && key === 'certificateDirectorPost') configured = { ...legacyDirector, width: Math.min(285, legacyDirector.width) }
		if (!configured && legacyDirector && key === 'certificateDirectorName') configured = { x: legacyDirector.x + Math.max(0, legacyDirector.width - 149), y: legacyDirector.y + 30, width: 149, align: 'right' }
		const layout = configured ?? DEFAULT_ELEMENT_LAYOUTS[key]
		const isPhoto = key === 'certificatePhoto'
		const isDirector = key === 'certificateDirector'
		const textStyle = activeTemplate.design.textStyles?.[key]
		const typeField = typographyField[key]
		return {
			style: { display: hidden ? 'none' : undefined, position: 'absolute', left: layout.x * dimensions.scaleX, top: layout.y * dimensions.scaleY, right: 'auto', bottom: 'auto', width: layout.width * dimensions.scaleX, minHeight: isDirector && layout.height === undefined ? 50 * dimensions.scaleY : undefined, height: isPhoto ? photoSettings.height * dimensions.scaleY : layout.height !== undefined ? layout.height * dimensions.scaleY : isDirector ? 50 * dimensions.scaleY : undefined, maxWidth: 'none', boxSizing: 'border-box', overflow: 'hidden', overflowWrap: 'anywhere', padding: !isPhoto && textStyle?.padding !== undefined ? textStyle.padding * dimensions.contentScale : undefined, borderRadius: isPhoto ? photoSettings.borderRadius * dimensions.contentScale : textBorderRadius(textStyle, dimensions.contentScale), border: !isPhoto && textStyle?.borderColor ? `${borderWidth}px solid ${textStyle.borderColor}` : undefined, opacity: textStyle?.opacity, zIndex: layout.zIndex, margin: 0, textAlign: layout.align, color: textStyle?.color, backgroundColor: colorWithOpacity(textStyle?.backgroundColor, textStyle?.backgroundOpacity), transform: textStyle?.rotation ? `rotate(${textStyle.rotation}deg)` : undefined, transformOrigin: 'center center', fontSize: typeField ? sizes[typeField] * dimensions.contentScale : undefined, lineHeight: typeField ? activeTemplate.design.lineHeights?.[typeField] ?? 1.2 : undefined, fontWeight: textStyle?.fontWeight, fontStyle: textStyle?.fontStyle, letterSpacing: textStyle?.letterSpacing !== undefined ? `${textStyle.letterSpacing}px` : undefined, textTransform: textStyle?.textTransform, whiteSpace: key === 'certificateDirectorPost' || key === 'certificateDirectorName' ? 'pre-wrap' : 'pre-line', cursor: editor && !Print ? 'move' : undefined } as React.CSSProperties,
			onPointerDown: editor && !Print ? (event: PointerEvent<HTMLElement>) => editor.onSelect(key, event) : undefined,
			'data-editor-selected': editor && !Print ? editor.selected === key : undefined,
		}
	}
	const customText = (side: 'front' | 'back') => activeTemplate.design.customTexts?.filter(item => item.side === side).map(item => item.contentType === 'field' ? <AutoFitTextBlock
		key={item.id}
		fontSize={item.fontSize * dimensions.contentScale}
		minimumFontSize={editor && !Print ? item.fontSize * dimensions.contentScale : 6 * dimensions.contentScale}
		text={CustomFields[item.id] || item.text}
		style={{ position: 'absolute', left: item.layout.x * dimensions.scaleX, top: item.layout.y * dimensions.scaleY, width: item.layout.width * dimensions.scaleX, height: item.layout.height !== undefined ? item.layout.height * dimensions.scaleY : undefined, boxSizing: 'border-box', overflow: 'hidden', overflowWrap: 'anywhere', padding: item.style?.padding !== undefined ? item.style.padding * dimensions.contentScale : undefined, zIndex: item.layout.zIndex, color: item.style?.color, backgroundColor: colorWithOpacity(item.style?.backgroundColor, item.style?.backgroundOpacity), borderRadius: textBorderRadius(item.style, dimensions.contentScale), opacity: item.style?.opacity, lineHeight: item.lineHeight, fontWeight: item.style?.fontWeight, fontStyle: item.style?.fontStyle, letterSpacing: item.style?.letterSpacing, textTransform: item.style?.textTransform, textAlign: item.layout.align, whiteSpace: 'pre-line', transform: item.style?.rotation ? `rotate(${item.style.rotation}deg)` : undefined, transformOrigin: 'center center', cursor: editor && !Print ? 'move' : undefined } as React.CSSProperties}
		onPointerDown={editor?.onSelectCustom && !Print ? event => editor.onSelectCustom!(item.id, event) : undefined}
		data-editor-selected={editor && !Print ? editor.selectedCustomId === item.id : undefined}
	/> : <div key={item.id} style={{ position: 'absolute', left: item.layout.x * dimensions.scaleX, top: item.layout.y * dimensions.scaleY, width: item.layout.width * dimensions.scaleX, height: item.layout.height !== undefined ? item.layout.height * dimensions.scaleY : undefined, boxSizing: 'border-box', overflow: 'hidden', overflowWrap: 'anywhere', padding: item.style?.padding !== undefined ? item.style.padding * dimensions.contentScale : undefined, zIndex: item.layout.zIndex, color: item.style?.color, backgroundColor: colorWithOpacity(item.style?.backgroundColor, item.style?.backgroundOpacity), borderRadius: textBorderRadius(item.style, dimensions.contentScale), opacity: item.style?.opacity, fontSize: item.fontSize * dimensions.contentScale, lineHeight: item.lineHeight, fontWeight: item.style?.fontWeight, fontStyle: item.style?.fontStyle, letterSpacing: item.style?.letterSpacing, textTransform: item.style?.textTransform, textAlign: item.layout.align, whiteSpace: 'pre-line', transform: item.style?.rotation ? `rotate(${item.style.rotation}deg)` : undefined, transformOrigin: 'center center', cursor: editor && !Print ? 'move' : undefined } as React.CSSProperties} onPointerDown={editor?.onSelectCustom && !Print ? event => editor.onSelectCustom!(item.id, event) : undefined} data-editor-selected={editor && !Print ? editor.selectedCustomId === item.id : undefined}>{item.text}</div>)
	const templateImages = (side: 'front' | 'back') => activeTemplate.design.images?.filter(item => item.side === side).map(item => <img key={item.id} src={resolveServerImageUrl(item.source)} alt='' style={{ position: 'absolute', left: item.layout.x * dimensions.scaleX, top: item.layout.y * dimensions.scaleY, width: item.layout.width * dimensions.scaleX, height: (item.layout.height ?? item.layout.width) * dimensions.scaleY, objectFit: 'contain', opacity: item.opacity, borderRadius: (item.borderRadius ?? 0) * dimensions.contentScale, transform: `rotate(${item.rotation}deg)`, transformOrigin: 'center', zIndex: item.layout.zIndex, cursor: editor && !Print ? 'move' : undefined }} onPointerDown={editor?.onSelectImage && !Print ? event => editor.onSelectImage!(item.id, event) : undefined} data-editor-selected={editor && !Print ? editor.selectedImageId === item.id : undefined} />)
	const movedContent = (key: TemplateElementKey) => {
		switch (key) {
			case 'certificateTitle': return fixedText(key)
			case 'certificateNumber': return <>{fixedText(key)} {Number_Tabs}</>
			case 'certificateIntro': return fixedText(key)
			case 'certificateName': return <>{LastName}<br />{FirstName}<br />{Patronymic}</>
			case 'certificateDate': return <>{fixedText(key)} {NewDate}</>
			case 'certificateOrganization': return CurrentSingleOrganization
			case 'certificatePost': return CurrentSinglePost
			case 'certificateDirectorPost': return PostDirector
			case 'certificateDirectorName': return NameDirector
			case 'certificatePhoto': return photoSettings.mode === 'qr' ? <QrCodeImage value={QrKey || 'ТЕСТОВЫЙ-QR-КЛЮЧ'} darkColor={photoSettings.qrDarkColor} lightColor={photoSettings.qrLightColor} /> : FilePhoto ? <img style={{ width: `${photoSettings.scale}%`, height: `${photoSettings.scale}%`, maxWidth: 'none', objectFit: photoSettings.fit, objectPosition: `${photoSettings.positionX}% ${photoSettings.positionY}%`, filter: `brightness(${PhotoBrightness}%) contrast(${PhotoContrast}%)` }} src={resolvePhotoSource(FilePhoto)} alt='Фотография сотрудника' /> : <span>{ICON.Photo}</span>
			default: return null
		}
	}
	const movedElements = (side: 'front' | 'back') => (Object.keys(activeTemplate.design.elementSides ?? {}) as TemplateElementKey[]).filter(key => defaultSide(key) !== side && sideFor(key) === side).map(key => <div key={`moved-${key}`} {...editable(key, side)} className='layoutCardPassVip__movedElement'>{movedContent(key)}</div>)
	const fittedDirectorField = (key: 'certificateDirectorPost' | 'certificateDirectorName', text: string) => {
		const props = editable(key)
		return <AutoFitTextBlock
			{...props}
			fontSize={sizes[key] * dimensions.contentScale}
			minimumFontSize={editor && !Print ? sizes[key] * dimensions.contentScale : 6 * dimensions.contentScale}
			text={text}
			style={{ ...props.style, whiteSpace: 'pre-wrap' }}
			className={Print ? `layoutCardPassVip__Print--Back--${key === 'certificateDirectorPost' ? 'DirectorPost' : 'DirectorName'}` : `layoutCardPassVip--Back--${key === 'certificateDirectorPost' ? 'DirectorPost' : 'DirectorName'}`}
		/>
	}

	return (
		<div
			style={{
				...cardStyle,
				...(!Print ? { width: dimensions.widthPx, height: dimensions.heightPx } : {}),
				...(Print ? {
					'--card-print-width': `${printDimensions.widthMm}mm`,
					'--card-print-height': `${printDimensions.heightMm}mm`,
				} : {}),
			}}
			className={Print ? 'layoutCardPassVip__Print' : `layoutCardPassVip ${flipped && !previewSide ? 'Flipped' : ''} ${previewSide ? `Editor${previewSide === 'front' ? 'Front' : 'Back'}` : ''}`}
		>
			<div
				style={{ backgroundImage: activeTemplate.design.frontBackgroundMode === 'color' ? 'none' : `url("${frontBackgroundSource}")`, backgroundColor: activeTemplate.design.frontBackgroundMode === 'color' ? activeTemplate.design.frontBackgroundColor ?? '#ffffff' : undefined, width: dimensions.widthPx, height: dimensions.heightPx, boxSizing: 'border-box', border: activeTemplate.design.borderColor ? `${borderWidth}px solid ${activeTemplate.design.borderColor}` : undefined }}
				className={
					Print ? 'layoutCardPassVip__Print--Front' : 'layoutCardPassVip--Front'
				}
			>
				{templateImages('front')}
				{movedElements('front')}
				<h3
					{...editable('certificateTitle')}
					className={
						Print
							? 'layoutCardPassVip__Print--Front--title'
							: 'layoutCardPassVip--Front--title'
					}
				>
					{fixedText('certificateTitle')}
				</h3>
				<div
					{...editable('certificateNumber')}
					className={
						Print
							? 'layoutCardPassVip__Print--Front--NumberCard'
							: 'layoutCardPassVip--Front--NumberCard'
					}
				>
					<p>{fixedText('certificateNumber')} </p>
					<p>{Number_Tabs}</p>
				</div>
				<p
					{...editable('certificateIntro')}
					className={
						Print
							? 'layoutCardPassVip__Print--Front--text'
							: 'layoutCardPassVip--Front--text'
					}
				>
					{fixedText('certificateIntro')}
				</p>
				<div
					ref={nameRef}
					{...editable('certificateName')}
					className={
						Print
							? 'layoutCardPassVip__Print--Front--Name'
							: 'layoutCardPassVip--Front--Name'
					}
				>
					<p>{LastName}</p>
					<p>{FirstName}</p>
					<p>{Patronymic}</p>
				</div>
				<div
					{...editable('certificateDate')}
					className={
						Print
							? 'layoutCardPassVip__Print--Front--Date'
							: 'layoutCardPassVip--Front--Date'
					}
				>
					<p>{fixedText('certificateDate')}</p>
					<p>{NewDate}</p>
				</div>
				<div
					{...editable('certificatePhoto')}
					className={
						Print
							? 'layoutCardPassVip__Print--Front--Photo'
							: 'layoutCardPassVip--Front--Photo'
					}
				>
					{photoSettings.mode === 'qr' ? (
						<QrCodeImage value={QrKey || 'ТЕСТОВЫЙ-QR-КЛЮЧ'} darkColor={photoSettings.qrDarkColor} lightColor={photoSettings.qrLightColor} />
					) : FilePhoto ? (
						<img style={{ width: `${photoSettings.scale}%`, height: `${photoSettings.scale}%`, maxWidth: 'none', objectFit: photoSettings.fit, objectPosition: `${photoSettings.positionX}% ${photoSettings.positionY}%`, filter: `brightness(${PhotoBrightness}%) contrast(${PhotoContrast}%)` }} src={resolvePhotoSource(FilePhoto)} alt='Фотография сотрудника' />
					) : (
						<span>{ICON.Photo}</span>
					)}
				</div>
				{customText('front')}
			</div>
			<div
				style={{ backgroundImage: activeTemplate.design.backBackgroundMode === 'color' ? 'none' : `url("${backBackgroundSource}")`, backgroundColor: activeTemplate.design.backBackgroundMode === 'color' ? activeTemplate.design.backBackgroundColor ?? '#ffffff' : undefined, width: dimensions.widthPx, height: dimensions.heightPx, boxSizing: 'border-box', border: activeTemplate.design.borderColor ? `${borderWidth}px solid ${activeTemplate.design.borderColor}` : undefined }}
				className={
					Print ? 'layoutCardPassVip__Print--Back' : 'layoutCardPassVip--Back'
				}
			>
				{templateImages('back')}
				{movedElements('back')}
				<div
					{...editable('certificateOrganization')}
					className={
						Print
							? 'layoutCardPassVip__Print--Back--Organization'
							: 'layoutCardPassVip--Back--Organization'
					}
				>
					<p>{CurrentSingleOrganization}</p>
				</div>
				<div
					{...editable('certificatePost')}
					className={
						Print
							? 'layoutCardPassVip__Print--Back--Post'
							: 'layoutCardPassVip--Back--Post'
					}
				>
					<p>{CurrentSinglePost}</p>
				</div>
				{activeTemplate.design.showDirector && <>
					{fittedDirectorField('certificateDirectorPost', PostDirector)}
					{fittedDirectorField('certificateDirectorName', NameDirector)}
				</>}
				{customText('back')}
			</div>
		</div>
	)
}

export default LayoutCardPassVip
