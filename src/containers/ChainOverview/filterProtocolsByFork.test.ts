import { describe, expect, it } from 'vitest'
import type { IProtocol } from './types'
import { filterProtocolsByFork, getAvailableForks } from './filterProtocolsByFork'

const make = (name: string, forkedFrom?: string[]): IProtocol =>
	({ name, forkedFrom } as unknown as IProtocol)

const protocols: IProtocol[] = [
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

	it('returns empty when no match', () => {
		expect(filterProtocolsByFork(protocols, 'Nonexistent')).toEqual([])
	})
})

describe('getAvailableForks', () => {
	it('returns sorted unique forks across all protocols', () => {
		expect(getAvailableForks(protocols)).toEqual(['Compound V2', 'Uniswap V2', 'Uniswap V3'])
	})

	it('returns [] when no protocol has forkedFrom', () => {
		expect(getAvailableForks([make('A'), make('B')])).toEqual([])
	})
})
