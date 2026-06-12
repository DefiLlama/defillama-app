import { describe, expect, it } from 'vitest'
import {
	applyProtocolTaxonomyTvlSettings,
	applyProtocolsCategoriesTvlSettings,
	buildProtocolsCategoriesTvlCharts,
	getEnabledProtocolTaxonomyTvls,
	getEnabledProtocolsCategoriesTvls
} from '../tvl'
import type {
	IProtocolTaxonomyPageData,
	IProtocolsCategoriesExtraTvlPoint,
	IProtocolsCategoriesTableRow
} from '../types'

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

const makeExtraTvlPoint = ({
	tvl,
	tvlPrevDay,
	tvlPrevWeek,
	tvlPrevMonth
}: IProtocolsCategoriesExtraTvlPoint): IProtocolsCategoriesExtraTvlPoint => ({
	tvl,
	tvlPrevDay,
	tvlPrevWeek,
	tvlPrevMonth
})

const makeCategoryRow = ({
	name = 'Dexes',
	tvl,
	tvlPrevDay,
	tvlPrevWeek,
	tvlPrevMonth,
	extraTvls = {},
	subRows
}: {
	name?: string
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	extraTvls?: IProtocolsCategoriesTableRow['extraTvls']
	subRows?: Array<IProtocolsCategoriesTableRow>
}): IProtocolsCategoriesTableRow => ({
	name,
	protocols: 1,
	tvl,
	tvlPrevDay,
	tvlPrevWeek,
	tvlPrevMonth,
	revenue: 0,
	extraTvls,
	change_1d: null,
	change_7d: null,
	change_1m: null,
	description: '',
	subRows
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

	it('excludes double counted and liquid staking from categories page enabled extras', () => {
		expect(
			getEnabledProtocolsCategoriesTvls({
				staking: true,
				borrowed: true,
				doublecounted: true,
				liquidstaking: true
			})
		).toEqual(['staking', 'borrowed'])
	})

	it('builds categories charts with enabled extras for selected categories', () => {
		const result = buildProtocolsCategoriesTvlCharts({
			categories: ['Dexes', 'Lending'],
			categoryColors: { Dexes: '#f00', Lending: '#0f0' },
			chartSource: [{ timestamp: 1_000, Dexes: 100, Lending: 200 }],
			extraTvlCharts: {
				Dexes: {
					staking: { 1_000: 25 },
					borrowed: { 1_000: 50 }
				},
				Lending: {
					staking: { 1_000: 75 }
				}
			},
			selectedCategories: ['Dexes'],
			enabledTvls: ['staking']
		})

		expect(result.dataset).toEqual({
			dimensions: ['timestamp', 'Dexes'],
			source: [{ timestamp: 1_000, Dexes: 125 }]
		})
		expect(result.charts).toEqual([
			{
				type: 'line',
				name: 'Dexes',
				encode: { x: 'timestamp', y: 'Dexes' },
				stack: 'stackA',
				color: '#f00'
			}
		])
	})

	it('recalculates categories table rows with enabled extras and leaves excluded extras out', () => {
		const enabledTvls = getEnabledProtocolsCategoriesTvls({
			staking: true,
			doublecounted: true,
			liquidstaking: true
		})

		const result = applyProtocolsCategoriesTvlSettings({
			tableData: [
				makeCategoryRow({
					tvl: 100,
					tvlPrevDay: 90,
					tvlPrevWeek: 80,
					tvlPrevMonth: 70,
					extraTvls: {
						staking: makeExtraTvlPoint({ tvl: 20, tvlPrevDay: 10, tvlPrevWeek: 5, tvlPrevMonth: 0 }),
						doublecounted: makeExtraTvlPoint({ tvl: 30, tvlPrevDay: 30, tvlPrevWeek: 30, tvlPrevMonth: 30 })
					},
					subRows: [
						makeCategoryRow({
							name: 'Dex tag',
							tvl: 50,
							tvlPrevDay: 40,
							tvlPrevWeek: 30,
							tvlPrevMonth: 20,
							extraTvls: {
								staking: makeExtraTvlPoint({ tvl: 5, tvlPrevDay: 4, tvlPrevWeek: 3, tvlPrevMonth: 2 })
							}
						})
					]
				})
			],
			enabledTvls
		})

		expect(result[0].tvl).toBe(120)
		expect(result[0].tvlPrevDay).toBe(100)
		expect(result[0].change_1d).toBe(20)
		expect(result[0].change_7d).toBeCloseTo(41.176470588)
		expect(result[0].subRows?.[0]).toMatchObject({
			tvl: 55,
			tvlPrevDay: 44,
			tvlPrevWeek: 33,
			tvlPrevMonth: 22
		})
	})
})
