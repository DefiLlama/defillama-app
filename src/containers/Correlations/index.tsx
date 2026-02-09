import * as Ariakit from '@ariakit/react'
import Router, { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { Icon } from '~/components/Icon'
import { TagGroup } from '~/components/TagGroup'
import { useIsClient } from '~/hooks/useIsClient'
import { FAQ } from './Faq'
import { usePriceCharts } from './hooks'
import { pearsonCorrelationCoefficient } from './util'

export function CoinsPicker({ coinsData, selectCoin, dialogStore, selectedCoins }: any) {
	const [search, setSearch] = useState('')
	const filteredCoins =
		search === ''
			? coinsData
			: coinsData.filter(
					(coin) =>
						(coin?.symbol?.toLowerCase().includes(search.toLowerCase()) ||
							coin?.name?.toLowerCase().includes(search.toLowerCase())) &&
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
						onChange={(e) => setSearch(e.target?.value)}
						placeholder="Search token..."
						className="dark:placeholder:[#919296] min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-base text-black outline-hidden placeholder:text-[#666] dark:text-white"
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

const PERIODS = ['7d', '1m', '1y'] as const
type Period = (typeof PERIODS)[number]
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '1m': 30, '1y': 365 }
const DEFAULT_PERIOD: Period = '1y'

const isPeriod = (value: string): value is Period => {
	return PERIODS.includes(value as Period)
}

export default function Correlations({ coinsData }) {
	const router = useRouter()
	const queryCoins = useMemo(() => {
		const coinQuery = router.query.coin
		if (!coinQuery) return [] as Array<string>
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

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					period: nextPeriod
				}
			},
			undefined,
			{ shallow: true }
		)
	}
	const coins = useMemo(() => Object.values(selectedCoins).filter(Boolean), [selectedCoins])
	const coinIds = useMemo(() => coins.map((c) => c.id), [coins])
	const { data: priceChart, isLoading } = usePriceCharts(coinIds)

	const correlations = useMemo(() => {
		if (isLoading || coins.length === 0) return {}
		const periodLength = PERIOD_DAYS[period]
		const result: Record<string, Record<string, string | number>> = {}

		for (let i = 0; i < coins.length; i++) {
			const id0 = coins[i].id
			result[id0] = {}
			for (let j = i + 1; j < coins.length; j++) {
				const id1 = coins[j].id
				const chart0 = priceChart[id0]?.slice(-periodLength)
				const chart1 = priceChart[id1]?.slice(-periodLength)
				const len = Math.min(chart0?.length ?? 0, chart1?.length ?? 0)
				if (len === 0) {
					result[id0][id1] = 0
					continue
				}
				const corr = pearsonCorrelationCoefficient(chart0.slice(0, len), chart1.slice(0, len))
				result[id0][id1] = corr
			}
		}
		// Mirror: corr(A,B) === corr(B,A)
		for (let i = 0; i < coins.length; i++) {
			for (let j = 0; j < i; j++) {
				result[coins[i].id][coins[j].id] = result[coins[j].id][coins[i].id]
			}
		}
		return result
	}, [isLoading, period, coins, priceChart])

	useEffect(() => {
		if (!router.isReady) return

		if (!queryCoins.length)
			Router.replace(
				{
					pathname: router.pathname,
					query: {
						...router.query,
						coin: ['bitcoin', 'ethereum', 'tether', 'binancecoin']
					}
				},
				undefined,
				{ shallow: true }
			)
	}, [queryCoins, router.query, router.pathname, router.isReady])

	const dialogStore = Ariakit.useDialogStore()

	const isClient = useIsClient()
	const showContent = isClient && coins.length > 0

	const removeCoin = (coinId: string) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					coin: queryCoins.filter((c) => c !== coinId)
				}
			},
			undefined,
			{ shallow: true }
		)
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
													<td
														key={`c-${coin.id}-${coin1.id}`}
														style={{
															backgroundColor:
																correlations[coin.id]?.[coin1.id] !== undefined
																	? +correlations[coin.id][coin1.id] > 0
																		? `rgba(53, 222, 59, ${Number(correlations[coin.id][coin1.id])})`
																		: `rgba(255, 0, 0, ${-Number(correlations[coin.id][coin1.id])})`
																	: undefined
														}}
														className="relative h-12 w-12 hover:after:pointer-events-none hover:after:absolute hover:after:top-[-5000px] hover:after:left-0 hover:after:h-[10000px] hover:after:w-full hover:after:bg-[rgba(59,130,246,0.12)] hover:after:content-['']"
													>
														{correlations[coin.id]?.[coin1.id] ?? ''}
													</td>
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
					queryCoins={queryCoins}
					selectCoin={(coin) => {
						router
							.push(
								{
									pathname: router.pathname,
									query: {
										...router.query,
										coin: queryCoins.concat(coin.id)
									}
								},
								undefined,
								{ shallow: true }
							)
							.then(() => {
								dialogStore.toggle()
							})
					}}
				/>
				<div className="w-full border-t border-(--form-control-border) pt-4">
					<p className="mx-auto max-w-xl text-center text-sm text-(--text-secondary)">
						Correlation is calculated by using each day as a single data point, and this calculation depends on the
						selected period. For example, if you select a period of one year, the correlation will be computed from 365
						data points.
					</p>
				</div>
			</div>
			<FAQ />
		</>
	)
}
