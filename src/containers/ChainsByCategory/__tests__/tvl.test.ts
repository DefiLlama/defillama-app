import { describe, expect, it } from 'vitest'
import { applyChainsTvlSettings, normalizeChainsBaseTvlValue, removeStaleChainExtraTvlEntries } from '../tvl'

describe('chains by category tvl helpers', () => {
	it('subtracts current doublecounted and liquid staking tvl by default', () => {
		const normalized = normalizeChainsBaseTvlValue(106_854_312_810, {
			doublecounted: 47_590_610_833,
			liquidstaking: 34_794_501_734,
			dcAndLsOverlap: 21_963_362_717
		})

		expect(normalized).toBe(46_432_562_960)
	})

	it('normalizes cosmoshub default tvl after stale doublecounted entries are removed', () => {
		const sanitized = removeStaleChainExtraTvlEntries({
			chainName: 'CosmosHub',
			extraTvl: {
				doublecounted: {
					tvl: 2_170_124,
					tvlPrevDay: 0,
					tvlPrevWeek: 0,
					tvlPrevMonth: 0
				},
				liquidstaking: {
					tvl: 6_085_010,
					tvlPrevDay: 6_085_010,
					tvlPrevWeek: 6_085_010,
					tvlPrevMonth: 6_085_010
				}
			},
			tvlChartsByChain: {
				tvl: {
					CosmosHub: {
						1776643200000: 6_224_100
					}
				},
				doublecounted: {
					CosmosHub: {
						1736467200000: 2_170_124
					}
				},
				liquidstaking: {
					CosmosHub: {
						1776643200000: 6_085_010
					}
				}
			}
		})

		const normalized = normalizeChainsBaseTvlValue(6_224_100, {
			doublecounted: sanitized.doublecounted?.tvl,
			liquidstaking: 6_085_010,
			dcAndLsOverlap: sanitized.dcAndLsOverlap?.tvl ?? 0
		})

		expect(normalized).toBe(139_090)
	})

	it('normalizes celestia default tvl to zero when base equals liquid staking tvl', () => {
		const normalized = normalizeChainsBaseTvlValue(298_257, {
			liquidstaking: 298_257,
			dcAndLsOverlap: 0
		})

		expect(normalized).toBe(0)
	})

	it('keeps rows and charts consistent when both doublecounted and liquidstaking are enabled', () => {
		const normalized = normalizeChainsBaseTvlValue(150, {
			doublecounted: 30,
			liquidstaking: 60,
			dcAndLsOverlap: 10
		})

		expect(normalized).toBe(70)
		expect(applyChainsTvlSettings(normalized, { doublecounted: 30 }, ['doublecounted'])).toBe(100)
		expect(applyChainsTvlSettings(normalized, { liquidstaking: 60 }, ['liquidstaking'])).toBe(130)
		expect(
			applyChainsTvlSettings(normalized, { doublecounted: 30, liquidstaking: 60, dcAndLsOverlap: 10 }, [
				'doublecounted',
				'liquidstaking'
			])
		).toBe(150)
	})

	it('returns null when no base or enabled extra tvl data exists', () => {
		expect(applyChainsTvlSettings(undefined, {}, ['doublecounted'])).toBeNull()
	})

	it('drops stale doublecounted snapshot entries when the chart series stopped updating', () => {
		const sanitized = removeStaleChainExtraTvlEntries({
			chainName: 'CosmosHub',
			extraTvl: {
				doublecounted: {
					tvl: 2_170_124,
					tvlPrevDay: 2_170_124,
					tvlPrevWeek: 2_170_124,
					tvlPrevMonth: 2_170_124
				},
				liquidstaking: {
					tvl: 6_085_010,
					tvlPrevDay: 6_085_010,
					tvlPrevWeek: 6_085_010,
					tvlPrevMonth: 6_085_010
				}
			},
			tvlChartsByChain: {
				tvl: {
					CosmosHub: {
						1776643200000: 6_224_100
					}
				},
				doublecounted: {
					CosmosHub: {
						1736467200000: 2_170_124
					}
				},
				liquidstaking: {
					CosmosHub: {
						1776643200000: 6_085_010
					}
				}
			}
		})

		expect(sanitized.doublecounted).toBeUndefined()
		expect(sanitized.liquidstaking?.tvl).toBe(6_085_010)
		expect(sanitized.dcAndLsOverlap).toBeUndefined()
	})

	it('preserves non-chart extra tvl entries while sanitizing stale chart-backed entries', () => {
		const sanitized = removeStaleChainExtraTvlEntries({
			chainName: 'Ethereum',
			extraTvl: {
				excludeparent: {
					tvl: 123,
					tvlPrevDay: 120,
					tvlPrevWeek: 110,
					tvlPrevMonth: 100
				}
			},
			tvlChartsByChain: {
				tvl: {
					Ethereum: {
						1776643200000: 106_854_312_810
					}
				}
			}
		})

		expect(sanitized.excludeparent?.tvl).toBe(123)
	})
})
