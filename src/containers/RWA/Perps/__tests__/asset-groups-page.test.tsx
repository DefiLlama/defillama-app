import type { GetStaticPropsContext } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({
	assetGroups = ['US Equities'],
	data = { rows: [], initialChartDataset: { source: [], dimensions: ['timestamp'] } }
}: {
	assetGroups?: string[]
	data?: unknown
}) {
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
	vi.doMock('~/containers/RWA/Perps/AssetGroups', () => ({
		RWAPerpsAssetGroupsOverview: () => null
	}))
	vi.doMock('~/containers/RWA/Perps/queries', () => ({
		getRWAPerpsAssetGroupsOverview: vi.fn().mockResolvedValue(data)
	}))
	vi.doMock('~/containers/RWA/Perps/TabNav', () => ({
		RWAPerpsTabNav: () => null
	}))
	vi.doMock('~/components/RowLinksWithDropdown', () => ({
		RowLinksWithDropdown: () => null
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

	return import('~/pages/rwa/perps/asset-groups')
}

describe('rwa perps asset-groups page', () => {
	it('builds asset-group links from metadata', async () => {
		const page = await setupPageModule({ assetGroups: ['US Equities', 'Commodities'] })
		const context = {} as unknown as GetStaticPropsContext

		await expect(page.getStaticProps(context)).resolves.toEqual({
			props: {
				assetGroups: [],
				initialChartDataset: { source: [], dimensions: ['timestamp'] },
				assetGroupLinks: [
					{ label: 'All', to: '/rwa/perps/asset-groups' },
					{ label: 'US Equities', to: '/rwa/perps/asset-group/us-equities' },
					{ label: 'Commodities', to: '/rwa/perps/asset-group/commodities' }
				]
			},
			revalidate: 123
		})
	})
})
