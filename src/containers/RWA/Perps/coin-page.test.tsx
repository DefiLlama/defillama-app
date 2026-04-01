import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IRWAPerpsCoinData } from './types'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({ coins = ['xyz:META'], coinData = null }: { coins?: string[]; coinData?: unknown }) {
	vi.doMock('~/constants', () => ({
		SKIP_BUILD_STATIC_GENERATION: false
	}))
	vi.doMock('~/utils/metadata', () => ({
		default: {
			rwaPerpsList: {
				coins,
				venues: [],
				categories: [],
				total: coins.length
			}
		}
	}))
	vi.doMock('~/containers/RWA/Perps/Coin', () => ({
		RWAPerpsCoinPage: () => null
	}))
	vi.doMock('~/containers/RWA/Perps/queries', () => ({
		getRWAPerpsCoinData: vi.fn().mockResolvedValue(coinData)
	}))
	vi.doMock('~/layout', () => ({
		default: () => null
	}))
	vi.doMock('~/utils/maxAgeForNext', () => ({
		maxAgeForNext: () => 123
	}))
	vi.doMock('~/utils/perf', () => ({
		withPerformanceLogging: (_label: string, fn: any) => fn
	}))

	return import('~/pages/rwa/perps/coin/[coin]')
}

const TEST_COIN: IRWAPerpsCoinData = {
	coin: {
		coin: 'xyz:META',
		displayName: 'Meta',
		venue: 'xyz',
		referenceAsset: 'Meta',
		referenceAssetGroup: 'Equities',
		assetClass: 'Single stock synthetic perp',
		rwaClassification: 'Programmable Finance',
		accessModel: 'Permissionless',
		parentPlatform: 'trade[XYZ]',
		issuer: 'XYZ',
		website: 'https://trade.xyz/',
		oracleProvider: 'Pyth',
		description: null,
		categories: ['RWA Perpetuals']
	},
	market: {
		id: 'xyz:meta',
		timestamp: 1775011512,
		coin: 'xyz:META',
		venue: 'xyz',
		openInterest: 100,
		volume24h: 50,
		price: 500,
		priceChange24h: 5,
		fundingRate: 0.00001,
		premium: 0.0002,
		cumulativeFunding: 1,
		referenceAsset: 'Meta',
		referenceAssetGroup: 'Equities',
		assetClass: 'Single stock synthetic perp',
		parentPlatform: 'trade[XYZ]',
		pair: '',
		marginAsset: 'USDC',
		settlementAsset: 'USDC',
		category: ['RWA Perpetuals'],
		issuer: 'XYZ',
		website: 'https://trade.xyz/',
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

describe('rwa perps coin page', () => {
	it('getStaticPaths returns raw coin identifiers without slug conversion', async () => {
		const page = await setupPageModule({ coins: ['xyz:META', 'km:NVDA'] })

		await expect(page.getStaticPaths()).resolves.toEqual({
			paths: [{ params: { coin: 'xyz:META' } }, { params: { coin: 'km:NVDA' } }],
			fallback: 'blocking'
		})
	})

	it('getStaticProps returns notFound for unknown coins', async () => {
		const page = await setupPageModule({ coins: ['xyz:META'] })

		await expect(page.getStaticProps({ params: { coin: 'xyz:TSLA' } } as never)).resolves.toEqual({
			notFound: true
		})
	})

	it('getStaticProps returns props for a known coin', async () => {
		const page = await setupPageModule({ coins: ['xyz:META'], coinData: TEST_COIN })

		await expect(page.getStaticProps({ params: { coin: 'xyz:META' } } as never)).resolves.toEqual({
			props: { coin: TEST_COIN },
			revalidate: 123
		})
	})

	it('uses the raw coin identifier in the SEO title', async () => {
		const page = await setupPageModule({ coins: ['xyz:META'], coinData: TEST_COIN })

		const element = page.default({ coin: TEST_COIN } as never) as ReactElement<{ title: string }>

		expect(element.props.title).toBe('xyz:META - RWA Perps Analytics - DefiLlama')
	})
})
