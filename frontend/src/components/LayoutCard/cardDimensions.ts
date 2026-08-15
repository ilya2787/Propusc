import { DEFAULT_CARD_SIZE, type PassTemplate, type TemplateCardSize, type TemplateKind } from '../../model/templates'

export const CARD_LAYOUT_WIDTH = 514
export const CARD_LAYOUT_HEIGHT = 363
const PREVIEW_MAX_WIDTH = 514
const PREVIEW_MAX_HEIGHT = 363
const CSS_PIXELS_PER_MM = 96 / 25.4
export const PRINT_GAP_MM = 3
export const A4_PRINTABLE_WIDTH_MM = 190
export const A4_PRINTABLE_HEIGHT_MM = 277

export const getCardSize = (template: PassTemplate): TemplateCardSize => ({
	widthMm: template.design.cardSize?.widthMm ?? DEFAULT_CARD_SIZE.widthMm,
	heightMm: template.design.cardSize?.heightMm ?? DEFAULT_CARD_SIZE.heightMm,
})

export const getCardDimensions = (
	template: PassTemplate,
	print: boolean,
	previewMaxWidth = PREVIEW_MAX_WIDTH,
	previewMaxHeight = PREVIEW_MAX_HEIGHT,
) => {
	const size = getCardSize(template)
	const previewPixelsPerMm = Math.min(
		previewMaxWidth / size.widthMm,
		previewMaxHeight / size.heightMm,
	)
	const widthPx = print ? size.widthMm * CSS_PIXELS_PER_MM : size.widthMm * previewPixelsPerMm
	const heightPx = print ? size.heightMm * CSS_PIXELS_PER_MM : size.heightMm * previewPixelsPerMm
	const scaleX = widthPx / CARD_LAYOUT_WIDTH
	const scaleY = heightPx / CARD_LAYOUT_HEIGHT

	return {
		...size,
		widthPx,
		heightPx,
		scaleX,
		scaleY,
		contentScale: Math.min(scaleX, scaleY),
	}
}

export const getA4PrintLayout = (template: PassTemplate, kind: TemplateKind) => {
	const { widthMm, heightMm } = getCardSize(template)
	const itemWidth = kind === 'certificate' ? widthMm * 2 + PRINT_GAP_MM : widthMm
	const columns = Math.floor((A4_PRINTABLE_WIDTH_MM + PRINT_GAP_MM) / (itemWidth + PRINT_GAP_MM))
	const rows = Math.floor((A4_PRINTABLE_HEIGHT_MM + PRINT_GAP_MM) / (heightMm + PRINT_GAP_MM))
	const fits = columns > 0 && rows > 0
	return {
		fits,
		columns,
		rows,
		cardsPerPage: fits ? columns * rows : 1,
		itemWidthMm: itemWidth,
		itemHeightMm: heightMm,
	}
}

export const getCardsPerA4Page = (template: PassTemplate, kind: TemplateKind) =>
	getA4PrintLayout(template, kind).cardsPerPage
