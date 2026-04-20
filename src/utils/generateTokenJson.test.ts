import { describe, expect, it } from 'vitest'
import { buildTokenDirectory } from '../../scripts/generateTokenJson.js'

describe('buildTokenDirectory', () => {
	it('preserves existing key ownership while adding unmatched and colliding tokens', () => {
		const previousTokens = [
			[
				'abc',
				{
					name: 'Alpha Legacy',
					symbol: 'ABC',
					token_nk: 'coingecko:alpha',
					route: '/token/ABC',
					is_yields: false,
					mcap_rank: 100
				}
			],
			[
				'missing-token',
				{
					name: 'Missing Token',
					symbol: 'MISS',
					token_nk: 'coingecko:missing-token',
					route: '/token/MISS',
					is_yields: true,
					mcap_rank: 999
				}
			],
			[
				'alpha-current',
				{
					name: 'Reserved Token',
					symbol: 'RSV',
					token_nk: 'coingecko:reserved-token',
					route: '/token/Reserved%20Token',
					is_yields: false,
					mcap_rank: 500
				}
			]
		]

		const { bySlug, stats } = buildTokenDirectory({
			coins: [
				{
					name: 'Alpha Current',
					symbol: 'ABC',
					token_nk: 'coingecko:alpha',
					on_yields: true,
					mcap_rank: 1
				},
				{
					name: 'Alpha Current',
					symbol: 'ABC',
					token_nk: 'coingecko:alpha-rival',
					on_yields: false,
					mcap_rank: 2
				},
				{
					name: 'Standalone Token',
					symbol: 'SOLO',
					token_nk: 'llama:standalone-token',
					on_yields: false,
					mcap_rank: 3
				},
				{
					name: 'Standalone Token Duplicate',
					symbol: 'SOLO',
					token_nk: 'llama:standalone-token',
					on_yields: true,
					mcap_rank: 4
				}
			],
			protocolsMetadata: {
				'parent#alpha': {
					gecko_id: 'alpha',
					tokenRights: true
				}
			},
			chainsMetadata: {
				alpha: {
					id: 'alpha-chain',
					gecko_id: 'alpha'
				}
			},
			previousTokens
		})

		expect(bySlug.abc).toMatchObject({
			name: 'Alpha Current',
			symbol: 'ABC',
			token_nk: 'coingecko:alpha',
			route: '/token/ABC',
			is_yields: true,
			mcap_rank: 1,
			protocolId: 'parent#alpha',
			chainId: 'alpha-chain',
			tokenRights: true
		})

		expect(bySlug['missing-token']).toEqual(previousTokens[1][1])

		expect(bySlug.solo).toMatchObject({
			name: 'Standalone Token',
			symbol: 'SOLO',
			token_nk: 'llama:standalone-token',
			route: '/token/SOLO',
			is_yields: false,
			mcap_rank: 3
		})
		expect(bySlug.solo.protocolId).toBeUndefined()
		expect(bySlug.solo.chainId).toBeUndefined()

		const rivalEntry = Object.entries(bySlug).find(([, item]) => item.token_nk === 'coingecko:alpha-rival')
		expect(rivalEntry).toBeDefined()
		expect(rivalEntry?.[0]).not.toBe('abc')
		expect(rivalEntry?.[0]).not.toBe('alpha-current')

		expect(stats).toEqual({
			totalTokens: 5,
			nameFallbackCount: 1,
			includedWithoutMetadataCount: 2,
			skippedDuplicateTokenNkCount: 1,
			preservedMissingTokenCount: 2
		})
	})
})
