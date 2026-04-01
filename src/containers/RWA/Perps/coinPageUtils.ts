import type { ChartTimeGroupingWithCumulative, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { formatPercentChangeText } from '~/components/PercentChange'
import { formattedNum, toNiceDayMonthAndYearAndTime } from '~/utils'
import type { IRWAPerpsCoinData, IRWAPerpsCoinFundingHistoryPoint, IRWAPerpsCoinMarketChartPoint } from './types'

export type RWAPerpsCoinChartMetricKey = 'openInterest' | 'volume24h' | 'price' | 'fundingRate' | 'premium'

export interface RWAPerpsCoinChartMetricConfig {
	key: RWAPerpsCoinChartMetricKey
	label: string
	queryKey: string
	defaultEnabled: boolean
	color: string
	defaultType: 'line' | 'bar'
	yAxisIndex?: number
	valueSymbol?: string
}

export const RWA_PERPS_COIN_CHART_METRICS: readonly RWAPerpsCoinChartMetricConfig[] = [
	{
		key: 'openInterest',
		label: 'Open Interest',
		queryKey: 'oi',
		defaultEnabled: true,
		color: '#3B82F6',
		defaultType: 'line',
		valueSymbol: '$'
	},
	{
		key: 'volume24h',
		label: 'Volume 24h',
		queryKey: 'vol24h',
		defaultEnabled: true,
		color: '#7DD3FC',
		defaultType: 'bar',
		valueSymbol: '$'
	},
	{
		key: 'price',
		label: 'Price',
		queryKey: 'price',
		defaultEnabled: true,
		color: '#22C55E',
		defaultType: 'line',
		yAxisIndex: 1,
		valueSymbol: '$'
	},
	{
		key: 'fundingRate',
		label: 'Funding Rate',
		queryKey: 'funding',
		defaultEnabled: false,
		color: '#F59E0B',
		defaultType: 'line',
		yAxisIndex: 2,
		valueSymbol: '%'
	},
	{
		key: 'premium',
		label: 'Premium',
		queryKey: 'premium',
		defaultEnabled: false,
		color: '#EF4444',
		defaultType: 'line',
		yAxisIndex: 2,
		valueSymbol: '%'
	}
] as const

export const DEFAULT_ENABLED_RWA_PERPS_COIN_CHART_METRICS = RWA_PERPS_COIN_CHART_METRICS.filter(
	(metric) => metric.defaultEnabled
).map((metric) => metric.key)

function toUnixMsTimestamp(timestamp: number): number {
	return timestamp > 1e12 ? timestamp : timestamp * 1e3
}

function formatFractionPercent(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '-'
	return `${(value * 100).toFixed(Math.abs(value * 100) >= 1 ? 2 : 4)}%`
}

function formatMaybeCurrency(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '-'
	return formattedNum(value, true)
}

function formatMaybeNumber(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '-'
	return formattedNum(value, false)
}

function formatTextValue(value: string | null | undefined): string | null {
	return value && value.trim().length > 0 ? value : null
}

export function formatRWAPerpsCoinPriceChange(value: number | null | undefined): string | null {
	return formatPercentChangeText(value)
}

export function formatRWAPerpsCoinChartDate(value: number): string {
	return toNiceDayMonthAndYearAndTime(Math.floor(toUnixMsTimestamp(value) / 1e3))
}

type MetricRowData = {
	label: string
	value: string
}

export type MetricSectionData = {
	label: string
	value: string
	children: MetricRowData[]
}

export function buildRWAPerpsCoinMetricSections(coin: IRWAPerpsCoinData): {
	openInterest: MetricRowData
	volume: MetricSectionData
	fees: MetricSectionData
	tradingParameters: MetricSectionData
	marketReference: MetricSectionData
	pointInTimeRows: MetricRowData[]
} {
	const tradingParameterChildren = [
		{ label: 'Max Leverage', value: `${coin.market.maxLeverage}x` },
		{ label: 'Maker Fee', value: formatFractionPercent(coin.market.makerFeeRate) },
		{ label: 'Taker Fee', value: formatFractionPercent(coin.market.takerFeeRate) },
		...(coin.market.deployerFeeShare == null || !Number.isFinite(coin.market.deployerFeeShare)
			? []
			: [{ label: 'Deployer Fee Share', value: formatFractionPercent(coin.market.deployerFeeShare) }]),
		{ label: 'Size Decimals', value: formatMaybeNumber(coin.market.szDecimals) }
	]

	const marketReferenceChildren = [
		{ label: 'Oracle Price', value: formatMaybeCurrency(coin.market.oraclePx) },
		{ label: 'Mid Price', value: formatMaybeCurrency(coin.market.midPx) },
		{ label: 'Previous Day Price', value: formatMaybeCurrency(coin.market.prevDayPx) },
		...(formatTextValue(coin.market.pair) ? [{ label: 'Pair', value: coin.market.pair }] : []),
		...(formatTextValue(coin.market.marginAsset) ? [{ label: 'Margin Asset', value: coin.market.marginAsset }] : []),
		...(formatTextValue(coin.market.settlementAsset)
			? [{ label: 'Settlement Asset', value: coin.market.settlementAsset }]
			: [])
	]

	return {
		openInterest: {
			label: 'Open Interest',
			value: formatMaybeCurrency(coin.market.openInterest)
		},
		volume: {
			label: 'Volume 30d',
			value: formatMaybeCurrency(coin.market.volume30d),
			children: [
				{ label: 'Volume 7d', value: formatMaybeCurrency(coin.market.volume7d) },
				{ label: 'Volume 24h', value: formatMaybeCurrency(coin.market.volume24h) },
				{ label: 'Cumulative Volume', value: formatMaybeCurrency(coin.market.volumeAllTime) }
			]
		},
		fees: {
			label: 'Fees 30d',
			value: formatMaybeCurrency(coin.market.estimatedProtocolFees30d),
			children: [
				{ label: 'Fees 7d', value: formatMaybeCurrency(coin.market.estimatedProtocolFees7d) },
				{ label: 'Fees 24h', value: formatMaybeCurrency(coin.market.estimatedProtocolFees24h) },
				{ label: 'Cumulative Fees', value: formatMaybeCurrency(coin.market.estimatedProtocolFeesAllTime) }
			]
		},
		tradingParameters: {
			label: 'Trading Parameters',
			value: `${coin.market.maxLeverage}x`,
			children: tradingParameterChildren
		},
		marketReference: {
			label: 'Market Reference',
			value: formatMaybeCurrency(coin.market.oraclePx),
			children: marketReferenceChildren
		},
		pointInTimeRows: [
			{ label: 'Funding Rate', value: formatFractionPercent(coin.market.fundingRate) },
			{ label: 'Premium', value: formatFractionPercent(coin.market.premium) },
			{ label: 'Cumulative Funding', value: formatMaybeCurrency(coin.market.cumulativeFunding) }
		]
	}
}

export function buildRWAPerpsCoinInfoRows(coin: IRWAPerpsCoinData): MetricRowData[] {
	const marketTimestampMs = toUnixMsTimestamp(coin.market.timestamp)
	const referenceAsset = formatTextValue(coin.coin.referenceAsset)
	const symbolSuffix = coin.coin.coin.split(':')[1] ?? coin.coin.coin
	const shouldShowReferenceAsset =
		referenceAsset != null && referenceAsset.trim().toLowerCase() !== symbolSuffix.trim().toLowerCase()

	return [
		{ label: 'Venue', value: coin.coin.venue },
		...(formatTextValue(coin.coin.assetClass) ? [{ label: 'Asset Class', value: coin.coin.assetClass! }] : []),
		...(formatTextValue(coin.coin.rwaClassification)
			? [{ label: 'RWA Classification', value: coin.coin.rwaClassification! }]
			: []),
		...(formatTextValue(coin.coin.accessModel) ? [{ label: 'Access Model', value: coin.coin.accessModel! }] : []),
		...(formatTextValue(coin.coin.parentPlatform)
			? [{ label: 'Parent Platform', value: coin.coin.parentPlatform! }]
			: []),
		...(formatTextValue(coin.coin.issuer) ? [{ label: 'Issuer', value: coin.coin.issuer! }] : []),
		...(formatTextValue(coin.coin.oracleProvider)
			? [{ label: 'Oracle Provider', value: coin.coin.oracleProvider! }]
			: []),
		...(coin.coin.website ? [{ label: 'Website', value: coin.coin.website }] : []),
		...(shouldShowReferenceAsset ? [{ label: 'Reference Asset', value: referenceAsset! }] : []),
		{ label: 'Snapshot Time', value: formatRWAPerpsCoinChartDate(marketTimestampMs) }
	]
}

function getMetricValue(point: IRWAPerpsCoinMarketChartPoint, metric: RWAPerpsCoinChartMetricKey): number {
	switch (metric) {
		case 'openInterest':
			return point.openInterest
		case 'volume24h':
			return point.volume24h
		case 'price':
			return point.price
		case 'fundingRate':
			return point.fundingRate * 100
		case 'premium':
			return point.premium * 100
	}
}

function getFundingHistoryMetricValue(
	point: IRWAPerpsCoinFundingHistoryPoint,
	metric: Extract<RWAPerpsCoinChartMetricKey, 'fundingRate' | 'premium'>
): number {
	switch (metric) {
		case 'fundingRate':
			return point.fundingRate * 100
		case 'premium':
			return point.premium * 100
	}
}

function getMetricSourcePoints({
	marketPoints,
	fundingHistory,
	metricKey
}: {
	marketPoints: IRWAPerpsCoinMarketChartPoint[] | null
	fundingHistory: IRWAPerpsCoinFundingHistoryPoint[] | null
	metricKey: RWAPerpsCoinChartMetricKey
}): Array<[number, number]> {
	if (metricKey === 'fundingRate' || metricKey === 'premium') {
		if (fundingHistory?.length) {
			return fundingHistory.map((point) => [
				toUnixMsTimestamp(point.timestamp),
				getFundingHistoryMetricValue(point, metricKey)
			])
		}
	}

	if (!marketPoints?.length) return []
	return marketPoints.map(
		(point) => [toUnixMsTimestamp(point.timestamp), getMetricValue(point, metricKey)] as [number, number]
	)
}

type ChartSpec = {
	dataset: {
		source: Array<Record<string, string | number | null>>
		dimensions: string[]
	}
	charts: MultiSeriesChart2SeriesConfig[]
}

export function buildRWAPerpsCoinChartSpec({
	marketPoints,
	fundingHistory,
	groupBy,
	enabledMetrics
}: {
	marketPoints: IRWAPerpsCoinMarketChartPoint[] | null
	fundingHistory: IRWAPerpsCoinFundingHistoryPoint[] | null
	groupBy: ChartTimeGroupingWithCumulative
	enabledMetrics: RWAPerpsCoinChartMetricKey[]
}): ChartSpec {
	const hasAnyData = (marketPoints?.length ?? 0) > 0 || (fundingHistory?.length ?? 0) > 0
	if (!hasAnyData || enabledMetrics.length === 0) {
		return {
			dataset: {
				source: [],
				dimensions: ['timestamp']
			},
			charts: []
		}
	}

	const rowMap = new Map<number, Record<string, string | number | null>>()
	const charts: MultiSeriesChart2SeriesConfig[] = []

	for (const metricKey of enabledMetrics) {
		const metric = RWA_PERPS_COIN_CHART_METRICS.find((item) => item.key === metricKey)
		if (!metric) continue

		const rawData = getMetricSourcePoints({ marketPoints, fundingHistory, metricKey: metric.key })
		if (rawData.length === 0) continue
		const seriesPoints =
			metric.defaultType === 'bar'
				? formatBarChart({
						data: rawData,
						groupBy: groupBy === 'cumulative' ? 'cumulative' : groupBy,
						dateInMs: true,
						denominationPriceHistory: null
					})
				: formatLineChart({
						data: rawData,
						groupBy: groupBy === 'cumulative' ? 'daily' : groupBy,
						dateInMs: true,
						denominationPriceHistory: null
					})

		for (const [timestamp, value] of seriesPoints) {
			const row = rowMap.get(timestamp) ?? { timestamp }
			row[metric.label] = value
			rowMap.set(timestamp, row)
		}

		charts.push({
			name: metric.label,
			type: metric.defaultType === 'bar' && groupBy !== 'cumulative' ? 'bar' : 'line',
			encode: { x: 'timestamp', y: metric.label },
			color: metric.color,
			...(metric.yAxisIndex != null ? { yAxisIndex: metric.yAxisIndex } : {}),
			...(metric.valueSymbol ? { valueSymbol: metric.valueSymbol } : {}),
			...(metric.key !== 'openInterest' ? { hideAreaStyle: true } : {})
		})
	}

	const source = Array.from(rowMap.values()).sort((a, b) => Number(a.timestamp) - Number(b.timestamp))

	return {
		dataset: {
			source,
			dimensions: ['timestamp', ...charts.map((chart) => chart.name)]
		},
		charts
	}
}
