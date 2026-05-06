import { describe, expect, it, vi } from 'vitest'
import { getStaticProps as getCexStaticProps } from '~/pages/cex/[cex]'
import { getStaticProps as getCexMarketsStaticProps } from '~/pages/cex/markets/[cex]'

const cexs = [
	{ name: 'Crypto.com', slug: 'Crypto-com' },
	{ name: 'No Markets', slug: 'no-markets' }
]

vi.mock('~/server/datasetCache/markets', () => ({
	fetchExchangeMarketsListFromCache: vi.fn().mockResolvedValue({
		cex: {
			spot: [
				{
					defillama_slug: 'Crypto-com',
					exchange: 'cryptocom',
					market_count: 1,
					total_volume_24h: 1
				}
			],
			linear_perp: [],
			inverse_perp: []
		},
		dex: {
			spot: [],
			linear_perp: [],
			inverse_perp: []
		},
		totals: {
			cex: {
				spot: { exchange_count: 1, total_oi_usd: null, total_volume_24h: 1 },
				linear_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: null },
				inverse_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: null }
			},
			dex: {
				spot: { exchange_count: 0, total_oi_usd: null, total_volume_24h: null },
				linear_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: null },
				inverse_perp: { exchange_count: 0, total_oi_usd: null, total_volume_24h: null }
			}
		}
	})
}))

vi.mock('~/constants', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/constants')>()
	return {
		...actual,
		SKIP_BUILD_STATIC_GENERATION: false
	}
})

vi.mock('~/utils/maxAgeForNext', () => ({
	maxAgeForNext: () => 123
}))

vi.mock('~/utils/perf', () => ({
	withPerformanceLogging: (_label: string, fn: any) => fn
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		get cexs() {
			return cexs
		},
		chainMetadata: {},
		tokenlist: {},
		cgExchangeIdentifiers: []
	},
	refreshMetadataIfStale: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('~/containers/ProtocolOverview/queries', () => ({
	getProtocolOverviewPageData: vi.fn(({ protocolId }: { protocolId: string }) =>
		Promise.resolve({
			name: protocolId === 'no-markets' ? 'No Markets' : 'Crypto.com',
			category: 'CEX',
			metrics: { tvl: true, stablecoins: true },
			seoTitle: protocolId === 'no-markets' ? 'No Markets' : 'Crypto.com',
			seoDescription: 'CEX overview'
		})
	)
}))

vi.mock('~/containers/ProtocolOverview/api', () => ({
	fetchProtocolOverviewMetrics: vi.fn((exchangeName: string) =>
		exchangeName === 'no-markets'
			? Promise.resolve({ name: 'No Markets', category: 'CEX', otherProtocols: [] })
			: Promise.resolve({ name: 'Crypto.com', category: 'CEX', otherProtocols: [] })
	)
}))

describe('CEX markets routes', () => {
	it('adds the markets exchange to the CEX overview props when the cached list matches', async () => {
		await expect(getCexStaticProps({ params: { cex: 'crypto-com' } } as never)).resolves.toMatchObject({
			props: {
				name: 'Crypto.com',
				cexMarketsExchange: 'cryptocom',
				cexMarketsSlug: 'Crypto-com'
			},
			revalidate: 123
		})
	})

	it('leaves the CEX overview markets exchange null when the cached list has no match', async () => {
		await expect(getCexStaticProps({ params: { cex: 'no-markets' } } as never)).resolves.toMatchObject({
			props: {
				name: 'No Markets',
				cexMarketsExchange: null
			},
			revalidate: 123
		})
	})

	it('returns props for the standalone markets tab when cached markets exist', async () => {
		await expect(getCexMarketsStaticProps({ params: { cex: 'crypto-com' } } as never)).resolves.toMatchObject({
			props: {
				name: 'Crypto.com',
				cexMarketsExchange: 'cryptocom',
				cexMarketsSlug: 'Crypto-com'
			},
			revalidate: 123
		})
	})

	it('returns notFound for the standalone markets tab when cached markets are missing', async () => {
		await expect(getCexMarketsStaticProps({ params: { cex: 'no-markets' } } as never)).resolves.toEqual({
			notFound: true
		})
	})
})
