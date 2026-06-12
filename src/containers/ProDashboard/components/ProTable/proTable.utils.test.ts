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

	it('keeps parent P/F null when a fee-contributing child is missing annualized1y', () => {
		const protocols = [
			{
				name: 'Child A',
				parentProtocol: 'parent#protocol',
				mcap: 600,
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
				defillamaId: 'child-a'
			},
			{
				name: 'Child B',
				parentProtocol: 'parent#protocol',
				mcap: 400,
				tvl: 200,
				tvlPrevDay: 180,
				tvlPrevWeek: 160,
				tvlPrevMonth: 140,
				chainTvls: {},
				change_1d: null,
				change_7d: null,
				change_1m: null,
				mcaptvl: null,
				chains: ['Base'],
				logo: null,
				url: '',
				defillamaId: 'child-b'
			}
		] as any

		const result = formatProtocolsList({
			protocols,
			parentProtocols: [{ id: 'parent#protocol', name: 'Parent Protocol', chains: ['Base'], mcap: 1000 }] as any,
			extraTvlsEnabled: {},
			feesData: [
				{
					name: 'Child A',
					total30d: 100,
					annualized1y: 600
				},
				{
					name: 'Child B',
					total30d: 200,
					annualized1y: null
				}
			],
			noSubrows: true
		})

		expect(result).toHaveLength(1)
		expect(result[0]).toMatchObject({
			name: 'Parent Protocol',
			fees_30d: 300,
			feesAnnualized1y: null,
			pf: null
		})
	})
})
