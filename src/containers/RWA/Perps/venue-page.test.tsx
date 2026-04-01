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
				coins: [],
				venues,
				categories: [],
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
	it('getStaticPaths returns raw venue identifiers without slug conversion', async () => {
		const page = await setupPageModule({ venues: ['xyz', 'flx'] })

		await expect(page.getStaticPaths()).resolves.toEqual({
			paths: [{ params: { venue: 'xyz' } }, { params: { venue: 'flx' } }],
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
			venue: 'xyz',
			markets: [],
			initialChartDataset: { source: [], dimensions: ['timestamp'] },
			venueLinks: [{ label: 'All', to: '/rwa/perps/venues' }],
			totals: {
				openInterest: 1,
				volume24h: 2,
				markets: 3,
				protocolFees24h: 4
			}
		}
		const page = await setupPageModule({ venues: ['xyz'], data })

		await expect(page.getStaticProps({ params: { venue: 'xyz' } } as never)).resolves.toEqual({
			props: { data },
			revalidate: 123
		})
	})
})
