import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import type { IResponseCGMarketsAPI } from '~/api/types'
import { Icon } from '~/components/Icon'
import { TagGroup } from '~/components/TagGroup'
import { useIsClient } from '~/hooks/useIsClient'
import { FAQ } from './Faq'
import type { PricePoint } from './hooks'
import { usePriceCharts } from './hooks'
import { pearsonCorrelationCoefficient, toPairedLogReturns } from './util'
import { pushShallowQuery } from '~/utils/routerQuery'

interface CoinsPickerProps {
	coinsData: Array<IResponseCGMarketsAPI>
	selectCoin: (coin: IResponseCGMarketsAPI) => void
	dialogStore: Ariakit.DialogStore
	selectedCoins: Record<string, IResponseCGMarketsAPI>
	/** Accepted for API compatibility with callers but not used internally. */
	queryCoins?: string[]
}

export function CoinsPicker({ coinsData, selectCoin, dialogStore, selectedCoins }: CoinsPickerProps) {
	const [search, setSearch] = useState('')
	const filteredCoins =
		search === ''
			? coinsData
			: coinsData.filter(
					(coin: IResponseCGMarketsAPI) =>
						(coin.symbol?.toLowerCase().includes(search.toLowerCase()) ||
							coin.name?.toLowerCase().includes(search.toLowerCase())) &&
						!selectedCoins[coin.id]
				)

	const [resultsLength, setResultsLength] = useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog className="dialog gap-3 sm:max-w-[400px]" unmountOnHide>
				<div className="flex items-center gap-2">
					<Ariakit.DialogHeading className="text-base font-semibold">Add Token</Ariakit.DialogHeading>
					<Ariakit.DialogDismiss className="-my-2 ml-auto rounded-lg p-2 text-(--text-tertiary) hover:bg-(--divider) hover:text-(--text-primary)">
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
				</div>
				<div className="relative">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search token..."
						className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-base text-black outline-hidden placeholder:text-[#666] dark:text-white dark:placeholder:text-[#919296]"
						autoFocus
					/>
				</div>

				<div className="flex max-h-[400px] w-full flex-col overflow-y-auto">
					{filteredCoins.slice(0, resultsLength + 1).map((coin) => {
						return (
							<button
								key={coin.name}
								onClick={() => selectCoin(coin)}
								className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							>
								<img
									alt={''}
									src={coin.image}
									height={'24px'}
									width={'24px'}
									loading="lazy"
									onError={(e) => {
										const img = e.currentTarget
										img.onerror = null
										img.src = '/assets/placeholder.png'
									}}
									className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
								/>
								<span>
									{coin.name} ({coin.symbol.toUpperCase()})
								</span>
							</button>
						)
					})}
					{resultsLength < filteredCoins.length ? (
						<button
							className="w-full px-3 py-3 text-left text-(--link) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							onClick={showMoreResults}
						>
							See more...
						</button>
					) : null}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

function CoinImage({ src }: { src: string }) {
	return (
		<img
			alt=""
			src={src}
			height="24"
			width="24"
			loading="lazy"
			onError={(e) => {
				const img = e.currentTarget
				img.onerror = null
				img.src = '/assets/placeholder.png'
			}}
			className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
		/>
	)
}

interface CorrelationCellProps {
	coinId: string
	coin1Id: string
	correlations: Record<string, Record<string, number | null>>
	alignedPointCounts: Record<string, Record<string, number>>
	returnPointCounts: Record<string, Record<string, number>>
	requiredReturnPoints: number
}

function CorrelationCell({
	coinId,
	coin1Id,
	correlations,
	alignedPointCounts,
	returnPointCounts,
	requiredReturnPoints
}: CorrelationCellProps) {
	const corr = correlations[coinId]?.[coin1Id] ?? null
	const aligned = alignedPointCounts[coinId]?.[coin1Id] ?? 0
	const returns = returnPointCounts[coinId]?.[coin1Id] ?? 0

	const backgroundColor =
		corr != null
			? corr > 0
				? `rgba(53, 222, 59, ${Math.abs(corr)})`
				: `rgba(255, 0, 0, ${Math.abs(corr)})`
			: undefined

	return (
		<td
			title={`Aligned prices: ${aligned}\nReturns used: ${returns}\nMinimum required: ${requiredReturnPoints}`}
			style={{ backgroundColor }}
			className="relative h-12 w-12 hover:after:pointer-events-none hover:after:absolute hover:after:top-[-5000px] hover:after:left-0 hover:after:h-[10000px] hover:after:w-full hover:after:bg-[rgba(59,130,246,0.12)] hover:after:content-['']"
		>
			{corr == null ? '--' : corr.toFixed(2)}
		</td>
	)
}

const PERIODS = ['7d', '1m', '1y'] as const
type Period = (typeof PERIODS)[number]
const PERIOD_MS: Record<Period, number> = {
	'7d': 7 * 24 * 60 * 60 * 1000,
	'1m': 30 * 24 * 60 * 60 * 1000,
	'1y': 365 * 24 * 60 * 60 * 1000
}
const MIN_RETURN_POINTS_BY_PERIOD: Record<Period, number> = {
	'7d': 5,
	'1m': 20,
	'1y': 30
}
const DEFAULT_PERIOD: Period = '1y'
const DEFAULT_QUERY_COINS = ['bitcoin', 'ethereum', 'tether', 'binancecoin']
const CORRELATION_BUCKET_MS = 20 * 60 * 1000

const isPeriod = (value: string): value is Period => {
	return PERIODS.includes(value as Period)
}

const bucketPointsByTime = (points: PricePoint[], fromTimestamp: number) => {
	const buckets = new Map<number, number>()
	for (const point of points) {
		if (point.timestamp < fromTimestamp) continue
		const bucketTimestamp = Math.floor(point.timestamp / CORRELATION_BUCKET_MS) * CORRELATION_BUCKET_MS
		// Keep the most recent price in each bucket.
		buckets.set(bucketTimestamp, point.price)
	}
	return buckets
}

interface CorrelationData {
	correlations: Record<string, Record<string, number | null>>
	alignedPointCounts: Record<string, Record<string, number>>
	returnPointCounts: Record<string, Record<string, number>>
}

interface CorrelationsProps {
	coinsData: Array<IResponseCGMarketsAPI>
}

export default function Correlations({ coinsData }: CorrelationsProps) {
	const router = useRouter()
	const queryCoins = useMemo<string[]>(() => {
		const coinQuery = router.query.coin
		if (!coinQuery) return []
		return Array.isArray(coinQuery) ? coinQuery.filter(Boolean) : coinQuery.split(',').filter(Boolean)
	}, [router.query.coin])

	const selectedCoins = useMemo<Record<string, IResponseCGMarketsAPI>>(() => {
		if (queryCoins.length === 0) return {}
		const queryCoinsSet = new Set(queryCoins)
		return Object.fromEntries(coinsData.flatMap((coin) => (queryCoinsSet.has(coin.id) ? [[coin.id, coin]] : [])))
	}, [queryCoins, coinsData])

	const period = useMemo<Period>(() => {
		const periodQuery = router.query.period
		const candidate = Array.isArray(periodQuery) ? periodQuery[0] : periodQuery
		return candidate && isPeriod(candidate) ? candidate : DEFAULT_PERIOD
	}, [router.query.period])

	const setPeriod = (nextPeriod: Period) => {
		if (nextPeriod === period) return

		pushShallowQuery(router, { period: nextPeriod })
	}
	const minReturnPoints = MIN_RETURN_POINTS_BY_PERIOD[period]
	const coins = useMemo(() => Object.values(selectedCoins).filter(Boolean), [selectedCoins])
	const coinIds = useMemo(() => coins.map((c) => c.id), [coins])
	const { data: priceChart, isLoading } = usePriceCharts(coinIds)

	const { correlations, alignedPointCounts, returnPointCounts } = useMemo<CorrelationData>(() => {
		if (isLoading || coins.length === 0) {
			return { correlations: {}, alignedPointCounts: {}, returnPointCounts: {} }
		}
		const fromTimestamp = Date.now() - PERIOD_MS[period]
		const correlationResult: Record<string, Record<string, number | null>> = {}
		const pointCountResult: Record<string, Record<string, number>> = {}
		const returnCountResult: Record<string, Record<string, number>> = {}
		const bucketedSeriesById: Record<string, Map<number, number>> = {}
		for (const coin of coins) {
			bucketedSeriesById[coin.id] = bucketPointsByTime(priceChart[coin.id] ?? [], fromTimestamp)
		}

		for (let i = 0; i < coins.length; i++) {
			const id0 = coins[i].id
			correlationResult[id0] = {}
			pointCountResult[id0] = {}
			returnCountResult[id0] = {}
			for (let j = i + 1; j < coins.length; j++) {
				const id1 = coins[j].id
				const bucketed0 = bucketedSeriesById[id0] ?? new Map<number, number>()
				const bucketed1 = bucketedSeriesById[id1] ?? new Map<number, number>()
				const [smallerSeries, largerSeries] =
					bucketed0.size <= bucketed1.size ? [bucketed0, bucketed1] : [bucketed1, bucketed0]
				const prices0: number[] = []
				const prices1: number[] = []

				for (const [timestamp, price] of smallerSeries.entries()) {
					const otherPrice = largerSeries.get(timestamp)
					if (otherPrice === undefined) continue
					if (smallerSeries === bucketed0) {
						prices0.push(price)
						prices1.push(otherPrice)
					} else {
						prices0.push(otherPrice)
						prices1.push(price)
					}
				}

				const { returns0, returns1 } = toPairedLogReturns(prices0, prices1)
				const returnPointCount = returns0.length
				pointCountResult[id0][id1] = prices0.length
				returnCountResult[id0][id1] = returnPointCount

				if (returnPointCount < minReturnPoints) {
					correlationResult[id0][id1] = null
					continue
				}

				const corr = pearsonCorrelationCoefficient(returns0, returns1)
				correlationResult[id0][id1] = corr
			}
		}
		// Mirror: corr(A,B) === corr(B,A)
		for (let i = 0; i < coins.length; i++) {
			for (let j = 0; j < i; j++) {
				correlationResult[coins[i].id][coins[j].id] = correlationResult[coins[j].id][coins[i].id]
				pointCountResult[coins[i].id][coins[j].id] = pointCountResult[coins[j].id][coins[i].id]
				returnCountResult[coins[i].id][coins[j].id] = returnCountResult[coins[j].id][coins[i].id]
			}
		}
		return {
			correlations: correlationResult,
			alignedPointCounts: pointCountResult,
			returnPointCounts: returnCountResult
		}
	}, [isLoading, period, coins, priceChart, minReturnPoints])

	useEffect(() => {
		if (!router.isReady) return
		if (queryCoins.length > 0) return

		void router.replace(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					coin: DEFAULT_QUERY_COINS
				}
			},
			undefined,
			{ shallow: true }
		)
	}, [queryCoins.length, router.isReady, router.pathname, router.query, router])

	const dialogStore = Ariakit.useDialogStore()

	const isClient = useIsClient()
	const showContent = isClient && coins.length > 0

	const removeCoin = (coinId: string) => {
		pushShallowQuery(router, { coin: queryCoins.filter((c) => c !== coinId) })
	}

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<h1 className="text-xl font-semibold">Correlations Matrix</h1>
				<TagGroup
					selectedValue={period}
					setValue={(period) => {
						if (isPeriod(period)) {
							setPeriod(period)
						}
					}}
					values={PERIODS}
					className="ml-auto"
				/>
			</div>

			<div className="flex flex-col items-center gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
				{!showContent ? (
					<div className="flex min-h-[300px] items-center justify-center">
						<p className="text-sm text-(--text-tertiary)">Loading...</p>
					</div>
				) : (
					<div className="flex flex-col sm:flex-row">
						<div className="no-scrollbar flex w-40 shrink-0 flex-col overflow-auto sm:mr-6">
							<h2 className="flex h-12 items-center px-3.25 text-xs font-medium text-(--text-tertiary)">Tokens</h2>
							{coins.map((coin) => (
								<button
									key={coin.id}
									onClick={() => removeCoin(coin.id)}
									className="group flex h-12 items-center gap-2 rounded-md px-2 hover:bg-[rgba(59,130,246,0.12)]"
								>
									<CoinImage src={coin.image} />
									<span className="text-sm font-medium">{coin.symbol.toUpperCase()}</span>
									<Icon
										name="x"
										height={12}
										width={12}
										className="ml-auto text-(--text-tertiary) opacity-0 transition-opacity group-hover:opacity-100 hover:text-(--text-primary)"
									/>
								</button>
							))}
							<button
								onClick={dialogStore.toggle}
								className="flex h-12 items-center gap-1 rounded-md px-3.25 py-2 text-sm text-(--link) hover:bg-(--link-hover-bg)"
							>
								<Icon name="plus" className="h-3.5 w-3.5" />
								<span>Add token</span>
							</button>
						</div>
						<div className="relative overflow-hidden">
							<table className="table-fixed text-center text-sm">
								<thead>
									<tr>
										<th />
										{coins.map((coin) => (
											<td
												key={`h-${coin.id}`}
												className="relative h-12 w-12 font-bold hover:after:pointer-events-none hover:after:absolute hover:after:top-[-5000px] hover:after:left-0 hover:after:h-[10000px] hover:after:w-full hover:after:bg-[rgba(59,130,246,0.12)] hover:after:content-['']"
											>
												{coin.symbol.toUpperCase()}
											</td>
										))}
										<td>
											<button
												onClick={dialogStore.toggle}
												className="flex h-12 w-12 items-center justify-center text-(--link) hover:bg-[rgba(59,130,246,0.12)] focus-visible:bg-[rgba(59,130,246,0.12)]"
											>
												<Icon name="plus" height={16} width={16} />
											</button>
										</td>
									</tr>
								</thead>
								<tbody>
									{coins.map((coin) => (
										<tr key={`r-${coin.id}`} className="hover:bg-[rgba(59,130,246,0.12)]">
											<td className="relative h-12 w-12 font-bold hover:after:pointer-events-none hover:after:absolute hover:after:top-[-5000px] hover:after:left-0 hover:after:h-[10000px] hover:after:w-full hover:after:bg-[rgba(59,130,246,0.12)] hover:after:content-['']">
												{coin.symbol.toUpperCase()}
											</td>
											{coins.map((coin1) =>
												coin1.id === coin.id ? (
													<td
														key={`d-${coin.id}`}
														className="relative h-12 w-12 hover:after:pointer-events-none hover:after:absolute hover:after:top-[-5000px] hover:after:left-0 hover:after:h-[10000px] hover:after:w-full hover:after:bg-[rgba(59,130,246,0.12)] hover:after:content-['']"
													>
														<CoinImage src={coin.image} />
													</td>
												) : (
													<CorrelationCell
														key={`c-${coin.id}-${coin1.id}`}
														coinId={coin.id}
														coin1Id={coin1.id}
														correlations={correlations}
														alignedPointCounts={alignedPointCounts}
														returnPointCounts={returnPointCounts}
														requiredReturnPoints={minReturnPoints}
													/>
												)
											)}
										</tr>
									))}
									<tr>
										<td>
											<button
												onClick={dialogStore.toggle}
												className="flex h-12 w-12 items-center justify-center text-(--link) hover:bg-[rgba(59,130,246,0.12)] focus-visible:bg-[rgba(59,130,246,0.12)]"
											>
												<Icon name="plus" height={16} width={16} />
											</button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				)}
				<CoinsPicker
					coinsData={coinsData}
					dialogStore={dialogStore}
					selectedCoins={selectedCoins}
					selectCoin={(coin) => {
						pushShallowQuery(router, { coin: queryCoins.concat(coin.id) })
							.then(() => {
								dialogStore.hide()
							})
					}}
				/>
				<div className="w-full border-t border-(--form-control-border) pt-4">
					<p className="mx-auto max-w-xl text-center text-sm text-(--text-secondary)">
						Correlation is calculated from log returns built on approximately 20-minute interval price points. A pair
						must have at least {minReturnPoints} aligned return observations for this period; otherwise, the matrix
						shows --.
					</p>
				</div>
			</div>
			<FAQ />
		</>
	)
}
