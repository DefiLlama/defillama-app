import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { fetchCoinPrices } from '~/api'
import { IResponseCGMarketsAPI } from '~/api/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { CACHE_SERVER } from '~/constants'
import { CoinsPicker } from '~/containers/Correlations'
import { fetchJson } from '~/utils/async'

export default function CompareFdv({ coinsData, protocols }) {
	const router = useRouter()
	const [isModalOpen, setModalOpen] = useState(0)
	const { selectedCoins, coins, compareType } = useMemo(() => {
		const queryCoins = router.query?.coin || ([] as Array<string>)

		const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]

		const compareType = compareTypes.find((type) => type.value === (router.query?.type ?? 'fdv')) ?? {
			label: 'FDV',
			value: 'fdv'
		}
		return {
			selectedCoins:
				(queryCoins && coins.map((coin) => coinsData.find((c) => c.id === coin))) || ([] as IResponseCGMarketsAPI[]),
			coins,
			compareType
		}
	}, [router.query])

	const { data: fdvData = null, error: fdvError } = useQuery({
		queryKey: [`fdv-${coins.join('-')}`],
		queryFn:
			coins.length == 2
				? () =>
						Promise.all([
							fetchCoinPrices(coins.map((c) => 'coingecko:' + c)).then((coins) => ({ coins })),
							fetchJson(`${CACHE_SERVER}/supply/${coins[0]}`),
							fetchJson(`${CACHE_SERVER}/supply/${coins[1]}`)
						])
				: () => null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	let newPrice, increase

	if (fdvData !== null) {
		let coinPrices = coins.map((c) => fdvData[0].coins['coingecko:' + c].price)

		if (compareType.value === 'mcap') {
			if (selectedCoins[0]['market_cap'] && selectedCoins[1]['market_cap']) {
				newPrice = (coinPrices[1] * selectedCoins[1]['market_cap']) / selectedCoins[0]['market_cap']
				increase = newPrice / coinPrices[0]
			}
		}
		if (compareType.value === 'fdv') {
			let fdvs = [fdvData[1], fdvData[2]].map((f) => Number(f.data.total_supply))
			newPrice = (coinPrices[1] * fdvs[1]) / fdvs[0]
			increase = newPrice / coinPrices[0]
			// console.log(coinPrices, fdvs, fdvData)
		}
		if (compareType.value === 'volume') {
			if (selectedCoins[0]['total_volume'] && selectedCoins[1]['total_volume']) {
				newPrice = (coinPrices[1] * selectedCoins[1]['total_volume']) / selectedCoins[0]['total_volume']
				increase = newPrice / coinPrices[0]
			}
		}

		if (compareType.value === 'tvl') {
			const tvlData = [
				protocols.find(
					(protocol) => protocol.geckoId === selectedCoins[0].id || protocol.name === selectedCoins[0].name
				)?.tvl ?? null,
				protocols.find(
					(protocol) => protocol.geckoId === selectedCoins[1].id || protocol.name === selectedCoins[1].name
				)?.tvl ?? null
			]
			if (tvlData[0] !== null && tvlData[1] !== null) {
				newPrice = (coinPrices[1] * tvlData[1]) / tvlData[0]
				increase = newPrice / coinPrices[0]
			}
		}

		if (compareType.value === 'fees') {
			const feesData = [
				protocols.find(
					(protocol) => protocol.geckoId === selectedCoins[0].id || protocol.name === selectedCoins[0].name
				)?.fees ?? null,
				protocols.find(
					(protocol) => protocol.geckoId === selectedCoins[1].id || protocol.name === selectedCoins[1].name
				)?.fees ?? null
			]
			if (feesData[0] !== null && feesData[1] !== null) {
				newPrice = (coinPrices[1] * feesData[1]) / feesData[0]
				increase = newPrice / coinPrices[0]
			}
		}

		if (compareType.value === 'revenue') {
			const revenueData = [
				protocols.find(
					(protocol) => protocol.geckoId === selectedCoins[0].id || protocol.name === selectedCoins[0].name
				)?.revenue ?? null,
				protocols.find(
					(protocol) => protocol.geckoId === selectedCoins[1].id || protocol.name === selectedCoins[1].name
				)?.revenue ?? null
			]
			if (revenueData[0] !== null && revenueData[1] !== null) {
				newPrice = (coinPrices[1] * revenueData[1]) / revenueData[0]
				increase = newPrice / coinPrices[0]
			}
		}
	}

	const dialogStore = Ariakit.useDialogStore()

	return (
		<>
			<h1 className="relative mx-auto mt-2 w-full max-w-sm text-center text-xl font-semibold lg:-left-[116px]">
				Compare Tokens
			</h1>
			<div className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-2 lg:-left-[116px]">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="relative w-full sm:max-w-[280px]">
						{selectedCoins[0] ? (
							<img
								alt={''}
								src={selectedCoins[0].image}
								height={16}
								width={16}
								loading="lazy"
								onError={(e) => {
									e.currentTarget.src = '/icons/placeholder.png'
								}}
								className="absolute top-0 bottom-0 left-2 my-auto inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
							/>
						) : (
							<Icon
								name="search"
								height={16}
								width={16}
								className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
							/>
						)}
						<input
							value={selectedCoins[0]?.name}
							onClick={() => {
								setModalOpen(1)
								dialogStore.toggle()
							}}
							placeholder="Search coins..."
							className="min-h-8 w-full rounded-md border border-(--form-control-border) bg-white px-2 py-1 pl-7 text-black max-sm:py-0.5 dark:bg-black dark:text-white"
						/>
					</div>
					{/* <ReactSelect
						options={coinsData}
						value={selectedCoins[0]}
						onChange={(coin: any) => {
							router.push(
								{
									pathname: router.pathname,
									query: {
										...router.query,
										coin: coins.length === 0 ? [coin.id] : [coin.id, coins[1]]
									}
								},
								undefined,
								{ shallow: true }
							)
						}}
						aria-label="Select Coin"
						placeholder="Select Coin"
						components={{ Option, SingleValue, Menu }}
						styles={{
							option: (base) => ({
								...base,
								display: 'flex',
								alignItems: 'center',
								gap: '4px'
							}),
							singleValue: (base) => ({
								...base,
								display: 'flex',
								alignItems: 'center',
								gap: '4px',
								color: 'var(--color)'
							})
						}}
						filterOption={createFilter({ ignoreAccents: false })}
					/> */}
					<button
						onClick={() => {
							if (coins.length > 1) {
								router.push(
									{
										pathname: router.pathname,
										query: {
											...router.query,
											coin: [coins[1], coins[0]]
										}
									},
									undefined,
									{ shallow: true }
								)
							}
						}}
						className="flex shrink-0 items-center justify-center p-1"
					>
						<Icon name="repeat" height={16} width={16} />
						<span className="sr-only">Switch tokens</span>
					</button>
					{/* <ReactSelect
						options={coinsData}
						value={selectedCoins[1]}
						onChange={(coin: any) => {
							router.push(
								{
									pathname: router.pathname,
									query: {
										...router.query,
										coin: coins.length === 0 ? [coin.id] : [coins[0], coin.id]
									}
								},
								undefined,
								{ shallow: true }
							)
						}}
						aria-label="Select Coin"
						placeholder="Select Coin"
						components={{ Option, SingleValue, Menu }}
						styles={{
							option: (base) => ({
								...base,
								display: 'flex',
								alignItems: 'center',
								gap: '4px'
							}),
							singleValue: (base) => ({
								...base,
								display: 'flex',
								alignItems: 'center',
								gap: '4px',
								color: 'var(--color)'
							})
						}}
						style={{ width: '100%' }}
						filterOption={createFilter({ ignoreAccents: false })}
					/> */}
					<div className="relative w-full sm:max-w-[280px]">
						{selectedCoins[1] ? (
							<img
								alt={''}
								src={selectedCoins[1].image}
								height={16}
								width={16}
								loading="lazy"
								onError={(e) => {
									e.currentTarget.src = '/icons/placeholder.png'
								}}
								className="absolute top-0 bottom-0 left-2 my-auto inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
							/>
						) : (
							<Icon
								name="search"
								height={16}
								width={16}
								className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
							/>
						)}
						<input
							value={selectedCoins[1]?.name}
							onClick={() => {
								setModalOpen(2)
								dialogStore.toggle()
							}}
							placeholder="Search coins..."
							className="min-h-8 w-full rounded-md border border-(--form-control-border) bg-white px-2 py-1 pl-7 text-black max-sm:py-0.5 dark:bg-black dark:text-white"
						/>
					</div>
				</div>
				<Ariakit.MenuProvider>
					<Ariakit.MenuButton className="relative flex w-full cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md bg-(--btn2-bg) px-3 py-2 text-(--text-primary) hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)">
						<span>{compareType?.label}</span>
						<Ariakit.MenuButtonArrow />
					</Ariakit.MenuButton>
					<Ariakit.Menu
						unmountOnHide
						hideOnInteractOutside
						sameWidth
						className="max-sm:drawer thin-scrollbar z-10 flex max-h-[60dvh] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none dark:border-[hsl(204,3%,32%)]"
					>
						<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
							<Icon name="x" className="h-5 w-5" />
						</Ariakit.PopoverDismiss>

						{compareTypes.map((item) => {
							return (
								<Ariakit.MenuItem
									key={item.value}
									onClick={() => {
										router.push(
											{
												pathname: router.pathname,
												query: {
													...router.query,
													type: item.value
												}
											},
											undefined,
											{ shallow: true }
										)
									}}
									className="flex shrink-0 cursor-pointer items-center justify-between gap-4 border-b border-(--form-control-border) px-3 py-2 first-of-type:rounded-t-md last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
								>
									{item.label}
								</Ariakit.MenuItem>
							)
						})}
					</Ariakit.Menu>
				</Ariakit.MenuProvider>
				{coins.length === 2 ? (
					fdvData === null ? (
						<div className="m-auto flex min-h-[360px] items-center justify-center">
							<LocalLoader />
						</div>
					) : (
						<div className="mt-10 flex flex-col items-center gap-2">
							<h2 className="flex flex-wrap items-center justify-center gap-1 text-base font-normal">
								<span className="flex items-center gap-1">
									<img
										alt={''}
										src={selectedCoins[0].image}
										height={'20px'}
										width={'20px'}
										loading="lazy"
										onError={(e) => {
											e.currentTarget.src = '/icons/placeholder.png'
										}}
										className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
									/>
									<span>{selectedCoins[0].symbol.toUpperCase()}</span>
								</span>
								<span>WITH THE {compareType.label.toUpperCase()} OF</span>
								<span className="flex items-center gap-1">
									<img
										alt={''}
										src={selectedCoins[1].image}
										height={'20px'}
										width={'20px'}
										loading="lazy"
										onError={(e) => {
											e.currentTarget.src = '/icons/placeholder.png'
										}}
										className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
									/>
									<span>{selectedCoins[1].symbol.toUpperCase()}</span>
								</span>
							</h2>

							{newPrice !== undefined && increase !== undefined ? (
								<p className="text-lg font-bold">
									$
									{newPrice.toLocaleString(
										undefined, // leave undefined to use the visitor's browser
										// locale or a string like 'en-US' to override it.
										{ maximumFractionDigits: 2 }
									)}{' '}
									({increase.toFixed(2)}x)
								</p>
							) : null}
						</div>
					)
				) : null}

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
						setModalOpen(0)
						dialogStore.toggle()
					}}
				/>
			</div>
		</>
	)
}

const compareTypes = [
	{ label: 'Mcap', value: 'mcap' },
	{ label: 'FDV', value: 'fdv' },
	{ label: 'TVL', value: 'tvl' },
	{ label: 'Volume', value: 'volume' },
	{ label: 'Revenue', value: 'revenue' },
	{ label: 'Fees', value: 'fees' }
]
