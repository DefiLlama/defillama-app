import { describe, expect, it } from 'vitest'
import { aggregateFeesAndRevenueProtocolsByChain } from './useProTableMultiChain'

const protocolRow = (name: string, overrides: Record<string, unknown>) => ({
	name,
	mcap: 1200,
	total24h: 10,
	total7d: 70,
	total30d: 300,
	revenue24h: 5,
	revenue7d: 35,
	revenue30d: 150,
	chains: [],
	...overrides
})

describe('aggregateFeesAndRevenueProtocolsByChain', () => {
	it('sums annualized fee and revenue denominators only when every selected chain has them', () => {
		const rows = aggregateFeesAndRevenueProtocolsByChain([
			{
				chain: 'Ethereum',
				protocols: [
					protocolRow('Multi Chain Protocol', {
						annualized1y: 600,
						revenueAnnualized1y: 300
					}),
					protocolRow('Late Annualized Fees', {
						annualized1y: null,
						revenueAnnualized1y: null
					}),
					protocolRow('Missing Annualized Fees', {
						annualized1y: null,
						revenueAnnualized1y: null
					})
				]
			},
			{
				chain: 'Base',
				protocols: [
					protocolRow('Multi Chain Protocol', {
						annualized1y: 400,
						revenueAnnualized1y: 100
					}),
					protocolRow('Late Annualized Fees', {
						annualized1y: 300,
						revenueAnnualized1y: null
					}),
					protocolRow('Missing Annualized Fees', {
						annualized1y: null,
						revenueAnnualized1y: null
					})
				]
			}
		])

		const rowByName = new Map(rows.map((row) => [row.name, row]))

		expect(rowByName.get('Multi Chain Protocol')).toMatchObject({
			annualized1y: 1000,
			revenueAnnualized1y: 400,
			pf: 1.2,
			ps: 3
		})
		expect(rowByName.get('Late Annualized Fees')).toMatchObject({
			annualized1y: null,
			pf: null,
			ps: null
		})
		expect(rowByName.get('Missing Annualized Fees')).toMatchObject({
			annualized1y: null,
			revenueAnnualized1y: null,
			pf: null,
			ps: null
		})
	})
})
