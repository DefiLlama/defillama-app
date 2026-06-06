import { describe, expect, it } from 'vitest'
import {
	filterStablecoinAssets,
	resolveStablecoinFilterState,
	stablecoinAttributeOptions,
	stablecoinBackingOptions,
	stablecoinPegTypeOptions
} from '../filterPolicy'
import type { FormattedStablecoinAsset } from '../utils'

const stablecoin = (overrides: Partial<FormattedStablecoinAsset>): FormattedStablecoinAsset => ({
	name: 'USD Coin',
	symbol: 'USDC',
	gecko_id: 'usd-coin',
	chains: ['Ethereum'],
	pegType: 'peggedUSD',
	pegMechanism: 'fiat-backed',
	...overrides
})

describe('stablecoin filter policy', () => {
	it('uses all option keys when no filters are active', () => {
		const state = resolveStablecoinFilterState({})

		expect(state).toEqual({
			selectedAttributes: stablecoinAttributeOptions.map((option) => option.key),
			selectedPegTypes: stablecoinPegTypeOptions.map((option) => option.key),
			selectedBackings: stablecoinBackingOptions.map((option) => option.key),
			minMcap: null,
			maxMcap: null,
			hasActiveFilters: false
		})
	})

	it('normalizes include and exclude keys case-insensitively', () => {
		const state = resolveStablecoinFilterState({
			attribute: ['stable', 'YIELDBEARING'],
			excludeAttribute: 'yieldbearing',
			pegtype: ['peggedusd', 'PEGGEDEUR'],
			excludePegtype: 'peggedeur',
			backing: 'fiatstables'
		})

		expect(state.selectedAttributes).toEqual(['STABLE'])
		expect(state.selectedPegTypes).toEqual(['PEGGEDUSD'])
		expect(state.selectedBackings).toEqual(['FIATSTABLES'])
		expect(state.hasActiveFilters).toBe(true)
	})

	it('keeps legacy typo aliases for attribute filters', () => {
		const state = resolveStablecoinFilterState({
			attribute: ['deppeged', 'unknow']
		})

		expect(state.selectedAttributes).toEqual(['DEPEGGED', 'UNKNOWN'])
	})

	it('treats None as an empty selected set', () => {
		const state = resolveStablecoinFilterState({
			attribute: 'none',
			pegtype: 'None',
			backing: ['FIATSTABLES', 'None']
		})

		expect(state.selectedAttributes).toEqual([])
		expect(state.selectedPegTypes).toEqual([])
		expect(state.selectedBackings).toEqual([])
	})

	it('filters by combined attribute, peg type, backing, and mcap range', () => {
		const assets = [
			stablecoin({ name: 'USD Coin', symbol: 'USDC', mcap: 100, pegDeviation: 0 }),
			stablecoin({ name: 'Dai', symbol: 'DAI', pegMechanism: 'crypto-backed', mcap: 75, pegDeviation: 0 }),
			stablecoin({ name: 'Euro Coin', symbol: 'EUROC', pegType: 'peggedEUR', mcap: 110, pegDeviation: 0 }),
			stablecoin({ name: 'Tether', symbol: 'USDT', mcap: 200, pegDeviation: 0 })
		]
		const state = resolveStablecoinFilterState({
			attribute: 'stable',
			pegtype: 'peggedusd',
			backing: 'fiatstables',
			minMcap: '50',
			maxMcap: '150'
		})

		expect(filterStablecoinAssets(assets, state).map((asset) => asset.symbol)).toEqual(['USDC'])
	})

	it('marks invalid mcap query values active without applying a range', () => {
		const state = resolveStablecoinFilterState({ minMcap: 'not-a-number' })

		expect(state.minMcap).toBeNull()
		expect(state.hasActiveFilters).toBe(true)
	})
})
