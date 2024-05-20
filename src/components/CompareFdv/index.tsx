import { TYPE } from '~/Theme'
import React, { useState, useMemo } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { Body } from '../Correlations/styles'
import { useRouter } from 'next/router'
import { CoinsPicker } from '../Correlations'
import { SearchIcon, TableFilters } from '~/containers/Hacks'
import useSWR from 'swr'
import { CACHE_SERVER } from '~/constants'
import { Loader } from 'react-feather'
import LocalLoader from '../LocalLoader'

export default function CompareFdv({ coinsData }) {
	const router = useRouter()
	const queryCoins = router.query?.coin || ([] as Array<string>)
	const [isModalOpen, setModalOpen] = useState(0)
	const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]
	const selectedCoins = useMemo<IResponseCGMarketsAPI[]>(
		() => (queryCoins && coins.map((coin) => coinsData.find((c) => c.id === coin))) || [],
		[queryCoins]
	)
	const { data: fdvData = null, error: fdvError } = useSWR(
		`fdv-${coins.join('-')}`,
		coins.length == 2
			? () =>
					Promise.all([
						fetch(`https://coins.llama.fi/prices/current/${coins.map((c) => 'coingecko:' + c).join(',')}`).then((res) =>
							res.json()
						),
						fetch(`${CACHE_SERVER}/supply/${coins[0]}`).then((res) => res.json()),
						fetch(`${CACHE_SERVER}/supply/${coins[1]}`).then((res) => res.json())
					])
			: () => null
	)

	let newPrice, increase
	if (fdvData !== null) {
		let coinPrices = coins.map((c) => fdvData[0].coins['coingecko:' + c].price)
		let fdvs = [fdvData[1], fdvData[2]].map((f) => Number(f.data.total_supply))
		newPrice = (coinPrices[1] * fdvs[1]) / fdvs[0]
		increase = newPrice / coinPrices[0]
		console.log(coinPrices, fdvs, fdvData)
	}

	return (
		<>
			<TYPE.largeHeader>FDV Comparison</TYPE.largeHeader>
			<Body style={{ display: 'block' }}>
				<div style={{ display: 'flex' }}>
					<TableFilters>
						<SearchIcon size={16} />

						<input value={selectedCoins[0]?.name} onClick={() => setModalOpen(1)} placeholder="Search coins..." />
					</TableFilters>
					<TableFilters style={{ marginLeft: '10em' }}>
						<SearchIcon size={16} />

						<input value={selectedCoins[1]?.name} onClick={() => setModalOpen(2)} placeholder="Search coins..." />
					</TableFilters>
				</div>
				{coins.length === 2 ? (
					fdvData === null ? (
						<LocalLoader />
					) : (
						<p style={{ textAlign: 'center', marginTop: '5em' }}>
							<TYPE.main>
								{selectedCoins[0].symbol.toUpperCase()} WITH THE FDV OF {selectedCoins[1].symbol.toUpperCase()}
							</TYPE.main>
							<TYPE.largeHeader>
								$
								{newPrice.toLocaleString(
									undefined, // leave undefined to use the visitor's browser
									// locale or a string like 'en-US' to override it.
									{ maximumFractionDigits: 2 }
								)}{' '}
								({increase.toFixed(2)}x)
							</TYPE.largeHeader>
						</p>
					)
				) : null}
				<CoinsPicker
					coinsData={coinsData}
					isModalOpen={isModalOpen}
					setModalOpen={setModalOpen}
					selectedCoins={{}}
					queryCoins={queryCoins}
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
			</Body>
		</>
	)
}
