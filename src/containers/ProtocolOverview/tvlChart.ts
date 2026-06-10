import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { formatLineChart, getBucketTimestampSec } from '~/components/ECharts/utils'

type ChartInterval = ChartTimeGroupingWithCumulative
type V2ChartPoint = [string | number, number]

export const MAX_TVL_TIMESTAMP_ALIGNMENT_DIFF_SEC = 24 * 60 * 60

export interface ExtraTvlChartsResult {
	charts: Record<string, Record<string, number>>
	latestTimestamps: Record<string, number>
}

export function getProtocolExtraTvlChartFetchState({
	isRouterReady,
	currentTvlByChain,
	tvlSettings,
	needsCompositeTvlChart,
	isStakingTvlToggled,
	isBorrowedTvlToggled
}: {
	isRouterReady: boolean
	currentTvlByChain: Record<string, number> | null
	tvlSettings: Record<string, boolean>
	needsCompositeTvlChart: boolean
	isStakingTvlToggled: boolean
	isBorrowedTvlToggled: boolean
}) {
	return {
		staking: !!(
			isRouterReady &&
			currentTvlByChain?.staking != null &&
			((needsCompositeTvlChart && tvlSettings.staking) || isStakingTvlToggled)
		),
		borrowed: !!(
			isRouterReady &&
			currentTvlByChain?.borrowed != null &&
			((needsCompositeTvlChart && tvlSettings.borrowed) || isBorrowedTvlToggled)
		),
		pool2: !!(isRouterReady && needsCompositeTvlChart && currentTvlByChain?.pool2 != null && tvlSettings.pool2),
		doublecounted: !!(
			isRouterReady &&
			needsCompositeTvlChart &&
			currentTvlByChain?.doublecounted != null &&
			tvlSettings.doublecounted
		),
		liquidstaking: !!(
			isRouterReady &&
			needsCompositeTvlChart &&
			currentTvlByChain?.liquidstaking != null &&
			tvlSettings.liquidstaking
		),
		vesting: !!(isRouterReady && needsCompositeTvlChart && currentTvlByChain?.vesting != null && tvlSettings.vesting),
		govtokens: !!(
			isRouterReady &&
			needsCompositeTvlChart &&
			currentTvlByChain?.govtokens != null &&
			tvlSettings.govtokens
		)
	}
}

const getGroupedTimestampSec = (timestampSec: number, groupBy: ChartInterval): number => {
	return groupBy === 'cumulative' ? timestampSec : getBucketTimestampSec(timestampSec, groupBy)
}

const toUnixSeconds = (timestamp: string | number): number | null => {
	const parsed = Number(timestamp)
	if (!Number.isFinite(parsed)) return null
	return parsed >= 1e12 ? Math.floor(parsed / 1e3) : Math.floor(parsed)
}

const getLatestTimestamp = (chart: Array<[string | number, number]>): number | null => {
	if (chart.length === 0) return null
	const lastPoint = chart[chart.length - 1]
	return lastPoint ? toUnixSeconds(lastPoint[0]) : null
}

export function buildExtraTvlCharts(chartByKey: Record<string, Array<V2ChartPoint> | null>): ExtraTvlChartsResult {
	const charts: Record<string, Record<string, number>> = {}
	const latestTimestamps: Record<string, number> = {}

	for (const key in chartByKey) {
		const chart = chartByKey[key]
		if (!chart || chart.length === 0) continue

		const byDate: Record<string, number> = {}
		let maxTimestamp: number | null = null
		for (const [timestamp, value] of chart) {
			const dateInSec = toUnixSeconds(timestamp)
			if (dateInSec == null) continue
			byDate[String(dateInSec)] = value
			if (maxTimestamp == null || dateInSec > maxTimestamp) maxTimestamp = dateInSec
		}

		let hasByDate = false
		for (const _date in byDate) {
			hasByDate = true
			break
		}
		if (hasByDate) {
			charts[key] = byDate
			if (maxTimestamp != null) latestTimestamps[key] = maxTimestamp
		}
	}

	return { charts, latestTimestamps }
}

export function buildTvlChart({
	tvlChartData,
	extraTvlCharts,
	tvlSettings,
	currentTvlByChain,
	groupBy,
	denominationPriceHistory
}: {
	tvlChartData: Array<[number, number]>
	extraTvlCharts: ExtraTvlChartsResult
	tvlSettings: Record<string, boolean>
	currentTvlByChain: Record<string, number> | null
	groupBy: ChartInterval
	denominationPriceHistory: Record<string, number> | null
}): Array<[number, number | null]> {
	const extraTvls: string[] = []
	for (const extra in tvlSettings) {
		if (tvlSettings[extra] && currentTvlByChain?.[extra] != null) {
			extraTvls.push(extra)
		}
	}

	if (extraTvls.length === 0) {
		return formatLineChart({ data: tvlChartData, groupBy, denominationPriceHistory })
	}

	const store: Record<string, number> = {}
	const retainedTimestampByKey: Record<string, number> = {}
	const latestMainTvlTimestamp = getLatestTimestamp(tvlChartData)
	let mostRecentTvlTimestamp = latestMainTvlTimestamp

	for (const extra of extraTvls) {
		const extraLatestTimestamp = extraTvlCharts.latestTimestamps[extra]
		if (extraLatestTimestamp == null) continue
		if (mostRecentTvlTimestamp == null || extraLatestTimestamp > mostRecentTvlTimestamp) {
			mostRecentTvlTimestamp = extraLatestTimestamp
		}
	}

	const shouldNormalizeMainTvlLatest =
		latestMainTvlTimestamp != null &&
		mostRecentTvlTimestamp != null &&
		Math.abs(mostRecentTvlTimestamp - latestMainTvlTimestamp) <= MAX_TVL_TIMESTAMP_ALIGNMENT_DIFF_SEC

	for (const [rawDate, value] of tvlChartData) {
		const dateInSec = toUnixSeconds(rawDate)
		if (dateInSec == null) continue
		const alignedDateInSec =
			shouldNormalizeMainTvlLatest && dateInSec === latestMainTvlTimestamp ? mostRecentTvlTimestamp! : dateInSec
		const dateKey = getGroupedTimestampSec(alignedDateInSec, groupBy)
		let extrasAtTimestamp = 0
		for (const extra of extraTvls) {
			const extraChart = extraTvlCharts.charts[extra]
			if (!extraChart) continue
			let extraValue = extraChart[String(dateInSec)]
			if (extraValue == null && alignedDateInSec !== dateInSec) {
				extraValue = extraChart[String(alignedDateInSec)]
			}

			// Align only near the latest timestamp so stale charts do not shift.
			if (
				extraValue == null &&
				latestMainTvlTimestamp != null &&
				dateInSec === latestMainTvlTimestamp &&
				mostRecentTvlTimestamp != null
			) {
				const extraLatestTimestamp = extraTvlCharts.latestTimestamps[extra]
				if (
					extraLatestTimestamp != null &&
					Math.abs(mostRecentTvlTimestamp - extraLatestTimestamp) <= MAX_TVL_TIMESTAMP_ALIGNMENT_DIFF_SEC
				) {
					extraValue = extraChart[String(extraLatestTimestamp)]
				}
			}
			extrasAtTimestamp += extraValue ?? 0
		}
		store[String(dateKey)] = value + extrasAtTimestamp
		retainedTimestampByKey[String(dateKey)] = alignedDateInSec
	}

	const finalChart: Array<[number, number | null]> = []
	for (const date in store) {
		const dateInSec = Number(date)
		const dateInMs = Number(date) * 1e3
		const retainedTimestampSec = retainedTimestampByKey[date] ?? dateInSec
		const retainedTimestampMs = retainedTimestampSec * 1e3
		const denominationRate =
			denominationPriceHistory?.[String(retainedTimestampSec)] ??
			denominationPriceHistory?.[String(retainedTimestampMs)]
		const finalValue = denominationPriceHistory
			? denominationRate
				? store[date] / denominationRate
				: null
			: store[date]
		if (finalValue !== null) {
			finalChart.push([dateInMs, finalValue])
		}
	}

	return finalChart
}

export function buildUsdInflowsFromTvlChart(tvlChart: Array<[number, number | null]>): Array<[number, number]> | null {
	if (tvlChart.length < 2) return null

	const inflows: Array<[number, number]> = []
	for (let i = 1; i < tvlChart.length; i++) {
		const [timestamp, value] = tvlChart[i]
		const previousValue = tvlChart[i - 1][1]
		if (value == null || previousValue == null || !Number.isFinite(value) || !Number.isFinite(previousValue)) continue
		inflows.push([Math.floor(timestamp / 1e3), value - previousValue])
	}

	return inflows.length > 0 ? inflows : null
}
