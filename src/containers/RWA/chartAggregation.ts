import type { IRWAAssetsOverview, IRWAChartDataByTicker } from './api.types'
import { DEFAULT_EXCLUDED_TYPES, type RWAOverviewMode } from './constants'

export type RWAChartMetric = 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'

export type RWAChartRow = { timestamp: number } & Record<string, number>

export type RWAChartDataset = { source: RWAChartRow[]; dimensions: string[] }

export type RWAChartDatasetsByMetric = Record<RWAChartMetric, RWAChartDataset>

export type RWAChartAggregationMode = 'category' | 'assetClass' | 'assetName'

export function emptyChartDataset(): RWAChartDataset {
	return { source: [], dimensions: ['timestamp'] }
}

export function emptyChartDatasets(): RWAChartDatasetsByMetric {
	return { onChainMcap: emptyChartDataset(), activeMcap: emptyChartDataset(), defiActiveTvl: emptyChartDataset() }
}

const toUniqueNonEmptyValues = (values: Array<string> | null | undefined): string[] => {
	if (!values || values.length === 0) return []
	const out = new Set<string>()
	for (const value of values) {
		const normalized = typeof value === 'string' ? value.trim() : ''
		if (!normalized) continue
		out.add(normalized)
	}
	return Array.from(out)
}

function buildTickerGroupMapping(
	assets: IRWAAssetsOverview['assets'],
	mode: RWAChartAggregationMode
): Map<string, Set<string>> {
	const tickerToGroups = new Map<string, Set<string>>()

	for (const asset of assets) {
		const ticker = asset.ticker
		if (!ticker) continue

		let groupValues: string[]
		if (mode === 'category') {
			groupValues = toUniqueNonEmptyValues(asset.category)
		} else if (mode === 'assetClass') {
			groupValues = toUniqueNonEmptyValues(asset.assetClass)
		} else {
			const name = (asset.assetName || asset.ticker || '').trim()
			groupValues = name ? [name] : []
		}

		if (groupValues.length === 0) continue

		const groups = tickerToGroups.get(ticker) ?? new Set<string>()
		for (const group of groupValues) {
			groups.add(group)
		}
		tickerToGroups.set(ticker, groups)
	}

	return tickerToGroups
}

function aggregateMetricRows(
	rows: RWAChartRow[],
	tickerToGroups: Map<string, Set<string>>,
	seenGroups: Set<string>
): RWAChartRow[] {
	const out: RWAChartRow[] = []

	for (const row of rows ?? []) {
		const outRow: RWAChartRow = { timestamp: row.timestamp }
		let hasData = false

		for (const [ticker, value] of Object.entries(row)) {
			if (ticker === 'timestamp') continue
			if (!Number.isFinite(value) || value === 0) continue

			const groups = tickerToGroups.get(ticker)
			if (!groups || groups.size === 0) continue

			hasData = true
			for (const group of groups) {
				seenGroups.add(group)
				outRow[group] = (outRow[group] ?? 0) + value
			}
		}

		if (hasData) {
			out.push(outRow)
		}
	}

	return out
}

export function sortKeysByLatestTimestampValue(rows: RWAChartRow[], keys: Iterable<string>): string[] {
	const arr = Array.from(keys).filter(Boolean)
	if (arr.length === 0) return arr

	let latestRow: RWAChartRow | null = null
	let latestTimestamp = Number.NEGATIVE_INFINITY
	for (const row of rows) {
		if (!Number.isFinite(row.timestamp)) continue
		if (row.timestamp >= latestTimestamp) {
			latestTimestamp = row.timestamp
			latestRow = row
		}
	}

	return arr.sort((a, b) => {
		if (a === 'Others') return 1
		if (b === 'Others') return -1

		const aValueRaw = latestRow?.[a]
		const bValueRaw = latestRow?.[b]
		const aValue = typeof aValueRaw === 'number' && Number.isFinite(aValueRaw) ? aValueRaw : 0
		const bValue = typeof bValueRaw === 'number' && Number.isFinite(bValueRaw) ? bValueRaw : 0
		if (aValue !== bValue) return bValue - aValue
		return a.localeCompare(b)
	})
}

export function aggregateRwaChartData(
	assets: IRWAAssetsOverview['assets'],
	chartDataByTicker: IRWAChartDataByTicker,
	mode: RWAChartAggregationMode
): RWAChartDatasetsByMetric {
	const tickerToGroups = buildTickerGroupMapping(assets, mode)

	const seenOnChain = new Set<string>()
	const seenActive = new Set<string>()
	const seenDefi = new Set<string>()

	const onChainMcap = aggregateMetricRows(chartDataByTicker.onChainMcap, tickerToGroups, seenOnChain)
	const activeMcap = aggregateMetricRows(chartDataByTicker.activeMcap, tickerToGroups, seenActive)
	const defiActiveTvl = aggregateMetricRows(chartDataByTicker.defiActiveTvl, tickerToGroups, seenDefi)

	return {
		onChainMcap: {
			source: onChainMcap,
			dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(onChainMcap, seenOnChain)]
		},
		activeMcap: {
			source: activeMcap,
			dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(activeMcap, seenActive)]
		},
		defiActiveTvl: {
			source: defiActiveTvl,
			dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(defiActiveTvl, seenDefi)]
		}
	}
}

/**
 * Apply the same default filters that the client applies when no URL query params exist.
 * This ensures `initialChartDataset` matches the no-filter client view exactly.
 */
export function applyDefaultAssetFilters(
	assets: IRWAAssetsOverview['assets'],
	{
		includeStablecoins,
		includeGovernance,
		mode
	}: { includeStablecoins: boolean; includeGovernance: boolean; mode?: RWAOverviewMode }
): IRWAAssetsOverview['assets'] {
	return assets.filter((asset) => {
		if (!includeStablecoins && asset.stablecoin) return false
		if (!includeGovernance && asset.governance) return false
		if (mode !== 'platform') {
			const assetType = asset.type || 'Unknown'
			if (DEFAULT_EXCLUDED_TYPES.has(assetType)) return false
		}
		return true
	})
}
