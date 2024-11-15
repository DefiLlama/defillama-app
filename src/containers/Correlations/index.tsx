import React, { useState, useEffect, useRef, useMemo } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRouter } from 'next/router'
import { FAQ } from './Faq'
import { usePriceCharts } from './hooks'
import { pearsonCorrelationCoefficient } from './util'
import { Icon } from '~/components/Icon'
import { Dialog, DialogDismiss, useDialogState } from 'ariakit'

export function CoinsPicker({ coinsData, dialogState, selectCoin, selectedCoins, queryCoins }: any) {
	const parentRef = useRef()
	const [search, setSearch] = useState('')
	const filteredCoins = useMemo(() => {
		return (
			coinsData &&
			coinsData.filter(
				(coin) =>
					(search === ''
						? true
						: coin?.symbol?.toLowerCase().includes(search.toLowerCase()) ||
						  coin?.name?.toLowerCase().includes(search.toLowerCase())) && !selectedCoins[coin.id]
			)
		)
	}, [search, selectedCoins, queryCoins])
	const rowVirtualizer = useVirtualizer({
		count: filteredCoins?.length || 0,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 50
	})
	return (
		<Dialog state={dialogState} className="dialog flex flex-col items-center sm:max-w-[340px]">
			<span className="flex items-center gap-1 w-full">
				<input
					value={search}
					onChange={(e) => {
						setSearch(e.target?.value)
					}}
					placeholder="Search token..."
					className="bg-white dark:bg-black rounded-md py-2 px-3 flex-1"
					autoFocus
				/>
				<DialogDismiss>
					<Icon name="x" height={24} width={24} />
					<span className="sr-only">Close dialog</span>
				</DialogDismiss>
			</span>

			<div
				ref={parentRef}
				style={{
					height: 400,
					width: 300
				}}
				className="no-scrollbar contain-strict overflow-y-auto"
			>
				<div
					style={{
						height: `${rowVirtualizer.getTotalSize()}px`,
						width: '100%',
						position: 'relative'
					}}
				>
					{rowVirtualizer.getVirtualItems().map((virtualItem) => {
						const coin = filteredCoins[virtualItem.index]

						if (!coin) return

						return (
							<button
								style={{
									height: `${virtualItem.size}px`,
									transform: `translateY(${virtualItem.start}px)`
								}}
								key={virtualItem.key}
								onClick={() => selectCoin(coin)}
								className="absolute top-0 left-0 w-full flex items-center gap-2 px-1 py-2 border-b border-black/40 dark:border-white/40"
							>
								<img
									alt={''}
									src={coin.image}
									height={'24px'}
									width={'24px'}
									loading="lazy"
									onError={(e) => {
										e.currentTarget.src = '/placeholder.png'
									}}
									className="inline-block object-cover aspect-square rounded-full bg-[var(--bg3)] flex-shrink-0"
								/>
								<span>
									{coin.name} ({coin.symbol.toUpperCase()})
								</span>
							</button>
						)
					})}
				</div>
			</div>
		</Dialog>
	)
}

export default function Correlations({ coinsData }) {
	const router = useRouter()
	const queryCoins = router.query?.coin || ([] as Array<string>)
	const selectedCoins = useMemo<Record<string, IResponseCGMarketsAPI>>(
		() =>
			(queryCoins &&
				Object.fromEntries(
					coinsData
						.filter((coin) =>
							Array.isArray(queryCoins) ? queryCoins.find((c) => c === coin.id) : coin.id === queryCoins
						)
						.map((coin) => [coin.id, coin])
				)) ||
			{},
		[queryCoins]
	)
	const [period, setPeriod] = useState(365)
	const { data: priceChart, isLoading } = usePriceCharts(Object.keys(selectedCoins))
	const coins = Object.values(selectedCoins).filter(Boolean)
	const correlations = useMemo(
		() =>
			!isLoading
				? Object.fromEntries(
						coins.map((coin0) => {
							const results = coins.map((coin1) => {
								if (coin1.id === coin0.id) return null
								const chart0 = priceChart[coin0.id]?.slice(-period)
								const chart1 = priceChart[coin1.id]?.slice(-period)
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
		[isLoading, period, queryCoins]
	)

	useEffect(() => {
		if (!queryCoins?.length)
			router.push(
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
	}, [queryCoins, router])

	const dialogState = useDialogState()

	return (
		<>
			<h1 className="text-2xl font-medium">Correlations Matrix</h1>

			<div className="flex items-center flex-nowrap overflow-hidden relative mx-auto p-1 text-[var(--text1)] bg-[var(--bg6)] rounded-lg font-medium">
				<button
					className="flex-1 px-6 py-2 data-[active=true]:bg-[#445ed0] rounded-lg"
					onClick={() => setPeriod(7)}
					data-active={period === 7}
				>
					7d
				</button>
				<button
					className="flex-1 px-6 py-2 data-[active=true]:bg-[#445ed0] rounded-lg"
					onClick={() => setPeriod(30)}
					data-active={period === 30}
				>
					1m
				</button>
				<button
					className="flex-1 px-6 py-2 data-[active=true]:bg-[#445ed0] rounded-lg"
					onClick={() => setPeriod(365)}
					data-active={period === 365}
				>
					1y
				</button>
			</div>

			<div className="flex flex-col sm:flex-row mx-auto">
				<div className="no-scrollbar overflow-auto mr-8 mt-3 flex flex-col">
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
								className="flex items-center gap-2 px-1 py-2 border-b border-black/40 dark:border-white/40"
							>
								<img
									alt={''}
									src={coin.image}
									height={'24px'}
									width={'24px'}
									loading="lazy"
									onError={(e) => {
										e.currentTarget.src = '/placeholder.png'
									}}
									className="inline-block object-cover aspect-square rounded-full bg-[var(--bg3)] flex-shrink-0"
								/>
								<span>{coin.symbol.toUpperCase()}</span>
								<Icon name="x" height={14} width={14} className="ml-auto" />
							</button>
						) : null
					)}
					<button onClick={dialogState.toggle} className="w-full text-xl py-2">
						+
					</button>
				</div>
				<table className="table-fixed text-center overflow-hidden max-w-lg">
					<thead>
						<th />
						{coins.map((coin) => (
							<td
								key={coin.id}
								className="w-12 h-12 relative hover:after:absolute hover:after:left-0 hover:after:bg-[rgba(0,153,255,0.5)] hover:after:top-[-5000px] hover:after:h-[10000px] hover:after:w-full hover:after:z-[-1] hover:after:content-[''] font-bold"
							>
								{coin?.symbol?.toUpperCase()}
							</td>
						))}
						<td>
							<button
								onClick={dialogState.toggle}
								className="w-12 h-12 text-2xl hover:bg-[rgba(0,153,255,0.5)] focus-visible:hover:bg-[rgba(0,153,255,0.5)]"
							>
								+
							</button>
						</td>
					</thead>
					<tbody>
						{coins.map((coin, i) => (
							<tr key={coin.id + i + period} className="hover:bg-[rgba(0,153,255,0.5)]">
								<td className="w-12 h-12 relative hover:after:absolute hover:after:left-0 hover:after:bg-[rgba(0,153,255,0.5)] hover:after:top-[-5000px] hover:after:h-[10000px] hover:after:w-full hover:after:z-[-1] hover:after:content-[''] font-bold">
									{coin?.symbol?.toUpperCase()}
								</td>
								{correlations[coin.id]?.map((corr) =>
									corr === null ? (
										<img
											key={coin.image}
											alt={''}
											src={coin.image}
											height={'24px'}
											width={'24px'}
											loading="lazy"
											onError={(e) => {
												e.currentTarget.src = '/placeholder.png'
											}}
											className="inline-block object-cover aspect-square rounded-full bg-[var(--bg3)] flex-shrink-0 mt-3"
										/>
									) : (
										<td
											key={corr + coin.id + period}
											style={{
												backgroundColor:
													+corr > 0 ? `rgba(53, 222, 59, ${Number(corr)})` : `rgb(255,0,0, ${-Number(corr)})`
											}}
											className="w-12 h-12 relative hover:after:absolute hover:after:left-0 hover:after:bg-[rgba(0,153,255,0.5)] hover:after:top-[-5000px] hover:after:h-[10000px] hover:after:w-full hover:after:z-[-1] hover:after:content-['']"
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
									onClick={dialogState.toggle}
									className="w-12 h-12 text-2xl hover:bg-[rgba(0,153,255,0.5)] focus-visible:hover:bg-[rgba(0,153,255,0.5)]"
								>
									+
								</button>
							</td>
						</tr>
					</tbody>
				</table>
				<CoinsPicker
					coinsData={coinsData}
					dialogState={dialogState}
					selectedCoins={selectedCoins}
					queryCoins={queryCoins}
					selectCoin={(coin) => {
						router.push(
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
					}}
				/>
			</div>
			<p className="text-center mx-auto text-sm max-w-lg text-[var(--text2)]">
				Correlation is calculated by using each day as a single data point, and this calculation depends on the selected
				period. For example, if you select a period of one year, the correlation will be computed from 365 data points.
			</p>
			<FAQ />
		</>
	)
}
