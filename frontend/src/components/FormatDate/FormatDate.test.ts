import { describe, expect, it } from 'vitest'
import { formatDate } from './FormatDate'

describe('formatDate', () => {
	it('formats a template date with a nominative month and year suffix', () => {
		expect(formatDate('2026-08-12', 'nominative')).toBe('«12» августа 2026 года')
	})
})
