import { describe, expect, it } from 'vitest'
import { buildProtocolTaxonomyGroupedCharts } from '../chartGrouping'
import type { IProtocolTaxonomyPageData } from '../types'

const toMs = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day)

function makeCharts(): IProtocolTaxonomyPageData['charts'] {
	return {
		dataset: {
			dimensions: ['timestamp', 'Volume', 'TVL'],
			source: [
				{ timestamp: toMs(2024, 1, 1), Volume: 10, TVL: 100 },
				{ timestamp: toMs(2024, 1, 2), Volume: null, TVL: 120 },
				{ timestamp: toMs(2024, 1, 3), Volume: 30, TVL: null }
			]
		},
		charts: [
			{ type: 'bar', name: 'Volume', encode: { x: 'timestamp', y: 'Volume' } },
			{ type: 'line', name: 'TVL', encode: { x: 'timestamp', y: 'TVL' } }
		]
	}
}

describe('buildProtocolTaxonomyGroupedCharts', () => {
	it('groups bar and line series while preserving sparse null values', () => {
		const grouped = buildProtocolTaxonomyGroupedCharts({ charts: makeCharts(), groupBy: 'daily' })

		expect(grouped.dataset).toEqual({
			dimensions: ['timestamp', 'Volume', 'TVL'],
			source: [
				{ timestamp: toMs(2024, 1, 1), Volume: 10, TVL: 100 },
				{ timestamp: toMs(2024, 1, 2), TVL: 120, Volume: null },
				{ timestamp: toMs(2024, 1, 3), Volume: 30, TVL: null }
			]
		})
		expect(grouped.charts.map((series) => series.type)).toEqual(['bar', 'line'])
	})

	it('renders cumulative bar groupings as line series', () => {
		const grouped = buildProtocolTaxonomyGroupedCharts({ charts: makeCharts(), groupBy: 'cumulative' })

		expect(grouped.charts[0].type).toBe('line')
		expect(grouped.dataset.source.map((row) => row.Volume)).toEqual([10, null, 40])
	})

	it('returns the original chart object when bar series have no numeric values', () => {
		const charts = makeCharts()
		charts.dataset.source = [
			{ timestamp: toMs(2024, 1, 1), Volume: null, TVL: 100 },
			{ timestamp: toMs(2024, 1, 2), Volume: null, TVL: 120 }
		]

		expect(buildProtocolTaxonomyGroupedCharts({ charts, groupBy: 'daily' })).toBe(charts)
	})
})
