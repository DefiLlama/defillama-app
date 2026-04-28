import { describe, expect, it } from 'vitest'
import { filterProtocolsByFork, getAvailableForks } from './filterProtocolsByFork'

type Protocol = { name: string; forkedFrom?: string[] }

const make = (name: string, forkedFrom?: string[]): Protocol => ({ name, forkedFrom })

const protocols: Protocol[] = [
	make('Uniswap V2', undefined),
	make('SushiSwap', ['Uniswap V2']),
	make('Camelot', ['Uniswap V2', 'Uniswap V3']),
	make('Curve', undefined),
	make('Aave V3', ['Compound V2'])
]

describe('filterProtocolsByFork', () => {
	it('returns all protocols when fork is null', () => {
		expect(filterProtocolsByFork(protocols, null)).toHaveLength(protocols.length)
	})

	it('returns all protocols when fork is empty string', () => {
		expect(filterProtocolsByFork(protocols, '')).toHaveLength(protocols.length)
	})

	it('matches by slug (case + whitespace insensitive)', () => {
		const result = filterProtocolsByFork(protocols, 'uniswap v2')
		expect(result.map((p) => p.name).sort()).toEqual(['Camelot', 'SushiSwap'])
	})

	it('matches when protocol has multiple forkedFrom entries', () => {
		const result = filterProtocolsByFork(protocols, 'Uniswap V3')
		expect(result.map((p) => p.name)).toEqual(['Camelot'])
	})

	it('skips protocols with no forkedFrom', () => {
		const result = filterProtocolsByFork(protocols, 'Compound V2')
		expect(result.map((p) => p.name)).toEqual(['Aave V3'])
	})

	it('skips protocols with an empty forkedFrom array', () => {
		const protocolsWithEmpty: Protocol[] = [make('Empty', []), make('SushiSwap', ['Uniswap V2'])]
		const result = filterProtocolsByFork(protocolsWithEmpty, 'Uniswap V2')
		expect(result.map((p) => p.name)).toEqual(['SushiSwap'])
	})

	it('returns empty when no match', () => {
		expect(filterProtocolsByFork(protocols, 'Nonexistent')).toEqual([])
	})

	it('preserves caller type (generic over T)', () => {
		type FullProtocol = Protocol & { tvl: number }
		const full: FullProtocol[] = [
			{ name: 'A', forkedFrom: ['Uniswap V2'], tvl: 1 },
			{ name: 'B', tvl: 2 }
		]
		const out = filterProtocolsByFork(full, 'Uniswap V2')
		// If the generic is correct, `out` is `FullProtocol[]` so `.tvl` is accessible:
		expect(out.map((p) => p.tvl)).toEqual([1])
	})
})

describe('getAvailableForks', () => {
	it('returns sorted unique forks across all protocols', () => {
		expect(getAvailableForks(protocols)).toEqual(['Compound V2', 'Uniswap V2', 'Uniswap V3'])
	})

	it('returns [] when no protocol has forkedFrom', () => {
		expect(getAvailableForks([make('A'), make('B')])).toEqual([])
	})

	it('returns [] when forkedFrom arrays are present but empty', () => {
		expect(getAvailableForks([make('A', []), make('B', [])])).toEqual([])
	})
})
