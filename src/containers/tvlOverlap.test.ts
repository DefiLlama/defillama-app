import { describe, expect, it } from 'vitest'
import {
	calculateTvlWithExtraToggles as calculateForkTvlWithExtraToggles,
	getEnabledExtraApiKeys as getEnabledForkExtraApiKeys
} from './Forks/tvl'
import {
	calculateTvsWithExtraToggles as calculateOracleTvsWithExtraToggles,
	getEnabledExtraApiKeys as getEnabledOracleExtraApiKeys
} from './Oracles/tvl'

const TVL_VALUES = {
	tvl: 100,
	staking: 20,
	doublecounted: 30,
	liquidstaking: 40,
	dcAndLsOverlap: 10
}

describe.each([
	{
		name: 'Forks',
		getEnabledExtraApiKeys: getEnabledForkExtraApiKeys,
		calculateTvlWithExtraToggles: calculateForkTvlWithExtraToggles
	},
	{
		name: 'Oracles',
		getEnabledExtraApiKeys: getEnabledOracleExtraApiKeys,
		calculateTvlWithExtraToggles: calculateOracleTvsWithExtraToggles
	}
])('$name TVL helpers', ({ getEnabledExtraApiKeys, calculateTvlWithExtraToggles }) => {
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
				values: TVL_VALUES,
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
				values: TVL_VALUES,
				extraTvlsEnabled: {
					doublecounted: true,
					liquidstaking: false
				}
			})
		).toBe(130)
	})
})
