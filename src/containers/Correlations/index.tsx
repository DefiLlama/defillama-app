import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { Icon } from '~/components/Icon'
import { TagGroup } from '~/components/TagGroup'
import { useIsClient } from '~/hooks/useIsClient'
import { FAQ } from './Faq'
import { usePriceCharts } from './hooks'
import { pearsonCorrelationCoefficient } from './util'

export function CoinsPicker({ coinsData, selectCoin, dialogStore, selectedCoins }: any) {
	const [search, setSearch] = useState('')
	const filteredCoins = useMemo(() => {
		if (search === '') {
			return coinsData
		}
		return coinsData.filter(
			(coin) =>
				(coin?.symbol?.toLowerCase().includes(search.toLowerCase()) ||
					coin?.name?.toLowerCase().includes(search.toLowerCase())) &&
				!selectedCoins[coin.id]
		)
	}, [search, selectedCoins, coinsData])

	const [resultsLength, setResultsLength] = useState(10)

	const showMoreResults = () => {
		setResultsLength((prev) => prev + 10)
	}

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog className="dialog flex flex-col items-center sm:max-w-[340px]">
				<span className="flex w-full items-center gap-1">
					<input
						value={search}
						onChange={(e) => {
							setSearch(e.target?.value)
						}}
						placeholder="Search token..."
						className="flex-1 rounded-md bg-white px-3 py-2 dark:bg-black"
						autoFocus
					/>
					<Ariakit.DialogDismiss>
						<Icon name="x" height={24} width={24} />
						<span className="sr-only">Close dialog</span>
					</Ariakit.DialogDismiss>
				</span>

				<div className="flex max-h-[400px] w-full flex-col overflow-y-auto">
					{filteredCoins.slice(0, resultsLength + 1).map((coin) => {
						return (
							<button
								key={coin.name}
								onClick={() => selectCoin(coin)}
								className="flex w-full items-center gap-2 border-b border-black/40 py-2 dark:border-white/40"
							>
								<img
									alt={''}
									src={coin.image}
									height={'24px'}
									width={'24px'}
									loading="lazy"
									onError={(e) => {
										e.currentTarget.src = '/icons/placeholder.png'
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
							className="w-full px-4 pt-4 pb-7 text-left text-(--link) hover:bg-(--bg-secondary) focus-visible:bg-(--bg-secondary)"
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

const PERIODS = ['7d', '1m', '1y'] as const
type Period = (typeof PERIODS)[number]

export default function Correlations({ coinsData }) {
	const router = useRouter()
	const queryParamString = JSON.stringify(router.query ?? {})
	const queryCoins = useMemo(() => {
		const routerQuery = JSON.parse(queryParamString)
		return routerQuery?.coin || ([] as Array<string>)
	}, [queryParamString])
	const selectedCoins = useMemo<Record<string, IResponseCGMarketsAPI>>(() => {
		return (
			(queryCoins &&
				Object.fromEntries(
					coinsData
						.filter((coin) =>
							Array.isArray(queryCoins) ? queryCoins.find((c) => c === coin.id) : coin.id === queryCoins
						)
						.map((coin) => [coin.id, coin])
				)) ||
			{}
		)
	}, [queryCoins, coinsData])

	const [period, setPeriod] = useState<Period>('1y')
	const { data: priceChart, isLoading } = usePriceCharts(Object.keys(selectedCoins))
	const coins = Object.values(selectedCoins).filter(Boolean)
	const correlations = useMemo(
		() =>
			!isLoading
				? Object.fromEntries(
						coins.map((coin0) => {
							const results = coins.map((coin1) => {
								if (coin1.id === coin0.id) return null
								const periodLength = period === '7d' ? 7 : period === '1m' ? 30 : 365
								const chart0 = priceChart[coin0.id]?.slice(-periodLength)
								const chart1 = priceChart[coin1.id]?.slice(-periodLength)
								const shortChartLength = chart0.length > chart1?.length ? chart1?.length : chart0?.length
								const corr = pearsonCorrelationCoefficient(
									chart0.slice(0, shortChartLength),
									chart1.slice(0, shortChartLength)
								)
								return corr
							})
							return [coin0.id, results]
						})
					)
				: [],
		[isLoading, period, coins, priceChart]
	)

	useEffect(() => {
		if (!router.isReady) return

		if (!queryCoins?.length)
			router.replace(
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
	}, [queryCoins, router, router.isReady])

	const dialogStore = Ariakit.useDialogStore()

	const isClient = useIsClient()

	if (!isClient) {
		return (
			<h1 className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 text-center text-xl font-semibold">
				Correlations Matrix
			</h1>
		)
	}

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<h1 className="text-xl font-semibold">Correlations Matrix</h1>
				<TagGroup
					selectedValue={period}
					setValue={(period) => setPeriod(period as Period)}
					values={PERIODS}
					className="ml-auto"
				/>
			</div>

			<div className="flex flex-col items-center justify-center gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex flex-col sm:flex-row">
					<div className="no-scrollbar mr-8 flex flex-col overflow-auto">
						<h2 className="text-lg font-medium">Selected Coins</h2>
						{Object.values(selectedCoins).map((coin) =>
							coin ? (
								<button
									key={coin.symbol.toUpperCase()}
									onClick={() =>
										router.push(
											{
												pathname: router.pathname,
												query: {
													...router.query,
													coin: Array.isArray(queryCoins) ? queryCoins.filter((c) => c !== coin.id) : []
												}
											},
											undefined,
											{ shallow: true }
										)
									}
									className="flex items-center gap-2 border-b border-black/40 px-1 py-2 dark:border-white/40"
								>
									<img
										alt={''}
										src={coin.image}
										height={'24px'}
										width={'24px'}
										loading="lazy"
										onError={(e) => {
											e.currentTarget.src = '/icons/placeholder.png'
										}}
										className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
									/>
									<span>{coin.symbol.toUpperCase()}</span>
									<Icon name="x" height={14} width={14} className="ml-auto" />
								</button>
							) : null
						)}
						<button onClick={dialogStore.toggle} className="w-full py-2 text-xl">
							+
						</button>
					</div>
					<table className="max-w-lg table-fixed overflow-hidden text-center">
						<thead>
							<tr>
								<th />
								{coins.map((coin) => (
									<td
										key={`1-${coin.id}-${period}`}
										className="relative h-12 w-12 font-bold hover:after:absolute hover:after:top-[-5000px] hover:after:left-0 hover:after:z-[-1] hover:after:h-[10000px] hover:after:w-full hover:after:bg-[rgba(0,153,255,0.5)] hover:after:content-['']"
									>
										{coin?.symbol?.toUpperCase()}
									</td>
								))}
								<td>
									<button
										onClick={dialogStore.toggle}
										className="h-12 w-12 text-2xl hover:bg-[rgba(0,153,255,0.5)] focus-visible:hover:bg-[rgba(0,153,255,0.5)]"
									>
										+
									</button>
								</td>
							</tr>
						</thead>
						<tbody>
							{coins.map((coin) => (
								<tr key={`2-${coin.id}-${period}`} className="hover:bg-[rgba(0,153,255,0.5)]">
									<td className="relative h-12 w-12 font-bold hover:after:absolute hover:after:top-[-5000px] hover:after:left-0 hover:after:z-[-1] hover:after:h-[10000px] hover:after:w-full hover:after:bg-[rgba(0,153,255,0.5)] hover:after:content-['']">
										{coin?.symbol?.toUpperCase()}
									</td>
									{correlations[coin.id]?.map((corr, i) =>
										corr === null ? (
											<td key={coin.image}>
												<img
													alt={''}
													src={coin.image}
													height={'24px'}
													width={'24px'}
													loading="lazy"
													onError={(e) => {
														e.currentTarget.src = '/icons/placeholder.png'
													}}
													className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
												/>
											</td>
										) : (
											<td
												key={`3-${corr}-${coin.id}-${period}-${i}`}
												style={{
													backgroundColor:
														+corr > 0 ? `rgba(53, 222, 59, ${Number(corr)})` : `rgb(255,0,0, ${-Number(corr)})`
												}}
												className="relative h-12 w-12 hover:after:absolute hover:after:top-[-5000px] hover:after:left-0 hover:after:z-[-1] hover:after:h-[10000px] hover:after:w-full hover:after:bg-[rgba(0,153,255,0.5)] hover:after:content-['']"
											>
												{corr}
											</td>
										)
									)}
								</tr>
							))}
							<tr>
								<td>
									<button
										onClick={dialogStore.toggle}
										className="h-12 w-12 text-2xl hover:bg-[rgba(0,153,255,0.5)] focus-visible:hover:bg-[rgba(0,153,255,0.5)]"
									>
										+
									</button>
								</td>
							</tr>
						</tbody>
					</table>
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
											coin: Array.isArray(queryCoins) ? queryCoins.concat(coin.id) : [queryCoins, coin.id]
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
				</div>
				<p className="mx-auto max-w-xl text-center text-sm text-(--text-secondary)">
					Correlation is calculated by using each day as a single data point, and this calculation depends on the
					selected period. For example, if you select a period of one year, the correlation will be computed from 365
					data points.
				</p>
			</div>
			<FAQ />
		</>
	)
}
