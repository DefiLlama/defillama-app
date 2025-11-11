import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { IResponseCGMarketsAPI } from '~/api/types'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { formatTooltipChartDate, formatTooltipValue } from '~/components/ECharts/useDefaults'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { COINS_CHART_API } from '~/constants'
import { CoinsPicker } from '~/containers/Correlations'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'
import { formattedNum } from '~/utils'
import { fetchJson } from '~/utils/async'
import { ComparisonPanel } from './ComparisonPanel'
import { DailyPnLGrid } from './DailyPnLGrid'
import { DateInput } from './DateInput'
import { formatDateLabel, formatPercent } from './format'
import { StatsCard } from './StatsCard'
import type { ComparisonEntry, PricePoint, TimelinePoint } from './types'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart'))

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
	chartData: ILineAndBarChartProps['charts']
	yAxisConfig: {
		min: number
		max: number
		interval: number
	}
	primaryColor: string
}

const unixToDateString = (unixTimestamp?: number) => {
	if (!unixTimestamp) return ''
	const date = new Date(unixTimestamp * 1000)
	return date.toISOString().split('T')[0]
}

const dateStringToUnix = (dateString: string) => {
	if (!dateString) return 0
	return Math.floor(new Date(dateString).getTime() / 1000)
}

const calculateMaxDrawdown = (series: PricePoint[]) => {
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

const calculateAnnualizedVolatility = (series: PricePoint[]) => {
	if (series.length < 2) return 0
	const returns: number[] = []
	for (let i = 1; i < series.length; i++) {
		const prev = series[i - 1].price
		const curr = series[i].price
		if (!prev) continue
		returns.push((curr - prev) / prev)
	}
	if (returns.length < 2) return 0
	const mean = returns.reduce((acc, value) => acc + value, 0) / returns.length
	const variance = returns.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / (returns.length - 1 || 1)
	const dailyVol = Math.sqrt(variance)
	return dailyVol * Math.sqrt(365) * 100
}

const calculateYAxisConfigFromPrices = (prices: number[]) => {
	if (!prices.length) return { min: 0, max: 0, interval: 1000 }

	const min = Math.min(...prices)
	const max = Math.max(...prices)
	const range = max - min

	if (range === 0) return { min: min - min * 0.1, max: max + max * 0.1, interval: max * 0.1 }

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

type RawPriceEntry = {
	timestamp?: number
	price?: number
}

const fetchPriceSeries = async (tokenId: string, start: number, end: number) => {
	if (!tokenId || !start || !end || end <= start) return [] as PricePoint[]
	const key = `coingecko:${tokenId}`
	const spanInDays = Math.max(1, Math.ceil((end - start) / DAY_IN_SECONDS))
	const url = `${COINS_CHART_API}/${key}?start=${start}&span=${spanInDays}&searchWidth=600`
	const response = await fetchJson(url)
	const raw: RawPriceEntry[] = response?.coins?.[key]?.prices ?? []
	return raw
		.filter(
			(entry): entry is { timestamp: number; price: number } =>
				typeof entry?.price === 'number' && typeof entry?.timestamp === 'number'
		)
		.map((entry) => ({
			timestamp: entry.timestamp,
			price: entry.price
		}))
		.sort((a: PricePoint, b: PricePoint) => a.timestamp - b.timestamp)
}

const computeTokenPnl = async (params: {
	id: string
	start: number
	end: number
	coinInfo?: IResponseCGMarketsAPI
}): Promise<TokenPnlResult | null> => {
	const { id, start, end, coinInfo } = params
	if (!id || !start || !end || end <= start) return null

	const series = await fetchPriceSeries(id, start, end)

	if (!series.length) {
		const primaryColor = '#10b981'
		return {
			coinInfo,
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
				'Token Price': {
					name: 'Token Price',
					stack: 'Token Price',
					color: primaryColor,
					type: 'line' as const,
					data: []
				}
			},
			yAxisConfig: { min: 0, max: 0, interval: 1000 },
			primaryColor
		}
	}

	const startPrice = series[0].price
	const endPrice = series[series.length - 1].price
	const percentChange = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0
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
	if (firstPoint && firstPoint.timestamp !== start) {
		dataPoints.push([start * 1000, firstPoint.price])
	}

	series.forEach((point, index) => {
		prices.push(point.price)

		if (index === 0) {
			timeline.push({ ...point, change: 0, percentChange: 0 })
		} else {
			const prev = series[index - 1]
			const delta = point.price - prev.price
			const pct = prev.price ? (delta / prev.price) * 100 : 0
			timeline.push({ ...point, change: delta, percentChange: pct })
		}

		// Prepare chart data
		dataPoints.push([point.timestamp * 1000, point.price])
	})

	const lastPoint = series[series.length - 1]
	if (lastPoint && lastPoint.timestamp !== end) {
		dataPoints.push([end * 1000, lastPoint.price])
	}
	dataPoints.sort((a, b) => a[0] - b[0])

	const rangeHigh = Math.max(...prices)
	const rangeLow = Math.min(...prices)

	const chartData = {
		'Token Price': {
			name: 'Token Price',
			stack: 'Token Price',
			color: primaryColor,
			type: 'line' as const,
			data: dataPoints
		}
	} as ILineAndBarChartProps['charts']

	const yAxisConfig = calculateYAxisConfigFromPrices(prices)

	return {
		coinInfo,
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
	return !isNaN(date.getTime())
}

export function TokenPnl({ coinsData }: { coinsData: IResponseCGMarketsAPI[] }) {
	const router = useRouter()
	const now = Math.floor(Date.now() / 1000) - 60

	const coinInfoMap = useMemo(() => new Map(coinsData.map((coin) => [coin.id, coin])), [coinsData])

	const { startDate, endDate, handleStartDateChange, handleEndDateChange, validateDateRange } = useDateRangeValidation({
		initialStartDate: unixToDateString(now - 7 * 24 * 60 * 60),
		initialEndDate: unixToDateString(now)
	})

	useEffect(() => {
		if (router.isReady) {
			const startParam = isValidDate(router.query.start) ? unixToDateString(Number(router.query.start)) : null
			const endParam = isValidDate(router.query.end) ? unixToDateString(Number(router.query.end)) : null

			if (startParam && startParam !== startDate) {
				handleStartDateChange(startParam)
			}
			if (endParam && endParam !== endDate) {
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
		const queryCoins = router.query?.coin || ['bitcoin']
		const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]
		return {
			selectedCoins: coins,
			selectedCoinId: coins[0],
			selectedCoinInfo: coins[0] ? coinInfoMap.get(coins[0]) : null
		}
	}, [router.query, coinInfoMap])

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
		enabled: router.isReady && Boolean(selectedCoinId && start && end && end > start) ? true : false,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const comparisonQueries = useQueries({
		queries: DEFAULT_COMPARISON_IDS.map((tokenId) => ({
			queryKey: ['token-pnl-comparison-item', tokenId, start, end],
			queryFn: () =>
				fetchPriceSeries(tokenId, start, end).then((series) => {
					if (!series.length) return null
					const startPrice = series[0].price
					const endPrice = series[series.length - 1].price
					const percentChange = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0
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
					} as ComparisonEntry
				}),
			enabled: router.isReady && Boolean(start && end && end > start) ? true : false,
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false
		}))
	})

	const comparisonData = useMemo(
		() => comparisonQueries.map((q) => q.data).filter(Boolean) as ComparisonEntry[],
		[comparisonQueries]
	)

	const quantity = useMemo(() => {
		const parsed = parseFloat(quantityInput)
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
	}, [quantityInput])

	const chartOptions = useMemo(() => {
		if (!pnlData) return {}

		const { metrics, yAxisConfig: yAxis } = pnlData
		const startPrice = metrics.startPrice

		return {
			grid: {
				left: 0,
				right: 0,
				top: 12,
				bottom: 12
			},
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
				formatter: (items: any) => {
					const itemsArray = Array.isArray(items) ? items : [items]
					if (!itemsArray?.length) return ''

					const point = itemsArray[0]
					const price = point.value[1]
					const changeFromStart = startPrice ? ((price - startPrice) / startPrice) * 100 : 0
					const changeColor = changeFromStart >= 0 ? '#10b981' : '#ef4444'
					const changeSign = changeFromStart >= 0 ? '+' : ''

					const chartdate = formatTooltipChartDate(point.value[0], 'daily')

					return `<div style="background: var(--bg-card); border: 1px solid var(--bg-border); box-shadow: 0 6px 24px rgba(0,0,0,0.25); color: var(--text-primary); border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 1.4; white-space: nowrap;">
						<div style="opacity: .75; margin-bottom: 4px;">${chartdate}</div>
						<div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${formatTooltipValue(price, '$')}</div>
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
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					[isStart ? 'start' : 'end']: unixValue
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const updateCoin = (coinId: string) => {
		const newCoins = [coinId]
		router.push(
			{
				pathname: router.pathname,
				query: { ...router.query, coin: newCoins }
			},
			undefined,
			{ shallow: true }
		)
		dialogStore.toggle()
	}

	const renderContent = () => {
		if (!router.isReady || isLoading || isFetching) {
			return (
				<div className="flex h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			)
		}
		if (isError) {
			return (
				<div className="flex flex-col items-center gap-2 rounded-md border border-red-400 bg-red-400/10 p-6 text-center">
					<span className="text-lg font-semibold text-red-500">Failed to load data</span>
					<span className="text-sm text-red-400">
						{error instanceof Error ? error.message : 'Something went wrong fetching price data.'}
					</span>
					<button
						onClick={() => refetch()}
						className="rounded-md bg-(--link-active-bg) px-4 py-2 text-sm font-medium text-white"
					>
						Retry
					</button>
				</div>
			)
		}
		if (!pnlData || !pnlData.priceSeries.length) {
			return (
				<div className="flex flex-col items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-center">
					<span className="text-lg font-semibold">No historical data available for this range.</span>
					<span className="text-sm text-(--text-secondary)">Try a different date range or another token.</span>
				</div>
			)
		}

		const { metrics, timeline, coinInfo, currentPrice, chartData } = pnlData
		const { percentChange, isProfit, holdingPeriodDays, annualizedReturn, absoluteChange } = metrics
		const quantityValue = quantity ? absoluteChange * quantity : absoluteChange
		const quantityLabel = quantity
			? `${formattedNum(quantity, false)} tokens → ${quantityValue >= 0 ? '+' : ''}$${formattedNum(quantityValue, false)}`
			: `$${formattedNum(absoluteChange, false)} per token`

		return (
			<div className="flex flex-col gap-6">
				<div className="grid gap-3 sm:grid-cols-3">
					<div
						className={`flex flex-col gap-1.5 rounded-md border p-4 ${
							isProfit ? 'border-emerald-500/30 bg-emerald-600/10' : 'border-red-500/30 bg-red-600/10'
						}`}
					>
						<span className="text-xs font-light tracking-wide text-(--text-secondary) uppercase">Return</span>
						<div className={`text-3xl font-bold ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
							{formatPercent(percentChange)}
						</div>
						<span className="text-xs text-(--text-secondary)">{quantityLabel}</span>
					</div>
					<div className="flex flex-col gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
						<span className="text-xs font-light tracking-wide text-(--text-secondary) uppercase">Holding Period</span>
						<div className="text-3xl font-bold text-(--text-secondary)">
							{holdingPeriodDays} <span className="text-xl font-medium text-(--text-secondary)">days</span>
						</div>
						<span className="text-xs text-(--text-secondary)">
							{formatDateLabel(start)} → {formatDateLabel(end)}
						</span>
					</div>
					<div className="flex flex-col gap-1.5 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
						<span className="text-xs font-light tracking-wide text-(--text-secondary) uppercase">
							Annualised Return
						</span>
						<div className={`text-3xl font-bold ${annualizedReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
							{formatPercent(annualizedReturn)}
						</div>
						<span className="text-xs text-(--text-secondary)">
							{annualizedReturn >= 0 ? '↑' : '↓'} Based on {holdingPeriodDays}d period
						</span>
					</div>
				</div>

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
					<div className="flex items-center justify-between p-3 pb-1">
						<h3 className="text-base font-semibold">Price Over Time</h3>
						<div className="flex items-center gap-2 text-xs text-(--text-secondary)">
							<span>{formatDateLabel(start)}</span>
							<Icon name="arrow-right" width={14} height={14} />
							<span>{formatDateLabel(end)}</span>
						</div>
					</div>
					<Suspense fallback={<div className="min-h-[360px]"></div>}>
						<LineAndBarChart charts={chartData} hideDataZoom chartOptions={chartOptions as any} />
					</Suspense>
				</div>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
						value={coinInfo?.price_change_percentage_24h ? formatPercent(coinInfo.price_change_percentage_24h) : '0%'}
						subtle={
							coinInfo?.price_change_24h
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

				<ComparisonPanel entries={comparisonData ?? []} activeId={selectedCoinId} />
			</div>
		)
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4">
			<h1 className="text-2xl font-semibold">Token Holder Profit and Loss</h1>
			<div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
				<div className="flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<div className="flex flex-col gap-3">
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
					<div className="flex flex-col gap-2 text-sm">
						<span>Token</span>
						<button
							onClick={() => dialogStore.toggle()}
							className="flex items-center gap-2 rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-base text-(--text-primary)"
						>
							{selectedCoinInfo ? (
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
							selectedCoins={{}}
							queryCoins={selectedCoins}
							selectCoin={(coin) => updateCoin(coin.id)}
						/>
					</div>
					<div className="flex flex-col gap-2 text-sm">
						<label className="flex flex-col gap-1">
							<span>Quantity (optional)</span>
							<input
								type="number"
								min="0"
								step="any"
								placeholder="Tokens held"
								value={quantityInput}
								onChange={(event) => setQuantityInput(event.target.value)}
								className="rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 py-2 text-base text-(--text-primary)"
							/>
						</label>
					</div>
				</div>
				<div>{renderContent()}</div>
			</div>
		</div>
	)
}
