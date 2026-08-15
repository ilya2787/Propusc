import { useContext, type FC, type PointerEvent } from 'react'
import { ICON } from '../icon/Icon'
import './StyleCard.scss'
import { Context } from '../../Page/Card/CardAll'
import FlagBackground from '../../assets/Flag.jpg'
import EmblemBackground from '../../assets/gerbT.png'
import { DEFAULT_ELEMENT_LAYOUTS, DEFAULT_FIXED_TEXTS, DEFAULT_FONT_SIZES, DEFAULT_PHOTO_SETTINGS, getTemplate, type PassTemplate, type TemplateElementKey, type TemplateTextStyle } from '../../model/templates'
import { useAutoFitText } from './useAutoFitText'
import { resolvePhotoSource } from './resolvePhotoSource'
import { resolveServerImageUrl } from '../../api/images'
import { getCardDimensions } from './cardDimensions'
import QrCodeImage from './QrCodeImage'

interface TypeProps {
	Number_Tabs: number
	NewDate: string
	CurrentSingleOrganization: string
	CurrentSinglePost: string
	LastName: string
	FirstName: string
	Patronymic: string
	FilePhoto?: string
	QrKey?: string
	Print: boolean
	template?: PassTemplate
	director?: { post: string; name: string }
	previewMaxWidth?: number
	previewMaxHeight?: number
	editor?: { selected?: TemplateElementKey; selectedCustomId?: string; onSelect: (key: TemplateElementKey, event: PointerEvent<HTMLElement>) => void; onSelectCustom?: (id: string, event: PointerEvent<HTMLElement>) => void }
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

const LayoutCardPass: FC<TypeProps> = ({
	Number_Tabs,
	NewDate,
	CurrentSingleOrganization,
	CurrentSinglePost,
	LastName,
	FirstName,
	Patronymic,
	FilePhoto,
	QrKey,
	Print,
	template,
	director,
	previewMaxWidth,
	previewMaxHeight,
	editor,
}) => {
	const AllContext = useContext(Context)
	const NameDirector = director?.name ?? AllContext.NameDirector
	const PostDirector = director?.post ?? AllContext.PostDirector
	const activeTemplate = template ?? getTemplate('standard-pass')
	const dimensions = getCardDimensions(activeTemplate, false, Print ? 335 : previewMaxWidth ?? 514, Print ? 240 : previewMaxHeight ?? 363)
	const printDimensions = getCardDimensions(activeTemplate, true)
	const sizes = { ...DEFAULT_FONT_SIZES, ...activeTemplate.design.fontSizes }
	const nameWidth = activeTemplate.design.elements?.passName?.width ?? DEFAULT_ELEMENT_LAYOUTS.passName.width
	const nameRef = useAutoFitText('--font-pass-name-fit', sizes.passName, [LastName, FirstName, Patronymic, nameWidth])
	const backgroundSource = resolveServerImageUrl(activeTemplate.design.backgroundImage) || (activeTemplate.design.background === 'emblem' ? EmblemBackground : FlagBackground)
	const photoSettings = { ...DEFAULT_PHOTO_SETTINGS, ...activeTemplate.design.photos?.passPhoto }
	const fixedText = (key: TemplateElementKey) => activeTemplate.design.fixedTexts?.[key] ?? DEFAULT_FIXED_TEXTS[key] ?? ''
	const cardStyle = {
		backgroundImage: `url("${backgroundSource}")`,
		'--template-background': `url("${backgroundSource}")`,
		'--template-accent': activeTemplate.design.accentColor,
		'--template-title': activeTemplate.design.titleColor,
		'--template-text': activeTemplate.design.textColor ?? '#111111',
		'--template-font': activeTemplate.design.fontFamily,
		'--template-radius': `${activeTemplate.design.borderRadius}px`,
		'--card-font-scale': dimensions.contentScale,
		'--font-pass-title': `${sizes.passTitle}px`,
		'--font-pass-number': `${sizes.passNumber}px`,
		'--font-pass-date': `${sizes.passDate}px`,
		'--font-pass-organization': `${sizes.passOrganization}px`,
		'--font-pass-post': `${sizes.passPost}px`,
		'--font-pass-name': `${sizes.passName}px`,
		'--font-pass-director-post': `${sizes.passDirectorPost}px`,
		'--font-pass-director-name': `${sizes.passDirectorName}px`,
		'--line-pass-title': activeTemplate.design.lineHeights?.passTitle ?? 1.15,
		'--line-pass-number': activeTemplate.design.lineHeights?.passNumber ?? 1.2,
		'--line-pass-date': activeTemplate.design.lineHeights?.passDate ?? 1.2,
		'--line-pass-organization': activeTemplate.design.lineHeights?.passOrganization ?? 1.35,
		'--line-pass-post': activeTemplate.design.lineHeights?.passPost ?? 1.2,
		'--line-pass-name': activeTemplate.design.lineHeights?.passName ?? 1.15,
		'--line-pass-director-post': activeTemplate.design.lineHeights?.passDirectorPost ?? 1.3,
		'--line-pass-director-name': activeTemplate.design.lineHeights?.passDirectorName ?? 1.2,
	} as React.CSSProperties
	const editable = (key: TemplateElementKey) => {
		const hidden = activeTemplate.design.hiddenElements?.includes(key) ?? false
		let configured = activeTemplate.design.elements?.[key]
		const legacyDirector = activeTemplate.design.elements?.passDirector
		if (!configured && legacyDirector && key === 'passDirectorPost') configured = { ...legacyDirector, width: Math.min(285, legacyDirector.width) }
		if (!configured && legacyDirector && key === 'passDirectorName') configured = { x: legacyDirector.x + Math.max(0, legacyDirector.width - 154), y: legacyDirector.y + 20, width: 154, align: 'right' }
		const layout = configured ?? DEFAULT_ELEMENT_LAYOUTS[key]
		const isPhoto = key === 'passPhoto'
		const textStyle = activeTemplate.design.textStyles?.[key]
		return {
			style: { display: hidden ? 'none' : undefined, position: 'absolute', left: layout.x * dimensions.scaleX, top: layout.y * dimensions.scaleY, right: 'auto', bottom: 'auto', width: layout.width * dimensions.scaleX, height: isPhoto ? photoSettings.height * dimensions.scaleY : layout.height !== undefined ? layout.height * dimensions.scaleY : undefined, maxWidth: 'none', boxSizing: 'border-box', overflow: 'hidden', overflowWrap: 'anywhere', padding: !isPhoto && textStyle?.padding !== undefined ? textStyle.padding * dimensions.contentScale : undefined, borderRadius: isPhoto ? photoSettings.borderRadius * dimensions.contentScale : textBorderRadius(textStyle, dimensions.contentScale), opacity: textStyle?.opacity, zIndex: layout.zIndex, textAlign: layout.align, color: textStyle?.color, backgroundColor: colorWithOpacity(textStyle?.backgroundColor, textStyle?.backgroundOpacity), transform: textStyle?.rotation ? `rotate(${textStyle.rotation}deg)` : undefined, transformOrigin: 'center center', fontWeight: textStyle?.fontWeight, fontStyle: textStyle?.fontStyle, letterSpacing: textStyle?.letterSpacing !== undefined ? `${textStyle.letterSpacing}px` : undefined, textTransform: textStyle?.textTransform, whiteSpace: 'pre-line', cursor: editor && !Print ? 'move' : undefined } as React.CSSProperties,
			onPointerDown: editor && !Print ? (event: PointerEvent<HTMLElement>) => editor.onSelect(key, event) : undefined,
			'data-editor-selected': editor && !Print ? editor.selected === key : undefined,
		}
	}
	const customTexts = activeTemplate.design.customTexts?.filter(item => item.side === 'pass') ?? []
	return (
		<div
			className={Print ? 'layoutCardPass__Print' : 'layoutCardPass'}
			style={Print ? {
				'--card-print-width': `${printDimensions.widthMm}mm`,
				'--card-print-height': `${printDimensions.heightMm}mm`,
				'--card-print-scale': printDimensions.widthPx / dimensions.widthPx,
			} as React.CSSProperties : undefined}
		>
			<div
				style={{ ...cardStyle, width: dimensions.widthPx, height: dimensions.heightPx }}
				className={
					Print ? 'layoutCardPass__Print--Card' : 'layoutCardPass--Card'
				}
			>
				<div
					{...editable('passTitle')}
					className={
						Print
							? 'layoutCardPass__Print--Card--Title'
							: 'layoutCardPass--Card--Title'
					}
				>
					<p>{fixedText('passTitle')}</p>
				</div>
				<div
					{...editable('passNumber')}
					className={
						Print
							? 'layoutCardPass__Print--Card--Number'
							: 'layoutCardPass--Card--Number'
					}
				>
					<p>{fixedText('passNumber')}</p>
					<p>{Number_Tabs}</p>
				</div>
				<div
					{...editable('passDate')}
					className={
						Print
							? 'layoutCardPass__Print--Card--Date'
							: 'layoutCardPass--Card--Date'
					}
				>
					<p>{NewDate}</p>
				</div>
				<div
					{...editable('passOrganization')}
					className={
						Print
							? 'layoutCardPass__Print--Card--Organization'
							: 'layoutCardPass--Card--Organization'
					}
				>
					<p>{CurrentSingleOrganization}</p>
				</div>
				<div
					{...editable('passPost')}
					className={
						Print
							? 'layoutCardPass__Print--Card--Post'
							: 'layoutCardPass--Card--Post'
					}
				>
					<p>{CurrentSinglePost}</p>
				</div>
				<div
					ref={nameRef}
					{...editable('passName')}
					className={
						Print
							? 'layoutCardPass__Print--Card--Name'
							: 'layoutCardPass--Card--Name'
					}
				>
					<p>{LastName}</p>
					<p>{FirstName}</p>
					<p>{Patronymic}</p>
				</div>
				{activeTemplate.design.showDirector && <>
					<div {...editable('passDirectorPost')} className={Print ? 'layoutCardPass__Print--Card--DirectorPost' : 'layoutCardPass--Card--DirectorPost'}><p>{PostDirector}</p></div>
					<div {...editable('passDirectorName')} className={Print ? 'layoutCardPass__Print--Card--DirectorName' : 'layoutCardPass--Card--DirectorName'}><p>{NameDirector}</p></div>
				</>}
				{customTexts.map(item => <div
					key={item.id}
					style={{ position: 'absolute', left: item.layout.x * dimensions.scaleX, top: item.layout.y * dimensions.scaleY, width: item.layout.width * dimensions.scaleX, height: item.layout.height !== undefined ? item.layout.height * dimensions.scaleY : undefined, boxSizing: 'border-box', overflow: 'hidden', overflowWrap: 'anywhere', padding: item.style?.padding !== undefined ? item.style.padding * dimensions.contentScale : undefined, zIndex: item.layout.zIndex, color: item.style?.color, backgroundColor: colorWithOpacity(item.style?.backgroundColor, item.style?.backgroundOpacity), borderRadius: textBorderRadius(item.style, dimensions.contentScale), opacity: item.style?.opacity, fontSize: item.fontSize * dimensions.contentScale, lineHeight: item.lineHeight, fontWeight: item.style?.fontWeight, fontStyle: item.style?.fontStyle, letterSpacing: item.style?.letterSpacing, textTransform: item.style?.textTransform, textAlign: item.layout.align, whiteSpace: 'pre-line', transform: item.style?.rotation ? `rotate(${item.style.rotation}deg)` : undefined, transformOrigin: 'center center', cursor: editor && !Print ? 'move' : undefined } as React.CSSProperties}
					onPointerDown={editor?.onSelectCustom && !Print ? event => editor.onSelectCustom!(item.id, event) : undefined}
					data-editor-selected={editor && !Print ? editor.selectedCustomId === item.id : undefined}
				>{item.text}</div>)}
				<div
					{...editable('passPhoto')}
					className={
						Print
							? 'layoutCardPass__Print--Card--Photo'
							: 'layoutCardPass--Card--Photo'
					}
				>
					{photoSettings.mode === 'qr' ? (
						<QrCodeImage value={QrKey || 'ТЕСТОВЫЙ-QR-КЛЮЧ'} darkColor={photoSettings.qrDarkColor} lightColor={photoSettings.qrLightColor} />
					) : FilePhoto ? (
						<img style={{ width: `${photoSettings.scale}%`, height: `${photoSettings.scale}%`, maxWidth: 'none', objectFit: photoSettings.fit, objectPosition: `${photoSettings.positionX}% ${photoSettings.positionY}%` }} src={resolvePhotoSource(FilePhoto)} alt='Фотография сотрудника' />
					) : (
						<span>{ICON.Photo}</span>
					)}
				</div>
			</div>
		</div>
	)
}

export default LayoutCardPass
