import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({ venues = ['xyz'], data = null }: { venues?: string[]; data?: unknown }) {
	vi.doMock('~/constants', () => ({
		SKIP_BUILD_STATIC_GENERATION: false
	}))
	vi.doMock('~/utils/metadata', () => ({
		default: {
			rwaPerpsList: {
				contracts: [],
				venues,
				categories: [],
				assetGroups: [],
				total: venues.length
			}
		}
	}))
	vi.doMock('~/containers/RWA/Perps/Dashboard', () => ({
		RWAPerpsDashboard: () => null
	}))
	vi.doMock('~/containers/RWA/Perps/queries', () => ({
		getRWAPerpsVenuePage: vi.fn().mockResolvedValue(data)
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

	return import('~/pages/rwa/perps/venue/[venue]')
}

describe('rwa perps venue page', () => {
	it('getStaticPaths returns venue slugs', async () => {
		const page = await setupPageModule({ venues: ['xyz venue', 'flx'] })

		await expect(page.getStaticPaths()).resolves.toEqual({
			paths: [{ params: { venue: 'xyz-venue' } }, { params: { venue: 'flx' } }],
			fallback: 'blocking'
		})
	})

	it('getStaticProps returns notFound for unknown venues', async () => {
		const page = await setupPageModule({ venues: ['xyz'] })

		await expect(page.getStaticProps({ params: { venue: 'flx' } } as never)).resolves.toEqual({
			notFound: true
		})
	})

	it('getStaticProps returns props for a known venue', async () => {
		const data = {
			venue: 'xyz venue',
			markets: [],
			initialChartDataset: { source: [], dimensions: ['timestamp'] },
			venueLinks: [{ label: 'All', to: '/rwa/perps/venues' }],
			totals: {
				openInterest: 1,
				volume24h: 2,
				volume24hChange24h: null,
				markets: 3,
				protocolFees24h: 4
			}
		}
		const page = await setupPageModule({ venues: ['xyz venue'], data })

		await expect(page.getStaticProps({ params: { venue: 'xyz-venue' } } as never)).resolves.toEqual({
			props: { data },
			revalidate: 123
		})
	})
})
