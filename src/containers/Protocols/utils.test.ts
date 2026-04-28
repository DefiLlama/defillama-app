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

<<<<<<< HEAD
=======
const emptyMetric = () => ({
	total24h: null,
	total7d: null,
	total30d: null,
	total1y: null,
	monthlyAverage1y: null,
	totalAllTime: null
})

>>>>>>> 190b996ad (fix(chain-overview): include fee extras in protocol metrics)
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

<<<<<<< HEAD
=======
	it('creates adjusted fee metrics when base metrics are missing but enabled extras exist', () => {
		const [row] = applyProtocolFeeSettings({
			protocols: [
				protocol({
					bribeRevenue: metric(2)
				})
			],
			extraFeesEnabled: { bribes: true, tokentax: false }
		})

		expect(row.fees?.total24h).toBe(2)
		expect(row.revenue?.total24h).toBe(2)
		expect(row.holdersRevenue?.total24h).toBe(2)
		expect(row.fees?.pf).toBe(50)
		expect(row.revenue?.ps).toBe(50)
	})

	it('does not synthesize fee metrics when base and enabled extras have no period totals', () => {
		const [row] = applyProtocolFeeSettings({
			protocols: [
				protocol({
					bribeRevenue: emptyMetric()
				})
			],
			extraFeesEnabled: { bribes: true, tokentax: false }
		})

		expect(row.fees).toBeUndefined()
		expect(row.revenue).toBeUndefined()
		expect(row.holdersRevenue).toBeUndefined()
	})

	it('keeps empty periods null when enabled extras do not contribute to that period', () => {
		const [row] = applyProtocolFeeSettings({
			protocols: [
				protocol({
					fees: { ...emptyMetric(), totalAllTime: 100, pf: null },
					bribeRevenue: { ...emptyMetric(), totalAllTime: 10 }
				})
			],
			extraFeesEnabled: { bribes: true, tokentax: false }
		})

		expect(row.fees?.total24h).toBeNull()
		expect(row.fees?.totalAllTime).toBe(110)
	})

>>>>>>> 190b996ad (fix(chain-overview): include fee extras in protocol metrics)
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
