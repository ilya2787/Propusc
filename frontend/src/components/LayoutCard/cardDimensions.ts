import { DEFAULT_CARD_SIZE, type PassTemplate, type TemplateCardSize, type TemplateKind } from '../../model/templates'

export const CARD_LAYOUT_WIDTH = 514
export const CARD_LAYOUT_HEIGHT = 363
const PREVIEW_MAX_WIDTH = 514
const PREVIEW_MAX_HEIGHT = 363
const CSS_PIXELS_PER_MM = 96 / 25.4
export const PRINT_GAP_MM = 3
export const A4_PRINTABLE_WIDTH_MM = 210
export const A4_PRINTABLE_HEIGHT_MM = 297
export const PRINT_PAGE_MARGIN_MM = 10

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
	const layout = template.design.printLayout ?? 'horizontal'
	const usePageMargins = true
	const printableWidth = A4_PRINTABLE_WIDTH_MM - (usePageMargins ? PRINT_PAGE_MARGIN_MM * 2 : 0)
	const printableHeight = A4_PRINTABLE_HEIGHT_MM - (usePageMargins ? PRINT_PAGE_MARGIN_MM * 2 : 0)
	const itemWidth = kind === 'certificate' && layout === 'horizontal' ? widthMm * 2 + PRINT_GAP_MM : widthMm
	const itemHeight = kind === 'certificate' && layout === 'vertical' ? heightMm * 2 + PRINT_GAP_MM : heightMm
	const columns = Math.floor((printableWidth + PRINT_GAP_MM) / (itemWidth + PRINT_GAP_MM))
	const rows = Math.floor((printableHeight + PRINT_GAP_MM) / (itemHeight + PRINT_GAP_MM))
	const fits = columns > 0 && rows > 0
	const onePerPage = kind === 'certificate' && layout !== 'horizontal'
	return {
		fits,
		columns,
		rows,
		cardsPerPage: fits ? (onePerPage ? 1 : columns * rows) : 1,
		itemWidthMm: itemWidth,
		itemHeightMm: itemHeight,
		usePageMargins,
	}
}

export const getCardsPerA4Page = (template: PassTemplate, kind: TemplateKind) =>
	getA4PrintLayout(template, kind).cardsPerPage
