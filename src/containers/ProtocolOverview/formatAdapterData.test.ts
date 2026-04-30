import { describe, expect, it } from 'vitest'
import type { IAdapterProtocolMetrics } from '~/containers/DimensionAdapters/api.types'
import { formatAdapterData } from './formatAdapterData'

function createAdapterMetrics(overrides: Partial<IAdapterProtocolMetrics> = {}): IAdapterProtocolMetrics {
	return {
		chain: null,
		allChains: ['Ethereum', 'Base'],
		total24h: 12,
		total48hto24h: 8,
		total7d: 70,
		total14dto7d: 64,
		total60dto30d: 250,
		total30d: 300,
		total1y: 3500,
		change_1d: 1,
		change_7d: 2,
		change_1m: 3,
		change_7dover7d: 4,
		change_30dover30d: 5,
		totalAllTime: 1500,
		defillamaId: '1',
		name: 'gauntlet',
		displayName: 'Gauntlet',
		module: 'fees',
		category: 'Analytics',
		logo: 'https://example.com/logo.png',
		chains: ['Ethereum', 'Base'],
		protocolType: 'protocol',
		methodologyURL: 'https://example.com/methodology',
		methodology: { Fees: 'Fees methodology', Volume: 'Volume methodology' },
		parentProtocol: null,
		slug: 'gauntlet',
		linkedProtocols: ['Gauntlet'],
		id: 'gauntlet',
		gecko_id: null,
		description: 'Example protocol',
		url: 'https://example.com',
		github: [],
		governanceID: null,
		treasury: null,
		cmcId: null,
		defaultChartView: 'weekly',
		...overrides
	}
}

describe('formatAdapterData', () => {
	it('slims chain breakdown into key metrics shape', () => {
		const result = formatAdapterData({
			data: createAdapterMetrics({
				chainBreakdown: {
					Ethereum: {
						total24h: 4,
						total48hto24h: 3,
						total7d: 28,
						total14dto7d: 24,
						total30d: 120,
						total60dto30d: 100,
						total1y: 1000,
						total7DaysAgo: 20,
						total30DaysAgo: 110,
						totalAllTime: 700,
						average1y: 90,
						monthlyAverage1y: 80,
						change_1d: 1,
						change_7d: 2,
						change_1m: 3,
						change_7dover7d: 4,
						change_30dover30d: 5
					},
					Base: {
						total24h: 8,
						total48hto24h: 5,
						total7d: 42,
						total14dto7d: 40,
						total30d: 180,
						total60dto30d: 150,
						total1y: 1200,
						total7DaysAgo: 30,
						total30DaysAgo: 160,
						totalAllTime: 800,
						average1y: 100,
						monthlyAverage1y: 90,
						change_1d: 2,
						change_7d: 3,
						change_1m: 4,
						change_7dover7d: 5,
						change_30dover30d: 6
					}
				}
			}),
			methodologyKey: 'Fees'
		})

		expect(result).toMatchObject({
			total24h: 12,
			total7d: 70,
			total30d: 300,
			total1y: 3500,
			totalAllTime: 1500,
			methodology: 'Fees methodology',
			methodologyURL: 'https://example.com/methodology',
			defaultChartView: 'weekly',
			chainBreakdown: {
				Ethereum: {
					total24h: 4,
					total7d: 28,
					total30d: 120,
					totalAllTime: 700
				},
				Base: {
					total24h: 8,
					total7d: 42,
					total30d: 180,
					totalAllTime: 800
				}
			}
		})
	})

	it('normalizes missing or empty chain breakdowns to null', () => {
		expect(formatAdapterData({ data: createAdapterMetrics(), methodologyKey: 'Fees' })?.chainBreakdown).toBeNull()

		expect(
			formatAdapterData({
				data: createAdapterMetrics({ chainBreakdown: {} }),
				methodologyKey: 'Fees'
			})?.chainBreakdown
		).toBeNull()
	})

	it('preserves child methodology behavior', () => {
		const result = formatAdapterData({
			data: createAdapterMetrics({
				childProtocols: [
					{
						name: 'gauntlet-v1',
						defillamaId: '1',
						displayName: 'Gauntlet V1',
						methodologyURL: 'https://example.com/v1',
						methodology: { CustomMetric: 'Custom methodology V1' },
						breakdownMethodology: {},
						defaultChartView: 'daily'
					},
					{
						name: 'gauntlet-v2',
						defillamaId: '2',
						displayName: 'Gauntlet V2',
						methodologyURL: 'https://example.com/v2',
						methodology: { CustomMetric: 'Custom methodology V2' },
						breakdownMethodology: {},
						defaultChartView: 'daily'
					}
				]
			}),
			methodologyKey: 'CustomMetric'
		})

		expect(result).toMatchObject({
			defaultChartView: 'weekly',
			childMethodologies: [
				['Gauntlet V1', 'Custom methodology V1', 'https://example.com/v1'],
				['Gauntlet V2', 'Custom methodology V2', 'https://example.com/v2']
			]
		})
	})
})
