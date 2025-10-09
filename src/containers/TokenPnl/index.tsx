import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { IResponseCGMarketsAPI } from '~/api/types'
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
import { TokenPriceChart } from './TokenPriceChart'
import type { ComparisonEntry, PricePoint, TimelinePoint } from './types'

const DAY_IN_SECONDS = 86_400
const DEFAULT_COMPARISON_IDS = ['bitcoin', 'ethereum', 'solana'] as const

type ChangeMode = 'percent' | 'absolute'

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
	}
	currentPrice: number
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

const buildDailyTimeline = (series: PricePoint[]): TimelinePoint[] => {
	return series.map((point, index) => {
		if (index === 0) {
			return { ...point, change: 0, percentChange: 0 }
		}
		const prev = series[index - 1]
		const delta = point.price - prev.price
		const pct = prev.price ? (delta / prev.price) * 100 : 0
		return { ...point, change: delta, percentChange: pct }
	})
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

type RawPriceEntry = {
	timestamp?: number
	price?: number
}

const fetchPriceSeries = async (tokenId: string, start: number, end: number) => {
	if (!tokenId || !start || !end || end <= start) return [] as PricePoint[]
	const key = `coingecko:${tokenId}`
	const spanInDays = Math.max(1, Math.ceil((end - start) / DAY_IN_SECONDS) + 1)
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
				rangeLow: 0
			},
			currentPrice: coinInfo?.current_price ?? 0
		}
	}

	const startPrice = series[0].price
	const endPrice = series[series.length - 1].price
	const percentChange = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0
	const absoluteChange = endPrice - startPrice
	const timeline = buildDailyTimeline(series)
	const rangeHigh = Math.max(...series.map((point) => point.price))
	const rangeLow = Math.min(...series.map((point) => point.price))

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
			rangeLow
		},
		currentPrice: coinInfo?.current_price ?? endPrice
	}
}

export function TokenPnl({ coinsData }: { coinsData: IResponseCGMarketsAPI[] }) {
	const router = useRouter()
	const now = Math.floor(Date.now() / 1000) - 60

	const coinInfoMap = useMemo(() => new Map(coinsData.map((coin) => [coin.id, coin])), [coinsData])

	const queryParams = useMemo(() => {
		const startRaw = router.query?.start
		const endRaw = router.query?.end

		return {
			start: startRaw ? Number(Array.isArray(startRaw) ? startRaw[0] : startRaw) : null,
			end: endRaw ? Number(Array.isArray(endRaw) ? endRaw[0] : endRaw) : null
		}
	}, [router.query?.start, router.query?.end])

	const { start: startQuery, end: endQuery } = queryParams

	const defaultStart = startQuery ? unixToDateString(startQuery) : unixToDateString(now - 7 * DAY_IN_SECONDS)
	const defaultEnd = endQuery ? unixToDateString(endQuery) : unixToDateString(now)

	const { startDate, endDate, handleStartDateChange, handleEndDateChange, validateDateRange } = useDateRangeValidation({
		initialStartDate: defaultStart,
		initialEndDate: defaultEnd
	})

	const [quantityInput, setQuantityInput] = useState('')
	const [mode, setMode] = useState<ChangeMode>('percent')
	const [focusedPoint, setFocusedPoint] = useState<{ timestamp: number; price: number } | null>(null)

	const selectedCoins = useMemo(() => {
		const queryCoins = router.query?.coin || ['bitcoin']
		const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]
		return {
			selected: coins
		}
	}, [router.query])

	const id = selectedCoins.selected[0] ?? ''

	const start = dateStringToUnix(startDate)
	const end = dateStringToUnix(endDate)

	const fetchData = useCallback(
		() => computeTokenPnl({ id, start, end, coinInfo: coinInfoMap.get(id) }),
		[id, start, end, coinInfoMap]
	)

	const {
		data: pnlData,
		isLoading,
		isError,
		error,
		refetch,
		isFetching
	} = useQuery({
		queryKey: ['token-pnl', id, start, end],
		queryFn: fetchData,
		enabled: Boolean(id && start && end && end > start),
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
			enabled: Boolean(start && end && end > start),
			staleTime: 60 * 60 * 1000
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

	const displayMetrics = useMemo(() => {
		if (!pnlData?.metrics) return null

		const { metrics } = pnlData
		const quantityValue = quantity ? metrics.absoluteChange * quantity : metrics.absoluteChange
		const summaryValue = mode === 'percent' ? metrics.percentChange : quantity ? quantityValue : metrics.absoluteChange
		const isProfit = summaryValue >= 0
		const quantityLabel = quantity
			? `${formattedNum(quantity, false)} tokens → ${quantityValue >= 0 ? '+' : ''}$${formattedNum(quantityValue, false)}`
			: `$${formattedNum(metrics.absoluteChange, false)} per token`

		const holdingPeriodDays = Math.max(1, Math.round((end - start) / DAY_IN_SECONDS))
		const annualizedReturn =
			holdingPeriodDays > 0 ? (Math.pow(1 + metrics.percentChange / 100, 365 / holdingPeriodDays) - 1) * 100 : 0

		return {
			summaryValue,
			isProfit,
			quantityLabel,
			holdingPeriodDays,
			annualizedReturn
		}
	}, [pnlData, quantity, mode, start, end])

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
		if (isLoading || isFetching) {
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
		if (!pnlData || !pnlData.priceSeries.length || !displayMetrics) {
			return (
				<div className="flex flex-col items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 text-center">
					<span className="text-lg font-semibold">No historical data available for this range.</span>
					<span className="text-sm text-(--text-secondary)">Try a different date range or another token.</span>
				</div>
			)
		}

		const { metrics, timeline, coinInfo, currentPrice } = pnlData
		const { summaryValue, isProfit, quantityLabel, holdingPeriodDays, annualizedReturn } = displayMetrics

		return (
			<div className="flex flex-col gap-6">
				<div className="grid gap-3 sm:grid-cols-3">
					<div
						className={`flex flex-col gap-1.5 rounded-md border p-4 ${
							isProfit ? 'border-emerald-500/30 bg-emerald-600/10' : 'border-red-500/30 bg-red-600/10'
						}`}
					>
						<span className="text-xs font-light tracking-wide text-(--text-secondary) uppercase">
							{mode === 'percent' ? 'Return' : isProfit ? 'Profit' : 'Loss'}
						</span>
						<div className={`text-3xl font-bold ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
							{mode === 'percent'
								? formatPercent(summaryValue)
								: `${summaryValue >= 0 ? '+' : ''}$${formattedNum(summaryValue, false)}`}
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

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-base font-semibold">Price Over Time</h3>
						<div className="flex items-center gap-2 text-xs text-(--text-secondary)">
							<span>{formatDateLabel(pnlData.priceSeries[0].timestamp)}</span>
							<Icon name="arrow-right" width={14} height={14} />
							<span>{formatDateLabel(pnlData.priceSeries[pnlData.priceSeries.length - 1].timestamp)}</span>
						</div>
					</div>
					<TokenPriceChart
						series={pnlData.priceSeries}
						isLoading={isFetching}
						onPointClick={(pt) => setFocusedPoint(pt)}
					/>
				</div>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<StatsCard
						label="Current Price"
						value={`$${formattedNum(focusedPoint?.price || currentPrice)}`}
						subtle={
							focusedPoint
								? new Date(focusedPoint.timestamp * 1000).toLocaleDateString()
								: coinInfo?.symbol?.toUpperCase()
						}
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

				<ComparisonPanel entries={comparisonData ?? []} activeId={id} />
			</div>
		)
	}

	const selectedCoin = coinInfoMap.get(id)

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
							{selectedCoin ? (
								<>
									<img
										src={selectedCoin.image}
										alt={selectedCoin.name}
										width={24}
										height={24}
										className="rounded-full"
									/>
									<span className="text-sm font-medium">{selectedCoin.name}</span>
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
							queryCoins={selectedCoins.selected}
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
					<div className="flex items-center justify-between text-sm">
						<span className="text-(--text-secondary)">Display as</span>
						<div className="relative h-8 w-[180px] rounded-full border border-(--form-control-border) bg-(--bg-cards-bg) p-1">
							<div
								className={`absolute inset-1 w-[calc(50%-4px)] rounded-full bg-(--form-control-border) transition-all duration-300 ${mode === 'percent' ? 'translate-x-0' : 'translate-x-full'}`}
							></div>
							<div className="relative z-[1] grid h-full grid-cols-2 text-xs">
								<button
									onClick={() => setMode('percent')}
									className={`rounded-full font-medium ${mode === 'percent' ? 'text-(--text-primary)' : 'text-(--text-secondary)'}`}
								>
									% Change
								</button>
								<button
									onClick={() => setMode('absolute')}
									className={`rounded-full font-medium ${mode === 'absolute' ? 'text-(--text-primary)' : 'text-(--text-secondary)'}`}
								>
									$ Change
								</button>
							</div>
						</div>
					</div>
				</div>
				<div>{renderContent()}</div>
			</div>
		</div>
	)
}
