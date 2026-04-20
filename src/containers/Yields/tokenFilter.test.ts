import { describe, expect, it } from 'vitest'
import { matchesYieldPoolToken } from './tokenFilter'

describe('matchesYieldPoolToken', () => {
	it('returns false for falsy inputs', () => {
		expect(matchesYieldPoolToken('', 'LINK')).toBe(false)
		expect(matchesYieldPoolToken('USDC-LINK', '')).toBe(false)
		expect(matchesYieldPoolToken('USDC-LINK', undefined as unknown as string)).toBe(false)
	})

	it('matches pools containing the token symbol directly and case-insensitively', () => {
		expect(matchesYieldPoolToken('USDC-LINK', 'LINK')).toBe(true)
		expect(matchesYieldPoolToken('usdc-link', 'LINK')).toBe(true)
	})

	it('matches wrapped token variants via canonical token comparisons', () => {
		expect(matchesYieldPoolToken('WBTC-ETH', 'BTC')).toBe(true)
		expect(matchesYieldPoolToken('WETH-USDC', 'ETH')).toBe(true)
	})

	it('matches pool symbols after stripping pool metadata suffixes', () => {
		expect(matchesYieldPoolToken('USDC-DAI (v2)', 'DAI')).toBe(true)
	})

	it('matches usdt and tether aliases in either direction', () => {
		expect(matchesYieldPoolToken('USDT-XYZ', 'TETHER')).toBe(true)
		expect(matchesYieldPoolToken('TETHER-XYZ', 'USDT')).toBe(true)
	})

	it('returns false when the token is not present in the pool symbol', () => {
		expect(matchesYieldPoolToken('USDC-USDT', 'LINK')).toBe(false)
		expect(matchesYieldPoolToken('USDC-LINK', 'IN')).toBe(false)
	})
})
