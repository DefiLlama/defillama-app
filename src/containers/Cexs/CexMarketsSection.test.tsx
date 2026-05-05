import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CexMarketsSection } from './CexMarketsSection'

vi.mock('@tanstack/react-query', () => ({
	useQuery: () => ({
		data: {
			categories: {
				spot: {
					market_count: 12,
					pairs: [
						{
							symbol: 'BTC/USDT',
							price: 100,
							volume_24h: 1000,
							pair_url: null
						}
					],
					total_oi_usd: null,
					total_volume_24h: 1_000
				},
				linear_perp: {
					market_count: 7,
					pairs: [],
					total_oi_usd: 2_000,
					total_volume_24h: 3_000
				},
				inverse_perp: {
					market_count: 2,
					pairs: [],
					total_oi_usd: 4_000,
					total_volume_24h: 5_000
				}
			},
			exchange: 'binance',
			exchange_type: 'cex',
			market_count: 21,
			market_types: ['spot', 'linear_perp', 'inverse_perp'],
			supports_funding: true,
			supports_oi: true,
			total_oi_usd: 6_000,
			total_volume_24h: 9_000
		},
		error: null,
		isLoading: false
	})
}))

vi.mock('~/components/Table/TableWithSearch', () => ({
	TableWithSearch: () => <div>markets-table</div>
}))

describe('CexMarketsSection', () => {
	it('renders exchange-level market summary metrics above the category table', () => {
		const html = renderToStaticMarkup(<CexMarketsSection exchange="binance" name="Binance" />)

		expect(html).toContain('Volume 24h')
		expect(html).toContain('Open Interest')
		expect(html).toContain('Spot Markets')
		expect(html).toContain('Linear Perp Markets')
		expect(html).toContain('Inverse Perp Markets')
		expect(html).toContain('12')
		expect(html).toContain('7')
		expect(html).toContain('2')
		expect(html).toContain('markets-table')
	})
})
