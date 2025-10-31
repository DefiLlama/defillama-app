import { getPercentChange } from '~/utils'
import type { NormalizedRow, NumericMetrics } from '../types'

export function aggregateMetrics(rows: NormalizedRow[]): NumericMetrics {
	let tvl = 0
	let tvlPrevDay = 0
	let tvlPrevWeek = 0
	let tvlPrevMonth = 0
	let volume24h = 0
	let fees24h = 0
	let revenue24h = 0
	let perpsVolume24h = 0
	let openInterest = 0
	let mcap = 0

	let hasTvl = false
	let hasPrevDay = false
	let hasPrevWeek = false
	let hasPrevMonth = false
	let hasVolume = false
	let hasFees = false
	let hasRevenue = false
	let hasPerpsVolume = false
	let hasOpenInterest = false
	let hasMcap = false

	const protocolIds = new Set<string>()

	for (const row of rows) {
		const { metrics } = row
		if (!metrics) continue

		if (row.protocolId) {
			protocolIds.add(row.protocolId)
		} else {
			protocolIds.add(row.id)
		}

		if (metrics.tvl !== null && metrics.tvl !== undefined) {
			tvl += metrics.tvl
			hasTvl = true
		}
		if (metrics.tvlPrevDay !== null && metrics.tvlPrevDay !== undefined) {
			tvlPrevDay += metrics.tvlPrevDay
			hasPrevDay = true
		}
		if (metrics.tvlPrevWeek !== null && metrics.tvlPrevWeek !== undefined) {
			tvlPrevWeek += metrics.tvlPrevWeek
			hasPrevWeek = true
		}
		if (metrics.tvlPrevMonth !== null && metrics.tvlPrevMonth !== undefined) {
			tvlPrevMonth += metrics.tvlPrevMonth
			hasPrevMonth = true
		}
		if (metrics.volume24h !== null && metrics.volume24h !== undefined) {
			volume24h += metrics.volume24h
			hasVolume = true
		}
		if (metrics.fees24h !== null && metrics.fees24h !== undefined) {
			fees24h += metrics.fees24h
			hasFees = true
		}
		if (metrics.revenue24h !== null && metrics.revenue24h !== undefined) {
			revenue24h += metrics.revenue24h
			hasRevenue = true
		}
		if (metrics.perpsVolume24h !== null && metrics.perpsVolume24h !== undefined) {
			perpsVolume24h += metrics.perpsVolume24h
			hasPerpsVolume = true
		}
		if (metrics.openInterest !== null && metrics.openInterest !== undefined) {
			openInterest += metrics.openInterest
			hasOpenInterest = true
		}
		if (metrics.mcap !== null && metrics.mcap !== undefined) {
			mcap += metrics.mcap
			hasMcap = true
		}
	}

	const aggregated: NumericMetrics = {
		tvl: hasTvl ? tvl : null,
		tvlPrevDay: hasPrevDay ? tvlPrevDay : null,
		tvlPrevWeek: hasPrevWeek ? tvlPrevWeek : null,
		tvlPrevMonth: hasPrevMonth ? tvlPrevMonth : null,
		change1d: hasTvl && hasPrevDay ? getPercentChange(tvl, tvlPrevDay) : null,
		change7d: hasTvl && hasPrevWeek ? getPercentChange(tvl, tvlPrevWeek) : null,
		change1m: hasTvl && hasPrevMonth ? getPercentChange(tvl, tvlPrevMonth) : null,
		volume24h: hasVolume ? volume24h : null,
		fees24h: hasFees ? fees24h : null,
		revenue24h: hasRevenue ? revenue24h : null,
		perpsVolume24h: hasPerpsVolume ? perpsVolume24h : null,
		openInterest: hasOpenInterest ? openInterest : null,
		mcap: hasMcap ? mcap : null,
		protocolCount: protocolIds.size > 0 ? protocolIds.size : null
	}

	return aggregated
}

export function extractLeafRows(nodes: NormalizedRow[] | undefined): NormalizedRow[] {
	return nodes ? [...nodes] : []
}
