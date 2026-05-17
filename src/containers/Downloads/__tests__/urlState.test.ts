import { describe, expect, it } from 'vitest'
import type { ChartConfig } from '../sql/chartConfig'
import { buildShareUrl, decodeDownloadConfig, encodeDownloadConfig } from '../urlState'

function roundtrip<T extends Parameters<typeof encodeDownloadConfig>[0]>(input: T): any {
	const encoded = encodeDownloadConfig(input)
	const asQuery = Object.fromEntries(Object.entries(encoded).map(([k, v]) => [k, v as string | string[] | undefined]))
	return decodeDownloadConfig(asQuery)
}

describe('chart-config URL round-trip', () => {
	const baseCfg: ChartConfig = {
		chartType: 'line',
		xCol: 'date',
		yCols: ['tvl'],
		splitByCol: null,
		stackMode: 'off',
		rightAxisCols: [],
		seriesKinds: {},
		seriesColors: {},
		numberFormat: 'auto'
	} as any

	it('round-trips a minimal line chart', () => {
		const decoded = roundtrip({ kind: 'query', sql: 'SELECT 1', tables: [], chartConfig: baseCfg })
		expect(decoded?.kind).toBe('query')
		if (decoded?.kind !== 'query') throw new Error('wrong kind')
		expect(decoded.chartConfig?.chartType).toBe('line')
		expect(decoded.chartConfig?.xCol).toBe('date')
		expect(decoded.chartConfig?.yCols).toEqual(['tvl'])
	})

	it('round-trips split-by + stack', () => {
		const decoded = roundtrip({
			kind: 'query',
			sql: 'SELECT 1',
			tables: [],
			chartConfig: { ...baseCfg, splitByCol: 'chain', stackMode: 'stacked' }
		})
		if (decoded?.kind !== 'query') throw new Error('wrong kind')
		expect(decoded.chartConfig?.splitByCol).toBe('chain')
		expect(decoded.chartConfig?.stackMode).toBe('stacked')
	})

	it('round-trips per-series kinds + colors + right axis', () => {
		const decoded = roundtrip({
			kind: 'query',
			sql: 'SELECT 1',
			tables: [],
			chartConfig: {
				...baseCfg,
				yCols: ['tvl', 'fees'],
				seriesKinds: { tvl: 'line', fees: 'bar' },
				seriesColors: { tvl: '#1f67d2' },
				rightAxisCols: ['fees']
			}
		})
		if (decoded?.kind !== 'query') throw new Error('wrong kind')
		expect(decoded.chartConfig?.seriesKinds).toEqual({ tvl: 'line', fees: 'bar' })
		expect(decoded.chartConfig?.seriesColors).toEqual({ tvl: '#1f67d2' })
		expect(decoded.chartConfig?.rightAxisCols).toEqual(['fees'])
	})

	it('round-trips number format', () => {
		const decoded = roundtrip({
			kind: 'query',
			sql: 'SELECT 1',
			tables: [],
			chartConfig: { ...baseCfg, numberFormat: 'currency' }
		})
		if (decoded?.kind !== 'query') throw new Error('wrong kind')
		expect(decoded.chartConfig?.numberFormat).toBe('currency')
	})

	it('round-trips type-specific mapping via cjs', () => {
		const decoded = roundtrip({
			kind: 'query',
			sql: 'SELECT 1',
			tables: [],
			chartConfig: {
				...baseCfg,
				chartType: 'candlestick',
				candlestick: { ts: 'date', open: 'o', close: 'c', low: 'l', high: 'h' }
			}
		})
		if (decoded?.kind !== 'query') throw new Error('wrong kind')
		expect(decoded.chartConfig?.candlestick).toEqual({ ts: 'date', open: 'o', close: 'c', low: 'l', high: 'h' })
	})

	it('leaves URL params empty for defaults', () => {
		const encoded = encodeDownloadConfig({ kind: 'query', sql: 'SELECT 1', tables: [], chartConfig: baseCfg } as any)
		expect(encoded.cs).toBeUndefined()
		expect(encoded.csb).toBeUndefined()
		expect(encoded.cn).toBeUndefined()
		expect(encoded.cv).toBe('ln')
	})

	it('buildShareUrl embeds chart params', () => {
		const url = buildShareUrl('https://x.test', '/downloads', {
			kind: 'query',
			sql: 'SELECT 1',
			tables: [],
			chartConfig: { ...baseCfg, chartType: 'scatter' }
		} as any)
		expect(url).toContain('cv=sc')
	})
})
