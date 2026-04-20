import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

const TEST_ASSET = {
	id: 'asset-1',
	slug: 'USDE',
	ticker: 'USDE',
	assetName: 'Ethena USDe'
}

function setupPageModule({
	idMap = { USDE: 'asset-1' },
	assetData = TEST_ASSET
}: {
	idMap?: Record<string, string>
	assetData?: unknown
} = {}) {
	vi.doMock('~/constants', () => ({
		SKIP_BUILD_STATIC_GENERATION: false
	}))
	vi.doMock('~/utils/metadata', () => ({
		default: {
			rwaList: {
				canonicalMarketIds: Object.keys(idMap),
				platforms: [],
				chains: [],
				categories: [],
				assetGroups: [],
				idMap
			}
		}
	}))
	vi.doMock('~/containers/RWA/Asset', () => ({
		RWAAssetPage: () => null
	}))
	vi.doMock('~/containers/RWA/queries', () => ({
		getRWAAssetData: vi.fn().mockResolvedValue(assetData)
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

	return import('~/pages/rwa/asset/[asset]')
}

describe('rwa asset page', () => {
	it('getStaticProps resolves an exact canonical asset param', async () => {
		const page = await setupPageModule()

		await expect(page.getStaticProps({ params: { asset: 'USDE' } } as never)).resolves.toEqual({
			props: { asset: TEST_ASSET },
			revalidate: 123
		})
	})

	it('getStaticProps resolves lowercase asset params to the canonical asset', async () => {
		const page = await setupPageModule()

		await expect(page.getStaticProps({ params: { asset: 'usde' } } as never)).resolves.toEqual({
			props: { asset: TEST_ASSET },
			revalidate: 123
		})
	})

	it('getStaticProps returns notFound for unknown asset params', async () => {
		const page = await setupPageModule()

		await expect(page.getStaticProps({ params: { asset: 'unknown' } } as never)).resolves.toEqual({
			notFound: true
		})
	})

	it('uses the canonical-cased asset slug in the canonical URL', async () => {
		const page = await setupPageModule()

		const element = page.default({ asset: TEST_ASSET } as never) as ReactElement<{ canonicalUrl: string }>

		expect(element.props.canonicalUrl).toBe('/rwa/asset/USDE')
	})
})
