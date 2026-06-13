import type { NextApiRequest } from 'next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextApiResponse } from '~/utils/test/nextApiMocks'

const {
	fetchProtocolTvlChartMock,
	fetchProtocolTreasuryChartMock,
	resolveProtocolParamMock,
	resolveCexParamMock,
	fetchAdapterProtocolChartDataMock,
	fetchAdapterProtocolChartDataByBreakdownTypeMock,
	fetchProtocolTokenLiquidityChartMock,
	getCachedCgChartDataMock,
	fetchBridgeVolumeBySlugMock,
	fetchAndFormatGovernanceDataMock,
	fetchNftMarketplaceVolumesMock,
	fetchOracleProtocolChartMock,
	getProtocolEmissionsChartsMock,
	fetchJsonMock
} = vi.hoisted(() => ({
	fetchProtocolTvlChartMock: vi.fn(),
	fetchProtocolTreasuryChartMock: vi.fn(),
	resolveProtocolParamMock: vi.fn(),
	resolveCexParamMock: vi.fn(),
	fetchAdapterProtocolChartDataMock: vi.fn(),
	fetchAdapterProtocolChartDataByBreakdownTypeMock: vi.fn(),
	fetchProtocolTokenLiquidityChartMock: vi.fn(),
	getCachedCgChartDataMock: vi.fn(),
	fetchBridgeVolumeBySlugMock: vi.fn(),
	fetchAndFormatGovernanceDataMock: vi.fn(),
	fetchNftMarketplaceVolumesMock: vi.fn(),
	fetchOracleProtocolChartMock: vi.fn(),
	getProtocolEmissionsChartsMock: vi.fn(),
	fetchJsonMock: vi.fn()
}))

vi.mock('~/api', () => ({
	fetchProtocolTokenLiquidityChart: fetchProtocolTokenLiquidityChartMock
}))

vi.mock('~/api/coingecko', () => ({
	getCachedCgChartData: getCachedCgChartDataMock
}))

vi.mock('~/containers/AdapterMetrics/api', () => ({
	fetchAdapterProtocolChartData: fetchAdapterProtocolChartDataMock,
	fetchAdapterProtocolChartDataByBreakdownType: fetchAdapterProtocolChartDataByBreakdownTypeMock
}))

vi.mock('~/containers/Bridges/api', () => ({
	fetchBridgeVolumeBySlug: fetchBridgeVolumeBySlugMock
}))

vi.mock('~/containers/Governance/queries.client', () => ({
	fetchAndFormatGovernanceData: fetchAndFormatGovernanceDataMock
}))

vi.mock('~/containers/Nft/api', () => ({
	fetchNftMarketplaceVolumes: fetchNftMarketplaceVolumesMock
}))

vi.mock('~/containers/Oracles/api', () => ({
	fetchOracleProtocolChart: fetchOracleProtocolChartMock
}))

vi.mock('~/containers/ProtocolOverview/api', () => ({
	fetchProtocolTvlChart: fetchProtocolTvlChartMock,
	fetchProtocolTreasuryChart: fetchProtocolTreasuryChartMock
}))

vi.mock('~/containers/Unlocks/queries', () => ({
	getProtocolEmissionsCharts: getProtocolEmissionsChartsMock
}))

vi.mock('~/server/routeCache/assets', () => ({
	resolveCexParam: resolveCexParamMock
}))

vi.mock('~/server/routeCache/protocols', () => ({
	resolveProtocolParam: resolveProtocolParamMock
}))

vi.mock('~/utils/async', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/utils/async')>()
	return {
		...actual,
		fetchJson: fetchJsonMock
	}
})

vi.mock('~/utils/telemetry', () => ({
	recordRouteRuntimeError: vi.fn(),
	withApiRouteTelemetry: (_route: string, handler: unknown) => handler
}))

import handler from '~/pages/api/public/protocols/charts'

beforeEach(() => {
	vi.clearAllMocks()
	fetchProtocolTvlChartMock.mockResolvedValue([])
	fetchProtocolTreasuryChartMock.mockResolvedValue([])
	resolveProtocolParamMock.mockResolvedValue({ canonicalSlug: 'aave', id: '1', metadata: { displayName: 'Aave' } })
	resolveCexParamMock.mockResolvedValue(null)
})

describe('/api/public/protocols/charts', () => {
	it.each([
		{
			label: 'TVL value chart',
			kind: 'tvl',
			query: { key: 'pool2', currency: 'ETH' },
			expected: { protocol: 'aave', key: 'pool2', currency: 'ETH' },
			fetcher: fetchProtocolTvlChartMock,
			oppositeFetcher: fetchProtocolTreasuryChartMock
		},
		{
			label: 'TVL chain breakdown chart',
			kind: 'tvl',
			query: { key: 'borrowed', breakdownType: 'chain-breakdown' },
			expected: { protocol: 'aave', key: 'borrowed', breakdownType: 'chain-breakdown' },
			fetcher: fetchProtocolTvlChartMock,
			oppositeFetcher: fetchProtocolTreasuryChartMock
		},
		{
			label: 'TVL token breakdown chart',
			kind: 'tvl',
			query: { key: 'staking', currency: 'token', breakdownType: 'token-breakdown' },
			expected: { protocol: 'aave', key: 'staking', currency: 'token', breakdownType: 'token-breakdown' },
			fetcher: fetchProtocolTvlChartMock,
			oppositeFetcher: fetchProtocolTreasuryChartMock
		},
		{
			label: 'treasury value chart',
			kind: 'treasury',
			query: { key: 'ownTokens' },
			expected: { protocol: 'aave', key: 'ownTokens' },
			fetcher: fetchProtocolTreasuryChartMock,
			oppositeFetcher: fetchProtocolTvlChartMock
		},
		{
			label: 'treasury chain breakdown chart',
			kind: 'treasury',
			query: { key: 'ownTokens', breakdownType: 'chain-breakdown' },
			expected: { protocol: 'aave', key: 'ownTokens', breakdownType: 'chain-breakdown' },
			fetcher: fetchProtocolTreasuryChartMock,
			oppositeFetcher: fetchProtocolTvlChartMock
		},
		{
			label: 'treasury token breakdown chart',
			kind: 'treasury',
			query: { key: 'ownTokens', currency: 'token', breakdownType: 'token-breakdown' },
			expected: { protocol: 'aave', key: 'ownTokens', currency: 'token', breakdownType: 'token-breakdown' },
			fetcher: fetchProtocolTreasuryChartMock,
			oppositeFetcher: fetchProtocolTvlChartMock
		}
	])('dispatches $label requests to the matching ProtocolOverview fetcher', async (row) => {
		const req = {
			method: 'GET',
			query: { kind: row.kind, protocol: 'Aave V3', ...row.query }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveProtocolParamMock).toHaveBeenCalledWith('Aave V3')
		expect(row.fetcher).toHaveBeenCalledWith(row.expected)
		expect(row.oppositeFetcher).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith([])
	})

	it('does not fetch TVL or treasury charts for unknown protocols', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveCexParamMock.mockResolvedValue(null)
		const req = {
			method: 'GET',
			query: { kind: 'treasury', protocol: 'missing', key: 'ownTokens' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(fetchProtocolTvlChartMock).not.toHaveBeenCalled()
		expect(fetchProtocolTreasuryChartMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(404)
		expect(res.json).toHaveBeenCalledWith({ error: 'protocol not found' })
	})

	it('falls back to CEX route cache entries for protocol chart requests', async () => {
		resolveProtocolParamMock.mockResolvedValue(null)
		resolveCexParamMock.mockResolvedValue({
			canonicalSlug: 'binance',
			id: 'cex-1',
			metadata: { displayName: 'Binance' }
		})
		const req = {
			method: 'GET',
			query: { kind: 'tvl', protocol: 'Binance' }
		} as unknown as NextApiRequest
		const res = createMockNextApiResponse()

		await handler(req, res)

		expect(resolveProtocolParamMock).toHaveBeenCalledWith('Binance')
		expect(resolveCexParamMock).toHaveBeenCalledWith('Binance')
		expect(fetchProtocolTvlChartMock).toHaveBeenCalledWith({ protocol: 'binance' })
		expect(fetchProtocolTreasuryChartMock).not.toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith([])
	})
})
