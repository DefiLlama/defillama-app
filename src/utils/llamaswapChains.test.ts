import { describe, expect, it } from 'vitest'
import { mergeProtocolLlamaswapChains } from './llamaswapChains'

describe('mergeProtocolLlamaswapChains', () => {
	it('keeps the GitHub ordering and appends only missing CoinGecko chains', () => {
		expect(
			mergeProtocolLlamaswapChains(
				[
					{
						chain: 'ethereum',
						address: '0x111',
						displayName: 'Ethereum',
						best: true
					},
					{
						chain: 'base',
						address: '0x222',
						displayName: 'Base'
					}
				],
				[
					{
						chain: 'base',
						address: '0x999',
						displayName: 'Base'
					},
					{
						chain: 'arbitrum',
						address: '0x333',
						displayName: 'Arbitrum'
					}
				]
			)
		).toEqual([
			{
				chain: 'ethereum',
				address: '0x111',
				displayName: 'Ethereum',
				best: true
			},
			{
				chain: 'base',
				address: '0x222',
				displayName: 'Base'
			},
			{
				chain: 'arbitrum',
				address: '0x333',
				displayName: 'Arbitrum'
			}
		])
	})

	it('falls back to CoinGecko when there is no GitHub chain list', () => {
		expect(
			mergeProtocolLlamaswapChains(null, [
				{
					chain: 'sonic',
					address: '0x444',
					displayName: 'Sonic'
				}
			])
		).toEqual([
			{
				chain: 'sonic',
				address: '0x444',
				displayName: 'Sonic'
			}
		])
	})
})
