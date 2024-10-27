import React, { useMemo, useState } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { useRouter } from 'next/router'
import { CACHE_SERVER } from '~/constants'
import { LocalLoader } from '~/components/LocalLoader'
import styled from 'styled-components'
import { CoinsPicker } from '../Correlations'
import { Button, Popover, Item } from '~/components/DropdownMenu'
import { MenuButtonArrow, useMenuState } from 'ariakit'
import { useQuery } from '@tanstack/react-query'
import { SearchIcon } from '../Table/shared'
import { Icon } from '~/components/Icon'

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

	const menu = useMenuState({ gutter: 8, animated: true })

	return (
		<>
			<h1 className="text-2xl font-medium mt-2">Compare Tokens</h1>
			<Wrapper>
				<SelectWrapper>
					<TableFilters>
						<SearchIcon />

						<input value={selectedCoins[0]?.name} onClick={() => setModalOpen(1)} placeholder="Search coins..." />
					</TableFilters>
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
					<Switch
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
					>
						<Icon name="repeat" height={16} width={16} />
					</Switch>
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
					<TableFilters>
						<SearchIcon />

						<input value={selectedCoins[1]?.name} onClick={() => setModalOpen(2)} placeholder="Search coins..." />
					</TableFilters>
					<Trigger state={menu}>
						<span>{compareType?.label}</span>
						<MenuButtonArrow />
					</Trigger>
					<Popover state={menu} composite={false}>
						{compareTypes.map((item) => {
							return (
								<Item
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
								>
									{item.label}
								</Item>
							)
						})}
					</Popover>
				</SelectWrapper>
				{coins.length === 2 ? (
					fdvData === null ? (
						<div className="flex items-center justify-center m-auto min-h-[360px]">
							<LocalLoader />
						</div>
					) : (
						<Wrapper2>
							<Header>
								<ImageWrapper>
									<Image
										alt={''}
										src={selectedCoins[0].image}
										height={'20px'}
										width={'20px'}
										loading="lazy"
										onError={(e) => {
											e.currentTarget.src = '/placeholder.png'
										}}
									/>
									<span>{selectedCoins[0].symbol.toUpperCase()}</span>
								</ImageWrapper>
								<span>WITH THE {compareType.label.toUpperCase()} OF</span>
								<ImageWrapper>
									<Image
										alt={''}
										src={selectedCoins[1].image}
										height={'20px'}
										width={'20px'}
										loading="lazy"
										onError={(e) => {
											e.currentTarget.src = '/placeholder.png'
										}}
									/>
									<span>{selectedCoins[1].symbol.toUpperCase()}</span>
								</ImageWrapper>
							</Header>

							{newPrice !== undefined && increase !== undefined ? (
								<p className="text-base font-medium">
									$
									{newPrice.toLocaleString(
										undefined, // leave undefined to use the visitor's browser
										// locale or a string like 'en-US' to override it.
										{ maximumFractionDigits: 2 }
									)}{' '}
									({increase.toFixed(2)}x)
								</p>
							) : null}
						</Wrapper2>
					)
				) : null}

				<CoinsPicker
					coinsData={coinsData}
					isModalOpen={isModalOpen}
					setModalOpen={setModalOpen}
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
					}}
				/>
			</Wrapper>
		</>
	)
}

const SelectWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;

	& > span {
		min-width: min(90vw, 300px);
		width: 100%;
		white-space: nowrap;
	}

	@media (min-width: ${({ theme }) => theme.bpMed}) {
		flex-direction: row;
		gap: 36px;
	}
`

const TableFilters = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	position: relative;

	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		input {
			max-width: 400px;
		}
	}
`

const Trigger = styled(Button)`
	border-radius: 8px;
	min-width: 120px;
`

const Switch = styled.button`
	padding: 4px;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-shrink: 0;
`

const Image = styled.img`
	display: inline-block;
	object-fit: cover;
	aspect-ratio: 1;
	background: ${({ theme }) => theme.bg3};
	border-radius: 50%;
	flex-shrink: 0;
`

const ImageWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 4px;
`

const Header = styled.h2`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 4px;
	font-weight: 400;
	font-size: 14px;
`

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 80px;
`

const Wrapper2 = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
`

// const Option = (props) => {
// 	return (
// 		<components.Option {...props}>
// 			<Image
// 				alt={''}
// 				src={props.data.image}
// 				height={'20px'}
// 				width={'20px'}
// 				loading="lazy"
// 				onError={(e) => {
// 					e.currentTarget.src = '/placeholder.png'
// 				}}
// 			/>
// 			<span>{props.children}</span>
// 		</components.Option>
// 	)
// }

// const SingleValue = (props) => {
// 	return (
// 		<components.SingleValue {...props}>
// 			<Image
// 				alt={''}
// 				src={props.data.image}
// 				height={'20px'}
// 				width={'20px'}
// 				loading="lazy"
// 				onError={(e) => {
// 					e.currentTarget.src = '/placeholder.png'
// 				}}
// 			/>
// 			<span>{props.children}</span>
// 		</components.SingleValue>
// 	)
// }

// const Menu = (props) => {
// 	// console.log({ props })
// 	// const rowVirtualizer = useVirtualizer({
// 	// 	count: props.option.length,
// 	// 	getScrollElement: () => props.innerRef.current,
// 	// 	estimateSize: () => 50
// 	// })
// 	return <components.Menu {...props} />
// }

// mcap
// fdv
// tvl
// volume
// revenue
// fees

const compareTypes = [
	{ label: 'Mcap', value: 'mcap' },
	{ label: 'FDV', value: 'fdv' },
	{ label: 'TVL', value: 'tvl' },
	{ label: 'Volume', value: 'volume' },
	{ label: 'Revenue', value: 'revenue' },
	{ label: 'Fees', value: 'fees' }
]
