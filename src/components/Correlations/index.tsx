import { X as XIcon } from 'react-feather'
import { TYPE } from '~/Theme'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { useQueries, useQuery } from 'react-query'
import {
	Body,
	ButtonCell,
	Cell,
	CloseButton,
	HeaderCell,
	ModalContent,
	ModalWrapper,
	Row,
	SearchRow,
	SelectedBody,
	Table,
	Image
} from './styles'
import { Switch, Wrapper } from '../LiquidationsPage/TableSwitch'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRouter } from 'next/router'

const usePriceCharts = (geckoIds, period) => {
	const data = useQueries<any>(
		geckoIds.map((id) => ({
			queryKey: ['price_chart', id, period],
			queryFn: () =>
				fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${period}`).then((r) =>
					r.json()
				),
			staleTime: Infinity,
			cacheTime: Infinity
		}))
	)
	return {
		data: Object.fromEntries(data.map((res, i) => [geckoIds[i], res.data?.prices?.map((price) => price[1]) || []])),
		isLoading: data.find((res: any) => res.isLoading)
	}
}

function pearsonCorrelationCoefficient(array1: number[], array2: number[]) {
	const n = array1.length
	let sum1 = 0
	let sum2 = 0
	let sum1Sq = 0
	let sum2Sq = 0
	let pSum = 0

	for (let i = 0; i < n; i++) {
		sum1 += array1[i]
		sum2 += array2[i]
		sum1Sq += array1[i] ** 2
		sum2Sq += array2[i] ** 2
		pSum += array1[i] * array2[i]
	}

	const num = pSum - (sum1 * sum2) / n
	const den = Math.sqrt((sum1Sq - sum1 ** 2 / n) * (sum2Sq - sum2 ** 2 / n))

	if (den === 0) {
		return 0
	}

	return (num / den).toFixed(2)
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
	const parentRef = useRef()
	const [search, setSearch] = useState('')
	const [period, setPeriod] = useState(365)
	const { data: priceChart, isLoading } = usePriceCharts(Object.keys(selectedCoins), period)
	const coins = Object.values(selectedCoins).filter(Boolean)
	const correlations = !isLoading
		? Object.fromEntries(
				coins.map((coin0) => {
					const results = coins.map((coin1) => {
						if (coin1.id === coin0.id) return null
						const corr = pearsonCorrelationCoefficient(priceChart[coin0.id], priceChart[coin1.id])
						return corr
					})
					return [coin0.id, results]
				})
		  )
		: []
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

	const [isModalOpen, setModalOpen] = useState(false)

	return (
		<>
			<TYPE.largeHeader>Correlations Matrix</TYPE.largeHeader>

			<Wrapper style={{ position: 'fixed', left: '50%' }}>
				<Switch onClick={() => setPeriod(7)} active={period === 7}>
					7d
				</Switch>
				<Switch onClick={() => setPeriod(30)} active={period === 30}>
					1m
				</Switch>
				<Switch onClick={() => setPeriod(365)} active={period === 365}>
					1y
				</Switch>
			</Wrapper>
			<Body>
				<SelectedBody>
					<TYPE.heading>Selected Coins</TYPE.heading>
					{Object.values(selectedCoins).map((coin) =>
						coin ? (
							<SearchRow
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
							>
								<Image
									alt={''}
									src={coin.image}
									height={'24px'}
									width={'24px'}
									loading="lazy"
									onError={(e) => {
										e.currentTarget.src = '/placeholder.png'
									}}
								/>
								<TYPE.body>{coin.symbol.toUpperCase()}</TYPE.body>
								<XIcon size={14} />
							</SearchRow>
						) : null
					)}
				</SelectedBody>
				<Table>
					<thead>
						<th />
						{coins.map((coin) => (
							<HeaderCell key={coin.id}>{coin?.symbol?.toUpperCase()}</HeaderCell>
						))}
						<ButtonCell onClick={() => setModalOpen(true)}>+</ButtonCell>
					</thead>
					<tbody>
						{coins.map((coin, i) => (
							<Row key={coin.id + i}>
								<HeaderCell>{coin?.symbol?.toUpperCase()}</HeaderCell>
								{correlations[coin.id]?.map((corr) =>
									corr === null ? (
										<Image
											alt={''}
											src={coin.image}
											height={'24px'}
											width={'24px'}
											style={{ marginTop: '13px' }}
											loading="lazy"
											onError={(e) => {
												e.currentTarget.src = '/placeholder.png'
											}}
										/>
									) : (
										<Cell value={Number(corr)} key={corr + coin.id}>
											{corr}
										</Cell>
									)
								)}
							</Row>
						))}
						<Row>
							<ButtonCell onClick={() => setModalOpen(true)}>+</ButtonCell>
						</Row>
					</tbody>
				</Table>
				<ModalWrapper open={isModalOpen} onClick={() => setModalOpen(false)}>
					<ModalContent onClick={(e) => e.stopPropagation()}>
						<CloseButton onClick={() => setModalOpen(false)}>
							<XIcon size={24} />
						</CloseButton>
						<input
							value={search}
							onChange={(e) => {
								setSearch(e.target?.value)
							}}
							placeholder={'Search token...'}
							style={{ height: '36px' }}
							autoFocus
						/>
						<div
							ref={parentRef}
							style={{
								height: 400,
								width: 400,
								overflowY: 'auto',
								contain: 'strict'
							}}
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
										<SearchRow
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												height: `${virtualItem.size}px`,
												transform: `translateY(${virtualItem.start}px)`
											}}
											key={virtualItem.key}
											onClick={() =>
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
											}
										>
											<Image
												alt={''}
												src={coin.image}
												height={'24px'}
												width={'24px'}
												loading="lazy"
												onError={(e) => {
													e.currentTarget.src = '/placeholder.png'
												}}
											/>
											<TYPE.body>
												{coin.name}({coin.symbol.toUpperCase()})
											</TYPE.body>
										</SearchRow>
									)
								})}
							</div>
						</div>
					</ModalContent>
				</ModalWrapper>
			</Body>
		</>
	)
}
