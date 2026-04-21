import { describe, expect, it } from 'vitest'
import { resolveProtocolCategory } from './category'

describe('resolveProtocolCategory', () => {
	it('keeps the explicit protocol category when present', () => {
		expect(
			resolveProtocolCategory({
				protocolData: {
					id: 'parent#aave',
					category: 'Lending',
					isParentProtocol: true
				},
				liteProtocols: [
					{ parentProtocol: 'parent#aave', category: 'CDP', tvl: 100 },
					{ parentProtocol: 'parent#aave', category: 'Lending', tvl: 50 }
				]
			})
		).toBe('Lending')
	})

	it('uses the highest-tvl child category for parent protocols without a category', () => {
		expect(
			resolveProtocolCategory({
				protocolData: {
					id: 'parent#interface',
					category: '',
					isParentProtocol: true
				},
				liteProtocols: [
					{ parentProtocol: 'parent#interface', category: 'DEX Aggregator', tvl: 120 },
					{ parentProtocol: 'parent#interface', category: 'Perps', tvl: 340 },
					{ parentProtocol: 'parent#other', category: 'Lending', tvl: 999 }
				]
			})
		).toBe('Perps')
	})

	it('ignores child protocols without a category', () => {
		expect(
			resolveProtocolCategory({
				protocolData: {
					id: 'parent#interface',
					category: null,
					isParentProtocol: true
				},
				liteProtocols: [
					{ parentProtocol: 'parent#interface', category: '', tvl: 500 },
					{ parentProtocol: 'parent#interface', category: 'DEX Aggregator', tvl: 120 }
				]
			})
		).toBe('DEX Aggregator')
	})

	it('returns null when no eligible child category exists', () => {
		expect(
			resolveProtocolCategory({
				protocolData: {
					id: 'parent#interface',
					category: null,
					isParentProtocol: true
				},
				liteProtocols: [{ parentProtocol: 'parent#interface', category: '', tvl: 120 }]
			})
		).toBeNull()
	})
})
