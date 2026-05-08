import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({ assetGroups = ['US Equities'], data = null }: { assetGroups?: string[]; data?: unknown }) {
	vi.doMock('~/constants', () => ({
		SKIP_BUILD_STATIC_GENERATION: false
	}))
	vi.doMock('~/utils/metadata', () => ({
		default: {
			rwaPerpsList: {
				contracts: [],
				venues: [],
				categories: [],
				assetGroups,
				total: assetGroups.length
			}
		}
	}))
	vi.doMock('~/containers/RWA/Perps/Dashboard', () => ({
		RWAPerpsDashboard: () => null
	}))
	vi.doMock('~/containers/RWA/Perps/queries', () => ({
		getRWAPerpsAssetGroupPage: vi.fn().mockResolvedValue(data)
	}))
	vi.doMock('~/containers/RWA/Perps/TabNav', () => ({
		RWAPerpsTabNav: () => null
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

	return import('~/pages/rwa/perps/asset-group/[assetGroup]')
}

describe('rwa perps asset-group page', () => {
	it('getStaticPaths slugifies known asset groups', async () => {
		const page = await setupPageModule({ assetGroups: ['US Equities', 'Commodities'] })

		await expect(page.getStaticPaths()).resolves.toEqual({
			paths: [{ params: { assetGroup: 'us-equities' } }, { params: { assetGroup: 'commodities' } }],
			fallback: 'blocking'
		})
	})

	it('getStaticProps returns notFound for an unknown asset group', async () => {
		const page = await setupPageModule({ assetGroups: ['US Equities'] })

		await expect(page.getStaticProps({ params: { assetGroup: 'private-credit' } } as never)).resolves.toEqual({
			notFound: true
		})
	})

	it('getStaticProps returns props for a known asset group slug', async () => {
		const data = {
			assetGroup: 'US Equities',
			markets: [],
			initialChartDataset: { source: [], dimensions: ['timestamp'] },
			assetGroupLinks: [{ label: 'All', to: '/rwa/perps/asset-groups' }],
			totals: {
				openInterest: 1,
				volume24h: 2,
				volume24hChange24h: null,
				markets: 3,
				protocolFees24h: 4
			}
		}
		const page = await setupPageModule({ assetGroups: ['US Equities'], data })

		await expect(page.getStaticProps({ params: { assetGroup: 'us-equities' } } as never)).resolves.toEqual({
			props: { data },
			revalidate: 123
		})
	})
})
