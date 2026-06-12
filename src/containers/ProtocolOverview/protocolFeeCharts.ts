import type { ChartTimeGroupingWithCumulative } from '~/components/ECharts/types'
import { mergeFeeExtraSeries } from '~/metrics/feeExtras'
import { getGroupedTimestampSec } from './chartSeries.utils'

export type ProtocolFeeExtraChartMap = Record<string, number> | null | undefined
export type ProtocolFeeChartSeries = Array<[number, number]>
export type ProtocolFeeChartRows = Array<[number, number | null]>

const toSeries = (chart: ProtocolFeeExtraChartMap): Array<[number, number]> => {
	if (!chart) return []

	const series: Array<[number, number]> = []
	for (const timestamp in chart) {
		series.push([Number(timestamp), chart[timestamp]])
	}
	return series
}

export function mergeProtocolFeeExtraChartSeries({
	base,
	bribeRevenue,
	tokenTax,
	includeBribes,
	includeTokenTax
}: {
	base: Array<[number, number]>
	bribeRevenue: ProtocolFeeExtraChartMap
	tokenTax: ProtocolFeeExtraChartMap
	includeBribes: boolean
	includeTokenTax: boolean
}) {
	return mergeFeeExtraSeries({
		base,
		extraCharts: [includeBribes ? toSeries(bribeRevenue) : [], includeTokenTax ? toSeries(tokenTax) : []]
	})
}

const toRows = (store: Record<string, number | null>): ProtocolFeeChartRows => {
	const rows: ProtocolFeeChartRows = []
	for (const date in store) {
		rows.push([+date * 1e3, store[date]])
	}
	return rows
}

interface ICumulativeBucket {
	fees: number
	revenue: number
	holdersRevenue: number
	extras: number
	feesEvent: boolean
	revenueEvent: boolean
	holdersRevenueEvent: boolean
	extrasEvent: boolean
	feesNull: boolean
	revenueNull: boolean
	holdersRevenueNull: boolean
	extrasNull: boolean
}

const getCumulativeBucket = (buckets: Record<string, ICumulativeBucket>, dateKey: number) => {
	return (buckets[dateKey] ??= {
		fees: 0,
		revenue: 0,
		holdersRevenue: 0,
		extras: 0,
		feesEvent: false,
		revenueEvent: false,
		holdersRevenueEvent: false,
		extrasEvent: false,
		feesNull: false,
		revenueNull: false,
		holdersRevenueNull: false,
		extrasNull: false
	})
}

export function buildProtocolFeeFamilyCharts({
	fees,
	revenue,
	holdersRevenue,
	bribes,
	tokenTaxes,
	groupBy,
	denominationPriceHistory
}: {
	fees: ProtocolFeeChartSeries | null | undefined
	revenue: ProtocolFeeChartSeries | null | undefined
	holdersRevenue: ProtocolFeeChartSeries | null | undefined
	bribes: ProtocolFeeChartSeries | null | undefined
	tokenTaxes: ProtocolFeeChartSeries | null | undefined
	groupBy: ChartTimeGroupingWithCumulative
	denominationPriceHistory: Record<string, number> | null
}) {
	const feesStore: Record<string, number | null> = {}
	const revenueStore: Record<string, number | null> = {}
	const holdersRevenueStore: Record<string, number | null> = {}
	const isCumulative = groupBy === 'cumulative'

	const applyValue = (date: number, value: number) => {
		if (!denominationPriceHistory) return value
		const price = denominationPriceHistory[String(date)] ?? denominationPriceHistory[String(date * 1e3)]
		return price ? value / price : null
	}

	if (isCumulative) {
		const buckets: Record<string, ICumulativeBucket> = {}

		const applyBaseChart = (
			chart: ProtocolFeeChartSeries | null | undefined,
			key: 'fees' | 'revenue' | 'holdersRevenue',
			eventKey: 'feesEvent' | 'revenueEvent' | 'holdersRevenueEvent',
			nullKey: 'feesNull' | 'revenueNull' | 'holdersRevenueNull'
		) => {
			if (!chart) return
			for (const [date, value] of chart) {
				const dateKey = getGroupedTimestampSec(date, groupBy)
				const finalValue = applyValue(date, value)
				const bucket = getCumulativeBucket(buckets, dateKey)
				bucket[eventKey] = true
				if (finalValue == null) {
					bucket[nullKey] = true
					continue
				}
				bucket[key] += finalValue
			}
		}

		const applyExtraChart = (chart: ProtocolFeeChartSeries | null | undefined) => {
			if (!chart) return
			for (const [date, value] of chart) {
				const dateKey = getGroupedTimestampSec(date, groupBy)
				const finalValue = applyValue(date, value)
				const bucket = getCumulativeBucket(buckets, dateKey)
				bucket.extrasEvent = true
				if (finalValue == null) {
					bucket.extrasNull = true
					continue
				}
				bucket.extras += finalValue
			}
		}

		applyBaseChart(fees, 'fees', 'feesEvent', 'feesNull')
		applyBaseChart(revenue, 'revenue', 'revenueEvent', 'revenueNull')
		applyBaseChart(holdersRevenue, 'holdersRevenue', 'holdersRevenueEvent', 'holdersRevenueNull')
		applyExtraChart(bribes)
		applyExtraChart(tokenTaxes)

		let feesTotal = 0
		let revenueTotal = 0
		let holdersRevenueTotal = 0
		for (const dateKey of Object.keys(buckets)
			.map(Number)
			.sort((a, b) => a - b)) {
			const bucket = buckets[dateKey]
			if (fees && (bucket.feesEvent || bucket.extrasEvent)) {
				if (bucket.feesNull || bucket.extrasNull) {
					feesStore[dateKey] = null
				} else {
					feesTotal += bucket.fees + bucket.extras
					feesStore[dateKey] = feesTotal
				}
			}
			if (revenue && (bucket.revenueEvent || bucket.extrasEvent)) {
				if (bucket.revenueNull || bucket.extrasNull) {
					revenueStore[dateKey] = null
				} else {
					revenueTotal += bucket.revenue + bucket.extras
					revenueStore[dateKey] = revenueTotal
				}
			}
			if (holdersRevenue && (bucket.holdersRevenueEvent || bucket.extrasEvent)) {
				if (bucket.holdersRevenueNull || bucket.extrasNull) {
					holdersRevenueStore[dateKey] = null
				} else {
					holdersRevenueTotal += bucket.holdersRevenue + bucket.extras
					holdersRevenueStore[dateKey] = holdersRevenueTotal
				}
			}
		}

		return {
			fees: toRows(feesStore),
			revenue: toRows(revenueStore),
			holdersRevenue: toRows(holdersRevenueStore)
		}
	}

	const applyBaseChart = (chart: ProtocolFeeChartSeries | null | undefined, store: Record<string, number | null>) => {
		if (!chart) return
		let total = 0
		for (const [date, value] of chart) {
			const dateKey = getGroupedTimestampSec(date, groupBy)
			const finalValue = applyValue(date, value)
			if (finalValue == null) {
				store[dateKey] = null
				continue
			}
			if (store[dateKey] === null) continue
			store[dateKey] = (store[dateKey] ?? 0) + finalValue + total
			if (isCumulative) total += finalValue
		}
	}

	const applyExtraChart = (chart: ProtocolFeeChartSeries | null | undefined) => {
		if (!chart) return
		let total = 0
		for (const [date, value] of chart) {
			const dateKey = getGroupedTimestampSec(date, groupBy)
			const finalValue = applyValue(date, value)
			if (finalValue == null) {
				if (fees) feesStore[dateKey] = null
				if (revenue) revenueStore[dateKey] = null
				if (holdersRevenue) holdersRevenueStore[dateKey] = null
				continue
			}
			if (fees && feesStore[dateKey] !== null) feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
			if (revenue && revenueStore[dateKey] !== null)
				revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
			if (holdersRevenue && holdersRevenueStore[dateKey] !== null)
				holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
			if (isCumulative) total += finalValue
		}
	}

	applyBaseChart(fees, feesStore)
	applyBaseChart(revenue, revenueStore)
	applyBaseChart(holdersRevenue, holdersRevenueStore)
	applyExtraChart(bribes)
	applyExtraChart(tokenTaxes)

	return {
		fees: toRows(feesStore),
		revenue: toRows(revenueStore),
		holdersRevenue: toRows(holdersRevenueStore)
	}
}
