import { describe, expect, it } from 'vitest'
import {
	normalizeChainGeckoIdLlamaswapChains,
	protocolHasOnlyUnsupportedLlamaswapChains,
	sortProtocolLlamaswapChainsByMetadataOrder
} from './buy-on-llamaswap'

describe('protocolHasOnlyUnsupportedLlamaswapChains', () => {
	it('excludes protocols whose metadata chains are entirely unsupported by LlamaSwap', () => {
		expect(
			protocolHasOnlyUnsupportedLlamaswapChains({
				chains: ['Solana']
			})
		).toBe(true)
	})

	it('keeps protocols that have at least one supported chain in metadata', () => {
		expect(
			protocolHasOnlyUnsupportedLlamaswapChains({
				chains: ['Solana', 'Unichain']
			})
		).toBe(false)
	})

	it('does not exclude protocols that are missing chain metadata', () => {
		expect(protocolHasOnlyUnsupportedLlamaswapChains({})).toBe(false)
		expect(protocolHasOnlyUnsupportedLlamaswapChains(null)).toBe(false)
	})
})

describe('normalizeChainGeckoIdLlamaswapChains', () => {
	it('puts the native chain first for chain gecko ids and removes best flags', () => {
		expect(
			normalizeChainGeckoIdLlamaswapChains(
				[
					{
						chain: 'ethereum',
						address: '0xeth',
						displayName: 'Ethereum',
						best: true
					},
					{
						chain: 'polygon',
						address: '0xpoly',
						displayName: 'Polygon POS'
					}
				],
				{
					name: 'Polygon',
					id: 'polygon-pos',
					gecko_id: 'polygon-ecosystem-token'
				}
			)
		).toEqual([
			{
				chain: 'polygon',
				address: '0xpoly',
				displayName: 'Polygon POS'
			},
			{
				chain: 'ethereum',
				address: '0xeth',
				displayName: 'Ethereum'
			}
		])
	})

	it('still removes best flags when the native chain is already first', () => {
		expect(
			normalizeChainGeckoIdLlamaswapChains(
				[
					{
						chain: 'polygon',
						address: '0xpoly',
						displayName: 'Polygon POS',
						best: true
					},
					{
						chain: 'ethereum',
						address: '0xeth',
						displayName: 'Ethereum'
					}
				],
				{
					name: 'Polygon',
					id: 'polygon-pos',
					gecko_id: 'polygon-ecosystem-token'
				}
			)
		).toEqual([
			{
				chain: 'polygon',
				address: '0xpoly',
				displayName: 'Polygon POS'
			},
			{
				chain: 'ethereum',
				address: '0xeth',
				displayName: 'Ethereum'
			}
		])
	})
})

describe('sortProtocolLlamaswapChainsByMetadataOrder', () => {
	it('sorts supported LlamaSwap chains by protocol metadata chain order', () => {
		expect(
			sortProtocolLlamaswapChainsByMetadataOrder(
				[
					{
						chain: 'base',
						address: '0xbase',
						displayName: 'Base'
					},
					{
						chain: 'unichain',
						address: '0xuni',
						displayName: 'Unichain'
					}
				],
				{
					chains: ['Solana', 'Unichain', 'Base']
				}
			)
		).toEqual([
			{
				chain: 'unichain',
				address: '0xuni',
				displayName: 'Unichain'
			},
			{
				chain: 'base',
				address: '0xbase',
				displayName: 'Base'
			}
		])
	})

	it('appends unmatched chains after the metadata-ordered matches', () => {
		expect(
			sortProtocolLlamaswapChainsByMetadataOrder(
				[
					{
						chain: 'base',
						address: '0xbase',
						displayName: 'Base'
					},
					{
						chain: 'sonic',
						address: '0xsonic',
						displayName: 'Sonic'
					},
					{
						chain: 'unichain',
						address: '0xuni',
						displayName: 'Unichain'
					}
				],
				{
					chains: ['Unichain', 'Base']
				}
			)
		).toEqual([
			{
				chain: 'unichain',
				address: '0xuni',
				displayName: 'Unichain'
			},
			{
				chain: 'base',
				address: '0xbase',
				displayName: 'Base'
			},
			{
				chain: 'sonic',
				address: '0xsonic',
				displayName: 'Sonic'
			}
		])
	})
})
