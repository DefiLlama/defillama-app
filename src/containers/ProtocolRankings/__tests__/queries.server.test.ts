import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyProtocolTvlSettings } from '~/containers/ProtocolLists/utils'

const {
	fetchCoinPricesMock,
	fetchAdapterChainMetricsMock,
	getAdapterChainOverviewMock,
	getProtocolEmissionsLookupFromAggregatedMock,
	fetchProtocolsMock
} = vi.hoisted(() => ({
	fetchCoinPricesMock: vi.fn(),
	fetchAdapterChainMetricsMock: vi.fn(),
	getAdapterChainOverviewMock: vi.fn(),
	getProtocolEmissionsLookupFromAggregatedMock: vi.fn(),
	fetchProtocolsMock: vi.fn()
}))

vi.mock('~/api/pricing', () => ({
	fetchCoinPrices: fetchCoinPricesMock
}))

vi.mock('~/containers/AdapterMetrics/api', () => ({
	fetchAdapterChainMetrics: fetchAdapterChainMetricsMock
}))

vi.mock('~/containers/AdapterMetrics/queries', () => ({
	getAdapterChainOverview: getAdapterChainOverviewMock
}))

vi.mock('~/containers/Incentives/queries', () => ({
	getProtocolEmissionsLookupFromAggregated: getProtocolEmissionsLookupFromAggregatedMock
}))

vi.mock('~/containers/ProtocolLists/api', () => ({
	fetchProtocols: fetchProtocolsMock
}))

import { getProtocolsByChain } from '../queries.server'

const protocolMetadata = {
	'parent#alpha': { displayName: 'Alpha Parent', chains: ['Ethereum', 'Optimism'] },
	'parent#empty': { displayName: 'Empty Parent', chains: ['Ethereum'] },
	'child-alpha-one': { displayName: 'Alpha One', chains: ['Ethereum', 'Arbitrum'] },
	'child-alpha-two': { displayName: 'Alpha Two', chains: ['Optimism', 'Ethereum'] },
	'solo-protocol': { displayName: 'Solo Protocol', chains: ['Ethereum'] }
}

const chainMetadata = {
	ethereum: { id: 'ethereum', name: 'Ethereum', fees: true, dexs: true }
}

const chainFilteredProtocolMetadata = {
	...protocolMetadata,
	'child-alpha-two': { displayName: 'Alpha Two', chains: ['Optimism'] }
}

const tvlEntry = (
	tvl: number | null,
	tvlPrevDay: number | null,
	tvlPrevWeek: number | null,
	tvlPrevMonth: number | null
) => ({
	tvl,
	tvlPrevDay,
	tvlPrevWeek,
	tvlPrevMonth
})

const liteProtocol = (overrides: Record<string, unknown>) => ({
	category: 'Dexes',
	tags: [],
	chains: ['Ethereum'],
	mcap: null,
	name: 'Protocol',
	symbol: 'PROTOCOL',
	logo: '',
	url: '',
	tvl: 0,
	tvlPrevDay: 0,
	tvlPrevWeek: 0,
	tvlPrevMonth: 0,
	chainTvls: {},
	defillamaId: 'protocol',
	oraclesByChain: {},
	...overrides
})

const metricRow = (defillamaId: string, totals: Record<string, number | null>) => ({
	defillamaId,
	total24h: totals.total24h ?? null,
	total7d: totals.total7d ?? null,
	total30d: totals.total30d ?? null,
	total1y: totals.total1y ?? null,
	annualized1y: totals.annualized1y ?? null,
	monthlyAverage1y: totals.monthlyAverage1y ?? null,
	totalAllTime: totals.totalAllTime ?? null,
	change_7dover7d: totals.change_7dover7d ?? null
})

describe('getProtocolsByChain parent aggregation', () => {
	beforeEach(() => {
		fetchCoinPricesMock.mockReset()
		fetchAdapterChainMetricsMock.mockReset()
		getAdapterChainOverviewMock.mockReset()
		getProtocolEmissionsLookupFromAggregatedMock.mockReset()
		fetchProtocolsMock.mockReset()

		fetchCoinPricesMock.mockResolvedValue({})
		getProtocolEmissionsLookupFromAggregatedMock.mockResolvedValue({})
		getAdapterChainOverviewMock.mockResolvedValue({
			protocols: [
				metricRow('child-alpha-one', { total24h: 100, total7d: 700, totalAllTime: 10_000 }),
				metricRow('child-alpha-two', { total24h: 50, total7d: 350, totalAllTime: 5_000 })
			]
		})
		fetchAdapterChainMetricsMock.mockImplementation(({ dataType }: { dataType?: string }) => {
			if (dataType === 'dailyRevenue') {
				return Promise.resolve({
					protocols: [
						metricRow('child-alpha-one', {
							total24h: 10,
							total7d: 70,
							total30d: 300,
							annualized1y: 2700,
							totalAllTime: 3000
						}),
						metricRow('child-alpha-two', {
							total24h: 5,
							total7d: 35,
							total30d: 150,
							annualized1y: null,
							totalAllTime: 1500
						})
					]
				})
			}

			if (dataType === 'dailyHoldersRevenue') {
				return Promise.resolve({
					protocols: [metricRow('child-alpha-one', { total24h: 4, total7d: 28, total30d: 120 })]
				})
			}

			return Promise.resolve({
				protocols: [
					metricRow('child-alpha-one', {
						total24h: 20,
						total7d: 140,
						total30d: 600,
						annualized1y: 3000,
						totalAllTime: 6000
					}),
					metricRow('child-alpha-two', {
						total24h: 8,
						total7d: 56,
						total30d: 240,
						annualized1y: 2400,
						totalAllTime: 2400
					})
				]
			})
		})
	})

	it('groups multiple eligible children under the parent and preserves current TVL, extras, null prev values, and child order', async () => {
		fetchProtocolsMock.mockResolvedValue({
			chains: ['Ethereum', 'Optimism'],
			parentProtocols: [
				{ id: 'parent#alpha', name: 'Alpha Parent', chains: ['Ethereum', 'Optimism'], mcap: 540 },
				{ id: 'parent#empty', name: 'Empty Parent', chains: ['Ethereum'], mcap: 100 }
			],
			protocols: [
				liteProtocol({
					defillamaId: 'child-alpha-one',
					name: 'Alpha One Raw',
					category: 'Dexes',
					chains: ['Ethereum', 'Arbitrum'],
					parentProtocol: 'parent#alpha',
					mcap: 1000,
					tvl: 100,
					tvlPrevDay: 90,
					tvlPrevWeek: null,
					tvlPrevMonth: 50,
					chainTvls: {
						Ethereum: tvlEntry(100, 90, null, 50),
						staking: tvlEntry(10, 9, 8, 7),
						doublecounted: tvlEntry(1, 1, 1, 1),
						excludeParent: tvlEntry(30, 5, 4, 3)
					}
				}),
				liteProtocol({
					defillamaId: 'child-alpha-two',
					name: 'Alpha Two Raw',
					category: 'Lending',
					chains: ['Optimism', 'Ethereum'],
					parentProtocol: 'parent#alpha',
					mcap: 500,
					tvl: 200,
					tvlPrevDay: null,
					tvlPrevWeek: 180,
					tvlPrevMonth: 100,
					chainTvls: {
						Ethereum: tvlEntry(200, null, 180, 100),
						staking: tvlEntry(20, 19, null, 17)
					}
				}),
				liteProtocol({
					defillamaId: 'solo-protocol',
					name: 'Solo Raw',
					category: 'Dexes',
					chains: ['Ethereum'],
					tvl: 50,
					tvlPrevDay: 40,
					tvlPrevWeek: 30,
					tvlPrevMonth: 20,
					chainTvls: {
						Ethereum: tvlEntry(50, 40, 30, 20)
					}
				})
			]
		})

		const data = await getProtocolsByChain({
			chain: 'All',
			chainMetadata,
			protocolMetadata: protocolMetadata as any
		})

		expect(data?.protocols.map((protocol) => protocol.name)).toEqual(['Alpha Parent', 'Solo Protocol'])
		expect(data?.protocols.map((protocol) => protocol.name)).not.toContain('Empty Parent')

		const parent = data?.protocols[0]
		expect(parent).toMatchObject({
			name: 'Alpha Parent',
			category: null,
			chains: ['Ethereum', 'Arbitrum', 'Optimism'],
			strikeTvl: true,
			tvl: {
				default: { tvl: 270, tvlPrevDay: null, tvlPrevWeek: null, tvlPrevMonth: 147 },
				staking: { tvl: 30, tvlPrevDay: 28, tvlPrevWeek: null, tvlPrevMonth: 24 },
				doublecounted: { tvl: 1, tvlPrevDay: 1, tvlPrevWeek: 1, tvlPrevMonth: 1 },
				excludeParent: { tvl: 30, tvlPrevDay: 5, tvlPrevWeek: 4, tvlPrevMonth: 3 }
			},
			tvlChange: { change1d: null, change7d: null, change1m: expect.any(Number) },
			fees: { total24h: 28, total7d: 196, total30d: 840, annualized1y: 5400, totalAllTime: 8400, pf: 0.1 },
			revenue: { total24h: 15, total7d: 105, total30d: 450, annualized1y: 2700, totalAllTime: 4500, ps: 0.2 },
			holdersRevenue: { total24h: 4, total7d: 28, total30d: 120 },
			dexs: { total24h: 150, total7d: 1050, totalAllTime: 15_000 }
		})
		expect(parent?.childProtocols?.map((protocol) => protocol.name)).toEqual(['Alpha One', 'Alpha Two'])
		expect(parent?.childProtocols?.map((protocol) => protocol.fees?.pf ?? null)).toEqual([0.33, 0.21])
		expect(parent?.childProtocols?.map((protocol) => protocol.revenue?.ps ?? null)).toEqual([0.37, null])

		const withStakingAndMin = applyProtocolTvlSettings({
			protocols: data?.protocols ?? [],
			extraTvlsEnabled: { staking: true },
			minTvl: 280,
			maxTvl: null
		})
		expect(withStakingAndMin.map((protocol) => protocol.name)).toEqual(['Alpha Parent'])
		expect(withStakingAndMin[0].tvl?.default.tvl).toBe(300)
	})

	it('keeps a single eligible child ungrouped when the chain filter leaves only one child under a parent', async () => {
		fetchProtocolsMock.mockResolvedValue({
			chains: ['Ethereum', 'Optimism'],
			parentProtocols: [{ id: 'parent#alpha', name: 'Alpha Parent', chains: ['Ethereum', 'Optimism'], mcap: 540 }],
			protocols: [
				liteProtocol({
					defillamaId: 'child-alpha-one',
					name: 'Alpha One Raw',
					category: 'Dexes',
					chains: ['Ethereum'],
					parentProtocol: 'parent#alpha',
					tvl: 100,
					tvlPrevDay: 90,
					tvlPrevWeek: 80,
					tvlPrevMonth: 70,
					chainTvls: {
						Ethereum: tvlEntry(100, 90, 80, 70)
					}
				}),
				liteProtocol({
					defillamaId: 'child-alpha-two',
					name: 'Alpha Two Raw',
					category: 'Lending',
					chains: ['Optimism'],
					parentProtocol: 'parent#alpha',
					tvl: 200,
					tvlPrevDay: 190,
					tvlPrevWeek: 180,
					tvlPrevMonth: 170,
					chainTvls: {
						Optimism: tvlEntry(200, 190, 180, 170)
					}
				})
			]
		})

		const data = await getProtocolsByChain({
			chain: 'Ethereum',
			chainMetadata,
			protocolMetadata: chainFilteredProtocolMetadata as any
		})

		expect(data?.protocols).toHaveLength(1)
		expect(data?.protocols[0]).toMatchObject({
			name: 'Alpha One',
			tvl: {
				default: { tvl: 100, tvlPrevDay: 90, tvlPrevWeek: 80, tvlPrevMonth: 70 }
			}
		})
		expect(data?.protocols[0]).not.toHaveProperty('childProtocols')
	})
})
