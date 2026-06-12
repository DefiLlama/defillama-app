import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CexMarketsSection } from '../CexMarketsSection'

vi.mock('@tanstack/react-query', () => ({
	useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
		if (queryKey[0] === 'markets-exchange-series') {
			return { data: [], error: null, isLoading: false }
		}

		return {
			data: {
				categories: {
					spot: {
						market_count: 12,
						pairs: [
							{
								amount_precision: null,
								base: 'BTC',
								contract_size: 1,
								contract_type: '',
								exchange: 'binance',
								exchange_type: 'cex',
								expiry_ts: null,
								funding_period_h: null,
								funding_rate_8h: null,
								listed_ts: null,
								maker_fee: null,
								market_id: 'BTC/USDT',
								market_type: 'spot',
								max_leverage: null,
								min_order_cost: null,
								oi: null,
								oi_prev_usd: null,
								oi_usd: null,
								pair_id: 'BTC/USDT',
								pair_url: '',
								price_change_24h: null,
								price_precision: null,
								quote: 'USDT',
								settle_asset: '',
								symbol: 'BTC/USDT',
								price: 100,
								taker_fee: null,
								volume_24h: 1000,
								volume_prev_24h: 900
							}
						],
						total_oi_prev_usd: null,
						total_oi_usd: null,
						total_volume_24h: 1_000,
						total_volume_prev_24h: 900
					},
					linear_perp: {
						market_count: 7,
						pairs: [],
						total_oi_prev_usd: 1_500,
						total_oi_usd: 2_000,
						total_volume_24h: 3_000,
						total_volume_prev_24h: 2_500
					},
					inverse_perp: {
						market_count: 2,
						pairs: [],
						total_oi_prev_usd: 3_000,
						total_oi_usd: 4_000,
						total_volume_24h: 5_000,
						total_volume_prev_24h: 4_500
					}
				},
				defillama_slug: 'Binance-CEX',
				exchange: 'binance',
				exchange_type: 'cex',
				last_updated: '2026-06-10T00:00:00Z',
				market_count: 21,
				market_types: ['spot', 'linear_perp', 'inverse_perp'],
				supports_funding: true,
				supports_oi: true,
				total_oi_prev_usd: 5_000,
				total_oi_usd: 6_000,
				total_volume_24h: 9_000,
				total_volume_prev_24h: 8_000
			},
			error: null,
			isLoading: false
		}
	}
}))

vi.mock('~/components/Table/TableWithSearch', () => ({
	TableWithSearch: () => <div>markets-table</div>
}))

vi.mock('~/containers/Markets/MarketsAreaChart', () => ({
	MarketsAreaChart: ({ title }: { title: string }) => <div>{title}</div>
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
		expect(html).toContain('Volume (30d)')
		expect(html).toContain('markets-table')
	})
})
