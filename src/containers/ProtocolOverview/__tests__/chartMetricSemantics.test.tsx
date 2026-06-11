import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IProtocolOverviewPageData, IProtocolPageMetrics, IToggledMetrics } from '../types'

const mocks = vi.hoisted(() => ({
	useQuery: vi.fn(),
	lastResult: null as ReturnType<typeof import('../useFetchProtocolChartData').useFetchProtocolChartData> | null
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: mocks.useQuery
}))

vi.mock('next/router', () => ({
	useRouter: () => ({ isReady: true })
}))

vi.mock('~/containers/Governance/queries.client', () => ({
	useFetchProtocolGovernanceData: () => ({ data: null, isLoading: false })
}))

vi.mock('~/containers/ProtocolOverview/queries.client', () => ({
	useFetchProtocolActivityChart: () => ({ data: null, isLoading: false }),
	useFetchProtocolMedianAPY: () => ({ data: null, isLoading: false }),
	useFetchProtocolTVLChart: () => ({ data: null, isLoading: false })
}))

vi.mock('~/utils/async', () => ({
	fetchJson: vi.fn()
}))

import { useFetchProtocolChartData } from '../useFetchProtocolChartData'

const timestamp = Date.UTC(2024, 0, 1) / 1e3
const timestampMs = Date.UTC(2024, 0, 1)

const toggledMetrics = {
	fees: 'true',
	revenue: 'true',
	holdersRevenue: 'true'
} as IToggledMetrics

const baseMetrics: IProtocolPageMetrics = {
	tvl: false,
	dexs: false,
	dexsNotionalVolume: false,
	perps: false,
	openInterest: false,
	optionsPremiumVolume: false,
	optionsNotionalVolume: false,
	dexAggregators: false,
	perpsAggregators: false,
	bridgeAggregators: false,
	stablecoins: false,
	bridge: false,
	treasury: false,
	unlocks: false,
	incentives: false,
	yields: false,
	fees: false,
	revenue: false,
	bribes: false,
	tokenTax: false,
	forks: false,
	governance: false,
	nfts: false,
	dev: false,
	inflows: false,
	liquidity: false,
	activeUsers: false,
	newUsers: false,
	txCount: false,
	gasUsed: false,
	borrowed: false,
	tokenRights: false
}

const feeProps = {
	name: 'Test Protocol',
	id: 'test-protocol',
	geckoId: null,
	currentTvlByChain: null,
	initialMultiSeriesChartData: {},
	metrics: {
		...baseMetrics,
		fees: true,
		revenue: true,
		bribes: true,
		tokenTax: false
	},
	toggledMetrics,
	groupBy: 'daily',
	availableCharts: ['Fees', 'Revenue', 'Holders Revenue'],
	chartDenominations: [],
	governanceApis: [],
	tvlSettings: {},
	feesSettings: { bribes: true },
	isCEX: false
} as unknown as IProtocolOverviewPageData & {
	toggledMetrics: IToggledMetrics
	groupBy: 'daily'
	tvlSettings: Record<string, boolean>
	feesSettings: Record<string, boolean>
}

let probeProps = feeProps

function Probe() {
	mocks.lastResult = useFetchProtocolChartData(probeProps)
	return null
}

describe('ProtocolOverview chart metric semantics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		probeProps = feeProps
		mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
			if (options.queryKey[2] === 'fees') return { data: [[timestamp, 100]], isLoading: false }
			if (options.queryKey[2] === 'revenue') return { data: [[timestamp, 50]], isLoading: false }
			if (options.queryKey[2] === 'holders-revenue') return { data: [[timestamp, 25]], isLoading: false }
			if (options.queryKey[2] === 'bribes') {
				return { data: undefined, isLoading: false, error: new Error('bribes failed') }
			}
			return { data: null, isLoading: false }
		})
	})

	it('keeps fee-family charts visible and reports failed enabled fee-extra chart fetches', () => {
		renderToStaticMarkup(<Probe />)

		expect(mocks.lastResult?.finalCharts.Fees).toBeDefined()
		expect(mocks.lastResult?.finalCharts.Revenue).toBeDefined()
		expect(mocks.lastResult?.finalCharts['Holders Revenue']).toBeDefined()
		expect(mocks.lastResult?.failedMetrics).toEqual(['Fees', 'Revenue', 'Holders Revenue'])
	})

	it('builds FDV chart points by applying token supply to price history', () => {
		probeProps = {
			...feeProps,
			geckoId: 'test-token',
			metrics: baseMetrics,
			toggledMetrics: { fdv: 'true' } as IToggledMetrics,
			availableCharts: ['FDV'],
			feesSettings: {}
		}

		mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
			if (options.queryKey[2] === 'token-price-history') {
				return {
					data: {
						prices: [
							[timestampMs, 2],
							[timestampMs + 86_400_000, 3]
						],
						mcaps: [],
						volumes: []
					},
					isLoading: false
				}
			}
			if (options.queryKey[2] === 'token-supply') return { data: 100, isLoading: false }
			return { data: null, isLoading: false }
		})

		renderToStaticMarkup(<Probe />)

		expect(mocks.lastResult?.finalCharts.FDV).toEqual([
			[timestampMs, 200],
			[timestampMs + 86_400_000, 300]
		])
	})

	it('keeps cumulative fee-family charts in selected denomination units', () => {
		const secondTimestamp = timestamp + 86_400
		const secondTimestampMs = timestampMs + 86_400_000
		probeProps = {
			...feeProps,
			groupBy: 'cumulative',
			chartDenominations: [{ symbol: 'ETH', geckoId: 'ethereum' }],
			toggledMetrics: {
				...toggledMetrics,
				denomination: 'ETH'
			},
			feesSettings: {}
		} as unknown as typeof feeProps

		mocks.useQuery.mockImplementation((options: { queryKey: unknown[] }) => {
			if (options.queryKey[2] === 'denomination-price-history') {
				return {
					data: {
						[String(timestamp)]: 10,
						[String(secondTimestamp)]: 20
					},
					isLoading: false
				}
			}
			if (options.queryKey[2] === 'fees') {
				return {
					data: [
						[timestamp, 100],
						[secondTimestamp, 200]
					],
					isLoading: false
				}
			}
			if (options.queryKey[2] === 'revenue') {
				return {
					data: [
						[timestamp, 50],
						[secondTimestamp, 100]
					],
					isLoading: false
				}
			}
			if (options.queryKey[2] === 'holders-revenue') {
				return {
					data: [
						[timestamp, 30],
						[secondTimestamp, 40]
					],
					isLoading: false
				}
			}
			return { data: null, isLoading: false }
		})

		renderToStaticMarkup(<Probe />)

		expect(mocks.lastResult?.valueSymbol).toBe('ETH')
		expect(mocks.lastResult?.finalCharts.Fees).toEqual([
			[timestampMs, 10],
			[secondTimestampMs, 20]
		])
		expect(mocks.lastResult?.finalCharts.Revenue).toEqual([
			[timestampMs, 5],
			[secondTimestampMs, 10]
		])
		expect(mocks.lastResult?.finalCharts['Holders Revenue']).toEqual([
			[timestampMs, 3],
			[secondTimestampMs, 5]
		])
	})
})
