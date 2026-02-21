import { fetchCoinsChart } from '~/api'
import type { IResponseCGMarketsAPI } from '~/api/types'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import type { ComparisonEntry, PricePoint, TimelinePoint } from './types'

const DAY_IN_SECONDS = 86_400

export type TokenPnlResult = {
	coinInfo?: IResponseCGMarketsAPI
	priceSeries: PricePoint[]
	timeline: TimelinePoint[]
	metrics: {
		startPrice: number
		endPrice: number
		percentChange: number
		absoluteChange: number
		maxDrawdown: number
		volatility: number
		rangeHigh: number
		rangeLow: number
		holdingPeriodDays: number
		annualizedReturn: number
		isProfit: boolean
	}
	currentPrice: number
	chartData: { dataset: IMultiSeriesChart2Props['dataset']; charts: IMultiSeriesChart2Props['charts'] }
	yAxisConfig: {
		min: number
		max: number
		interval: number
	}
	primaryColor: string
}

export function formatPriceSeriesFromCoinsChart(
	prices: Array<{ timestamp?: number; price?: number }> | undefined
): PricePoint[] {
	return (prices ?? [])
		.flatMap((entry): PricePoint[] => {
			if (
				typeof entry.timestamp !== 'number' ||
				!Number.isFinite(entry.timestamp) ||
				typeof entry.price !== 'number' ||
				!Number.isFinite(entry.price)
			) {
				return []
			}
			return [{ timestamp: entry.timestamp, price: entry.price }]
		})
		.sort((a, b) => a.timestamp - b.timestamp)
}

export async function fetchPriceSeries(
	tokenId: string,
	start: number | null,
	end: number | null
): Promise<PricePoint[]> {
	if (!tokenId || start == null || end == null || end <= start) return []
	const key = `coingecko:${tokenId}`
	const rangeSeconds = end - start
	const intervalSeconds =
		rangeSeconds <= 7 * DAY_IN_SECONDS ? 3600 : rangeSeconds <= 90 * DAY_IN_SECONDS ? 14_400 : DAY_IN_SECONDS
	const span = Math.max(1, Math.min(5_000, Math.ceil(rangeSeconds / intervalSeconds)))
	const response = await fetchCoinsChart({
		coin: key,
		start,
		span,
		searchWidth: '600'
	})
	return formatPriceSeriesFromCoinsChart(response?.coins?.[key]?.prices)
}

const calculateMaxDrawdown = (series: PricePoint[]): number => {
	if (series.length === 0) return 0
	let peak = series[0].price
	let maxDrawdown = 0
	for (const point of series) {
		if (point.price > peak) {
			peak = point.price
			continue
		}
		if (peak === 0) continue
		const drawdown = ((point.price - peak) / peak) * 100
		if (drawdown < maxDrawdown) maxDrawdown = drawdown
	}
	return Math.abs(maxDrawdown)
}

const SECONDS_PER_YEAR = 365 * DAY_IN_SECONDS

const calculateAnnualizedVolatility = (series: PricePoint[]): number => {
	if (series.length < 2) return 0
	const returns: number[] = []
	let totalDeltaSec = 0
	let deltaCount = 0
	for (let i = 1; i < series.length; i++) {
		const prev = series[i - 1]
		const curr = series[i]
		if (prev.price === 0 || !Number.isFinite(prev.price) || !Number.isFinite(curr.price)) continue
		returns.push((curr.price - prev.price) / prev.price)
		const dt = curr.timestamp - prev.timestamp
		if (Number.isFinite(dt) && dt > 0) {
			totalDeltaSec += dt
			deltaCount++
		}
	}
	if (returns.length < 2) return 0
	const avgIntervalSec = deltaCount > 0 ? totalDeltaSec / deltaCount : DAY_IN_SECONDS
	const periodsPerYear = SECONDS_PER_YEAR / avgIntervalSec
	const mean = returns.reduce((acc, value) => acc + value, 0) / returns.length
	const variance = returns.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / (returns.length - 1 || 1)
	const periodVol = Math.sqrt(variance)
	return periodVol * Math.sqrt(periodsPerYear) * 100
}

const calculateYAxisConfigFromPrices = (
	rangeLow: number,
	rangeHigh: number
): { min: number; max: number; interval: number } => {
	if (!Number.isFinite(rangeLow) || !Number.isFinite(rangeHigh)) return { min: 0, max: 0, interval: 1000 }

	const min = rangeLow
	const max = rangeHigh
	const range = max - min

	if (range === 0) {
		const padding = max === 0 ? 1 : Math.abs(max) * 0.1
		return {
			min: Math.min(0, min - padding),
			max: max + padding,
			interval: padding
		}
	}

	const magnitude = Math.pow(10, Math.floor(Math.log10(range)))
	const normalized = range / magnitude
	const interval =
		normalized <= 1 ? magnitude * 0.2 : normalized <= 2 ? magnitude * 0.5 : normalized <= 5 ? magnitude : magnitude * 2

	return {
		min: Math.floor(min / interval) * interval,
		max: Math.ceil(max / interval) * interval,
		interval
	}
}

export async function computeTokenPnl(params: {
	id: string
	start: number | null
	end: number | null
	coinInfo?: IResponseCGMarketsAPI | null
}): Promise<TokenPnlResult | null> {
	const { id, start, end, coinInfo } = params
	if (!id || start == null || end == null || end <= start) return null

	const series = await fetchPriceSeries(id, start, end)
	if (series.length === 0) {
		const primaryColor = '#10b981'
		return {
			coinInfo: coinInfo ?? undefined,
			priceSeries: [],
			timeline: [],
			metrics: {
				startPrice: 0,
				endPrice: 0,
				percentChange: 0,
				absoluteChange: 0,
				maxDrawdown: 0,
				volatility: 0,
				rangeHigh: 0,
				rangeLow: 0,
				holdingPeriodDays: 0,
				annualizedReturn: 0,
				isProfit: false
			},
			currentPrice: coinInfo?.current_price ?? 0,
			chartData: {
				dataset: { source: [], dimensions: ['timestamp', 'Token Price'] },
				charts: [
					{
						type: 'line' as const,
						name: 'Token Price',
						encode: { x: 'timestamp', y: 'Token Price' },
						stack: 'Token Price',
						color: primaryColor
					}
				]
			},
			yAxisConfig: { min: 0, max: 0, interval: 1000 },
			primaryColor
		}
	}

	const startPrice = series[0].price
	const endPrice = series[series.length - 1].price
	const percentChange = startPrice !== 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0
	const absoluteChange = endPrice - startPrice
	const isPositive = endPrice >= startPrice
	const primaryColor = isPositive ? '#10b981' : '#ef4444'
	const holdingPeriodDays = Math.max(1, Math.round((end - start) / DAY_IN_SECONDS))
	const annualizedBase = Math.max(Number.EPSILON, 1 + percentChange / 100)
	const annualizedReturn = (Math.pow(annualizedBase, 365 / holdingPeriodDays) - 1) * 100

	const timeline: TimelinePoint[] = []
	const dataPoints: Array<[number, number]> = []
	let rangeHigh = Number.NEGATIVE_INFINITY
	let rangeLow = Number.POSITIVE_INFINITY
	const firstPoint = series[0]
	if (firstPoint.timestamp !== start) dataPoints.push([start * 1000, firstPoint.price])

	for (let index = 0; index < series.length; index++) {
		const point = series[index]
		if (point.price > rangeHigh) rangeHigh = point.price
		if (point.price < rangeLow) rangeLow = point.price
		if (index === 0) {
			timeline.push({ ...point, change: 0, percentChange: 0 })
		} else {
			const prev = series[index - 1]
			const delta = point.price - prev.price
			const pct = prev.price !== 0 ? (delta / prev.price) * 100 : 0
			timeline.push({ ...point, change: delta, percentChange: pct })
		}
		dataPoints.push([point.timestamp * 1000, point.price])
	}

	const lastPoint = series[series.length - 1]
	if (lastPoint.timestamp !== end) dataPoints.push([end * 1000, lastPoint.price])
	dataPoints.sort((a, b) => a[0] - b[0])

	const chartData = {
		dataset: {
			source: dataPoints.map(([timestamp, value]) => ({ timestamp, 'Token Price': value })),
			dimensions: ['timestamp', 'Token Price']
		},
		charts: [
			{
				type: 'line' as const,
				name: 'Token Price',
				encode: { x: 'timestamp', y: 'Token Price' },
				stack: 'Token Price',
				color: primaryColor
			}
		]
	}

	return {
		coinInfo: coinInfo ?? undefined,
		priceSeries: series,
		timeline,
		metrics: {
			startPrice,
			endPrice,
			percentChange,
			absoluteChange,
			maxDrawdown: calculateMaxDrawdown(series),
			volatility: calculateAnnualizedVolatility(series),
			rangeHigh,
			rangeLow,
			holdingPeriodDays,
			annualizedReturn,
			isProfit: percentChange >= 0
		},
		currentPrice: coinInfo?.current_price ?? endPrice,
		chartData,
		yAxisConfig: calculateYAxisConfigFromPrices(rangeLow, rangeHigh),
		primaryColor
	}
}

export async function buildComparisonEntry(params: {
	tokenId: string
	start: number | null
	end: number | null
	coinInfoMap: Map<string, IResponseCGMarketsAPI>
}): Promise<ComparisonEntry | null> {
	const { tokenId, start, end, coinInfoMap } = params
	const series = await fetchPriceSeries(tokenId, start, end)
	if (series.length === 0) return null

	const startPrice = series[0].price
	const endPrice = series[series.length - 1].price
	const percentChange = startPrice !== 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0
	const absoluteChange = endPrice - startPrice
	const coin = coinInfoMap.get(tokenId)

	return {
		id: tokenId,
		name: coin?.name ?? tokenId,
		symbol: coin?.symbol ?? tokenId,
		image: coin?.image,
		percentChange,
		absoluteChange,
		startPrice,
		endPrice
	}
}
