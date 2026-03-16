import type { IRWAAssetsOverview, IRWAChartDataByTicker } from './api.types'
import { isTypeIncludedByDefault, type RWAOverviewMode } from './constants'
import { computeWeightedGroups } from './grouping'

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

function buildTickerGroupMapping(
	assets: IRWAAssetsOverview['assets'],
	mode: RWAChartAggregationMode
): Map<string, Map<string, number>> {
	const tickerToGroups = new Map<string, Map<string, number>>()

	for (const asset of assets) {
		const ticker = asset.ticker
		if (!ticker) continue

		let weightedGroups: ReturnType<typeof computeWeightedGroups>
		if (mode === 'category') {
			weightedGroups = computeWeightedGroups(asset.category)
		} else if (mode === 'assetClass') {
			weightedGroups = computeWeightedGroups(asset.assetClass)
		} else {
			const name = (asset.assetName || asset.ticker || '').trim()
			weightedGroups = computeWeightedGroups(name ? [name] : [])
		}

		if (weightedGroups.length === 0) continue

		const groups = tickerToGroups.get(ticker) ?? new Map<string, number>()
		for (const { value: group, weight } of weightedGroups) {
			groups.set(group, weight)
		}
		tickerToGroups.set(ticker, groups)
	}

	return tickerToGroups
}

function aggregateMetricRows(
	rows: RWAChartRow[],
	tickerToGroups: Map<string, Map<string, number>>,
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
			for (const [group, weight] of groups.entries()) {
				seenGroups.add(group)
				outRow[group] = (outRow[group] ?? 0) + value * weight
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
		mode,
		categorySlug
	}: {
		includeStablecoins: boolean
		includeGovernance: boolean
		mode?: RWAOverviewMode
		categorySlug?: string | null
	}
): IRWAAssetsOverview['assets'] {
	return assets.filter((asset) => {
		if (!includeStablecoins && asset.stablecoin) return false
		if (!includeGovernance && asset.governance) return false
		if (!isTypeIncludedByDefault(asset.type, mode ?? 'chain', categorySlug)) return false
		return true
	})
}
