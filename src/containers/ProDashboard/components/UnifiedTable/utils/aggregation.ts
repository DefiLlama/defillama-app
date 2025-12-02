import { getPercentChange } from '~/utils'
import type { NormalizedRow, NumericMetrics } from '../types'

export function aggregateMetrics(rows: NormalizedRow[]): NumericMetrics {
	const sumKeys: (keyof NumericMetrics)[] = [
		'tvl',
		'tvlPrevDay',
		'tvlPrevWeek',
		'tvlPrevMonth',
		'users',
		'bridgedTvl',
		'stablesMcap',
		'nftVolume',
		'volume24h',
		'volume_7d',
		'volume_30d',
		'cumulativeVolume',
		'fees24h',
		'fees_7d',
		'fees_30d',
		'fees_1y',
		'average_1y',
		'cumulativeFees',
		'userFees_24h',
		'holderRevenue_24h',
		'holderRevenue_7d',
		'holdersRevenue30d',
		'treasuryRevenue_24h',
		'revenue24h',
		'revenue_7d',
		'revenue_30d',
		'revenue_1y',
		'average_revenue_1y',
		'perpsVolume24h',
		'perps_volume_7d',
		'perps_volume_30d',
		'openInterest',
		'aggregators_volume_24h',
		'aggregators_volume_7d',
		'aggregators_volume_30d',
		'derivatives_aggregators_volume_24h',
		'derivatives_aggregators_volume_7d',
		'derivatives_aggregators_volume_30d',
		'options_volume_24h',
		'options_volume_7d',
		'options_volume_30d',
		'mcap'
	]

	const totals: Partial<Record<keyof NumericMetrics, number>> = {}
	const seen: Partial<Record<keyof NumericMetrics, boolean>> = {}

	const protocolIds = new Set<string>()

	for (const row of rows) {
		const { metrics } = row
		if (!metrics) continue

		if (row.protocolId) {
			protocolIds.add(row.protocolId)
		} else {
			protocolIds.add(row.id)
		}

		for (const key of sumKeys) {
			const value = metrics[key]
			if (value !== null && value !== undefined) {
				totals[key] = (totals[key] ?? 0) + value
				seen[key] = true
			}
		}
	}

	const aggregated: NumericMetrics = {}

	for (const key of sumKeys) {
		;(aggregated as any)[key] = seen[key] ? (totals[key] ?? null) : null
	}

	type WeightedChange = {
		changeKey: keyof NumericMetrics
		weightKey: keyof NumericMetrics
	}

	const weightedChangeMetrics: WeightedChange[] = [
		{ changeKey: 'volumeChange_1d', weightKey: 'volume24h' },
		{ changeKey: 'volumeChange_7d', weightKey: 'volume_7d' },
		{ changeKey: 'volumeChange_1m', weightKey: 'volume_30d' },
		{ changeKey: 'feesChange_1d', weightKey: 'fees24h' },
		{ changeKey: 'feesChange_7d', weightKey: 'fees_7d' },
		{ changeKey: 'feesChange_1m', weightKey: 'fees_30d' },
		{ changeKey: 'revenueChange_1d', weightKey: 'revenue24h' },
		{ changeKey: 'revenueChange_7d', weightKey: 'revenue_7d' },
		{ changeKey: 'revenueChange_1m', weightKey: 'revenue_30d' },
		{ changeKey: 'perps_volume_change_1d', weightKey: 'perpsVolume24h' },
		{ changeKey: 'perps_volume_change_7d', weightKey: 'perps_volume_7d' },
		{ changeKey: 'perps_volume_change_1m', weightKey: 'perps_volume_30d' },
		{ changeKey: 'aggregators_volume_change_1d', weightKey: 'aggregators_volume_24h' },
		{ changeKey: 'aggregators_volume_change_7d', weightKey: 'aggregators_volume_7d' },
		{ changeKey: 'derivatives_aggregators_volume_change_1d', weightKey: 'derivatives_aggregators_volume_24h' },
		{ changeKey: 'derivatives_aggregators_volume_change_7d', weightKey: 'derivatives_aggregators_volume_7d' },
		{ changeKey: 'derivatives_aggregators_volume_change_1m', weightKey: 'derivatives_aggregators_volume_30d' },
		{ changeKey: 'options_volume_change_1d', weightKey: 'options_volume_24h' },
		{ changeKey: 'options_volume_change_7d', weightKey: 'options_volume_7d' }
	]

	for (const { changeKey, weightKey } of weightedChangeMetrics) {
		let weightedSum = 0
		let totalWeight = 0

		for (const row of rows) {
			const { metrics } = row
			if (!metrics) continue

			const changeValue = metrics[changeKey]
			const weightValue = metrics[weightKey]

			if (
				changeValue !== null &&
				changeValue !== undefined &&
				weightValue !== null &&
				weightValue !== undefined &&
				weightValue > 0
			) {
				weightedSum += changeValue * weightValue
				totalWeight += weightValue
			}
		}

		;(aggregated as any)[changeKey] = totalWeight > 0 ? weightedSum / totalWeight : null
	}

	const dominanceKeys: (keyof NumericMetrics)[] = [
		'volumeDominance_24h',
		'volumeMarketShare7d',
		'tvlShare',
		'stablesShare',
		'volume24hShare',
		'perps_volume_dominance_24h',
		'aggregators_volume_dominance_24h',
		'aggregators_volume_marketShare7d',
		'options_volume_dominance_24h'
	]

	if (rows.length === 1) {
		const singleMetrics = rows[0]?.metrics
		for (const key of dominanceKeys) {
			;(aggregated as any)[key] = singleMetrics?.[key] ?? null
		}
	} else {
		for (const key of dominanceKeys) {
			;(aggregated as any)[key] = null
		}
	}

	const hasTvl = seen.tvl ?? false
	const hasPrevDay = seen.tvlPrevDay ?? false
	const hasPrevWeek = seen.tvlPrevWeek ?? false
	const hasPrevMonth = seen.tvlPrevMonth ?? false

	aggregated.change1d =
		hasTvl && hasPrevDay && aggregated.tvl !== null && aggregated.tvlPrevDay !== null
			? getPercentChange(aggregated.tvl, aggregated.tvlPrevDay)
			: null
	aggregated.change7d =
		hasTvl && hasPrevWeek && aggregated.tvl !== null && aggregated.tvlPrevWeek !== null
			? getPercentChange(aggregated.tvl, aggregated.tvlPrevWeek)
			: null
	aggregated.change1m =
		hasTvl && hasPrevMonth && aggregated.tvl !== null && aggregated.tvlPrevMonth !== null
			? getPercentChange(aggregated.tvl, aggregated.tvlPrevMonth)
			: null

	if (aggregated.mcap !== null && aggregated.tvl && aggregated.tvl > 0) {
		aggregated.mcaptvl = aggregated.mcap / aggregated.tvl
	} else {
		aggregated.mcaptvl = null
	}

	if (aggregated.mcap !== null && aggregated.fees24h && aggregated.fees24h > 0) {
		aggregated.pf = aggregated.mcap / (aggregated.fees24h * 365)
	} else {
		aggregated.pf = null
	}

	if (aggregated.mcap !== null && aggregated.revenue24h && aggregated.revenue24h > 0) {
		aggregated.ps = aggregated.mcap / (aggregated.revenue24h * 365)
	} else {
		aggregated.ps = null
	}

	aggregated.perpsVolume24h = aggregated.perpsVolume24h ?? null
	aggregated.protocolCount = protocolIds.size > 0 ? protocolIds.size : null

	return aggregated
}

export function extractLeafRows(nodes: NormalizedRow[] | undefined): NormalizedRow[] {
	return nodes ? [...nodes] : []
}
