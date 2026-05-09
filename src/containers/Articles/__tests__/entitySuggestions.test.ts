import { describe, expect, it } from 'vitest'
import {
	getStaticArticleEntitySuggestions,
	mergeArticleEntitySuggestions,
	normalizeArticleEntitySearchHit
} from '../entitySuggestions'

describe('article entity suggestions', () => {
	it('normalizes a Meilisearch hit using its canonical route', () => {
		expect(
			normalizeArticleEntitySearchHit({
				id: 'protocol_parent_aave',
				name: 'Aave',
				type: 'Protocol',
				route: '/protocol/aave',
				logo: '/icons/aave.png'
			})
		).toEqual({
			entityType: 'protocol',
			slug: 'aave',
			label: 'Aave',
			route: '/protocol/aave',
			id: 'protocol_parent_aave',
			source: 'search',
			logo: '/icons/aave.png'
		})
	})

	it('preserves subName for chain variant pages', () => {
		const hit = normalizeArticleEntitySearchHit({
			id: 'chain_ethereum_protocolsByDexVolume',
			name: 'Ethereum',
			type: 'Chain',
			route: '/dexs/chain/ethereum',
			subName: 'DEX Volume'
		})
		expect(hit?.subLabel).toBe('DEX Volume')
		expect(hit?.route).toBe('/dexs/chain/ethereum')
		expect(hit?.entityType).toBe('chain')
	})

	it('maps Metric, CEX and Bridge types', () => {
		expect(
			normalizeArticleEntitySearchHit({ id: 'metric_yields', name: 'Yields', type: 'Metric', route: '/yields' })
				?.entityType
		).toBe('metric')
		expect(
			normalizeArticleEntitySearchHit({ id: 'cex_binance', name: 'Binance', type: 'CEX', route: '/cex/Binance' })
				?.entityType
		).toBe('cex')
		expect(
			normalizeArticleEntitySearchHit({
				id: 'bridge_stargate',
				name: 'Stargate',
				type: 'Bridge',
				route: '/bridge/stargate'
			})?.entityType
		).toBe('bridge')
	})

	it('rejects unsupported search result types', () => {
		expect(
			normalizeArticleEntitySearchHit({ id: 'btc', name: 'Bitcoin', type: 'Token', route: '/token/btc' })
		).toBeNull()
	})

	it('rejects hits missing a route', () => {
		expect(normalizeArticleEntitySearchHit({ id: 'x', name: 'X', type: 'Protocol' })).toBeNull()
	})

	it('static fallback returns the curated list when query is empty', () => {
		const items = getStaticArticleEntitySuggestions('')
		expect(items.length).toBeGreaterThan(0)
		expect(items.every((i) => typeof i.route === 'string' && i.route.length > 0)).toBe(true)
	})

	it('deduplicates search and static suggestions by id', () => {
		const merged = mergeArticleEntitySuggestions(
			[
				{
					entityType: 'hack',
					slug: 'hacks',
					label: 'Hacks',
					route: '/hacks',
					id: 'hack:hacks',
					source: 'search'
				}
			],
			getStaticArticleEntitySuggestions('hacks')
		)
		expect(merged.filter((i) => i.id === 'hack:hacks')).toHaveLength(1)
	})
})
