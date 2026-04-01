import { describe, expect, it } from 'vitest'
import {
	formatRwaTreemapBoxLabel,
	formatRwaTreemapTooltip,
	formatRwaUpperLabel,
	normalizeTreemapValue
} from './rwaFormatting'

describe('rwa treemap formatting', () => {
	it('keeps flat box and upper labels name-only', () => {
		expect(formatRwaTreemapBoxLabel({ name: 'Tesla' })).toBe('Tesla')
		expect(formatRwaUpperLabel({ name: 'Tesla' })).toBe('Tesla')
	})

	it('formats flat-node tooltips with share of total only', () => {
		const tooltip = formatRwaTreemapTooltip({
			info: {
				name: 'Tesla',
				value: [3, 6.12, 6.12],
				treePathInfo: [{ name: 'Ref Asset' }, { name: 'Tesla' }]
			},
			valueLabel: 'Markets',
			formatMetricValue: (value) => String(value)
		})

		expect(tooltip).toContain('Tesla<br>')
		expect(tooltip).toContain('Markets: 3<br>')
		expect(tooltip).toContain('Share of Total: 6.12%<br>')
		expect(tooltip).not.toContain('Share of Parent')
	})

	it('formats nested-node tooltips with explicit parent and total shares', () => {
		const tooltip = formatRwaTreemapTooltip({
			info: {
				name: 'xyz:META',
				value: [2, 66.67, 44.44],
				treePathInfo: [{ name: 'Ref Asset' }, { name: 'Meta' }, { name: 'xyz:META' }]
			},
			valueLabel: 'Markets',
			formatMetricValue: (value) => String(value)
		})

		expect(tooltip).toContain('Parent: Meta<br>')
		expect(tooltip).toContain('Child: xyz:META<br>')
		expect(tooltip).toContain('Markets: 2<br>')
		expect(tooltip).toContain('Share of Parent: 66.67%<br>')
		expect(tooltip).toContain('Share of Total: 44.44%<br>')
	})

	it('normalizes treemap values into a consistent numeric tuple', () => {
		expect(normalizeTreemapValue([3, '6.12', null])).toEqual([3, 6.12, null])
		expect(normalizeTreemapValue(5)).toEqual([5, null, null])
		expect(normalizeTreemapValue(undefined)).toEqual([0, null, null])
	})
})
