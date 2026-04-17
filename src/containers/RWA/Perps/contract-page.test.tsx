import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IRWAPerpsContractData } from './types'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({
	contracts = ['xyz:META'],
	contractData = null
}: {
	contracts?: string[]
	contractData?: unknown
}) {
	vi.doMock('~/constants', () => ({
		SKIP_BUILD_STATIC_GENERATION: false
	}))
	vi.doMock('~/utils/metadata', () => ({
		default: {
			rwaPerpsList: {
				contracts,
				venues: [],
				categories: [],
				assetGroups: [],
				total: contracts.length
			}
		}
	}))
	vi.doMock('~/containers/RWA/Perps/Contract', () => ({
		RWAPerpsContractPage: () => null
	}))
	vi.doMock('~/containers/RWA/Perps/queries', () => ({
		getRWAPerpsContractData: vi.fn().mockResolvedValue(contractData)
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

	return import('~/pages/rwa/perps/contract/[contract]')
}

const TEST_CONTRACT: IRWAPerpsContractData = {
	contract: {
		contract: 'xyz:META',
		displayName: 'Meta',
		venue: 'xyz',
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

describe('rwa perps contract page', () => {
	it('getStaticPaths returns raw contract identifiers without slug conversion', async () => {
		const page = await setupPageModule({ contracts: ['xyz:META', 'km:NVDA'] })

		await expect(page.getStaticPaths()).resolves.toEqual({
			paths: [{ params: { contract: 'xyz:META' } }, { params: { contract: 'km:NVDA' } }],
			fallback: 'blocking'
		})
	})

	it('getStaticProps returns notFound for unknown contracts', async () => {
		const page = await setupPageModule({ contracts: ['xyz:META'] })

		await expect(page.getStaticProps({ params: { contract: 'xyz:TSLA' } } as never)).resolves.toEqual({
			notFound: true
		})
	})

	it('getStaticProps returns props for a known contract', async () => {
		const page = await setupPageModule({ contracts: ['xyz:META'], contractData: TEST_CONTRACT })

		await expect(page.getStaticProps({ params: { contract: 'xyz:META' } } as never)).resolves.toEqual({
			props: { contract: TEST_CONTRACT },
			revalidate: 123
		})
	})

	it('uses the raw contract identifier in the SEO title', async () => {
		const page = await setupPageModule({ contracts: ['xyz:META'], contractData: TEST_CONTRACT })

		const element = page.default({ contract: TEST_CONTRACT } as never) as ReactElement<{ title: string }>

		expect(element.props.title).toBe('xyz:META - RWA Perps Analytics - DefiLlama')
	})
})
