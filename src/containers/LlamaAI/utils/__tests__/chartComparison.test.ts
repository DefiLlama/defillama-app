import { describe, expect, it } from 'vitest'
import { areChartDataEqual } from '~/containers/LlamaAI/utils/chartComparison'

describe('areChartDataEqual', () => {
	it('treats equivalent keyed chart payloads as equal', () => {
		const rows = [{ date: '2026-01-01', value: 1 }]

		expect(areChartDataEqual({ chart_1: rows }, { chart_1: rows })).toBe(true)
		expect(areChartDataEqual({ chart_1: rows }, { chart_1: [{ date: '2026-01-01', value: 1 }] })).toBe(true)
		expect(areChartDataEqual({ chart_1: rows }, { chart_1: [{ date: '2026-01-01', value: 2 }] })).toBe(false)
	})

	it('compares tuple rows used by scatter and pie chart adapters', () => {
		expect(areChartDataEqual({ scatter: [[1, 2, 'Aave', 'aave']] }, { scatter: [[1, 2, 'Aave', 'aave']] })).toBe(true)
	})
})
