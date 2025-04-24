import { useQuery } from '@tanstack/react-query'
import React, { useMemo, useState, useCallback } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { useRouter } from 'next/router'
import { LocalLoader } from '~/components/LocalLoader'
import { CoinsPicker } from '~/containers/Correlations'
import { formattedNum } from '~/utils'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'

const unixToDateString = (unixTimestamp) => {
	if (!unixTimestamp) return ''
	const date = new Date(unixTimestamp * 1000)
	return date.toISOString().split('T')[0]
}

const dateStringToUnix = (dateString) => {
	if (!dateString) return ''
	return Math.floor(new Date(dateString).getTime() / 1000)
}

export default function TokenPnl({ coinsData }) {
	const router = useRouter()
	const now = Math.floor(Date.now() / 1000) - 1000

	const [isModalOpen, setModalOpen] = useState(0)
	const [start, setstart] = useState(now - 7 * 24 * 60 * 60)
	const [end, setend] = useState(now)

	const { selectedCoins, coins } = useMemo(() => {
		const queryCoins = router.query?.coin || (['bitcoin'] as Array<string>)
		const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]

		return {
			selectedCoins:
				(queryCoins && coins.map((coin) => coinsData.find((c) => c.id === coin))) || ([] as IResponseCGMarketsAPI[]),
			coins
		}
	}, [router.query, coinsData])

	const id = useMemo(() => {
		return coins.length > 0 ? coins[0] : ''
	}, [coins])

	const fetchPnlData = useCallback(async () => {
		if (!id) return null
		const key = `coingecko:${id}`
		const spanInDays = Math.ceil((end - start) / (24 * 60 * 60))
		const chartRes = await fetch(
			`https://coins.llama.fi/chart/${key}?start=${start}&span=${spanInDays}&searchWidth=600`
		).then((r) => r.json())

		const selectedCoin = coinsData.find((coin) => coin.id === id)

		if (!chartRes.coins[key] || chartRes.coins[key].prices.length < 2) {
			return {
				pnl: 'No data',
				coinInfo: selectedCoin,
				startPrice: null,
				endPrice: null
			}
		}

		const prices = chartRes.coins[key].prices
		const startPrice = prices[0].price
		const endPrice = prices[prices.length - 1].price
		const pnlValue = ((endPrice - startPrice) / startPrice) * 100

		return {
			pnl: `${pnlValue.toFixed(2)}%`,
			coinInfo: selectedCoin,
			startPrice,
			endPrice
		}
	}, [id, start, end, coinsData])

	const {
		data: pnlData,
		isLoading,
		isError,
		error,
		refetch
	} = useQuery({
		queryKey: ['pnlData', id, start, end],
		queryFn: fetchPnlData,
		staleTime: 10 * 60 * 1000,
		enabled: !!id,
		refetchOnWindowFocus: false
	})

	const updateDateAndFetchPnl = (newDate, isStart) => {
		const unixTimestamp = dateStringToUnix(newDate)
		if (unixTimestamp !== '') {
			if (isStart) {
				setstart(unixTimestamp)
			} else {
				setend(unixTimestamp)
			}
			router.push(
				{
					pathname: router.pathname,
					query: {
						...router.query,
						[isStart ? 'start' : 'end']: unixTimestamp
					}
				},
				undefined,
				{ shallow: true }
			)
			refetch()
		}
	}

	const dialogStore = Ariakit.useDialogStore()

	return (
		<>
			<div className="flex flex-col gap-3 items-center w-full max-w-sm mx-auto rounded-md relative xl:fixed xl:left-0 xl:right-0 lg:top-4 xl:top-11 bg-[var(--cards-bg)] p-3">
				<h1 className="text-xl font-semibold text-center">Token Holder Profit and Loss</h1>
				<div className="flex flex-col gap-3 w-full">
					<label className="flex flex-col gap-1 text-sm">
						<span>Start Date:</span>
						<input
							type="date"
							className="p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-[#E6E6E6] dark:border-[#39393E]"
							value={unixToDateString(start)}
							onChange={(e) => updateDateAndFetchPnl(e.target.value, true)}
							min={unixToDateString(0)}
							max={unixToDateString(now)}
							onFocus={async (e) => {
								try {
									e.target.showPicker()
								} catch (error) {}
							}}
						/>
					</label>

					<label className="flex flex-col gap-1 text-sm">
						<span>End Date:</span>
						<input
							type="date"
							className="p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-[#E6E6E6] dark:border-[#39393E]"
							value={unixToDateString(end)}
							onChange={(e) => updateDateAndFetchPnl(e.target.value, false)}
							min={unixToDateString(start)}
							max={new Date().toISOString().split('T')[0]}
							onFocus={async (e) => {
								try {
									e.target.showPicker()
								} catch (error) {}
							}}
						/>
					</label>

					<label className="flex flex-col gap-1 text-sm">
						<span>Token:</span>

						{selectedCoins[0] ? (
							<button
								onClick={() => {
									setModalOpen(1)
									dialogStore.toggle()
								}}
								className="flex items-center gap-1 p-[6px] rounded-md text-base bg-white text-black dark:bg-black dark:text-white border border-[#E6E6E6] dark:border-[#39393E]"
							>
								<img
									src={selectedCoins[0].image}
									alt={selectedCoins[0].name}
									width={24}
									height={24}
									className="rounded-full"
								/>
								<span>{selectedCoins[0].name}</span>
							</button>
						) : (
							<>
								<button
									onClick={() => {
										setModalOpen(1)
										dialogStore.toggle()
									}}
									className="flex items-center gap-1 p-[6px] rounded-md text-base bg-white text-black/60 dark:bg-black dark:text-white/60 border border-[#E6E6E6] dark:border-[#39393E]"
								>
									<Icon name="search" height={16} width={16} />
									<span>Search coins...</span>
								</button>
							</>
						)}
					</label>

					<>
						{coins.length === 1 && (
							<div className="flex flex-col items-center justify-center">
								{isLoading ? (
									<div className="flex items-center justify-center m-auto">
										<LocalLoader />
									</div>
								) : isError ? (
									<div className="flex flex-col gap-1 items-center text-base">
										<h2 className="text-red-500 font-bold text-2xl">Error</h2>
										<p>{error instanceof Error ? error.message : 'An error occurred'}</p>
										<button
											onClick={() => refetch()}
											className="rounded-md py-[6px] px-4 bg-[var(--link-active-bg)] text-white"
										>
											Retry
										</button>
									</div>
								) : (
									pnlData && (
										<div className="flex flex-col items-center gap-3">
											<h2
												className="font-bold text-2xl flex flex-col items-center"
												style={{ color: parseFloat(pnlData.pnl) >= 0 ? 'green' : 'red' }}
											>
												<span>{parseFloat(pnlData.pnl) >= 0 ? 'Profit' : 'Loss'}</span>
												<span>{pnlData.pnl}</span>
											</h2>

											{pnlData.coinInfo && (
												<div className="grid grid-cols-2 gap-4 w-full">
													<p className="flex flex-col items-center">
														<span className="text-[var(--text2)]">Start Price:</span>
														<span className="font-semibold text-lg">
															{pnlData.startPrice ? `$${formattedNum(pnlData.startPrice)}` : 'N/A'}
														</span>
													</p>
													<p className="flex flex-col items-center">
														<span className="text-[var(--text2)]">End Price:</span>
														<span className="font-semibold text-lg">
															{pnlData.endPrice ? `$${formattedNum(pnlData.endPrice)}` : 'N/A'}
														</span>
													</p>
													<p className="flex flex-col items-center">
														<span className="text-[var(--text2)]">Current Price:</span>
														<span className="font-semibold text-lg">
															${formattedNum(pnlData.coinInfo.current_price)}
														</span>
													</p>

													<p className="flex flex-col items-center">
														<span className="text-[var(--text2)]">24h Change:</span>
														<span
															className="font-semibold text-lg"
															style={{ color: pnlData.coinInfo.price_change_percentage_24h >= 0 ? 'green' : 'red' }}
														>
															{pnlData.coinInfo.price_change_percentage_24h.toFixed(2)}%
														</span>
													</p>
													<p className="flex flex-col items-center">
														<span className="text-[var(--text2)]">All-Time High:</span>
														<span className="font-semibold text-lg">${formattedNum(pnlData.coinInfo.ath)}</span>
													</p>
												</div>
											)}
										</div>
									)
								)}
							</div>
						)}
					</>

					<CoinsPicker
						coinsData={coinsData}
						dialogStore={dialogStore}
						selectedCoins={{}}
						queryCoins={coins}
						selectCoin={(coin) => {
							const newCoins = coins.slice()
							newCoins[isModalOpen - 1] = coin.id
							router.push(
								{
									pathname: router.pathname,
									query: {
										...router.query,
										coin: newCoins
									}
								},
								undefined,
								{ shallow: true }
							)
							refetch()
							setModalOpen(0)
							dialogStore.toggle()
						}}
					/>
				</div>
			</div>
		</>
	)
}
