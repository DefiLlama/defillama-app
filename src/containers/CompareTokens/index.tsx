import React, { useMemo, useState } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { useRouter } from 'next/router'
import { CACHE_SERVER } from '~/constants'
import { LocalLoader } from '~/components/LocalLoader'
import { CoinsPicker } from '~/containers/Correlations'
import { useSelectState, Select, SelectItem, SelectPopover, SelectArrow } from 'ariakit/select'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { useDialogState } from 'ariakit'

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
							fetch(`https://coins.llama.fi/prices/current/${coins.map((c) => 'coingecko:' + c).join(',')}`).then(
								(res) => res.json()
							),
							fetch(`${CACHE_SERVER}/supply/${coins[0]}`).then((res) => res.json()),
							fetch(`${CACHE_SERVER}/supply/${coins[1]}`).then((res) => res.json())
						])
				: () => null,
		staleTime: 60 * 60 * 1000
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

	const selectState = useSelectState({ gutter: 8 })

	const dialogState = useDialogState()

	return (
		<>
			<h1 className="text-2xl font-medium mt-2 text-center w-full max-w-sm mx-auto relative lg:-left-[116px]">
				Compare Tokens
			</h1>
			<div className="flex flex-col items-center gap-2 w-full max-w-sm mx-auto relative lg:-left-[116px]">
				<div className="flex flex-col sm:flex-row sm:items-center gap-4">
					<div className="relative w-full sm:max-w-[280px]">
						{selectedCoins[0] ? (
							<img
								alt={''}
								src={selectedCoins[0].image}
								height={16}
								width={16}
								loading="lazy"
								onError={(e) => {
									e.currentTarget.src = '/placeholder.png'
								}}
								className="inline-block object-cover aspect-square rounded-full flex-shrink-0 bg-[var(--bg3)] absolute top-0 bottom-0 my-auto left-2"
							/>
						) : (
							<Icon
								name="search"
								height={16}
								width={16}
								className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
							/>
						)}
						<input
							value={selectedCoins[0]?.name}
							onClick={() => {
								setModalOpen(1)
								dialogState.toggle()
							}}
							placeholder="Search coins..."
							className="border border-black/10 dark:border-white/10 w-full py-[6px] px-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-base"
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
						className="p-1 flex items-center justify-center flex-shrink-0"
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
									e.currentTarget.src = '/placeholder.png'
								}}
								className="inline-block object-cover aspect-square rounded-full flex-shrink-0 bg-[var(--bg3)] absolute top-0 bottom-0 my-auto left-2"
							/>
						) : (
							<Icon
								name="search"
								height={16}
								width={16}
								className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
							/>
						)}
						<input
							value={selectedCoins[1]?.name}
							onClick={() => {
								setModalOpen(2)
								dialogState.toggle()
							}}
							placeholder="Search coins..."
							className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-base"
						/>
					</div>
				</div>
				<Select
					state={selectState}
					className="bg-[var(--btn2-bg)] hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] flex-nowrap relative w-full"
				>
					<span>{compareType?.label}</span>
					<SelectArrow />
				</Select>
				<SelectPopover
					state={selectState}
					composite={false}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					{compareTypes.map((item) => {
						return (
							<SelectItem
								as="button"
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
								className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
							>
								{item.label}
							</SelectItem>
						)
					})}
				</SelectPopover>
				{coins.length === 2 ? (
					fdvData === null ? (
						<div className="flex items-center justify-center m-auto min-h-[360px]">
							<LocalLoader />
						</div>
					) : (
						<div className="flex flex-col gap-2 items-center mt-10">
							<h2 className="flex flex-wrap items-center justify-center gap-1 font-normal text-base">
								<span className="flex items-center gap-1">
									<img
										alt={''}
										src={selectedCoins[0].image}
										height={'20px'}
										width={'20px'}
										loading="lazy"
										onError={(e) => {
											e.currentTarget.src = '/placeholder.png'
										}}
										className="inline-block object-cover aspect-square rounded-full flex-shrink-0 bg-[var(--bg3)]"
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
											e.currentTarget.src = '/placeholder.png'
										}}
										className="inline-block object-cover aspect-square rounded-full flex-shrink-0 bg-[var(--bg3)]"
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
					dialogState={dialogState}
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
						dialogState.toggle()
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
