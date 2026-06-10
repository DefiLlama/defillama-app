import { describe, expect, it } from 'vitest'
import { toStrikeTvl } from '../utils'

describe('ProtocolRankings TVL helpers', () => {
	it('strikes protocol rows in categories removed from chain TVL', () => {
		expect(toStrikeTvl({ category: 'Bridge' }, {})).toBe(true)
	})

	it('strikes protocol rows that expose liquid staking or double counted TVL sections', () => {
		expect(toStrikeTvl({ category: 'Dexes' }, { liquidstaking: true })).toBe(true)
		expect(toStrikeTvl({ category: 'Dexes' }, { doublecounted: true })).toBe(true)
	})

	it('does not strike ordinary protocol rows without removed categories or extra TVL sections', () => {
		expect(toStrikeTvl({ category: 'Dexes' }, {})).toBe(false)
	})
})
