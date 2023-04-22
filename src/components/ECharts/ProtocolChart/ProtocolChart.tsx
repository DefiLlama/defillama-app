import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import {
	useDenominationPriceHistory,
	useFetchProtocolActiveUsers,
	useFetchProtocolGasUsed,
	useFetchProtocolTransactions
} from '~/api/categories/protocols/client'
import { useDefiManager } from '~/contexts/LocalStorage'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import type { IChartProps } from '../types'
import { nearestUtc } from '~/utils'
import { useGetOverviewChartData } from '~/containers/DexsAndFees/charts/hooks'
import useSWR from 'swr'
import { LazyChart } from '~/layout/ProtocolAndPool'

const AreaChart = dynamic(() => import('.'), {
	ssr: false
}) as React.FC<IChartProps>

interface IProps {
	protocol: string
	color: string
	historicalChainTvls: {}
	chains: Array<string> | null
	bobo?: boolean
	hallmarks?: Array<[number, string]>
	geckoId?: string | null
	chartColors: { [type: string]: string }
	metrics: { [metric: string]: boolean }
	emissions?: Array<{
		[label: string]: number
	}>
	unlockTokenSymbol?: string
	activeUsersId: number | string | null
}

export default function ProtocolChart({
	protocol,
	color,
	historicalChainTvls,
	chains = [],
	bobo = false,
	hallmarks,
	geckoId,
	chartColors,
	metrics,
	emissions,
	unlockTokenSymbol,
	activeUsersId
}: IProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useDefiManager()

	const {
		denomination,
		tvl,
		mcap,
		tokenPrice,
		fdv,
		volume,
		fees,
		revenue,
		unlocks,
		activeUsers,
		events,
		transactions,
		gasUsed,
		staking,
		borrowed
	} = router.query

	const DENOMINATIONS = React.useMemo(() => {
		if (chains && chains.length > 0) {
			let d = [{ symbol: 'USD', geckoId: null }]

			if (chainCoingeckoIds[chains[0]]?.geckoId) {
				d.push(chainCoingeckoIds[chains[0]])
			} else {
				d.push(chainCoingeckoIds['Ethereum'])
			}

			return d
		}

		return []
	}, [chains])

	// fetch denomination on protocol chains
	const { data: denominationHistory, loading: denominationLoading } = useDenominationPriceHistory(
		router.isReady && denomination ? DENOMINATIONS.find((d) => d.symbol === denomination)?.geckoId : null
	)

	// fetch protocol mcap data
	const { data: protocolCGData, loading } = useDenominationPriceHistory(
		router.isReady && (mcap === 'true' || tokenPrice === 'true' || fdv === 'true') ? geckoId : null
	)

	const { data: fdvData = null, error: fdvError } = useSWR(
		`fdv-${geckoId}-${fdv}-${router.isReady}`,
		geckoId && fdv === 'true' && router.isReady
			? () =>
					fetch(
						`https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
					).then((res) => res.json())
			: () => null
	)

	const fetchingFdv = router.isReady && fdv === 'true' && !fdvData && fdvData !== null && !fdvError

	const { data: feesAndRevenue, loading: fetchingFees } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'fees',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: router.isReady && (fees === 'true' || revenue === 'true') && metrics.fees ? false : true
	})

	const { data: users, loading: fetchingActiveUsers } = useFetchProtocolActiveUsers(
		router.isReady && activeUsers === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: transactionsData, loading: fetchingTransactions } = useFetchProtocolTransactions(
		router.isReady && transactions === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: gasData, loading: fetchingGasUsed } = useFetchProtocolGasUsed(
		router.isReady && gasUsed === 'true' && activeUsersId ? activeUsersId : null
	)

	const { data: volumeData, loading: fetchingVolume } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'dexs',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: router.isReady && volume === 'true' && metrics.dexs ? false : true
	})

	// update tvl calc based on extra tvl options like staking, pool2 selected
	const tvlData = React.useMemo(() => {
		return formatProtocolsTvlChartData({ historicalChainTvls, extraTvlEnabled })
	}, [historicalChainTvls, extraTvlEnabled])

	const showNonUsdDenomination =
		denomination &&
		denomination !== 'USD' &&
		DENOMINATIONS.find((d) => d.symbol === denomination) &&
		denominationHistory?.prices?.length > 0
			? true
			: false

	let valueSymbol = '$'
	if (showNonUsdDenomination) {
		const d = DENOMINATIONS.find((d) => d.symbol === denomination)

		valueSymbol = d.symbol || ''
	}

	// console.log({ denominationHistory, protocolCGData, tvlData, fdvData, feesAndRevenue, users, volumeData })

	const { finalData, tokensUnique } = React.useMemo(() => {
		if (!router.isReady) {
			return { finalData: [], tokensUnique: [] }
		}
		const tokensUnique = []

		const chartData = {}

		const isHourlyTvl = tvlData.length > 2 ? +tvlData[1][0] - +tvlData[0][0] < 80_000 : true

		if (tvlData.length > 0 && tvl !== 'false') {
			tokensUnique.push('TVL')

			let prevDate = null

			tvlData.forEach(([dateS, TVL]) => {
				const date = isHourlyTvl ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (prevDate && +date - prevDate > 86400) {
					const noOfDatesMissing = Math.floor((+date - prevDate) / 86400)

					for (let i = 1; i < noOfDatesMissing + 1; i++) {
						const missingDate = prevDate + 86400 * i

						if (!chartData[missingDate]) {
							chartData[missingDate] = {}
						}

						const missingTvl =
							((chartData[prevDate]?.['TVL'] ?? 0) +
								(showNonUsdDenomination ? TVL / getPriceAtDate(dateS, denominationHistory.prices) : TVL)) /
							2

						chartData[missingDate] = {
							...chartData[missingDate],
							TVL: missingTvl
						}
					}
				}

				prevDate = date

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					TVL: showNonUsdDenomination ? TVL / getPriceAtDate(dateS, denominationHistory.prices) : TVL
				}
			})
		}

		if (staking === 'true' && historicalChainTvls['staking']?.tvl?.length > 0) {
			tokensUnique.push('Staking')

			let prevDate = null

			historicalChainTvls['staking'].tvl.forEach(({ date: dateS, totalLiquidityUSD }) => {
				const date = isHourlyTvl ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (prevDate && +date - prevDate > 86400) {
					const noOfDatesMissing = Math.floor((+date - prevDate) / 86400)

					for (let i = 1; i < noOfDatesMissing + 1; i++) {
						const missingDate = prevDate + 86400 * i

						if (!chartData[missingDate]) {
							chartData[missingDate] = {}
						}

						const missingStakedTvl =
							((chartData[prevDate]?.['Staking'] ?? 0) +
								(showNonUsdDenomination
									? totalLiquidityUSD / getPriceAtDate(dateS, denominationHistory.prices)
									: totalLiquidityUSD)) /
							2

						chartData[missingDate] = {
							...chartData[missingDate],
							Staking: missingStakedTvl
						}
					}
				}

				prevDate = date

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					Staking: showNonUsdDenomination
						? totalLiquidityUSD / getPriceAtDate(dateS, denominationHistory.prices)
						: totalLiquidityUSD
				}
			})
		}

		if (borrowed === 'true' && historicalChainTvls['borrowed']?.tvl?.length > 0) {
			tokensUnique.push('Borrowed')

			let prevDate = null

			historicalChainTvls['borrowed'].tvl.forEach(({ date: dateS, totalLiquidityUSD }) => {
				const date = isHourlyTvl ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (prevDate && +date - prevDate > 86400) {
					const noOfDatesMissing = Math.floor((+date - prevDate) / 86400)

					for (let i = 1; i < noOfDatesMissing + 1; i++) {
						const missingDate = prevDate + 86400 * i

						if (!chartData[missingDate]) {
							chartData[missingDate] = {}
						}

						const missingBorrowedTvl =
							((chartData[prevDate]?.['Borrowed'] ?? 0) +
								(showNonUsdDenomination
									? totalLiquidityUSD / getPriceAtDate(dateS, denominationHistory.prices)
									: totalLiquidityUSD)) /
							2

						chartData[missingDate] = {
							...chartData[missingDate],
							Borrowed: missingBorrowedTvl
						}
					}
				}

				prevDate = date

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					Borrowed: showNonUsdDenomination
						? totalLiquidityUSD / getPriceAtDate(dateS, denominationHistory.prices)
						: totalLiquidityUSD
				}
			})
		}

		if (geckoId && protocolCGData) {
			if (mcap === 'true') {
				tokensUnique.push('Mcap')

				protocolCGData['market_caps'].forEach(([dateMs, Mcap]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}

					chartData[date] = {
						...chartData[date],
						Mcap: showNonUsdDenomination ? Mcap / getPriceAtDate(date, denominationHistory.prices) : Mcap
					}
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['market_caps'].length > 0 &&
					protocolCGData['market_caps'][protocolCGData['market_caps'].length - 1][0] <
						+tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyTvl
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const Mcap = protocolCGData['market_caps'][protocolCGData['market_caps'].length - 1][1]

					chartData[date] = {
						...chartData[date],
						Mcap: showNonUsdDenomination ? Mcap / getPriceAtDate(date, denominationHistory.prices) : Mcap
					}
				}
			}

			if (tokenPrice === 'true') {
				tokensUnique.push('Token Price')

				protocolCGData['prices'].forEach(([dateMs, price]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}

					chartData[date] = {
						...chartData[date],
						'Token Price': showNonUsdDenomination ? price / getPriceAtDate(date, denominationHistory.prices) : price
					}
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['prices'].length > 0 &&
					protocolCGData['prices'][protocolCGData['prices'].length - 1][0] < +tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyTvl
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenPrice = protocolCGData['prices'][protocolCGData['prices'].length - 1][1]

					chartData[date] = {
						...chartData[date],
						'Token Price': showNonUsdDenomination
							? tokenPrice / getPriceAtDate(date, denominationHistory.prices)
							: tokenPrice
					}
				}
			}

			if (fdv === 'true' && fdvData) {
				tokensUnique.push('FDV')

				const totalSupply = fdvData['market_data']['total_supply']

				protocolCGData['prices'].forEach(([dateMs, price]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}
					const fdv = totalSupply * price

					chartData[date] = {
						...chartData[date],
						FDV: showNonUsdDenomination ? fdv / getPriceAtDate(date, denominationHistory.prices) : fdv
					}
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['prices'].length > 0 &&
					protocolCGData['prices'][protocolCGData['prices'].length - 1][0] < +tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyTvl
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenPrice = protocolCGData['prices'][protocolCGData['prices'].length - 1][1]
					const fdv = totalSupply * tokenPrice

					chartData[date] = {
						...chartData[date],
						FDV: showNonUsdDenomination ? fdv / getPriceAtDate(date, denominationHistory.prices) : fdv
					}
				}
			}
		}

		if (volume === 'true' && volumeData) {
			tokensUnique.push('Volume')

			volumeData.forEach((item) => {
				const date = +item.date
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					Volume: showNonUsdDenomination ? +item.Dexs / getPriceAtDate(date, denominationHistory.prices) : item.Dexs
				}
			})
		}

		if (feesAndRevenue) {
			if (fees === 'true') {
				tokensUnique.push('Fees')
			}

			if (revenue === 'true') {
				tokensUnique.push('Revenue')
			}

			feesAndRevenue.forEach((item) => {
				const date = +item.date
				if (!chartData[date]) {
					chartData[date] = {}
				}

				if (fees === 'true') {
					chartData[date] = {
						...chartData[date],
						Fees: showNonUsdDenomination ? +item.Fees / getPriceAtDate(date, denominationHistory.prices) : item.Fees
					}
				}

				if (revenue === 'true') {
					chartData[date] = {
						...chartData[date],
						Revenue: showNonUsdDenomination
							? +item.Revenue / getPriceAtDate(date, denominationHistory.prices)
							: item.Revenue
					}
				}
			})
		}

		if (emissions && emissions.length > 0 && unlocks === 'true') {
			tokensUnique.push('Unlocks')
			emissions
				.filter((emission) => +emission.date * 1000 <= Date.now())
				.forEach((item) => {
					if (!chartData[item.date]) {
						chartData[item.date] = {}
					}

					let totalUnlocked = 0

					for (const label in item) {
						if (label !== 'date') {
							totalUnlocked += item[label]
						}
					}

					chartData[item.date] = {
						...chartData[item.date],
						Unlocks: totalUnlocked
					}
				})
		}

		if (activeUsers === 'true' && users) {
			tokensUnique.push('Active Users')

			users.forEach(([date, noOfUsers]) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					'Active Users': noOfUsers || 0
				}
			})
		}
		if (transactions === 'true' && transactionsData) {
			tokensUnique.push('Transactions')

			transactionsData.forEach(([date, noOfTxs]) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					Transactions: noOfTxs || 0
				}
			})
		}
		if (gasUsed === 'true' && gasData) {
			tokensUnique.push('Gas Used')

			gasData.forEach(([date, gasAmount]) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					'Gas Used': showNonUsdDenomination ? gasAmount / getPriceAtDate(date, denominationHistory.prices) : gasAmount
				}
			})
		}

		const finalData = Object.entries(chartData).map(([date, values]: [string, { [key: string]: number }]) => ({
			date,
			...values
		}))

		return {
			finalData,
			tokensUnique
		}
	}, [
		tvlData,
		protocolCGData,
		mcap,
		geckoId,
		volume,
		volumeData,
		tvl,
		showNonUsdDenomination,
		denominationHistory?.prices,
		feesAndRevenue,
		fees,
		revenue,
		router.isReady,
		unlocks,
		emissions,
		activeUsers,
		users,
		tokenPrice,
		fdv,
		fdvData,
		gasData,
		gasUsed,
		transactions,
		transactionsData,
		staking,
		borrowed,
		historicalChainTvls
	])

	const fetchingTypes = []

	if (denominationLoading) {
		fetchingTypes.push(denomination + ' price')
	}

	if (loading) {
		if (mcap === 'true') {
			fetchingTypes.push('mcap')
		}

		if (tokenPrice === 'true') {
			fetchingTypes.push('token price')
		}
	}

	if ((loading || fetchingFdv) && fdv === 'true') {
		fetchingTypes.push('fdv')
	}

	if (fetchingFees) {
		if (fees === 'true') {
			fetchingTypes.push('fees')
		}

		if (revenue === 'true') {
			fetchingTypes.push('revenue')
		}
	}

	if (fetchingVolume) {
		fetchingTypes.push('volume')
	}

	if (fetchingActiveUsers) {
		fetchingTypes.push('active users')
	}
	if (fetchingTransactions) {
		fetchingTypes.push('transactions')
	}
	if (fetchingGasUsed) {
		fetchingTypes.push('gas used')
	}

	const isLoading =
		loading || fetchingFdv || denominationLoading || fetchingFees || fetchingVolume || fetchingActiveUsers

	return (
		<Wrapper>
			{geckoId ||
			hallmarks?.length > 0 ||
			metrics?.fees ||
			metrics?.dexs ||
			emissions?.length > 0 ||
			activeUsersId ||
			historicalChainTvls['borrowed']?.tvl?.length > 0 ||
			historicalChainTvls['staking']?.tvl?.length > 0 ? (
				<ToggleWrapper>
					<Toggle backgroundColor={color}>
						<input
							type="checkbox"
							value="tvl"
							checked={tvl !== 'false'}
							onChange={() =>
								router.push(
									{
										pathname: router.pathname,
										query: { ...router.query, tvl: tvl === 'false' ? true : false }
									},
									undefined,
									{ shallow: true }
								)
							}
						/>
						<span data-wrapper="true">
							<span>TVL</span>
						</span>
					</Toggle>

					{geckoId && (
						<>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="mcap"
									checked={mcap === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, mcap: mcap === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Mcap</span>
								</span>
							</Toggle>

							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="tokenPrice"
									checked={tokenPrice === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, tokenPrice: tokenPrice === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Token Price</span>
								</span>
							</Toggle>

							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="fdv"
									checked={fdv === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, fdv: fdv === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>FDV</span>
								</span>
							</Toggle>
						</>
					)}

					{metrics.dexs && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="volume"
								checked={volume === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, volume: volume === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Volume</span>
							</span>
						</Toggle>
					)}

					{metrics.fees && (
						<>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="fees"
									checked={fees === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, fees: fees === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Fees</span>
								</span>
							</Toggle>

							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="revenue"
									checked={revenue === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, revenue: revenue === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Revenue</span>
								</span>
							</Toggle>
						</>
					)}

					{emissions?.length > 0 && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="unlocks"
								checked={unlocks === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, unlocks: unlocks === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Unlocks</span>
							</span>
						</Toggle>
					)}

					{activeUsersId && (
						<>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="activeUsers"
									checked={activeUsers === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, activeUsers: activeUsers === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Active Users</span>
								</span>
							</Toggle>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="transactions"
									checked={transactions === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, transactions: transactions === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Transactions</span>
								</span>
							</Toggle>
							<Toggle backgroundColor={color}>
								<input
									type="checkbox"
									value="gasUsed"
									checked={gasUsed === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, gasUsed: gasUsed === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>Gas Used</span>
								</span>
							</Toggle>
						</>
					)}

					{historicalChainTvls['staking']?.tvl?.length > 0 && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="staking"
								checked={staking === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, staking: staking === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Staking</span>
							</span>
						</Toggle>
					)}

					{historicalChainTvls['borrowed']?.tvl?.length > 0 && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="borrowed"
								checked={borrowed === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, borrowed: borrowed === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Borrowed</span>
							</span>
						</Toggle>
					)}

					{hallmarks?.length > 0 && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="events"
								checked={events !== 'false'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, events: events === 'false' ? true : false }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Events</span>
							</span>
						</Toggle>
					)}
				</ToggleWrapper>
			) : null}

			<FiltersWrapper>
				{DENOMINATIONS.length > 0 && (
					<Filters color={color}>
						{DENOMINATIONS.map((D) => (
							<Link
								href={
									`/protocol/${protocol}?` +
									(tvl ? `tvl=${tvl}&` : '') +
									(mcap ? `mcap=${mcap}&` : '') +
									(tokenPrice ? `tokenPrice=${tokenPrice}&` : '') +
									(fdv ? `fdv=${fdv}&` : '') +
									(volume ? `volume=${volume}&` : '') +
									(fees ? `fees=${fees}&` : '') +
									(revenue ? `revenue=${revenue}&` : '') +
									(unlocks ? `unlocks=${unlocks}&` : '') +
									(activeUsers ? `activeUsers=${activeUsers}&` : '') +
									(transactions ? `transactions=${transactions}&` : '') +
									(gasUsed ? `gasUsed=${gasUsed}&` : '') +
									(events ? `events=${events}&` : '') +
									(staking ? `staking=${staking}&` : '') +
									(borrowed ? `borrowed=${borrowed}&` : '') +
									`denomination=${D.symbol}`
								}
								key={D.symbol}
								shallow
								passHref
							>
								<Denomination active={denomination === D.symbol || (D.symbol === 'USD' && !denomination)}>
									{D.symbol}
								</Denomination>
							</Link>
						))}
					</Filters>
				)}
			</FiltersWrapper>

			<LazyChart style={{ padding: 0, minHeight: '360px' }}>
				{!router.isReady ? null : isLoading ? (
					<p style={{ position: 'relative', top: '180px', textAlign: 'center' }}>{`Fetching ${fetchingTypes.join(
						', '
					)} ...`}</p>
				) : (
					<AreaChart
						chartData={finalData}
						color={color}
						title=""
						valueSymbol={valueSymbol}
						stacks={tokensUnique}
						hallmarks={!(events === 'false') && hallmarks}
						tooltipSort={false}
						stackColors={chartColors}
						style={{
							...(bobo && {
								backgroundImage: 'url("/bobo.png")',
								backgroundSize: '100% 360px',
								backgroundRepeat: 'no-repeat',
								backgroundPosition: 'bottom'
							})
						}}
						unlockTokenSymbol={unlockTokenSymbol}
					/>
				)}
			</LazyChart>
		</Wrapper>
	)
}

export const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px 0;
	grid-column: span 1;
`

export const FiltersWrapper = styled.div`
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
	gap: 16px;
	margin: 0 16px;

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		flex-wrap: wrap;
		flex-direction: row;
		align-items: center;
	}
`

export const Filters = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 6px;
	background-color: ${({ theme, color }) => (color ? transparentize(0.8, color) : transparentize(0.8, theme.primary1))};
	border-radius: 12px;
	width: min-content;
`

interface IDenomination {
	active?: boolean
}

export const Denomination = styled.a<IDenomination>`
	display: inline-block;
	font-weight: 500;
	font-size: 0.875rem;
	border-radius: 10px;
	background: ${({ theme, active }) =>
		active ? transparentize(0.5, theme.mode === 'dark' ? '#000' : '#fff') : 'none'};
	padding: 6px 8px;
	color: ${({ theme, active }) =>
		active
			? theme.mode === 'dark'
				? '#fff'
				: '#000'
			: theme.mode === 'dark'
			? 'rgba(255, 255, 255, 0.6)'
			: 'rgba(0, 0, 0, 0.6)'};
`

export const formatProtocolsTvlChartData = ({ historicalChainTvls, extraTvlEnabled }) => {
	const tvlDictionary: { [key: number]: number } = {}

	for (const section in historicalChainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (!name.includes('-') && name !== 'offers') {
			// sum key with staking, ethereum, arbitrum etc
			if (Object.keys(extraTvlEnabled).includes(name) ? extraTvlEnabled[name] : true) {
				historicalChainTvls[section].tvl?.forEach(
					({ date, totalLiquidityUSD }: { date: number; totalLiquidityUSD: number }, index) => {
						let nearestDate = date

						// roundup timestamps on last tvl values in chart
						if (index > historicalChainTvls[section].tvl!.length - 2 && !tvlDictionary[date]) {
							const prevDate = historicalChainTvls[section].tvl[index - 1]?.date
							// only change timestamp if prev timestamp is at UTC 00:00
							if (prevDate && new Date(prevDate * 1000).getUTCHours() === 0) {
								// find date in tvlDictionary
								for (
									let i = prevDate + 1;
									i <= Number((new Date().getTime() / 1000).toFixed(0)) && nearestDate === date;
									i++
								) {
									if (tvlDictionary[i]) {
										nearestDate = i
									}
								}
							}
						}

						if (!tvlDictionary[nearestDate]) {
							tvlDictionary[nearestDate] = 0
						}

						tvlDictionary[nearestDate] += totalLiquidityUSD
					}
				)
			}
		}
	}

	return Object.entries(tvlDictionary)
}

const getPriceAtDate = (date: string | number, history: Array<[number, number]>) => {
	let priceAtDate = history.find((x) => x[0] === Number(date) * 1000)

	if (!priceAtDate) {
		priceAtDate = history.find((x) => -432000000 < x[0] - Number(date) * 1000 && x[0] - Number(date) * 1000 < 432000000)
	}

	return priceAtDate?.[1] ?? 0
}

interface IToggleProps {
	backgroundColor: string
}

const Toggle = styled.label<IToggleProps>`
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;

	input {
		position: absolute;
		width: 1em;
		height: 1em;
		opacity: 0.00001;
	}

	span[data-wrapper='true'] {
		position: relative;
		z-index: 1;
		padding: 8px 12px;
		background: red;
		border-radius: 10px;
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 4px;
		background: ${({ backgroundColor, theme }) =>
			backgroundColor ? transparentize(0.8, backgroundColor) : transparentize(0.8, theme.primary1)};
	}

	input:checked + span[data-wrapper='true'] {
		background: ${({ backgroundColor, theme }) =>
			backgroundColor ? transparentize(0.4, backgroundColor) : transparentize(0.4, theme.primary1)};
	}

	input:focus-visible {
		outline: none;
	}

	input:focus-visible + span[data-wrapper='true'] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}
`

const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin: 0 16px;
`
