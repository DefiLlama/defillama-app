import { describe, expect, it } from 'vitest'
import { matchesYieldPoolToken } from './tokenFilter'

describe('matchesYieldPoolToken', () => {
	it('matches pools containing the token symbol directly', () => {
		expect(matchesYieldPoolToken('USDC-LINK', 'LINK')).toBe(true)
	})

	it('matches wrapped token variants via substring matching', () => {
		expect(matchesYieldPoolToken('WBTC-ETH', 'BTC')).toBe(true)
		expect(matchesYieldPoolToken('WETH-USDC', 'ETH')).toBe(true)
	})

	it('returns false when the token is not present in the pool symbol', () => {
		expect(matchesYieldPoolToken('USDC-USDT', 'LINK')).toBe(false)
	})
})
