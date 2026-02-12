import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import { fetchCoinPrices } from '~/api'
import type { IResponseCGMarketsAPI } from '~/api/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { CACHE_SERVER } from '~/constants'
import { CoinsPicker } from '~/containers/Correlations'
import { fetchJson } from '~/utils/async'

const EMPTY_SELECTED_COINS: Record<string, IResponseCGMarketsAPI> = {}

type Protocol = { geckoId?: string; name: string; tvl?: number; fees?: number; revenue?: number }

type CompareType = { label: string; value: string }

const compareTypes: CompareType[] = [
	{ label: 'Mcap', value: 'mcap' },
	{ label: 'FDV', value: 'fdv' },
	{ label: 'TVL', value: 'tvl' },
	{ label: 'Volume', value: 'volume' },
	{ label: 'Revenue', value: 'revenue' },
	{ label: 'Fees', value: 'fees' }
]

type SupplyResponse = { data: { total_supply: string | number } }

function getCompareValues(
	type: string,
	coin0: IResponseCGMarketsAPI,
	coin1: IResponseCGMarketsAPI,
	fdvData: [{ coins: Record<string, { price: number }> }, SupplyResponse, SupplyResponse],
	protocolsByGeckoId: Map<string, Protocol>,
	protocolsByName: Map<string, Protocol>
): [number | null, number | null] {
	const p0 = protocolsByGeckoId.get(coin0.id) ?? protocolsByName.get(coin0.name)
	const p1 = protocolsByGeckoId.get(coin1.id) ?? protocolsByName.get(coin1.name)

	switch (type) {
		case 'mcap':
			return [coin0.market_cap ?? null, coin1.market_cap ?? null]
		case 'fdv':
			return [Number(fdvData[1].data.total_supply), Number(fdvData[2].data.total_supply)]
		case 'volume':
			return [coin0.total_volume ?? null, coin1.total_volume ?? null]
		case 'tvl':
			return [p0?.tvl ?? null, p1?.tvl ?? null]
		case 'fees':
			return [p0?.fees ?? null, p1?.fees ?? null]
		case 'revenue':
			return [p0?.revenue ?? null, p1?.revenue ?? null]
		default:
			return [null, null]
	}
}

function computeComparison(
	compareType: CompareType,
	selectedCoins: Array<IResponseCGMarketsAPI | undefined>,
	coinPrices: number[],
	fdvData: [{ coins: Record<string, { price: number }> }, SupplyResponse, SupplyResponse],
	protocolsByGeckoId: Map<string, Protocol>,
	protocolsByName: Map<string, Protocol>
): { newPrice: number; increase: number } | null {
	const coin0 = selectedCoins[0]
	const coin1 = selectedCoins[1]
	if (!coin0 || !coin1) return null

	const [val0, val1] = getCompareValues(compareType.value, coin0, coin1, fdvData, protocolsByGeckoId, protocolsByName)
	if (val0 == null || val1 == null || val0 === 0) return null

	const newPrice = (coinPrices[1] * val1) / val0
	return { newPrice, increase: newPrice / coinPrices[0] }
}

export function CompareTokens({
	coinsData,
	protocols
}: {
	coinsData: IResponseCGMarketsAPI[]
	protocols: Protocol[]
}) {
	const router = useRouter()
	const [isModalOpen, setModalOpen] = useState(0)
	const coinParam = router.query?.coin
	const typeParam = router.query?.type

	const coinsDataById = useMemo(
		() => new Map<string, IResponseCGMarketsAPI>(coinsData.map((c) => [c.id, c])),
		[coinsData]
	)
	const protocolsByGeckoId = useMemo(
		() =>
			new Map<string, Protocol>(
				protocols.flatMap((p) => (p.geckoId ? [[p.geckoId, p] as const] : []))
			),
		[protocols]
	)
	const protocolsByName = useMemo(
		() => new Map<string, Protocol>(protocols.map((p) => [p.name, p])),
		[protocols]
	)

	const { selectedCoins, coins, compareType } = useMemo(() => {
		const queryCoins = coinParam ?? ([] as string[])

		const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]

		const compareType = compareTypes.find((type) => type.value === (typeParam ?? 'fdv')) ?? {
			label: 'FDV',
			value: 'fdv'
		}
		return {
			selectedCoins: coins.map((coin) => coinsDataById.get(coin)),
			coins,
			compareType
		}
	}, [coinParam, typeParam, coinsDataById])

	const { data: fdvData = null } = useQuery({
		queryKey: [`fdv-${coins.join('-')}`],
		queryFn:
			coins.length === 2
				? () =>
						Promise.all([
							fetchCoinPrices(coins.map((c) => `coingecko:${c}`)).then((coins) => ({ coins })),
							fetchJson<SupplyResponse>(`${CACHE_SERVER}/supply/${coins[0]}`),
							fetchJson<SupplyResponse>(`${CACHE_SERVER}/supply/${coins[1]}`)
						])
				: () => null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const comparison = useMemo(() => {
		if (fdvData == null || coins.length !== 2) return null
		const coinPrices = coins.map((c) => fdvData[0].coins[`coingecko:${c}`].price)
		return computeComparison(
			compareType,
			selectedCoins,
			coinPrices,
			fdvData as [{ coins: Record<string, { price: number }> }, SupplyResponse, SupplyResponse],
			protocolsByGeckoId,
			protocolsByName
		)
	}, [fdvData, coins, compareType, selectedCoins, protocolsByGeckoId, protocolsByName])

	const dialogStore = Ariakit.useDialogStore()

	return (
		<>
			<h1 className="relative mx-auto mt-2 w-full max-w-sm text-center text-xl font-semibold lg:-left-[116px]">
				Compare Tokens
			</h1>
			<div className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-2 lg:-left-[116px]">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="relative w-full sm:max-w-[280px]">
						{selectedCoins[0] != null ? (
							<img
								alt={''}
								src={selectedCoins[0].image}
								height={16}
								width={16}
								loading="lazy"
								onError={(e) => {
									const img = e.currentTarget
									img.onerror = null
									img.src = '/assets/placeholder.png'
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
							value={selectedCoins[0]?.name ?? ''}
							onClick={() => {
								setModalOpen(1)
								dialogStore.toggle()
							}}
							readOnly
							placeholder="Search coins..."
							className="min-h-8 w-full rounded-md border border-(--form-control-border) bg-white px-2 py-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</div>
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
					<div className="relative w-full sm:max-w-[280px]">
						{selectedCoins[1] != null ? (
							<img
								alt={''}
								src={selectedCoins[1].image}
								height={16}
								width={16}
								loading="lazy"
								onError={(e) => {
									const img = e.currentTarget
									img.onerror = null
									img.src = '/assets/placeholder.png'
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
							value={selectedCoins[1]?.name ?? ''}
							onClick={() => {
								setModalOpen(2)
								dialogStore.toggle()
							}}
							readOnly
							placeholder="Search coins..."
							className="min-h-8 w-full rounded-md border border-(--form-control-border) bg-white px-2 py-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</div>
				</div>
				<Ariakit.MenuProvider>
					<Ariakit.MenuButton className="relative flex w-full cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md bg-(--btn2-bg) px-3 py-2 text-(--text-primary) hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)">
						<span>{compareType.label}</span>
						<Ariakit.MenuButtonArrow />
					</Ariakit.MenuButton>
					<Ariakit.Menu
						unmountOnHide
						hideOnInteractOutside
						sameWidth
						className="z-10 flex thin-scrollbar max-h-[60dvh] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:drawer max-sm:rounded-b-none dark:border-[hsl(204,3%,32%)]"
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
					fdvData == null ? (
						<div className="m-auto flex min-h-[360px] items-center justify-center">
							<LocalLoader />
						</div>
					) : (
						<div className="mt-10 flex flex-col items-center gap-2">
							<h2 className="flex flex-wrap items-center justify-center gap-1 text-base font-normal">
								<span className="flex items-center gap-1">
									<img
										alt={''}
										src={selectedCoins[0]?.image}
										height={'20px'}
										width={'20px'}
										loading="lazy"
										onError={(e) => {
											e.currentTarget.src = '/assets/placeholder.png'
										}}
										className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
									/>
									<span>{selectedCoins[0]?.symbol?.toUpperCase()}</span>
								</span>
								<span>WITH THE {compareType.label.toUpperCase()} OF</span>
								<span className="flex items-center gap-1">
									<img
										alt={''}
										src={selectedCoins[1]?.image}
										height={'20px'}
										width={'20px'}
										loading="lazy"
										onError={(e) => {
											e.currentTarget.src = '/assets/placeholder.png'
										}}
										className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover"
									/>
									<span>{selectedCoins[1]?.symbol?.toUpperCase()}</span>
								</span>
							</h2>

							{comparison != null ? (
								<p className="text-lg font-bold">
									$
									{comparison.newPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
									({comparison.increase.toFixed(2)}x)
								</p>
							) : null}
						</div>
					)
				) : null}

				<CoinsPicker
					coinsData={coinsData}
					dialogStore={dialogStore}
					selectedCoins={EMPTY_SELECTED_COINS}
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
