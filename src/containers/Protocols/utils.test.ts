import { describe, expect, it } from 'vitest'
import type { IProtocol } from '~/containers/ChainOverview/types'
import { applyProtocolFeeSettings } from './utils'

const metric = (value: number) => ({
	total24h: value,
	total7d: value * 7,
	total30d: value * 30,
	total1y: value * 365,
	monthlyAverage1y: value * 30,
	totalAllTime: value * 1000
})

const protocol = (overrides: Partial<IProtocol> = {}): IProtocol => ({
	name: 'Example',
	slug: 'example',
	category: 'Dexs',
	tvl: null,
	tvlChange: null,
	chains: ['Ethereum'],
	mcap: 36_000,
	tokenPrice: null,
	mcaptvl: null,
	strikeTvl: false,
	...overrides
})

describe('applyProtocolFeeSettings', () => {
	it('returns the original rows when fee extras are disabled', () => {
		const protocols = [
			protocol({
				fees: { ...metric(100), pf: 1 },
				revenue: { ...metric(100), ps: 1 },
				bribeRevenue: metric(20)
			})
		]

		expect(applyProtocolFeeSettings({ protocols, extraFeesEnabled: { bribes: false, tokentax: false } })).toBe(
			protocols
		)
	})

	it('applies enabled bribes and token tax to protocol fee, revenue, and holders revenue totals', () => {
		const [row] = applyProtocolFeeSettings({
			protocols: [
				protocol({
					fees: { ...metric(100), pf: 30 },
					revenue: { ...metric(100), ps: 30 },
					holdersRevenue: metric(100),
					bribeRevenue: metric(20),
					tokenTax: metric(5)
				})
			],
			extraFeesEnabled: { bribes: true, tokentax: true }
		})

		expect(row.fees?.total24h).toBe(125)
		expect(row.revenue?.total24h).toBe(125)
		expect(row.holdersRevenue?.total24h).toBe(125)
		expect(row.fees?.total30d).toBe(3750)
		expect(row.fees?.pf).toBe(0.8)
		expect(row.revenue?.ps).toBe(0.8)
	})

	it('applies fee extras to expanded child protocol rows', () => {
		const [row] = applyProtocolFeeSettings({
			protocols: [
				protocol({
					childProtocols: [
						protocol({
							name: 'Example V2',
							slug: 'example-v2',
							fees: { ...metric(10), pf: 1 },
							revenue: { ...metric(10), ps: 1 },
							bribeRevenue: metric(2)
						})
					]
				})
			],
			extraFeesEnabled: { bribes: true, tokentax: false }
		})

		expect(row.childProtocols?.[0].fees?.total24h).toBe(12)
		expect(row.childProtocols?.[0].revenue?.total24h).toBe(12)
	})
})
