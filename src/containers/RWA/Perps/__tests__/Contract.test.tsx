import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
	getRWAPerpsContractChartGroup,
	getRWAPerpsContractEnabledMetrics,
	getRWAPerpsContractGroupByQueryPatch,
	getRWAPerpsContractMetricQueryPatch,
	RWAPerpsContractPage
} from '../Contract'
import type { IRWAPerpsContractData } from '../types'

vi.mock('next/router', () => ({
	useRouter: () => ({
		asPath: '/rwa/perps/contract/xyz:META',
		query: {},
		push: vi.fn()
	})
}))

const TEST_CONTRACT: IRWAPerpsContractData = {
	contract: {
		contract: 'xyz:META',
		displayName: 'Meta',
		venue: 'XYZ Exchange',
		baseAsset: 'Meta',
		baseAssetGroup: 'Equities',
		assetClass: 'Stock Perp',
		rwaClassification: 'Programmable Finance',
		accessModel: 'Permissionless',
		parentPlatform: 'trade[XYZ]',
		issuer: 'XYZ',
		website: 'https://trade.xyz/',
		oracleProvider: 'Pyth',
		description: null,
		categories: ['RWA Perps']
	},
	market: {
		id: 'xyz:meta',
		timestamp: 1775011512,
		contract: 'xyz:META',
		venue: 'XYZ Exchange',
		openInterest: 100,
		volume24h: 50,
		price: 500,
		priceChange24h: 5,
		fundingRate: 0.00001,
		premium: 0.0002,
		cumulativeFunding: 1,
		referenceAsset: 'Meta',
		referenceAssetGroup: 'Equities',
		assetClass: ['Stock Perp'],
		parentPlatform: 'trade[XYZ]',
		pair: null,
		marginAsset: 'USDC',
		settlementAsset: 'USDC',
		category: ['RWA Perps'],
		issuer: 'XYZ',
		website: ['https://trade.xyz/'],
		oracleProvider: 'Pyth',
		description: null,
		accessModel: 'Permissionless',
		rwaClassification: 'Programmable Finance',
		makerFeeRate: 0.0002,
		takerFeeRate: 0.0005,
		deployerFeeShare: 0.5,
		oraclePx: 501,
		midPx: 500.5,
		prevDayPx: 480,
		maxLeverage: 10,
		szDecimals: 2,
		volume7d: 300,
		volume30d: 1000,
		volumeAllTime: 5000,
		estimatedProtocolFees24h: 1,
		estimatedProtocolFees7d: 3,
		estimatedProtocolFees30d: 10,
		estimatedProtocolFeesAllTime: 50
	},
	marketChart: null,
	fundingHistory: null
}

describe('Contract helpers', () => {
	it('links the market information venue to the venue page', () => {
		const html = renderToStaticMarkup(<RWAPerpsContractPage contract={TEST_CONTRACT} />)

		expect(html).toContain('href="/rwa/perps/venue/xyz-exchange"')
		expect(html).toContain('XYZ Exchange')
	})

	it('normalizes invalid or missing groupBy values back to daily', () => {
		expect(getRWAPerpsContractChartGroup(null)).toBe('daily')
		expect(getRWAPerpsContractChartGroup('weekly')).toBe('weekly')
		expect(getRWAPerpsContractChartGroup('cumulative')).toBe('daily')
		expect(getRWAPerpsContractChartGroup('bad-value')).toBe('daily')
	})

	it('derives enabled metrics from URLSearchParams state', () => {
		const params = new URLSearchParams({
			oi: 'false',
			vol24h: 'true',
			funding: 'true'
		})

		expect(getRWAPerpsContractEnabledMetrics(params)).toEqual(['volume24h', 'price', 'fundingRate'])
	})

	it('builds metric and groupBy query patches for interactive controls', () => {
		expect(
			getRWAPerpsContractMetricQueryPatch({
				metric: { queryKey: 'funding', defaultEnabled: false },
				isActive: false
			})
		).toEqual({ funding: 'true' })

		expect(
			getRWAPerpsContractMetricQueryPatch({
				metric: { queryKey: 'oi', defaultEnabled: true },
				isActive: true
			})
		).toEqual({ oi: 'false' })

		expect(getRWAPerpsContractGroupByQueryPatch('daily')).toEqual({ groupBy: undefined })
		expect(getRWAPerpsContractGroupByQueryPatch('monthly')).toEqual({ groupBy: 'monthly' })
	})
})
