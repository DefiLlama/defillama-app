import type { ChartTimeGrouping, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import { formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { formatPercentChangeText } from '~/components/PercentChange'
import { formattedNum, toNiceDayMonthAndYearAndTime } from '~/utils'
import type {
	IRWAPerpsContractData,
	IRWAPerpsContractFundingHistoryPoint,
	IRWAPerpsContractMarketChartPoint
} from './types'

export type RWAPerpsContractChartMetricKey = 'openInterest' | 'volume24h' | 'price' | 'fundingRate' | 'premium'

export interface RWAPerpsContractChartMetricConfig {
	key: RWAPerpsContractChartMetricKey
	label: string
	queryKey: string
	defaultEnabled: boolean
	color: string
	defaultType: 'line' | 'bar'
	yAxisIndex?: number
	valueSymbol?: string
}

export const RWA_PERPS_CONTRACT_CHART_METRICS: readonly RWAPerpsContractChartMetricConfig[] = [
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

export const DEFAULT_ENABLED_RWA_PERPS_CONTRACT_CHART_METRICS = RWA_PERPS_CONTRACT_CHART_METRICS.filter(
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
	return value ?? null
}

export function formatRWAPerpsContractPriceChange(value: number | null | undefined): string | null {
	return formatPercentChangeText(value)
}

export function formatRWAPerpsContractChartDate(value: number): string {
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

export function buildRWAPerpsContractMetricSections(contractData: IRWAPerpsContractData): {
	openInterest: MetricRowData
	volume: MetricSectionData
	fees: MetricSectionData
	tradingParameters: MetricSectionData
	marketReference: MetricSectionData
	pointInTimeRows: MetricRowData[]
} {
	const maxLeverage = formatMaybeNumber(contractData.market.maxLeverage)
	const tradingParameterChildren = [
		{ label: 'Max Leverage', value: maxLeverage === '-' ? '-' : `${maxLeverage}x` },
		{ label: 'Maker Fee', value: formatFractionPercent(contractData.market.makerFeeRate) },
		{ label: 'Taker Fee', value: formatFractionPercent(contractData.market.takerFeeRate) },
		...(contractData.market.deployerFeeShare == null || !Number.isFinite(contractData.market.deployerFeeShare)
			? []
			: [{ label: 'Deployer Fee Share', value: formatFractionPercent(contractData.market.deployerFeeShare) }]),
		{ label: 'Size Decimals', value: formatMaybeNumber(contractData.market.szDecimals) }
	]

	const marketReferenceChildren = [
		{ label: 'Oracle Price', value: formatMaybeCurrency(contractData.market.oraclePx) },
		{ label: 'Mid Price', value: formatMaybeCurrency(contractData.market.midPx) },
		{ label: 'Previous Day Price', value: formatMaybeCurrency(contractData.market.prevDayPx) },
		...(formatTextValue(contractData.market.pair) ? [{ label: 'Pair', value: contractData.market.pair }] : []),
		...(formatTextValue(contractData.market.marginAsset)
			? [{ label: 'Margin Asset', value: contractData.market.marginAsset }]
			: []),
		...(formatTextValue(contractData.market.settlementAsset)
			? [{ label: 'Settlement Asset', value: contractData.market.settlementAsset }]
			: [])
	]

	return {
		openInterest: {
			label: 'Open Interest',
			value: formatMaybeCurrency(contractData.market.openInterest)
		},
		volume: {
			label: 'Volume 30d',
			value: formatMaybeCurrency(contractData.market.volume30d),
			children: [
				{ label: 'Volume 7d', value: formatMaybeCurrency(contractData.market.volume7d) },
				{ label: 'Volume 24h', value: formatMaybeCurrency(contractData.market.volume24h) },
				{ label: 'Cumulative Volume', value: formatMaybeCurrency(contractData.market.volumeAllTime) }
			]
		},
		fees: {
			label: 'Est. Protocol Fees 30d',
			value: formatMaybeCurrency(contractData.market.estimatedProtocolFees30d),
			children: [
				{ label: 'Est. Protocol Fees 7d', value: formatMaybeCurrency(contractData.market.estimatedProtocolFees7d) },
				{ label: 'Est. Protocol Fees 24h', value: formatMaybeCurrency(contractData.market.estimatedProtocolFees24h) },
				{
					label: 'Est. Cum. Protocol Fees',
					value: formatMaybeCurrency(contractData.market.estimatedProtocolFeesAllTime)
				}
			]
		},
		tradingParameters: {
			label: 'Trading Parameters',
			value: `${contractData.market.maxLeverage}x`,
			children: tradingParameterChildren
		},
		marketReference: {
			label: 'Market Reference',
			value: formatMaybeCurrency(contractData.market.oraclePx),
			children: marketReferenceChildren
		},
		pointInTimeRows: [
			{ label: 'Latest Funding Rate', value: formatFractionPercent(contractData.market.fundingRate) },
			{ label: 'Premium', value: formatFractionPercent(contractData.market.premium) },
			{ label: 'Cum. Funding / Unit', value: formatMaybeCurrency(contractData.market.cumulativeFunding) }
		]
	}
}

export function buildRWAPerpsContractInfoRows(contractData: IRWAPerpsContractData): MetricRowData[] {
	const marketTimestampMs = toUnixMsTimestamp(contractData.market.timestamp)
	const baseAsset = formatTextValue(contractData.contract.baseAsset)
	const symbolSuffix = contractData.contract.contract.split(':')[1] ?? contractData.contract.contract
	const shouldShowBaseAsset = baseAsset != null && baseAsset.toLowerCase() !== symbolSuffix.toLowerCase()

	return [
		{ label: 'Venue', value: contractData.contract.venue },
		...(formatTextValue(contractData.contract.assetClass)
			? [{ label: 'Asset Class', value: contractData.contract.assetClass! }]
			: []),
		...(formatTextValue(contractData.contract.rwaClassification)
			? [{ label: 'RWA Classification', value: contractData.contract.rwaClassification! }]
			: []),
		...(formatTextValue(contractData.contract.accessModel)
			? [{ label: 'Access Model', value: contractData.contract.accessModel! }]
			: []),
		...(formatTextValue(contractData.contract.parentPlatform)
			? [{ label: 'Parent Platform', value: contractData.contract.parentPlatform! }]
			: []),
		...(formatTextValue(contractData.contract.issuer)
			? [{ label: 'Issuer', value: contractData.contract.issuer! }]
			: []),
		...(formatTextValue(contractData.contract.oracleProvider)
			? [{ label: 'Oracle Provider', value: contractData.contract.oracleProvider! }]
			: []),
		...(contractData.contract.website ? [{ label: 'Website', value: contractData.contract.website }] : []),
		...(shouldShowBaseAsset ? [{ label: 'Base Asset', value: baseAsset! }] : []),
		{ label: 'Snapshot Time', value: formatRWAPerpsContractChartDate(marketTimestampMs) }
	]
}

function getMetricValue(point: IRWAPerpsContractMarketChartPoint, metric: RWAPerpsContractChartMetricKey): number {
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
	point: IRWAPerpsContractFundingHistoryPoint,
	metric: Extract<RWAPerpsContractChartMetricKey, 'fundingRate' | 'premium'>
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
	marketPoints: IRWAPerpsContractMarketChartPoint[] | null
	fundingHistory: IRWAPerpsContractFundingHistoryPoint[] | null
	metricKey: RWAPerpsContractChartMetricKey
}): Array<[number, number]> {
	if (metricKey === 'fundingRate' || metricKey === 'premium') {
		if (fundingHistory?.length) {
			return [...fundingHistory]
				.sort((a, b) => toUnixMsTimestamp(a.timestamp) - toUnixMsTimestamp(b.timestamp))
				.map((point) => [toUnixMsTimestamp(point.timestamp), getFundingHistoryMetricValue(point, metricKey)])
		}
	}

	if (!marketPoints?.length) return []
	return [...marketPoints]
		.sort((a, b) => toUnixMsTimestamp(a.timestamp) - toUnixMsTimestamp(b.timestamp))
		.map((point) => [toUnixMsTimestamp(point.timestamp), getMetricValue(point, metricKey)] as [number, number])
}

type ChartSpec = {
	dataset: {
		source: Array<Record<string, string | number | null>>
		dimensions: string[]
	}
	charts: MultiSeriesChart2SeriesConfig[]
}

export function buildRWAPerpsContractChartSpec({
	marketPoints,
	fundingHistory,
	groupBy,
	enabledMetrics
}: {
	marketPoints: IRWAPerpsContractMarketChartPoint[] | null
	fundingHistory: IRWAPerpsContractFundingHistoryPoint[] | null
	groupBy: ChartTimeGrouping
	enabledMetrics: RWAPerpsContractChartMetricKey[]
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
		const metric = RWA_PERPS_CONTRACT_CHART_METRICS.find((item) => item.key === metricKey)
		if (!metric) continue

		const rawData = getMetricSourcePoints({ marketPoints, fundingHistory, metricKey: metric.key })
		if (rawData.length === 0) continue
		const seriesPoints =
			metric.defaultType === 'bar'
				? formatBarChart({
						data: rawData,
						groupBy,
						dateInMs: true,
						denominationPriceHistory: null
					})
				: formatLineChart({
						data: rawData,
						groupBy,
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
			type: metric.defaultType,
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
