import { describe, expect, it } from 'vitest'
import type { IProtocol } from '~/containers/ProtocolRankings/types'
import type { IRecentProtocol } from '../types'
import { applyExtraTvl, applyProtocolTvlSettings } from '../utils'

type ProtocolTvlRecord = NonNullable<IProtocol['tvl']>
type ProtocolTvlEntry = ProtocolTvlRecord['default']

const makeTvlEntry = (tvl: number, tvlPrevDay = tvl, tvlPrevWeek = tvl, tvlPrevMonth = tvl): ProtocolTvlEntry => ({
	tvl,
	tvlPrevDay,
	tvlPrevWeek,
	tvlPrevMonth
})

const makeProtocolTvl = (overrides: Partial<ProtocolTvlRecord> = {}): ProtocolTvlRecord => ({
	default: makeTvlEntry(100, 80, 50, 25),
	pool2: makeTvlEntry(0),
	staking: makeTvlEntry(0),
	borrowed: makeTvlEntry(0),
	doublecounted: makeTvlEntry(0),
	liquidstaking: makeTvlEntry(0),
	vesting: makeTvlEntry(0),
	govtokens: makeTvlEntry(0),
	excludeParent: makeTvlEntry(0),
	...overrides
})

const makeProtocol = (overrides: Partial<IProtocol> = {}): IProtocol => ({
	name: 'Example Protocol',
	slug: 'example-protocol',
	category: 'Dexes',
	tvl: makeProtocolTvl(),
	tvlChange: null,
	chains: ['Ethereum'],
	mcap: 1_000,
	tokenPrice: null,
	mcaptvl: null,
	strikeTvl: false,
	...overrides
})

const makeRecentProtocol = (overrides: Partial<IRecentProtocol> = {}): IRecentProtocol => ({
	name: 'Recent Protocol',
	symbol: null,
	logo: '',
	url: 'https://example.com',
	category: 'Dexes',
	chains: ['Ethereum'],
	chainTvls: {},
	tvl: 100,
	tvlPrevDay: 80,
	tvlPrevWeek: 50,
	tvlPrevMonth: 25,
	mcap: 1_000,
	listedAt: 1_700_000_000,
	defillamaId: 'recent-protocol',
	extraTvl: {},
	...overrides
})

describe('ProtocolLists TVL helpers', () => {
	it('adds enabled recent protocol extras without applying doublecounted or liquid staking overlap behavior', () => {
		const [protocol] = applyExtraTvl(
			[
				makeRecentProtocol({
					extraTvl: {
						staking: makeTvlEntry(20),
						doublecounted: makeTvlEntry(500),
						liquidstaking: makeTvlEntry(600)
					}
				})
			],
			{ staking: true, doublecounted: true, liquidstaking: true }
		)

		expect(protocol.tvl).toBe(120)
		expect(protocol.tvlPrevDay).toBe(100)
		expect(protocol.tvlPrevWeek).toBe(70)
		expect(protocol.tvlPrevMonth).toBe(45)
		expect(protocol.change_1d).toBe(20)
		expect(protocol.mcaptvl).toBe(8.33)
	})

	it('clamps negative recent protocol TVL values after enabled extras are applied', () => {
		const [protocol] = applyExtraTvl(
			[
				makeRecentProtocol({
					tvl: 10,
					tvlPrevDay: 8,
					tvlPrevWeek: 6,
					tvlPrevMonth: 4,
					extraTvl: {
						pool2: makeTvlEntry(-50, -40, -30, -20)
					}
				})
			],
			{ pool2: true }
		)

		expect(protocol.tvl).toBe(0)
		expect(protocol.tvlPrevDay).toBe(0)
		expect(protocol.tvlPrevWeek).toBe(0)
		expect(protocol.tvlPrevMonth).toBe(0)
		expect(protocol.change_1d).toBeNull()
		expect(protocol.mcaptvl).toBeNull()
	})

	it('returns null for non-finite recent protocol market-cap-to-tvl ratios', () => {
		const [protocol] = applyExtraTvl(
			[
				makeRecentProtocol({
					tvl: Number.MIN_VALUE,
					mcap: Number.MAX_VALUE
				})
			],
			{}
		)

		expect(protocol.mcaptvl).toBeNull()
	})

	it('adds normal protocol table extras while keeping doublecounted and liquid staking non-additive', () => {
		const [protocol] = applyProtocolTvlSettings({
			protocols: [
				makeProtocol({
					strikeTvl: true,
					tvl: makeProtocolTvl({
						default: makeTvlEntry(100, 80, 50, 25),
						staking: makeTvlEntry(20),
						doublecounted: makeTvlEntry(500),
						liquidstaking: makeTvlEntry(600)
					})
				})
			],
			extraTvlsEnabled: { staking: true, doublecounted: true, liquidstaking: true },
			minTvl: null,
			maxTvl: null
		})

		expect(protocol.strikeTvl).toBe(false)
		expect(protocol.tvl?.default).toEqual(makeTvlEntry(120, 100, 70, 45))
		expect(protocol.tvlChange?.change1d).toBe(20)
		expect(protocol.mcaptvl).toBe(8.33)
	})

	it('returns null for non-finite protocol table market-cap-to-tvl ratios', () => {
		const [protocol] = applyProtocolTvlSettings({
			protocols: [
				makeProtocol({
					mcap: Number.MAX_VALUE,
					tvl: makeProtocolTvl({
						default: makeTvlEntry(Number.MIN_VALUE)
					})
				})
			],
			extraTvlsEnabled: {},
			minTvl: null,
			maxTvl: null
		})

		expect(protocol.mcaptvl).toBeNull()
	})

	it('treats missing additive extra fields as zero when protocol table base fields exist', () => {
		const staking = {
			tvl: 20,
			tvlPrevDay: null,
			tvlPrevWeek: 10,
			tvlPrevMonth: null
		} as unknown as ProtocolTvlEntry

		const [protocol] = applyProtocolTvlSettings({
			protocols: [
				makeProtocol({
					tvl: makeProtocolTvl({
						default: makeTvlEntry(100, 80, 50, 25),
						staking
					})
				})
			],
			extraTvlsEnabled: { staking: true },
			minTvl: null,
			maxTvl: null
		})

		expect(protocol.tvl?.default).toEqual(makeTvlEntry(120, 80, 60, 25))
	})

	it('keeps unknown protocol table base fields unknown even when additive extras exist', () => {
		const defaultTvl = {
			tvl: 100,
			tvlPrevDay: null,
			tvlPrevWeek: 50,
			tvlPrevMonth: null
		} as unknown as ProtocolTvlEntry

		const [protocol] = applyProtocolTvlSettings({
			protocols: [
				makeProtocol({
					tvl: makeProtocolTvl({
						default: defaultTvl,
						staking: makeTvlEntry(20)
					})
				})
			],
			extraTvlsEnabled: { staking: true },
			minTvl: null,
			maxTvl: null
		})

		expect(protocol.tvl?.default).toEqual(makeTvlEntry(120, 0, 70, 0))
		expect(protocol.tvlChange?.change1d).toBeNull()
		expect(protocol.tvlChange?.change1m).toBeNull()
	})

	it('filters child protocol rows after enabled extras are applied', () => {
		const [protocol] = applyProtocolTvlSettings({
			protocols: [
				makeProtocol({
					tvl: makeProtocolTvl({
						default: makeTvlEntry(90),
						staking: makeTvlEntry(20)
					}),
					childProtocols: [
						makeProtocol({
							name: 'Included Child',
							slug: 'included-child',
							tvl: makeProtocolTvl({
								default: makeTvlEntry(70),
								staking: makeTvlEntry(20)
							})
						}),
						makeProtocol({
							name: 'Filtered Child',
							slug: 'filtered-child',
							tvl: makeProtocolTvl({
								default: makeTvlEntry(70),
								staking: makeTvlEntry(5)
							})
						})
					]
				})
			],
			extraTvlsEnabled: { staking: true },
			minTvl: 80,
			maxTvl: null
		})

		expect(protocol.tvl?.default.tvl).toBe(110)
		expect(protocol.childProtocols?.map((child) => child.name)).toEqual(['Included Child'])
		expect(protocol.childProtocols?.[0].tvl?.default.tvl).toBe(90)
	})
})
