import { describe, expect, it } from 'vitest'
import type { ICategoriesAndTags, IChainMetadata } from '~/utils/metadata/types'
import { shouldFetchChainDexs } from './queries.server'

const categoriesAndTagsMetadata = {
	categories: ['Dexs', 'OTC Marketplace'],
	tags: [],
	tagCategoryMap: {},
	configs: {
		Dexs: {
			category: 'Dexs',
			chains: ['ethereum'],
			slug: 'dexs',
			dexs: true
		},
		'OTC Marketplace': {
			category: 'OTC Marketplace',
			chains: ['provenance'],
			slug: 'otc-marketplace',
			dexs: true
		}
	}
} satisfies ICategoriesAndTags

describe('shouldFetchChainDexs', () => {
	it('skips dexs when the chain has the metadata flag but is not in the default Dexs category', () => {
		const provenance = {
			name: 'Provenance',
			id: 'provenance',
			dexs: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainDexs({
				chain: 'provenance',
				currentChainMetadata: provenance,
				categoriesAndTagsMetadata
			})
		).toBe(false)
	})

	it('fetches dexs when the chain id is in the default Dexs category', () => {
		const ethereum = {
			name: 'Ethereum',
			id: 'ethereum',
			dexs: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainDexs({
				chain: 'ethereum',
				currentChainMetadata: ethereum,
				categoriesAndTagsMetadata
			})
		).toBe(true)
	})

	it('keeps All chains dexs enabled', () => {
		const allChains = {
			name: 'All',
			id: 'all',
			dexs: true
		} satisfies IChainMetadata

		expect(
			shouldFetchChainDexs({
				chain: 'All',
				currentChainMetadata: allChains,
				categoriesAndTagsMetadata
			})
		).toBe(true)
	})
})
