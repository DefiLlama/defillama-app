import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { IResponseCGMarketsAPI } from '~/api/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { COINS_CHART_API } from '~/constants'
import { CoinsPicker } from '~/containers/Correlations'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'
import { formattedNum } from '~/utils'
import { fetchJson } from '~/utils/async'

const unixToDateString = (unixTimestamp) => {
	if (!unixTimestamp) return ''
	const date = new Date(unixTimestamp * 1000)
	return date.toISOString().split('T')[0]
}

const dateStringToUnix = (dateString: string) => {
	return Math.floor(new Date(dateString).getTime() / 1000)
}

const DateInput = ({ label, value, onChange, min, max, hasError = false }) => {
	return (
		<label className="flex flex-col gap-1 text-sm">
			<span>{label}:</span>
			<input
				type="date"
				className={`rounded-md bg-white p-1.5 text-base text-black outline-0 dark:bg-black dark:text-white ${
					hasError ? 'border-2 border-red-500' : 'border border-(--form-control-border)'
				}`}
				value={value}
				onChange={onChange}
				min={min}
				max={max}
			/>
		</label>
	)
}

export function TokenPnl({ coinsData }) {
	const router = useRouter()
	const now = Math.floor(Date.now() / 1000) - 1000

	const [isModalOpen, setModalOpen] = useState(0)

	const { startDate, endDate, dateError, handleStartDateChange, handleEndDateChange, validateDateRange } =
		useDateRangeValidation({
			initialStartDate: unixToDateString(now - 7 * 24 * 60 * 60),
			initialEndDate: unixToDateString(now)
		})

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

	const start = dateStringToUnix(startDate)
	const end = dateStringToUnix(endDate)

	const fetchPnlData = useCallback(async () => {
		if (!id) return null
		const key = `coingecko:${id}`
		const spanInDays = Math.ceil((end - start) / (24 * 60 * 60))
		const chartRes = await fetchJson(`${COINS_CHART_API}/${key}?start=${start}&span=${spanInDays}&searchWidth=600`)

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
		const currentStartDate = isStart ? newDate : startDate
		const currentEndDate = isStart ? endDate : newDate

		if (validateDateRange(currentStartDate, currentEndDate)) {
			if (isStart) {
				handleStartDateChange(newDate)
			} else {
				handleEndDateChange(newDate)
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
			<div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 xl:absolute xl:top-0 xl:right-0 xl:left-0 xl:m-auto xl:mt-[132px]">
				<h1 className="text-center text-xl font-semibold">Token Holder Profit and Loss</h1>
				<div className="flex w-full flex-col gap-3">
					<DateInput
						label="Start Date"
						value={startDate}
						onChange={(e) => updateDateAndFetchPnl(e.target.value, true)}
						min={unixToDateString(0)}
						max={unixToDateString(now)}
					/>

					<DateInput
						label="End Date"
						value={endDate}
						onChange={(e) => updateDateAndFetchPnl(e.target.value, false)}
						min={startDate}
						max={new Date().toISOString().split('T')[0]}
						hasError={!!dateError}
					/>

					{dateError && <p className="text-center text-sm text-red-500">{dateError}</p>}

					<label className="flex flex-col gap-1 text-sm">
						<span>Token:</span>

						{selectedCoins[0] ? (
							<button
								onClick={() => {
									setModalOpen(1)
									dialogStore.toggle()
								}}
								className="flex items-center gap-1 rounded-md border border-(--form-control-border) bg-white p-1.5 text-base text-black dark:bg-black dark:text-white"
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
									className="flex items-center gap-1 rounded-md border border-(--form-control-border) bg-white p-1.5 text-base text-black/60 dark:bg-black dark:text-white/60"
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
									<div className="m-auto flex items-center justify-center">
										<LocalLoader />
									</div>
								) : isError ? (
									<div className="flex flex-col items-center gap-1 text-base">
										<h2 className="text-2xl font-bold text-red-500">Error</h2>
										<p>{error instanceof Error ? error.message : 'An error occurred'}</p>
										<button
											onClick={() => refetch()}
											className="rounded-md bg-(--link-active-bg) px-4 py-1.5 text-white"
										>
											Retry
										</button>
									</div>
								) : (
									pnlData && (
										<div className="flex flex-col items-center gap-3">
											<h2 className="flex flex-col items-center text-2xl font-bold">
												{pnlData.pnl === 'No data' ? (
													<span className="text-red-500">No data</span>
												) : (
													<>
														<span style={{ color: parseFloat(pnlData.pnl) >= 0 ? 'green' : 'red' }}>
															{parseFloat(pnlData.pnl) >= 0 ? 'Profit' : 'Loss'}
														</span>
														<span style={{ color: parseFloat(pnlData.pnl) >= 0 ? 'green' : 'red' }}>{pnlData.pnl}</span>
													</>
												)}
											</h2>

											{pnlData.coinInfo && (
												<div className="grid w-full grid-cols-2 gap-4">
													<p className="flex flex-col items-center">
														<span className="text-(--text-secondary)">Start Price:</span>
														<span className="text-lg font-semibold">
															{pnlData.startPrice ? `$${formattedNum(pnlData.startPrice)}` : 'N/A'}
														</span>
													</p>
													<p className="flex flex-col items-center">
														<span className="text-(--text-secondary)">End Price:</span>
														<span className="text-lg font-semibold">
															{pnlData.endPrice ? `$${formattedNum(pnlData.endPrice)}` : 'N/A'}
														</span>
													</p>
													<p className="flex flex-col items-center">
														<span className="text-(--text-secondary)">Current Price:</span>
														<span className="text-lg font-semibold">
															${formattedNum(pnlData.coinInfo.current_price)}
														</span>
													</p>

													<p className="flex flex-col items-center">
														<span className="text-(--text-secondary)">24h Change:</span>
														<span
															className="text-lg font-semibold"
															style={{ color: pnlData.coinInfo.price_change_percentage_24h >= 0 ? 'green' : 'red' }}
														>
															{pnlData.coinInfo.price_change_percentage_24h.toFixed(2)}%
														</span>
													</p>
													<p className="flex flex-col items-center">
														<span className="text-(--text-secondary)">All-Time High:</span>
														<span className="text-lg font-semibold">${formattedNum(pnlData.coinInfo.ath)}</span>
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
