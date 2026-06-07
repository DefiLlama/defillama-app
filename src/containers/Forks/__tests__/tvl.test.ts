import { describe, expect, it } from 'vitest'
import { calculateTvlWithExtraToggles, getEnabledExtraApiKeys } from '../tvl'

describe('Forks TVL helpers', () => {
	it('requests overlap data only when both overlap parents are enabled', () => {
		expect(
			getEnabledExtraApiKeys({
				tvl: true,
				staking: true,
				doublecounted: true,
				liquidstaking: false
			})
		).toEqual(['doublecounted', 'staking'])

		expect(
			getEnabledExtraApiKeys({
				tvl: true,
				doublecounted: true,
				liquidstaking: true
			})
		).toEqual(['dcAndLsOverlap', 'doublecounted', 'liquidstaking'])
	})

	it('adds enabled extras and subtracts overlap when both overlap parents are enabled', () => {
		expect(
			calculateTvlWithExtraToggles({
				values: {
					tvl: 100,
					staking: 20,
					doublecounted: 30,
					liquidstaking: 40,
					dcAndLsOverlap: 10
				},
				extraTvlsEnabled: {
					staking: true,
					doublecounted: true,
					liquidstaking: true
				}
			})
		).toBe(180)
	})

	it('does not subtract overlap when only one overlap parent is enabled', () => {
		expect(
			calculateTvlWithExtraToggles({
				values: {
					tvl: 100,
					doublecounted: 30,
					liquidstaking: 40,
					dcAndLsOverlap: 10
				},
				extraTvlsEnabled: {
					doublecounted: true,
					liquidstaking: false
				}
			})
		).toBe(130)
	})
})
