import * as Ariakit from '@ariakit/react'
import { useQueries, useQuery } from '@tanstack/react-query'
import type * as echarts from 'echarts/core'
import { useRouter } from 'next/router'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { IResponseCGMarketsAPI } from '~/api/types'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { formatTooltipChartDate, formatTooltipValue } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { CoinsPicker } from '~/containers/Correlations'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum } from '~/utils'
import { pushShallowQuery } from '~/utils/routerQuery'
import { fetchPriceSeries } from './api'
import { ComparisonPanel } from './ComparisonPanel'
import { DailyPnLGrid } from './DailyPnLGrid'
import { DateInput } from './DateInput'
import { formatDateLabel, formatPercent } from './format'
import { StatsCard } from './StatsCard'
import type { ComparisonEntry, PricePoint, TimelinePoint } from './types'

const EMPTY_SELECTED_COINS: Record<string, IResponseCGMarketsAPI> = {}
const EMPTY_COMPARISON_ENTRIES: ComparisonEntry[] = []

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const DAY_IN_SECONDS = 86_400
const DEFAULT_COMPARISON_IDS = ['bitcoin', 'ethereum', 'solana'] as const

type TokenPnlResult = {
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

const unixToDateString = (unixTimestamp?: number): string => {
	if (unixTimestamp == null) return ''
	const date = new Date(unixTimestamp * 1000)
	return date.toISOString().split('T')[0] ?? ''
}

const dateStringToUnix = (dateString: string | null | undefined): number | null => {
	if (!dateString) return null
	const timestamp = new Date(dateString).getTime()
	if (Number.isNaN(timestamp)) return null
	return Math.floor(timestamp / 1000)
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
		if (drawdown < maxDrawdown) {
			maxDrawdown = drawdown
		}
	}
	return Math.abs(maxDrawdown)
}

const calculateAnnualizedVolatility = (series: PricePoint[]): number => {
	if (series.length < 2) return 0
	const returns: number[] = []
	for (let i = 1; i < series.length; i++) {
		const prev = series[i - 1].price
		const curr = series[i].price
		if (prev === 0 || !Number.isFinite(prev) || !Number.isFinite(curr)) continue
		returns.push((curr - prev) / prev)
	}
	if (returns.length < 2) return 0
	const mean = returns.reduce((acc, value) => acc + value, 0) / returns.length
	const variance = returns.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / (returns.length - 1 || 1)
	const dailyVol = Math.sqrt(variance)
	return dailyVol * Math.sqrt(365) * 100
}

const calculateYAxisConfigFromPrices = (prices: number[]): { min: number; max: number; interval: number } => {
	if (prices.length === 0) return { min: 0, max: 0, interval: 1000 }

	const min = Math.min(...prices)
	const max = Math.max(...prices)
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

const computeTokenPnl = async (params: {
	id: string
	start: number | null
	end: number | null
	coinInfo?: IResponseCGMarketsAPI | null
}): Promise<TokenPnlResult | null> => {
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
	const annualizedReturn =
		holdingPeriodDays > 0 ? (Math.pow(1 + percentChange / 100, 365 / holdingPeriodDays) - 1) * 100 : 0

	const prices: number[] = []
	const timeline: TimelinePoint[] = []
	const dataPoints: Array<[number, number]> = []

	const firstPoint = series[0]
	if (firstPoint.timestamp !== start) {
		dataPoints.push([start * 1000, firstPoint.price])
	}

	for (let index = 0; index < series.length; index++) {
		const point = series[index]
		prices.push(point.price)

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
	if (lastPoint.timestamp !== end) {
		dataPoints.push([end * 1000, lastPoint.price])
	}
	dataPoints.sort((a, b) => a[0] - b[0])

	const rangeHigh = Math.max(...prices)
	const rangeLow = Math.min(...prices)

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

	const yAxisConfig = calculateYAxisConfigFromPrices(prices)

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
		yAxisConfig,
		primaryColor
	}
}

const isValidDate = (dateString: string | string[] | undefined): boolean => {
	if (!dateString || typeof dateString !== 'string') return false
	const date = new Date(+dateString * 1000)
	return !Number.isNaN(date.getTime())
}

type TokenPnlContentProps = {
	routerReady: boolean
	isLoading: boolean
	isFetching: boolean
	isError: boolean
	error: unknown
	onRetry: () => void | Promise<unknown>
	pnlData: TokenPnlResult | null | undefined
	quantity: number
	start: number
	end: number
	chartOptions: TokenPnlChartOptions | undefined
	exportChartInstance: () => echarts.ECharts | null
	handleChartReady: (instance: echarts.ECharts | null) => void
	comparisonData: ComparisonEntry[]
	selectedCoinId: string
}

type TooltipItem = {
	data?: Record<string, unknown>
	value?: unknown
	seriesName?: string
}

type TokenPnlChartOptions = {
	xAxis: {
		type: 'time'
		min: number
		max: number
		axisLabel: {
			formatter: (value: number) => string
			showMinLabel: boolean
			showMaxLabel: boolean
			hideOverlap: boolean
		}
		boundaryGap: boolean
	}
	yAxis: {
		min: number
		max: number
		interval: number
	}
	legend: {
		show: boolean
	}
	tooltip: {
		backgroundColor: string
		borderWidth: number
		padding: number
		axisPointer: {
			type: 'line'
			lineStyle: { color: string; width: number; type: 'solid' }
			z: number
		}
		formatter: (items: TooltipItem | TooltipItem[]) => string
	}
}

const TokenPnlContent = ({
	routerReady,
	isLoading,
	isFetching,
	isError,
	error,
	onRetry,
	pnlData,
	quantity,
	start,
	end,
	chartOptions,
	exportChartInstance,
	handleChartReady,
	comparisonData,
	selectedCoinId
}: TokenPnlContentProps) => {
	if (!routerReady || isLoading || isFetching) {
		return (
			<div className="flex min-h-[360px] flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	if (isError) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-red-400 bg-red-400/10 p-2 text-center">
				<span className="text-lg font-semibold text-red-500">Failed to load data</span>
				<span className="text-sm text-red-400">
					{error instanceof Error ? error.message : 'Something went wrong fetching price data.'}
				</span>
				<button
					onClick={onRetry}
					className="rounded-md border border-red-500/40 bg-transparent px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
				>
					Retry
				</button>
			</div>
		)
	}

	if (!pnlData || pnlData.priceSeries.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
				<p className="text-lg font-semibold">No historical data available for this range.</p>
				<p className="text-sm text-(--text-secondary)">Try a different date range or another token.</p>
			</div>
		)
	}

	const { metrics, timeline, coinInfo, currentPrice, chartData } = pnlData
	const { percentChange, isProfit, holdingPeriodDays, annualizedReturn, absoluteChange } = metrics
	const quantityValue = quantity !== 0 ? absoluteChange * quantity : absoluteChange
	const formattedQuantityValue = formattedNum(Math.abs(quantityValue), false)
	const formattedAbsoluteChange = formattedNum(Math.abs(absoluteChange), false)
	const quantityLabel =
		quantity !== 0
			? `${formattedNum(quantity, false)} tokens → ${quantityValue >= 0 ? '+$' : '-$'}${formattedQuantityValue}`
			: `${absoluteChange >= 0 ? '+$' : '-$'}${formattedAbsoluteChange} per token`

	return (
		<div className="flex flex-1 flex-col gap-2">
			<section className="grid gap-2 sm:grid-cols-3" aria-label="Performance summary">
				<dl className="flex flex-col gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<dt className="text-xs font-medium tracking-wide text-(--text-label) uppercase">Return</dt>
					<dd className={`font-jetbrains text-3xl font-semibold ${isProfit ? 'text-(--success)' : 'text-(--error)'}`}>
						{formatPercent(percentChange)}
					</dd>
					<dd className="text-sm text-(--text-secondary)">{quantityLabel}</dd>
				</dl>
				<dl className="flex flex-col gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<dt className="text-xs font-medium tracking-wide text-(--text-label) uppercase">Holding Period</dt>
					<dd className="font-jetbrains text-3xl font-semibold text-(--text-primary)">
						{holdingPeriodDays} <span className="text-lg font-medium text-(--text-secondary)">days</span>
					</dd>
					<dd className="text-sm text-(--text-secondary)">
						<time dateTime={unixToDateString(start)}>{formatDateLabel(start)}</time> →{' '}
						<time dateTime={unixToDateString(end)}>{formatDateLabel(end)}</time>
					</dd>
				</dl>
				<dl className="flex flex-col gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<dt className="text-xs font-medium tracking-wide text-(--text-label) uppercase">Annualised Return</dt>
					<dd
						className={`font-jetbrains text-3xl font-semibold ${annualizedReturn >= 0 ? 'text-(--success)' : 'text-(--error)'}`}
					>
						{formatPercent(annualizedReturn)}
					</dd>
					<dd className="text-sm text-(--text-secondary)">
						{annualizedReturn >= 0 ? '↑' : '↓'} Based on {holdingPeriodDays}d period
					</dd>
				</dl>
			</section>

			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex items-center justify-end gap-2 p-3">
					<h3 className="text-base font-semibold">Price Over Time</h3>
					<p className="relative top-px mr-auto flex items-center gap-1 text-xs text-nowrap text-(--text-secondary)">
						<span>{formatDateLabel(start)}</span>
						<Icon name="arrow-right" width={14} height={14} />
						<span>{formatDateLabel(end)}</span>
					</p>
					<ChartExportButtons chartInstance={exportChartInstance} filename="token-pnl-price" title="Price Over Time" />
				</div>
				<Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={chartData.dataset}
						charts={chartData.charts}
						hideDataZoom
						chartOptions={chartOptions as unknown as IMultiSeriesChart2Props['chartOptions']}
						onReady={handleChartReady}
					/>
				</Suspense>
			</div>

			<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				<StatsCard
					label="Current Price"
					value={`$${formattedNum(currentPrice)}`}
					subtle={coinInfo?.symbol?.toUpperCase()}
					variant="highlight"
				/>
				<StatsCard label="Start Price" value={`$${formattedNum(metrics.startPrice)}`} />
				<StatsCard label="End Price" value={`$${formattedNum(metrics.endPrice)}`} />
				<StatsCard
					label="24h Change"
					value={
						coinInfo?.price_change_percentage_24h != null ? formatPercent(coinInfo.price_change_percentage_24h) : '0%'
					}
					subtle={
						coinInfo?.price_change_24h != null
							? `${coinInfo.price_change_24h >= 0 ? '+' : ''}$${formattedNum(coinInfo.price_change_24h)}`
							: undefined
					}
				/>
				<StatsCard
					label="All-Time High"
					value={`$${formattedNum(coinInfo?.ath ?? 0)}`}
					subtle={coinInfo?.ath_date ? new Date(coinInfo.ath_date).toLocaleDateString() : undefined}
				/>
				<StatsCard label="Max Drawdown" value={formatPercent(-Math.abs(metrics.maxDrawdown))} />
				<StatsCard label="Volatility (Ann.)" value={formatPercent(metrics.volatility)} />
			</div>

			<DailyPnLGrid timeline={timeline} />

			<ComparisonPanel entries={comparisonData} activeId={selectedCoinId} />
		</div>
	)
}

export function TokenPnl({ coinsData }: { coinsData: IResponseCGMarketsAPI[] }) {
	const router = useRouter()
	const now = useMemo(() => Math.floor(Date.now() / 1000) - 60, [])
	const coinParam = router.query?.coin

	const coinInfoMap = useMemo(() => new Map(coinsData.map((coin) => [coin.id, coin])), [coinsData])
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const { startDate, endDate, handleStartDateChange, handleEndDateChange, validateDateRange } = useDateRangeValidation({
		initialStartDate: unixToDateString(now - 7 * 24 * 60 * 60),
		initialEndDate: unixToDateString(now)
	})

	useEffect(() => {
		if (router.isReady) {
			const startParam = isValidDate(router.query.start) ? unixToDateString(Number(router.query.start)) : null
			const endParam = isValidDate(router.query.end) ? unixToDateString(Number(router.query.end)) : null

			if (startParam != null && startParam !== startDate) {
				handleStartDateChange(startParam)
			}
			if (endParam != null && endParam !== endDate) {
				handleEndDateChange(endParam)
			}
		}
	}, [
		router.isReady,
		router.query.start,
		router.query.end,
		startDate,
		endDate,
		handleStartDateChange,
		handleEndDateChange
	])

	const [quantityInput, setQuantityInput] = useState('')

	const { selectedCoins, selectedCoinId, selectedCoinInfo } = useMemo(() => {
		const queryCoins = coinParam ?? ['bitcoin']
		const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]
		return {
			selectedCoins: coins,
			selectedCoinId: coins[0],
			selectedCoinInfo: coins[0] ? (coinInfoMap.get(coins[0]) ?? null) : null
		}
	}, [coinParam, coinInfoMap])

	const start = dateStringToUnix(startDate)
	const end = dateStringToUnix(endDate)

	const {
		data: pnlData,
		isLoading,
		isError,
		error,
		refetch,
		isFetching
	} = useQuery({
		queryKey: ['token-pnl', selectedCoinId, start, end],
		queryFn: () => computeTokenPnl({ id: selectedCoinId, start, end, coinInfo: selectedCoinInfo }),
		enabled: !!(router.isReady && selectedCoinId && start != null && end != null && end > start),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const comparisonQueries = useQueries({
		queries: DEFAULT_COMPARISON_IDS.map((tokenId) => ({
			queryKey: ['token-pnl-comparison-item', tokenId, start, end],
			queryFn: () =>
				fetchPriceSeries(tokenId, start, end).then((series): ComparisonEntry | null => {
					if (series.length === 0) return null
					const firstPoint = series[0]
					const lastPoint = series[series.length - 1]
					if (
						firstPoint == null ||
						lastPoint == null ||
						!Number.isFinite(firstPoint.price) ||
						!Number.isFinite(lastPoint.price)
					) {
						return null
					}
					const startPrice = firstPoint.price
					const endPrice = lastPoint.price
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
				}),
			enabled: !!(router.isReady && start != null && end != null && end > start),
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0
		}))
	})

	const comparisonData = useMemo(
		() =>
			comparisonQueries.flatMap((q): ComparisonEntry[] => {
				const d = q.data
				return d != null ? [d] : []
			}),
		[comparisonQueries]
	)

	const quantity = useMemo(() => {
		const parsed = parseFloat(quantityInput)
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
	}, [quantityInput])

	const chartOptions = useMemo<TokenPnlChartOptions | undefined>(() => {
		if (!pnlData || start == null || end == null) return undefined

		const { metrics, yAxisConfig: yAxis } = pnlData
		const startPrice = metrics.startPrice

		return {
			xAxis: {
				type: 'time',
				min: start * 1000,
				max: end * 1000,
				axisLabel: {
					formatter: (value: number) => formatDateLabel(value / 1000),
					showMinLabel: true,
					showMaxLabel: true,
					hideOverlap: true
				},
				boundaryGap: false
			},
			yAxis: {
				min: yAxis.min,
				max: yAxis.max,
				interval: yAxis.interval
			},
			legend: {
				show: false
			},
			tooltip: {
				backgroundColor: 'transparent',
				borderWidth: 0,
				padding: 0,
				axisPointer: {
					type: 'line',
					lineStyle: { color: 'rgba(148,163,184,0.5)', width: 1.5, type: 'solid' },
					z: 0
				},
				formatter: (items: TooltipItem | TooltipItem[]) => {
					const itemsArray = Array.isArray(items) ? items : [items]
					if (itemsArray.length === 0) return ''

					const point = itemsArray[0]
					const row = point?.data ?? {}
					const timestamp =
						(typeof row.timestamp === 'number' ? row.timestamp : undefined) ??
						(Array.isArray(point?.value) ? point.value[0] : undefined)
					const seriesValue =
						(typeof point?.seriesName === 'string' ? row[point.seriesName] : undefined) ??
						(Array.isArray(point?.value) ? point.value[1] : undefined)
					const price = typeof seriesValue === 'number' ? seriesValue : Number(seriesValue ?? 0)
					const changeFromStart = startPrice !== 0 ? ((price - startPrice) / startPrice) * 100 : 0
					const changeColor = changeFromStart >= 0 ? '#10b981' : '#ef4444'
					const changeSign = changeFromStart >= 0 ? '+' : ''

					const chartdate = timestamp != null ? formatTooltipChartDate(Number(timestamp), 'daily') : ''

					return `<div style="background: var(--cards-bg); border: 1px solid var(--cards-border); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16); color: var(--text-primary); border-radius: 8px; padding: 8px 10px; font-size: 11px; line-height: 1.35; white-space: nowrap;">
						<div style="color: var(--text-secondary); margin-bottom: 2px;">${chartdate}</div>
						<div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${formatTooltipValue(price, '$')}</div>
						<div style="font-size: 11px; color: ${changeColor}; font-weight: 500;">${changeSign}${formatTooltipValue(changeFromStart, '%')} from start</div>
					</div>`
				}
			}
		}
	}, [pnlData, start, end])

	const dialogStore = Ariakit.useDialogStore()

	const handleDateChange = (value: string, isStart: boolean) => {
		if (!value) return
		const nextStart = isStart ? value : startDate
		const nextEnd = isStart ? endDate : value
		if (!nextStart || !nextEnd) return
		if (!validateDateRange(nextStart, nextEnd)) return
		if (isStart) {
			handleStartDateChange(value)
		} else {
			handleEndDateChange(value)
		}
		const unixValue = dateStringToUnix(value)
		pushShallowQuery(router, {
			[isStart ? 'start' : 'end']: unixValue ?? undefined
		})
	}

	const updateCoin = (coinId: string) => {
		const newCoins = [coinId]
		pushShallowQuery(router, { coin: newCoins })
		dialogStore.toggle()
	}

	return (
		<>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<h1 className="text-xl font-bold">Token Holder Profit and Loss</h1>
			</div>
			<div className="grid flex-1 gap-2 xl:grid-cols-[300px_minmax(0,1fr)]">
				<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<div className="flex flex-col gap-2">
						<DateInput
							label="Start Date"
							value={startDate}
							onChange={(value) => handleDateChange(value, true)}
							min={unixToDateString(0)}
							max={unixToDateString(now)}
						/>
						<DateInput
							label="End Date"
							value={endDate}
							onChange={(value) => handleDateChange(value, false)}
							min={startDate}
							max={unixToDateString(now)}
						/>
					</div>
					<div className="flex flex-col gap-1.5 text-sm">
						<span className="text-(--text-label)">Token</span>
						<button
							onClick={() => dialogStore.toggle()}
							className="flex items-center gap-2 rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary)"
						>
							{selectedCoinInfo != null ? (
								<>
									<img
										src={selectedCoinInfo.image}
										alt={selectedCoinInfo.name}
										width={24}
										height={24}
										className="rounded-full"
									/>
									<span className="text-sm font-medium">{selectedCoinInfo.name}</span>
								</>
							) : (
								<>
									<Icon name="search" width={16} height={16} />
									<span>Select token</span>
								</>
							)}
						</button>
						<CoinsPicker
							dialogStore={dialogStore}
							coinsData={coinsData}
							selectedCoins={EMPTY_SELECTED_COINS}
							queryCoins={selectedCoins}
							selectCoin={(coin) => updateCoin(coin.id)}
						/>
					</div>
					<div className="flex flex-col gap-1.5 text-sm">
						<label className="flex flex-col gap-1">
							<span className="text-(--text-label)">Quantity (optional)</span>
							<input
								type="number"
								min="0"
								step="any"
								placeholder="Tokens held"
								value={quantityInput}
								onChange={(event) => setQuantityInput(event.target.value)}
								className="rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary)"
							/>
						</label>
					</div>
				</div>
				<TokenPnlContent
					routerReady={router.isReady}
					isLoading={isLoading}
					isFetching={isFetching}
					isError={isError}
					error={error}
					onRetry={() => refetch()}
					pnlData={pnlData}
					quantity={quantity}
					start={start ?? 0}
					end={end ?? 0}
					chartOptions={chartOptions}
					exportChartInstance={exportChartInstance}
					handleChartReady={handleChartReady}
					comparisonData={comparisonData ?? EMPTY_COMPARISON_ENTRIES}
					selectedCoinId={selectedCoinId}
				/>
			</div>
		</>
	)
}
