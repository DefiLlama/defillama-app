import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({ data }: { data: unknown }) {
	vi.doMock('~/containers/RWA/Perps/Dashboard', () => ({
		RWAPerpsDashboard: () => null
	}))
	vi.doMock('~/containers/RWA/Perps/queries', () => ({
		getRWAPerpsOverview: vi.fn().mockResolvedValue(data)
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

	return import('~/pages/rwa/perps/index')
}

describe('rwa perps overview page', () => {
	it('getStaticProps returns props for the overview page', async () => {
		const data = {
			markets: [],
			initialChartDataset: { source: [], dimensions: ['timestamp'] },
			totals: {
				openInterest: 1,
				openInterestChange24h: 10,
				volume24h: 2,
				volume24hChange24h: -5,
				markets: 3,
				protocolFees24h: 4,
				cumulativeFunding: 4
			}
		}
		const page = await setupPageModule({ data })

		await expect(page.getStaticProps({} as never)).resolves.toEqual({
			props: { data },
			revalidate: 123
		})
	})
})
