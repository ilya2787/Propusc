import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATES, type PassTemplate, type TemplateKind } from '../../model/templates'
import { getA4PrintLayout, getCardDimensions } from './cardDimensions'

const templateWithSize = (kind: TemplateKind, widthMm: number, heightMm: number): PassTemplate => ({
	...DEFAULT_TEMPLATES[kind === 'pass' ? 0 : 1],
	kind,
	design: {
		...DEFAULT_TEMPLATES[kind === 'pass' ? 0 : 1].design,
		cardSize: { widthMm, heightMm },
	},
})

describe('Размещение на печатном листе A4', () => {
	it('размещает десять стандартных пропусков на листе A4', () => {
		const layout = getA4PrintLayout(templateWithSize('pass', 70, 48), 'pass')
		expect(layout).toMatchObject({ fits: true, columns: 2, rows: 5, cardsPerPage: 10 })
	})

	it('размещает пять двусторонних удостоверений на листе A4', () => {
		const layout = getA4PrintLayout(templateWithSize('certificate', 70, 48), 'certificate')
		expect(layout).toMatchObject({ fits: true, columns: 1, rows: 5, cardsPerPage: 5, itemWidthMm: 143 })
	})

	it('пересчитывает вместимость для увеличенного пропуска', () => {
		const layout = getA4PrintLayout(templateWithSize('pass', 90, 60), 'pass')
		expect(layout).toMatchObject({ fits: true, columns: 2, rows: 4, cardsPerPage: 8 })
	})

	it('отклоняет удостоверение, две стороны которого превышают ширину печатной области', () => {
		const layout = getA4PrintLayout(templateWithSize('certificate', 94, 48), 'certificate')
		expect(layout).toMatchObject({ fits: false, columns: 0, cardsPerPage: 1 })
	})
})

describe('Размеры карточки', () => {
	it('сохраняет предпросмотр в заданных границах и физический размер при печати', () => {
		const template = templateWithSize('pass', 90, 60)
		const preview = getCardDimensions(template, false, 300, 200)
		const print = getCardDimensions(template, true)
		expect(preview.widthPx).toBeLessThanOrEqual(300)
		expect(preview.heightPx).toBeLessThanOrEqual(200)
		expect(print.widthPx).toBeCloseTo(90 * 96 / 25.4)
		expect(print.heightPx).toBeCloseTo(60 * 96 / 25.4)
	})
})
