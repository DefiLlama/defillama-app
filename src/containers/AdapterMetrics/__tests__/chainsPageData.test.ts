import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '../constants'

const { fetchJsonMock, fetchProtocolsMock } = vi.hoisted(() => ({
	fetchJsonMock: vi.fn(),
	fetchProtocolsMock: vi.fn()
}))

vi.mock('~/utils/async', () => ({
	fetchJson: fetchJsonMock
}))

vi.mock('~/containers/ProtocolLists/api', () => ({
	fetchProtocols: fetchProtocolsMock
}))

import {
	getAdapterByChainPageData,
	getChainsByAdapterChartData,
	getChainsByAdapterPageData,
	getChainsByFeesAdapterPageData
} from '../queries'

const chainMetadata = {
	ethereum: {
		id: 'ethereum',
		name: 'Ethereum',
		dexs: true,
		dimAgg: {
			dexs: {
				dv: {
					'24h': 100,
					'7d': 700,
					'30d': 3000
				}
			}
		}
	}
}

const feeRevenueChainMetadata = {
	base: {
		id: 'base',
		name: 'Base',
		fees: true,
		revenue: true,
		chainFees: true
	},
	sui: {
		id: 'sui',
		name: 'Sui',
		fees: true,
		revenue: true,
		chainRevenue: true
	},
	appOnly: {
		id: 'app-only',
		name: 'App Only',
		fees: true,
		revenue: true
	}
}

const appFeeExtrasChainMetadata = {
	base: {
		id: 'base',
		name: 'Base',
		fees: true,
		dimAgg: {
			fees: {
				daf: {
					'24h': 100,
					'7d': 700,
					'30d': 3000
				},
				dbr: {
					'24h': 500,
					'7d': 3500,
					'30d': 15_000
				},
				dtt: {
					'24h': 50,
					'7d': 350,
					'30d': 1500
				}
			}
		}
	}
}

const overloadedVolumeChainMetadata = {
	ethereum: {
		id: 'ethereum',
		name: 'Ethereum',
		dexs: true,
		dimAgg: {
			dexs: {
				dv: {
					'24h': 100
				}
			}
		}
	},
	solana: {
		id: 'solana',
		name: 'Solana',
		perps: true,
		dimAgg: {
			derivatives: {
				dv: {
					'24h': 200
				}
			}
		}
	},
	optimism: {
		id: 'optimism',
		name: 'Optimism',
		dexAggregators: true,
		dimAgg: {
			aggregators: {
				dv: {
					'24h': 500
				}
			}
		}
	},
	arbitrum: {
		id: 'arbitrum',
		name: 'Arbitrum',
		perpsAggregators: true,
		dimAgg: {
			'aggregator-derivatives': {
				dv: {
					'24h': 600
				}
			}
		}
	},
	base: {
		id: 'base',
		name: 'Base',
		dexs: true,
		perps: true,
		dexAggregators: true,
		perpsAggregators: true,
		dimAgg: {
			dexs: {
				dv: {
					'24h': 300
				}
			},
			derivatives: {
				dv: {
					'24h': 400
				}
			},
			aggregators: {
				dv: {
					'24h': 700
				}
			},
			'aggregator-derivatives': {
				dv: {
					'24h': 800
				}
			}
		}
	}
}

const overloadedNotionalVolumeChainMetadata = {
	ethereum: {
		id: 'ethereum',
		name: 'Ethereum',
		dexsNotionalVolume: true,
		dimAgg: {
			dexs: {
				dnv: {
					'24h': 1000
				}
			},
			options: {
				dnv: {
					'24h': 9000
				}
			}
		}
	},
	lyra: {
		id: 'lyra',
		name: 'Lyra',
		optionsNotionalVolume: true,
		dimAgg: {
			dexs: {
				dnv: {
					'24h': 8000
				}
			},
			options: {
				dnv: {
					'24h': 2000
				}
			}
		}
	},
	base: {
		id: 'base',
		name: 'Base',
		dexsNotionalVolume: true,
		optionsNotionalVolume: true,
		dimAgg: {
			dexs: {
				dnv: {
					'24h': 3000
				}
			},
			options: {
				dnv: {
					'24h': 4000
				}
			}
		}
	}
}

const adapterProtocolRow = (overrides: Record<string, unknown>) => ({
	total24h: 0,
	total48hto24h: 0,
	total7d: 0,
	total14dto7d: 0,
	total60dto30d: 0,
	total30d: 0,
	total1y: 0,
	annualized1y: 0,
	totalAllTime: 0,
	average1y: 0,
	monthlyAverage1y: 0,
	change_1d: 0,
	change_7d: 0,
	change_1m: 0,
	change_7dover7d: 0,
	change_30dover30d: 0,
	breakdown24h: {},
	breakdown30d: {},
	total7DaysAgo: 0,
	total30DaysAgo: 0,
	defillamaId: 'adapter-row',
	name: 'Adapter Row',
	displayName: 'Adapter Row',
	module: 'adapter-row',
	category: 'Dexes',
	logo: '',
	chains: ['Base'],
	protocolType: 'protocol',
	methodologyURL: '',
	methodology: {},
	latestFetchIsOk: true,
	parentProtocol: '',
	slug: 'adapter-row',
	linkedProtocols: [],
	id: 'adapter-row',
	...overrides
})

const adapterMetricsResponse = (overrides: Record<string, unknown> = {}) => ({
	breakdown24h: null,
	breakdown30d: null,
	chain: 'Base',
	allChains: ['Base'],
	total24h: 100,
	total48hto24h: 90,
	total7d: 700,
	total14dto7d: 600,
	total60dto30d: 2000,
	total30d: 3000,
	total1y: 36_000,
	annualized1y: 36_000,
	change_1d: 11.11,
	change_7d: 16.67,
	change_1m: 50,
	change_7dover7d: 10,
	change_30dover30d: 20,
	total7DaysAgo: 80,
	total30DaysAgo: 70,
	totalAllTime: 100_000,
	protocols: [],
	...overrides
})

function mockFeesAdapterMetrics() {
	fetchJsonMock.mockImplementation((url: string) => {
		const dataType = new URL(url).searchParams.get('dataType')

		if (dataType === ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE) {
			return Promise.resolve({
				protocols: [
					{ name: 'Base', slug: 'base', protocolType: 'chain', total24h: 500, total7d: 3500, total30d: 15_000 },
					{ name: 'Sui', slug: 'sui', protocolType: 'chain', total24h: 600, total7d: 4200, total30d: 18_000 }
				]
			})
		}

		if (dataType === ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES) {
			return Promise.resolve({
				protocols: [
					{ name: 'Base', slug: 'base', protocolType: 'chain', total24h: 50, total7d: 350, total30d: 1500 },
					{ name: 'Sui', slug: 'sui', protocolType: 'chain', total24h: 60, total7d: 420, total30d: 1800 }
				]
			})
		}

		return Promise.resolve({
			protocols: [
				{ name: 'Base', slug: 'base', protocolType: 'chain', total24h: 100, total7d: 700, total30d: 3000 },
				{ name: 'Sui', slug: 'sui', protocolType: 'chain', total24h: 200, total7d: 1400, total30d: 6000 },
				{ name: 'App Only', slug: 'app-only', protocolType: 'chain', total24h: 300, total7d: 2100, total30d: 9000 },
				{ name: 'Protocol Row', slug: 'protocol-row', protocolType: 'protocol', total24h: 400 }
			]
		})
	})
}

describe('chains by adapter page data', () => {
	beforeEach(() => {
		fetchJsonMock.mockReset()
		fetchProtocolsMock.mockReset()
		fetchProtocolsMock.mockResolvedValue({ protocols: [], parentProtocols: [] })
	})

	it('omits chart data when includeChartData is false', async () => {
		const data = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chainMetadata,
			includeChartData: false
		})

		expect(fetchJsonMock).not.toHaveBeenCalled()
		expect(data.chartData).toEqual({ dimensions: ['timestamp'], source: [] })
		expect(data.chains).toEqual([
			expect.objectContaining({
				name: 'Ethereum',
				total24h: 100,
				total7d: 700,
				total30d: 3000
			})
		])
	})

	it('attaches app fee extras without changing base chain totals', async () => {
		const data = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_APP_FEES,
			chainMetadata: appFeeExtrasChainMetadata,
			includeChartData: false
		})

		expect(fetchJsonMock).not.toHaveBeenCalled()
		expect(data.chains).toEqual([
			expect.objectContaining({
				name: 'Base',
				total24h: 100,
				total7d: 700,
				total30d: 3000,
				bribes: { total24h: 500, total7d: 3500, total30d: 15_000 },
				tokenTax: { total24h: 50, total7d: 350, total30d: 1500 }
			})
		])
	})

	it('does not attach fee extras to non-fee adapter chain rankings', async () => {
		const data = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chainMetadata,
			includeChartData: false
		})

		expect(fetchJsonMock).not.toHaveBeenCalled()
		expect(data.chains[0]).not.toHaveProperty('bribes')
		expect(data.chains[0]).not.toHaveProperty('tokenTax')
	})

	it('uses adapter type to disambiguate dailyVolume chain metadata', async () => {
		const dexData = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chainMetadata: overloadedVolumeChainMetadata,
			includeChartData: false
		})
		const perpsData = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.PERPS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chainMetadata: overloadedVolumeChainMetadata,
			includeChartData: false
		})
		const dexAggregatorData = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.AGGREGATORS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chainMetadata: overloadedVolumeChainMetadata,
			includeChartData: false
		})
		const perpsAggregatorData = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.PERPS_AGGREGATOR,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			chainMetadata: overloadedVolumeChainMetadata,
			includeChartData: false
		})

		expect(dexData.chains.map(({ name, total24h }) => ({ name, total24h }))).toEqual([
			{ name: 'Base', total24h: 300 },
			{ name: 'Ethereum', total24h: 100 }
		])
		expect(perpsData.chains.map(({ name, total24h }) => ({ name, total24h }))).toEqual([
			{ name: 'Base', total24h: 400 },
			{ name: 'Solana', total24h: 200 }
		])
		expect(dexAggregatorData.chains.map(({ name, total24h }) => ({ name, total24h }))).toEqual([
			{ name: 'Base', total24h: 700 },
			{ name: 'Optimism', total24h: 500 }
		])
		expect(perpsAggregatorData.chains.map(({ name, total24h }) => ({ name, total24h }))).toEqual([
			{ name: 'Base', total24h: 800 },
			{ name: 'Arbitrum', total24h: 600 }
		])
	})

	it('uses adapter type to disambiguate dailyNotionalVolume chain metadata', async () => {
		const dexNotionalData = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_NOTIONAL_VOLUME,
			chainMetadata: overloadedNotionalVolumeChainMetadata,
			includeChartData: false
		})
		const optionsNotionalData = await getChainsByAdapterPageData({
			adapterType: ADAPTER_TYPES.OPTIONS,
			dataType: ADAPTER_DATA_TYPES.DAILY_NOTIONAL_VOLUME,
			chainMetadata: overloadedNotionalVolumeChainMetadata,
			includeChartData: false
		})

		expect(dexNotionalData.chains.map(({ name, total24h }) => ({ name, total24h }))).toEqual([
			{ name: 'Base', total24h: 3000 },
			{ name: 'Ethereum', total24h: 1000 }
		])
		expect(optionsNotionalData.chains.map(({ name, total24h }) => ({ name, total24h }))).toEqual([
			{ name: 'Base', total24h: 4000 },
			{ name: 'Lyra', total24h: 2000 }
		])
	})

	it('builds the chart data shape used by the page', async () => {
		fetchJsonMock.mockResolvedValue([
			[2, { Ethereum: 20 }],
			[1, { Ethereum: 10, Optimism: 5 }]
		])

		const chartData = await getChainsByAdapterChartData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			allChains: ['Ethereum', 'Optimism']
		})

		expect(chartData).toEqual({
			dimensions: ['timestamp', 'Ethereum', 'Optimism'],
			source: [
				{ timestamp: 1000, Ethereum: 10, Optimism: 5 },
				{ timestamp: 2000, Ethereum: 20, Optimism: null }
			]
		})
	})

	it('throws chart fetch failures by default so API routes do not cache empty charts', async () => {
		fetchJsonMock.mockRejectedValue(new Error('upstream failed'))

		await expect(
			getChainsByAdapterChartData({
				adapterType: ADAPTER_TYPES.DEXS,
				dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
				allChains: ['Ethereum']
			})
		).rejects.toThrow('upstream failed')
	})

	it('can explicitly tolerate chart fetch failures for static page generation', async () => {
		fetchJsonMock.mockRejectedValue(new Error('upstream failed'))

		const chartData = await getChainsByAdapterChartData({
			adapterType: ADAPTER_TYPES.DEXS,
			dataType: ADAPTER_DATA_TYPES.DAILY_VOLUME,
			allChains: ['Ethereum'],
			allowEmptyOnError: true
		})

		expect(chartData).toEqual({
			dimensions: ['timestamp', 'Ethereum'],
			source: []
		})
	})

	it('keeps main DEX chain page fetch failures loud', async () => {
		fetchJsonMock.mockRejectedValue(new Error('backend contract failed'))

		await expect(
			getAdapterByChainPageData({
				adapterType: ADAPTER_TYPES.DEXS,
				chain: 'Litecoin',
				route: 'dexs',
				metricName: 'DEX Volume'
			})
		).rejects.toThrow('backend contract failed')
	})

	it('builds bribes and token-tax only protocol rows without changing base totals', async () => {
		fetchProtocolsMock.mockResolvedValue({
			protocols: [{ name: 'Core Fees', mcap: 12_000 }],
			parentProtocols: []
		})
		fetchJsonMock.mockImplementation((url: string) => {
			const parsedUrl = new URL(url)
			const dataType = parsedUrl.searchParams.get('dataType')

			if (parsedUrl.pathname.includes('/chart/')) {
				return Promise.resolve([[1_700_000_000, 100]])
			}

			if (dataType === ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE) {
				return Promise.resolve(
					adapterMetricsResponse({
						protocols: [
							{
								...adapterProtocolRow({
									defillamaId: 'extra-row',
									name: 'Extra Raw',
									displayName: 'Extra Display',
									slug: 'extra-display',
									category: 'Lending',
									methodology: undefined,
									linkedProtocols: undefined,
									total24h: 10,
									total48hto24h: 5,
									total7d: null,
									total14dto7d: 20,
									total30d: 30,
									total60dto30d: 10,
									total7DaysAgo: 8,
									total30DaysAgo: null,
									total1y: 0,
									totalAllTime: null
								})
							}
						]
					})
				)
			}

			if (dataType === ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES) {
				return Promise.resolve(
					adapterMetricsResponse({
						protocols: [
							{
								...adapterProtocolRow({
									defillamaId: 'extra-row',
									name: 'Extra Raw',
									displayName: 'Extra Display',
									slug: 'extra-display',
									category: 'Lending',
									total24h: null,
									total48hto24h: 5,
									total7d: 7,
									total14dto7d: 8,
									total30d: 0,
									total60dto30d: 5,
									total7DaysAgo: 2,
									total30DaysAgo: 4,
									total1y: null,
									totalAllTime: 70
								})
							},
							{
								...adapterProtocolRow({
									defillamaId: 'token-tax-only',
									name: 'Token Tax Raw',
									displayName: 'Token Tax Display',
									slug: 'token-tax-display',
									category: undefined,
									total24h: 5,
									total7d: 0,
									total30d: null,
									total1y: 50,
									totalAllTime: 500
								})
							}
						]
					})
				)
			}

			return Promise.resolve(
				adapterMetricsResponse({
					protocols: [
						adapterProtocolRow({
							defillamaId: 'core-fees',
							name: 'Core Fees',
							displayName: 'Core Fees',
							slug: 'core-fees',
							total24h: 100,
							total7d: 700,
							total30d: 3000,
							total1y: 36_000,
							annualized1y: 60_000,
							totalAllTime: 100_000
						})
					]
				})
			)
		})

		const data = await getAdapterByChainPageData({
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'Base',
			dataType: ADAPTER_DATA_TYPES.DAILY_FEES,
			route: 'fees',
			metricName: 'Fees'
		})

		expect(data?.total24h).toBe(100)
		const protocolsByName = new Map(data?.protocols.map((protocol) => [protocol.name, protocol]))
		expect(Array.from(protocolsByName.keys())).toEqual(
			expect.arrayContaining(['Core Fees', 'Extra Display', 'Token Tax Display'])
		)
		expect(protocolsByName.get('Core Fees')).toMatchObject({
			name: 'Core Fees',
			total24h: 100,
			total7d: 700,
			total30d: 3000,
			annualized1y: 60_000
		})

		const extraRow = protocolsByName.get('Extra Display')
		expect(extraRow).toMatchObject({
			name: 'Extra Display',
			slug: 'extra-display',
			chains: ['Base'],
			category: 'Lending',
			total24h: null,
			total7d: null,
			total30d: null,
			total1y: null,
			totalAllTime: null,
			bribes: {
				total24h: 10,
				total48hto24h: 5,
				total7d: null,
				total14dto7d: 20,
				total30d: 30,
				total60dto30d: 10,
				total7DaysAgo: 8,
				total30DaysAgo: null,
				total1y: 0,
				totalAllTime: null
			},
			tokenTax: {
				total24h: null,
				total48hto24h: 5,
				total7d: 7,
				total14dto7d: 8,
				total30d: 0,
				total60dto30d: 5,
				total7DaysAgo: 2,
				total30DaysAgo: 4,
				total1y: null,
				totalAllTime: 70
			},
			breakdownAliases: ['Extra Raw']
		})
		expect(extraRow).not.toHaveProperty('methodology')

		expect(protocolsByName.get('Token Tax Display')).toMatchObject({
			name: 'Token Tax Display',
			slug: 'token-tax-display',
			category: null,
			total24h: null,
			tokenTax: { total24h: 5, total7d: 0, total30d: null, total1y: 50, totalAllTime: 500 }
		})
	})

	it('keeps linked fee-extra parent periods null when every child is missing the period', async () => {
		const nullPeriods = {
			total24h: null,
			total48hto24h: null,
			total7d: null,
			total14dto7d: null,
			total30d: null,
			total60dto30d: null,
			total7DaysAgo: null,
			total30DaysAgo: null,
			total1y: null,
			annualized1y: null,
			totalAllTime: null
		}

		fetchProtocolsMock.mockResolvedValue({
			protocols: [],
			parentProtocols: []
		})
		fetchJsonMock.mockImplementation((url: string) => {
			const parsedUrl = new URL(url)
			const dataType = parsedUrl.searchParams.get('dataType')

			if (parsedUrl.pathname.includes('/chart/')) {
				return Promise.resolve([])
			}

			if (dataType === ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE) {
				return Promise.resolve(
					adapterMetricsResponse({
						protocols: [
							adapterProtocolRow({
								...nullPeriods,
								defillamaId: 'null-extra-a',
								name: 'Null Extra A',
								displayName: 'Null Extra A',
								slug: 'null-extra-a',
								linkedProtocols: ['Null Extras Parent', 'Null Extra A']
							}),
							adapterProtocolRow({
								...nullPeriods,
								defillamaId: 'null-extra-b',
								name: 'Null Extra B',
								displayName: 'Null Extra B',
								slug: 'null-extra-b',
								linkedProtocols: ['Null Extras Parent', 'Null Extra B']
							})
						]
					})
				)
			}

			if (dataType === ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES) {
				return Promise.resolve(adapterMetricsResponse({ protocols: [] }))
			}

			return Promise.resolve(adapterMetricsResponse({ protocols: [] }))
		})

		const data = await getAdapterByChainPageData({
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'Base',
			dataType: ADAPTER_DATA_TYPES.DAILY_FEES,
			route: 'fees',
			metricName: 'Fees'
		})

		expect(data?.protocols).toHaveLength(1)
		expect(data?.protocols[0]).toMatchObject({
			name: 'Null Extras Parent',
			total24h: null,
			annualized1y: null,
			bribes: {
				total24h: null,
				total7d: null,
				total30d: null,
				annualized1y: null,
				totalAllTime: null
			}
		})
		expect(data?.protocols[0].bribes).not.toHaveProperty('change_1d')
	})

	it('uses annualized1y, not 30d fallback, for P/F rankings', async () => {
		fetchProtocolsMock.mockResolvedValue({
			protocols: [
				{ name: 'Annualized Fees', mcap: 12_000 },
				{ name: 'Thirty Day Only', mcap: 12_000 },
				{ name: 'Zero Mcap Fees', mcap: 0 }
			],
			parentProtocols: [
				{ name: 'Zero Mcap Parent', mcap: 0 },
				{ name: 'Partial Annualized Parent', mcap: 12_000 },
				{ name: 'Sparse Null Parent', mcap: 12_000 }
			]
		})
		fetchJsonMock.mockImplementation((url: string) => {
			const parsedUrl = new URL(url)
			const dataType = parsedUrl.searchParams.get('dataType')

			if (parsedUrl.pathname.includes('/chart/')) {
				return Promise.resolve([])
			}

			if (dataType === ADAPTER_DATA_TYPES.DAILY_BRIBES_REVENUE || dataType === ADAPTER_DATA_TYPES.DAILY_TOKEN_TAXES) {
				return Promise.resolve(adapterMetricsResponse({ protocols: [] }))
			}

			return Promise.resolve(
				adapterMetricsResponse({
					protocols: [
						adapterProtocolRow({
							defillamaId: 'annualized-fees',
							name: 'Annualized Fees',
							displayName: 'Annualized Fees',
							slug: 'annualized-fees',
							total30d: 3000,
							annualized1y: 60_000
						}),
						adapterProtocolRow({
							defillamaId: 'thirty-day-only',
							name: 'Thirty Day Only',
							displayName: 'Thirty Day Only',
							slug: 'thirty-day-only',
							total30d: 3000,
							annualized1y: null
						}),
						adapterProtocolRow({
							defillamaId: 'zero-mcap-fees',
							name: 'Zero Mcap Fees',
							displayName: 'Zero Mcap Fees',
							slug: 'zero-mcap-fees',
							total30d: 3000,
							annualized1y: 60_000
						}),
						adapterProtocolRow({
							defillamaId: 'zero-parent-child-a',
							name: 'Zero Parent Child A',
							displayName: 'Zero Parent Child A',
							slug: 'zero-parent-child-a',
							total30d: 1000,
							annualized1y: 20_000,
							linkedProtocols: ['Zero Mcap Parent', 'Zero Parent Child A']
						}),
						adapterProtocolRow({
							defillamaId: 'zero-parent-child-b',
							name: 'Zero Parent Child B',
							displayName: 'Zero Parent Child B',
							slug: 'zero-parent-child-b',
							total30d: 2000,
							annualized1y: 40_000,
							linkedProtocols: ['Zero Mcap Parent', 'Zero Parent Child B']
						}),
						adapterProtocolRow({
							defillamaId: 'partial-parent-child-a',
							name: 'Partial Parent Child A',
							displayName: 'Partial Parent Child A',
							slug: 'partial-parent-child-a',
							total30d: 1000,
							annualized1y: 20_000,
							linkedProtocols: ['Partial Annualized Parent', 'Partial Parent Child A']
						}),
						adapterProtocolRow({
							defillamaId: 'partial-parent-child-b',
							name: 'Partial Parent Child B',
							displayName: 'Partial Parent Child B',
							slug: 'partial-parent-child-b',
							total30d: 2000,
							annualized1y: null,
							linkedProtocols: ['Partial Annualized Parent', 'Partial Parent Child B']
						}),
						adapterProtocolRow({
							defillamaId: 'sparse-null-parent-child-a',
							name: 'Sparse Null Parent Child A',
							displayName: 'Sparse Null Parent Child A',
							slug: 'sparse-null-parent-child-a',
							total30d: 1000,
							annualized1y: 20_000,
							linkedProtocols: ['Sparse Null Parent', 'Sparse Null Parent Child A']
						}),
						adapterProtocolRow({
							defillamaId: 'sparse-null-parent-child-b',
							name: 'Sparse Null Parent Child B',
							displayName: 'Sparse Null Parent Child B',
							slug: 'sparse-null-parent-child-b',
							total24h: null,
							total7d: null,
							total30d: null,
							total1y: null,
							annualized1y: null,
							totalAllTime: null,
							linkedProtocols: ['Sparse Null Parent', 'Sparse Null Parent Child B']
						})
					]
				})
			)
		})

		const data = await getAdapterByChainPageData({
			adapterType: ADAPTER_TYPES.FEES,
			chain: 'Base',
			dataType: ADAPTER_DATA_TYPES.DAILY_FEES,
			route: 'pf',
			metricName: 'P/F'
		})

		const protocolsByName = new Map(data?.protocols.map((protocol) => [protocol.name, protocol]))
		expect(protocolsByName.get('Annualized Fees')?.pfOrPs).toBe(0.2)
		expect(protocolsByName.get('Zero Mcap Fees')?.pfOrPs).toBe(0)
		expect(protocolsByName.get('Zero Mcap Parent')?.pfOrPs).toBe(0)
		expect(protocolsByName.get('Sparse Null Parent')?.pfOrPs).toBe(0.6)
		expect(protocolsByName.has('Thirty Day Only')).toBe(false)
		expect(protocolsByName.has('Partial Annualized Parent')).toBe(false)
	})

	it('uses chainFees metadata to qualify Chain Fees rankings without summing bribes or token taxes into totals', async () => {
		mockFeesAdapterMetrics()

		const data = await getChainsByFeesAdapterPageData({
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_FEES,
			chainMetadata: feeRevenueChainMetadata
		})

		expect(data.chains).toHaveLength(1)
		expect(data.allChains).toEqual(['Base'])
		expect(data.chains[0]).toMatchObject({
			name: 'Base',
			total24h: 100,
			total7d: 700,
			total30d: 3000,
			bribes: { total24h: 500, total7d: 3500, total30d: 15_000 },
			tokenTax: { total24h: 50, total7d: 350, total30d: 1500 }
		})
	})

	it('uses chainRevenue metadata to qualify Chain Revenue rankings and excludes app-only chains', async () => {
		mockFeesAdapterMetrics()

		const data = await getChainsByFeesAdapterPageData({
			adapterType: ADAPTER_TYPES.FEES,
			dataType: ADAPTER_DATA_TYPES.DAILY_REVENUE,
			chainMetadata: feeRevenueChainMetadata
		})

		expect(data.chains).toHaveLength(1)
		expect(data.allChains).toEqual(['Sui'])
		expect(data.chains[0]).toMatchObject({
			name: 'Sui',
			total24h: 200,
			total7d: 1400,
			total30d: 6000
		})
		expect(data.chains.map((chain) => chain.name)).not.toContain('App Only')
	})
})
