import { describe, expect, it } from 'vitest'
import type { LiquidationPosition } from '../api.types'
import { filterLiquidationPositions } from '../Table'

const position: LiquidationPosition = {
	protocolId: 'aave',
	protocolName: 'Aave',
	protocolSlug: 'aave',
	chainId: 'ethereum',
	chainName: 'Ethereum',
	chainSlug: 'ethereum',
	owner: '0x1234567890abcdef',
	ownerName: 'Treasury Wallet',
	ownerUrlOverride: 'https://example.com/owner',
	liqPrice: 1234,
	collateral: 'WBTC',
	collateralAmount: 1.25,
	collateralAmountUsd: 110000
}

describe('filterLiquidationPositions', () => {
	it('matches protocol, chain, owner, token, and raw owner fields', () => {
		expect(filterLiquidationPositions([position], 'aave')).toEqual([position])
		expect(filterLiquidationPositions([position], 'ethereum')).toEqual([position])
		expect(filterLiquidationPositions([position], 'treasury')).toEqual([position])
		expect(filterLiquidationPositions([position], 'wbtc')).toEqual([position])
		expect(filterLiquidationPositions([position], '0x123456')).toEqual([position])
	})

	it('returns an empty list when no searchable fields match', () => {
		expect(filterLiquidationPositions([position], 'solana')).toEqual([])
	})
})
