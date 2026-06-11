import { describe, expect, it } from 'vitest'
import { formatProtocolsList } from './proTable.utils'

describe('formatProtocolsList fee ratios', () => {
	it('uses annualized1y for P/F and P/S instead of deriving ratios from 30d totals', () => {
		const protocols = [
			{
				name: 'Annualized Protocol',
				mcap: 12_000,
				tvl: 100,
				tvlPrevDay: 90,
				tvlPrevWeek: 80,
				tvlPrevMonth: 70,
				chainTvls: {},
				change_1d: null,
				change_7d: null,
				change_1m: null,
				mcaptvl: null,
				chains: ['Base'],
				logo: null,
				url: '',
				defillamaId: 'annualized-protocol'
			}
		] as any

		const result = formatProtocolsList({
			protocols,
			parentProtocols: [],
			extraTvlsEnabled: {},
			feesData: [
				{
					name: 'Annualized Protocol',
					total30d: 3000,
					annualized1y: 60_000,
					revenue30d: 1000,
					revenueAnnualized1y: null
				}
			],
			noSubrows: true
		})

		expect(result[0]).toMatchObject({
			fees_30d: 3000,
			feesAnnualized1y: 60_000,
			pf: 0.2,
			ps: null
		})
	})
})
