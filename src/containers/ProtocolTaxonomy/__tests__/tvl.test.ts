import { describe, expect, it } from 'vitest'
import { applyProtocolTaxonomyTvlSettings, getEnabledProtocolTaxonomyTvls } from '../tvl'
import type { IProtocolTaxonomyPageData } from '../types'

const makeProtocol = ({
	name = 'Protocol',
	tvl,
	extraTvls = {},
	subRows
}: {
	name?: string
	tvl: number | null
	extraTvls?: Record<string, number>
	subRows?: IProtocolTaxonomyPageData['protocols']
}): IProtocolTaxonomyPageData['protocols'][number] => ({
	name,
	slug: name.toLowerCase(),
	logo: '',
	chains: ['Ethereum'],
	tvl,
	extraTvls,
	mcap: null,
	tags: [],
	subRows
})

const makeCharts = (): IProtocolTaxonomyPageData['charts'] => ({
	dataset: {
		dimensions: ['timestamp', 'TVL', 'Active Loans'],
		source: [
			{ timestamp: 1_000, TVL: 100, 'Active Loans': 5 },
			{ timestamp: 2_000, TVL: '200', 'Active Loans': 10 }
		]
	},
	charts: [
		{
			type: 'line',
			name: 'TVL',
			encode: { x: 'timestamp', y: 'TVL' }
		}
	]
})

describe('ProtocolTaxonomy TVL helpers', () => {
	it('returns no enabled extras when all TVL settings are disabled', () => {
		expect(getEnabledProtocolTaxonomyTvls({ staking: false, borrowed: false })).toEqual([])
	})

	it('reuses protocol rows and charts when no TVL extras are enabled', () => {
		const protocols = [makeProtocol({ tvl: 100, extraTvls: { staking: 25 } })]
		const charts = makeCharts()

		const result = applyProtocolTaxonomyTvlSettings({
			protocols,
			charts,
			extraTvlCharts: { staking: { 1_000: 25 } },
			tvlSettings: {},
			effectiveCategory: 'Dexes'
		})

		expect(result.finalProtocols).toBe(protocols)
		expect(result.charts).toBe(charts)
	})

	it('adds enabled extra TVL to protocol rows, subrows, and chart TVL series', () => {
		const result = applyProtocolTaxonomyTvlSettings({
			protocols: [
				makeProtocol({
					tvl: 100,
					extraTvls: { staking: 25, borrowed: 50 },
					subRows: [makeProtocol({ name: 'Child', tvl: null, extraTvls: { staking: 10 } })]
				})
			],
			charts: makeCharts(),
			extraTvlCharts: {
				staking: { 1_000: 25, 2_000: 30 },
				borrowed: { 1_000: 50, 2_000: 60 }
			},
			tvlSettings: { staking: true },
			effectiveCategory: 'Dexes'
		})

		expect(result.finalProtocols[0].tvl).toBe(125)
		expect(result.finalProtocols[0].subRows?.[0].tvl).toBe(10)
		expect(result.charts.dataset.source).toEqual([
			{ timestamp: 1_000, TVL: 125, 'Active Loans': 5 },
			{ timestamp: 2_000, TVL: 230, 'Active Loans': 10 }
		])
	})

	it('adds double counted and liquid staking extras without subtracting overlap', () => {
		const result = applyProtocolTaxonomyTvlSettings({
			protocols: [
				makeProtocol({
					tvl: 100,
					extraTvls: {
						doublecounted: 30,
						liquidstaking: 40,
						dcAndLsOverlap: 25
					}
				})
			],
			charts: makeCharts(),
			extraTvlCharts: {
				doublecounted: { 1_000: 30 },
				liquidstaking: { 1_000: 40 },
				dcAndLsOverlap: { 1_000: 25 }
			},
			tvlSettings: { doublecounted: true, liquidstaking: true },
			effectiveCategory: 'Dexes'
		})

		expect(result.finalProtocols[0].tvl).toBe(170)
		expect(result.charts.dataset.source[0]).toMatchObject({ TVL: 170 })
	})

	it('mirrors borrowed TVL into Active Loans only on Lending pages', () => {
		const lendingResult = applyProtocolTaxonomyTvlSettings({
			protocols: [makeProtocol({ tvl: 100, extraTvls: { borrowed: 50 } })],
			charts: makeCharts(),
			extraTvlCharts: { borrowed: { 1_000: 50, 2_000: 60 } },
			tvlSettings: { borrowed: true },
			effectiveCategory: 'Lending'
		})

		const dexResult = applyProtocolTaxonomyTvlSettings({
			protocols: [makeProtocol({ tvl: 100, extraTvls: { borrowed: 50 } })],
			charts: makeCharts(),
			extraTvlCharts: { borrowed: { 1_000: 50, 2_000: 60 } },
			tvlSettings: { borrowed: true },
			effectiveCategory: 'Dexes'
		})

		expect(lendingResult.charts.dataset.source[0]).toMatchObject({ TVL: 150, 'Active Loans': 150 })
		expect(dexResult.charts.dataset.source[0]).toMatchObject({ TVL: 150, 'Active Loans': 5 })
	})
})
