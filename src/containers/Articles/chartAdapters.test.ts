import { describe, expect, it } from 'vitest'
import { validateArticleChartConfig } from './chartAdapters'

describe('validateArticleChartConfig', () => {
	it('accepts a single-entity protocol chart config', () => {
		expect(
			validateArticleChartConfig({
				entities: [{ entityType: 'protocol', slug: 'aave', name: 'Aave' }],
				chartType: 'fees'
			})
		).toEqual({
			entities: [{ entityType: 'protocol', slug: 'aave', name: 'Aave' }],
			chartType: 'fees'
		})
	})

	it('accepts a chain chart config with optional fields', () => {
		expect(
			validateArticleChartConfig({
				entities: [{ entityType: 'chain', slug: 'Ethereum', name: 'Ethereum', geckoId: 'ethereum' }],
				chartType: 'tvl',
				range: '90d',
				logScale: true,
				caption: 'TVL trend'
			})
		).toEqual({
			entities: [{ entityType: 'chain', slug: 'Ethereum', name: 'Ethereum', geckoId: 'ethereum' }],
			chartType: 'tvl',
			range: '90d',
			logScale: true,
			caption: 'TVL trend'
		})
	})

	it('accepts multiple entities up to the cap', () => {
		const config = validateArticleChartConfig({
			entities: [
				{ entityType: 'protocol', slug: 'aave', name: 'Aave' },
				{ entityType: 'protocol', slug: 'compound', name: 'Compound' },
				{ entityType: 'protocol', slug: 'morpho', name: 'Morpho' }
			],
			chartType: 'tvl'
		})
		expect(config?.entities).toHaveLength(3)
	})

	it('rejects unknown entity types inside the entities array', () => {
		expect(
			validateArticleChartConfig({
				entities: [{ entityType: 'stablecoin', slug: 'usdc', name: 'USDC' }],
				chartType: 'tvl'
			})
		).toBeNull()
	})

	it('falls back name to slug when missing', () => {
		expect(
			validateArticleChartConfig({
				entities: [{ entityType: 'protocol', slug: 'aave' }],
				chartType: 'tvl'
			})
		).toEqual({
			entities: [{ entityType: 'protocol', slug: 'aave', name: 'aave' }],
			chartType: 'tvl'
		})
	})

	it('drops invalid annotations and rejects malformed dates', () => {
		const config = validateArticleChartConfig({
			entities: [{ entityType: 'protocol', slug: 'aave', name: 'Aave' }],
			chartType: 'tvl',
			annotations: [
				{ date: '2024-05-01', label: 'V3 launch' },
				{ date: 'not-a-date', label: 'bad' },
				{ date: '2024-09-01', label: '' }
			]
		})
		expect(config?.annotations).toHaveLength(1)
		expect(config?.annotations?.[0].label).toBe('V3 launch')
	})

	it('returns null when entities array is empty', () => {
		expect(
			validateArticleChartConfig({
				entities: [],
				chartType: 'tvl'
			})
		).toBeNull()
	})
})
