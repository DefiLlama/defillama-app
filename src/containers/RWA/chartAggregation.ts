import type { IRWAAssetsOverview, IRWAChartDataByAsset, IRWAChartMetricRows, RWAChartMetricKey } from './api.types'
import { normalizeRwaAssetGroup } from './assetGroup'
import { isTypeIncludedByDefault, type RWAOverviewMode } from './constants'
import { computeWeightedGroups, getPrimaryRwaCategory, getRwaPlatforms } from './grouping'

export type RWAChartMetric = RWAChartMetricKey
export const RWA_OPEN_INTEREST_SERIES_LABEL = 'RWA Perps OI'

export type RWAChartRow = { timestamp: number } & Record<string, number>
type RWAOpenInterestSourceRow = Record<string, number | string>

export type RWAChartDataset = { source: RWAChartRow[]; dimensions: string[] }

export type RWAChartDatasetsByMetric = Record<RWAChartMetric, RWAChartDataset>

export type RWAChartAggregationMode = 'total' | 'category' | 'assetClass' | 'assetName' | 'platform' | 'assetGroup'

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}

export function emptyChartDataset(): RWAChartDataset {
	return { source: [], dimensions: ['timestamp'] }
}

export function emptyChartDatasets(): RWAChartDatasetsByMetric {
	return { onChainMcap: emptyChartDataset(), activeMcap: emptyChartDataset(), defiActiveTvl: emptyChartDataset() }
}

export function appendRwaChartDatasetTotal(dataset: RWAChartDataset): RWAChartDataset {
	const seriesDimensions = dataset.dimensions.filter((dimension) => dimension !== 'timestamp' && dimension !== 'Total')
	if (dataset.source.length === 0) return emptyChartDataset()
	if (seriesDimensions.length === 0) return dataset

	return {
		source: dataset.source.map((row) => ({
			...row,
			Total: seriesDimensions.reduce((sum, dimension) => {
				const value = row[dimension]
				const numericValue = typeof value === 'number' ? value : Number(value)
				return Number.isFinite(numericValue) ? sum + numericValue : sum
			}, 0)
		})),
		dimensions: ['timestamp', 'Total', ...seriesDimensions]
	}
}

export function getRwaChartTotalLabel(metric: RWAChartMetricKey): string {
	switch (metric) {
		case 'activeMcap':
			return 'Total Active Mcap'
		case 'onChainMcap':
			return 'Total Onchain Mcap'
		case 'defiActiveTvl':
			return 'Total DeFi Active TVL'
		default:
			return assertNever(metric)
	}
}

export function renameRwaChartDatasetTotal(dataset: RWAChartDataset, metric: RWAChartMetricKey): RWAChartDataset {
	if (!dataset.dimensions.includes('Total') && !dataset.source.some((row) => row.Total != null)) {
		return dataset
	}

	const totalLabel = getRwaChartTotalLabel(metric)

	return {
		source: dataset.source.map((row) => {
			if (row.Total == null) return row

			const { Total, ...rest } = row

			return {
				...rest,
				[totalLabel]: Total
			}
		}),
		dimensions: dataset.dimensions.map((dimension) => (dimension === 'Total' ? totalLabel : dimension))
	}
}

export function selectRwaChartDatasetSeries(dataset: RWAChartDataset, seriesDimensions: string[]): RWAChartDataset {
	const allowedSeries = new Set(seriesDimensions)
	const dimensions = dataset.dimensions.filter((dimension) => dimension === 'timestamp' || allowedSeries.has(dimension))
	for (const dimension of seriesDimensions) {
		if (
			dimension !== 'timestamp' &&
			dataset.source.some((row) => row[dimension] != null) &&
			!dimensions.includes(dimension)
		) {
			dimensions.push(dimension)
		}
	}

	return {
		source: dataset.source,
		dimensions
	}
}

export function buildRwaOpenInterestDataset(
	assets: IRWAAssetsOverview['assets'],
	dataset: { source: RWAOpenInterestSourceRow[]; dimensions: string[] }
): RWAChartDataset {
	const contracts = new Set(
		assets
			.filter((asset) => asset.kind === 'perps')
			.map((asset) => asset.contract)
			.filter(Boolean)
	)

	if (contracts.size === 0 || dataset.source.length === 0) return emptyChartDataset()

	const source = dataset.source.map((row) => {
		let totalOpenInterest = 0

		for (const contract of contracts) {
			const value = row[contract]
			const numericValue = typeof value === 'number' ? value : Number(value)
			if (Number.isFinite(numericValue)) {
				totalOpenInterest += numericValue
			}
		}

		return {
			timestamp: Number(row.timestamp),
			[RWA_OPEN_INTEREST_SERIES_LABEL]: totalOpenInterest
		}
	})

	if (!source.some((row) => row[RWA_OPEN_INTEREST_SERIES_LABEL] > 0)) {
		return emptyChartDataset()
	}

	return {
		source,
		dimensions: ['timestamp', RWA_OPEN_INTEREST_SERIES_LABEL]
	}
}

export function mergeRwaChartDatasets(primary: RWAChartDataset, overlay: RWAChartDataset): RWAChartDataset {
	if (overlay.dimensions.length <= 1 || overlay.source.length === 0) return primary
	if (primary.dimensions.length <= 1 || primary.source.length === 0) return overlay

	const mergedRows = new Map<number, RWAChartRow>()

	for (const row of primary.source) {
		mergedRows.set(row.timestamp, { ...row })
	}

	for (const row of overlay.source) {
		const existingRow = mergedRows.get(row.timestamp)
		if (existingRow) {
			Object.assign(existingRow, row)
			continue
		}

		mergedRows.set(row.timestamp, { ...row })
	}

	return {
		source: [...mergedRows.values()].sort((a, b) => a.timestamp - b.timestamp),
		dimensions: [
			'timestamp',
			...primary.dimensions.filter((dimension) => dimension !== 'timestamp'),
			...overlay.dimensions.filter((dimension) => dimension !== 'timestamp' && !primary.dimensions.includes(dimension))
		]
	}
}

function buildAssetGroupMapping(
	assets: IRWAAssetsOverview['assets'],
	mode: RWAChartAggregationMode
): Map<string, Map<string, number>> {
	const assetToGroups = new Map<string, Map<string, number>>()

	for (const asset of assets) {
		if (asset.kind !== 'spot') continue

		const assetKey = asset.canonicalMarketId

		let weightedGroups: ReturnType<typeof computeWeightedGroups>
		switch (mode) {
			case 'total':
				weightedGroups = computeWeightedGroups(['Total'])
				break
			case 'category': {
				const primaryCategory = getPrimaryRwaCategory(asset.category)
				weightedGroups = computeWeightedGroups(primaryCategory ? [primaryCategory] : [])
				break
			}
			case 'assetClass':
				weightedGroups = computeWeightedGroups(asset.assetClass)
				break
			case 'assetName': {
				const name = (asset.assetName || asset.ticker || '').trim()
				weightedGroups = computeWeightedGroups(name ? [name] : [])
				break
			}
			case 'platform':
				weightedGroups = computeWeightedGroups(getRwaPlatforms(asset.parentPlatform))
				break
			case 'assetGroup': {
				weightedGroups = computeWeightedGroups([normalizeRwaAssetGroup(asset.assetGroup)])
				break
			}
			default:
				assertNever(mode)
		}

		if (weightedGroups.length === 0) continue

		const groups = assetToGroups.get(assetKey) ?? new Map<string, number>()
		for (const { value: group, weight } of weightedGroups) {
			groups.set(group, weight)
		}
		assetToGroups.set(assetKey, groups)
	}

	return assetToGroups
}

function aggregateMetricRows(
	rows: RWAChartRow[],
	assetToGroups: Map<string, Map<string, number>>,
	seenGroups: Set<string>
): RWAChartRow[] {
	const out: RWAChartRow[] = []

	for (const row of rows ?? []) {
		const outRow: RWAChartRow = { timestamp: row.timestamp }
		let hasData = false

		for (const [assetKey, value] of Object.entries(row)) {
			if (assetKey === 'timestamp') continue
			if (!Number.isFinite(value) || value === 0) continue

			const groups = assetToGroups.get(assetKey)
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

function buildAggregatedRwaDataset(
	rows: IRWAChartMetricRows,
	assetToGroups: Map<string, Map<string, number>>
): RWAChartDataset {
	const seenGroups = new Set<string>()
	const source = aggregateMetricRows(rows, assetToGroups, seenGroups)

	return {
		source,
		dimensions: ['timestamp', ...sortKeysByLatestTimestampValue(source, seenGroups)]
	}
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
	chartDataByAsset: IRWAChartDataByAsset,
	mode: RWAChartAggregationMode
): RWAChartDatasetsByMetric {
	const assetToGroups = buildAssetGroupMapping(assets, mode)

	return {
		onChainMcap: buildAggregatedRwaDataset(chartDataByAsset.onChainMcap, assetToGroups),
		activeMcap: buildAggregatedRwaDataset(chartDataByAsset.activeMcap, assetToGroups),
		defiActiveTvl: buildAggregatedRwaDataset(chartDataByAsset.defiActiveTvl, assetToGroups)
	}
}

export function aggregateRwaMetricData(
	assets: IRWAAssetsOverview['assets'],
	rows: IRWAChartMetricRows,
	mode: RWAChartAggregationMode
): RWAChartDataset {
	const assetToGroups = buildAssetGroupMapping(assets, mode)
	return buildAggregatedRwaDataset(rows, assetToGroups)
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
