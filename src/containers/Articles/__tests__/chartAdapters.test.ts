import { describe, expect, it } from 'vitest'
import { validateArticleChartConfig } from '../chartAdapters'

describe('validateArticleChartConfig', () => {
	it('accepts a single-series protocol chart config', () => {
		expect(
			validateArticleChartConfig({
				series: [{ entityType: 'protocol', slug: 'aave', name: 'Aave', chartType: 'fees' }]
			})
		).toEqual({
			series: [{ entityType: 'protocol', slug: 'aave', name: 'Aave', chartType: 'fees' }],
			entities: [{ entityType: 'protocol', slug: 'aave', name: 'Aave' }],
			chartType: 'fees'
		})
	})

	it('accepts a chain series with optional fields', () => {
		expect(
			validateArticleChartConfig({
				series: [
					{ entityType: 'chain', slug: 'Ethereum', name: 'Ethereum', geckoId: 'ethereum', chartType: 'tvl' }
				],
				range: '90d',
				logScale: true,
				caption: 'TVL trend'
			})
		).toEqual({
			series: [{ entityType: 'chain', slug: 'Ethereum', name: 'Ethereum', geckoId: 'ethereum', chartType: 'tvl' }],
			entities: [{ entityType: 'chain', slug: 'Ethereum', name: 'Ethereum', geckoId: 'ethereum' }],
			chartType: 'tvl',
			range: '90d',
			logScale: true,
			caption: 'TVL trend'
		})
	})

	it('accepts multiple series mixing entity types and chart types up to the cap', () => {
		const config = validateArticleChartConfig({
			series: [
				{ entityType: 'protocol', slug: 'aave', name: 'Aave', chartType: 'tvl' },
				{ entityType: 'protocol', slug: 'aave', name: 'Aave', chartType: 'volume' },
				{ entityType: 'chain', slug: 'Ethereum', name: 'Ethereum', chartType: 'fees' }
			]
		})
		expect(config?.series).toHaveLength(3)
		expect(config?.entities).toHaveLength(2)
		expect(config?.chartType).toBeDefined()
	})

	it('migrates legacy entities + chartType into series', () => {
		const config = validateArticleChartConfig({
			entities: [
				{ entityType: 'protocol', slug: 'aave', name: 'Aave' },
				{ entityType: 'protocol', slug: 'compound', name: 'Compound' }
			],
			chartType: 'tvl'
		})
		expect(config?.series).toEqual([
			{ entityType: 'protocol', slug: 'aave', name: 'Aave', chartType: 'tvl' },
			{ entityType: 'protocol', slug: 'compound', name: 'Compound', chartType: 'tvl' }
		])
		expect(config?.chartType).toBe('tvl')
		expect(config?.entities).toHaveLength(2)
	})

	it('falls back series chartType to legacy chartType when missing', () => {
		const config = validateArticleChartConfig({
			series: [{ entityType: 'protocol', slug: 'aave', name: 'Aave' }],
			chartType: 'fees'
		})
		expect(config?.series).toEqual([{ entityType: 'protocol', slug: 'aave', name: 'Aave', chartType: 'fees' }])
	})

	it('rejects unknown entity types inside the series array', () => {
		expect(
			validateArticleChartConfig({
				series: [{ entityType: 'stablecoin', slug: 'usdc', name: 'USDC', chartType: 'tvl' }]
			})
		).toBeNull()
	})

	it('falls back name to slug when missing', () => {
		expect(
			validateArticleChartConfig({
				series: [{ entityType: 'protocol', slug: 'aave', chartType: 'tvl' }]
			})
		).toEqual({
			series: [{ entityType: 'protocol', slug: 'aave', name: 'aave', chartType: 'tvl' }],
			entities: [{ entityType: 'protocol', slug: 'aave', name: 'aave' }],
			chartType: 'tvl'
		})
	})

	it('drops invalid annotations and rejects malformed dates', () => {
		const config = validateArticleChartConfig({
			series: [{ entityType: 'protocol', slug: 'aave', name: 'Aave', chartType: 'tvl' }],
			annotations: [
				{ date: '2024-05-01', label: 'V3 launch' },
				{ date: 'not-a-date', label: 'bad' },
				{ date: '2024-09-01', label: '' }
			]
		})
		expect(config?.annotations).toHaveLength(1)
		expect(config?.annotations?.[0].label).toBe('V3 launch')
	})

	it('returns null when neither series nor legacy entities are valid', () => {
		expect(
			validateArticleChartConfig({
				series: [],
				entities: [],
				chartType: 'tvl'
			})
		).toBeNull()
	})
})
