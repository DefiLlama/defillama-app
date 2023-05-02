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
	useFetchProtocolGovernanceData,
	useFetchProtocolMedianAPY,
	useFetchProtocolNewUsers,
	useFetchProtocolTransactions
} from '~/api/categories/protocols/client'
import { useDefiManager } from '~/contexts/LocalStorage'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import type { IChartProps } from '../types'
import { nearestUtc } from '~/utils'
import { useGetOverviewChartData } from '~/containers/DexsAndFees/charts/hooks'
import useSWR from 'swr'
import { LazyChart } from '~/layout/ProtocolAndPool'
import { Denomination, Filters, FiltersWrapper, Toggle } from './Misc'
import { BAR_CHARTS } from './utils'

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
	usdInflowsData: Array<[string, number]> | null
	inflowsExist: boolean
	governanceApi: string | null
	isHourlyChart?: boolean
}

const CHART_TYPES = [
	'tvl',
	'mcap',
	'tokenPrice',
	'fdv',
	'volume',
	'fees',
	'revenue',
	'unlocks',
	'activeUsers',
	'newUsers',
	'transactions',
	'gasUsed',
	'events',
	'staking',
	'borrowed',
	'medianApy',
	'usdInflows',
	'governance'
]

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
	activeUsersId,
	usdInflowsData,
	inflowsExist,
	governanceApi,
	isHourlyChart
}: IProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useDefiManager()

	const {
		denomination,
		groupBy,
		tvl,
		mcap,
		tokenPrice,
		fdv,
		volume,
		fees,
		revenue,
		unlocks,
		activeUsers,
		newUsers,
		events,
		transactions,
		gasUsed,
		staking,
		borrowed,
		medianApy,
		usdInflows,
		governance
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

	const { data: activeUsersData, loading: fetchingActiveUsers } = useFetchProtocolActiveUsers(
		router.isReady && activeUsers === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: newUsersData, loading: fetchingNewUsers } = useFetchProtocolNewUsers(
		router.isReady && newUsers === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: transactionsData, loading: fetchingTransactions } = useFetchProtocolTransactions(
		router.isReady && transactions === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: gasData, loading: fetchingGasUsed } = useFetchProtocolGasUsed(
		router.isReady && gasUsed === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: medianAPYData, loading: fetchingMedianAPY } = useFetchProtocolMedianAPY(
		router.isReady && medianApy === 'true' && metrics.medianApy ? protocol : null
	)
	const { data: governanceData, loading: fetchingGovernanceData } = useFetchProtocolGovernanceData(
		router.isReady && governance === 'true' ? governanceApi : null
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

	const { finalData, chartsUnique } = React.useMemo(() => {
		if (!router.isReady) {
			return { finalData: [], chartsUnique: [] }
		}
		const chartsUnique = []

		const chartData = {}

		if (tvlData.length > 0 && tvl !== 'false') {
			chartsUnique.push('TVL')

			let prevDate = null

			tvlData.forEach(([dateS, TVL]) => {
				const date = isHourlyChart ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

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

						chartData[missingDate]['TVL'] = missingTvl
					}
				}

				prevDate = date

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['TVL'] = showNonUsdDenomination ? TVL / getPriceAtDate(dateS, denominationHistory.prices) : TVL
			})
		}

		if (staking === 'true' && historicalChainTvls['staking']?.tvl?.length > 0) {
			chartsUnique.push('Staking')

			let prevDate = null

			historicalChainTvls['staking'].tvl.forEach(({ date: dateS, totalLiquidityUSD }) => {
				const date = isHourlyChart ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

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

						chartData[missingDate]['Staking'] = missingStakedTvl
					}
				}

				prevDate = date

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Staking'] = showNonUsdDenomination
					? totalLiquidityUSD / getPriceAtDate(dateS, denominationHistory.prices)
					: totalLiquidityUSD
			})
		}

		if (borrowed === 'true' && historicalChainTvls['borrowed']?.tvl?.length > 0) {
			chartsUnique.push('Borrowed')

			let prevDate = null

			historicalChainTvls['borrowed'].tvl.forEach(({ date: dateS, totalLiquidityUSD }) => {
				const date = isHourlyChart ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

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

						chartData[missingDate]['Borrowed'] = missingBorrowedTvl
					}
				}

				prevDate = date

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Borrowed'] = showNonUsdDenomination
					? totalLiquidityUSD / getPriceAtDate(dateS, denominationHistory.prices)
					: totalLiquidityUSD
			})
		}

		if (geckoId && protocolCGData) {
			if (mcap === 'true') {
				chartsUnique.push('Mcap')

				protocolCGData['market_caps'].forEach(([dateMs, Mcap]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}

					chartData[date]['Mcap'] = showNonUsdDenomination
						? Mcap / getPriceAtDate(date, denominationHistory.prices)
						: Mcap
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['market_caps'].length > 0 &&
					protocolCGData['market_caps'][protocolCGData['market_caps'].length - 1][0] <
						+tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyChart
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const Mcap = protocolCGData['market_caps'][protocolCGData['market_caps'].length - 1][1]

					chartData[date]['Mcap'] = showNonUsdDenomination
						? Mcap / getPriceAtDate(date, denominationHistory.prices)
						: Mcap
				}
			}

			if (tokenPrice === 'true') {
				chartsUnique.push('Token Price')

				protocolCGData['prices'].forEach(([dateMs, price]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}

					chartData[date]['Token Price'] = showNonUsdDenomination
						? price / getPriceAtDate(date, denominationHistory.prices)
						: price
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['prices'].length > 0 &&
					protocolCGData['prices'][protocolCGData['prices'].length - 1][0] < +tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyChart
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenPrice = protocolCGData['prices'][protocolCGData['prices'].length - 1][1]

					chartData[date]['Token Price'] = showNonUsdDenomination
						? tokenPrice / getPriceAtDate(date, denominationHistory.prices)
						: tokenPrice
				}
			}

			if (fdv === 'true' && fdvData) {
				chartsUnique.push('FDV')

				const totalSupply = fdvData['market_data']['total_supply']

				protocolCGData['prices'].forEach(([dateMs, price]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}
					const fdv = totalSupply * price

					chartData[date]['FDV'] = showNonUsdDenomination ? fdv / getPriceAtDate(date, denominationHistory.prices) : fdv
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['prices'].length > 0 &&
					protocolCGData['prices'][protocolCGData['prices'].length - 1][0] < +tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyChart
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenPrice = protocolCGData['prices'][protocolCGData['prices'].length - 1][1]
					const fdv = totalSupply * tokenPrice

					chartData[date]['FDV'] = showNonUsdDenomination ? fdv / getPriceAtDate(date, denominationHistory.prices) : fdv
				}
			}
		}

		if (volume === 'true' && volumeData) {
			chartsUnique.push('Volume')

			volumeData.forEach((item) => {
				const date = +item.date
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Volume'] = showNonUsdDenomination
					? +item.Dexs / getPriceAtDate(date, denominationHistory.prices)
					: item.Dexs
			})
		}

		if (feesAndRevenue) {
			if (fees === 'true') {
				chartsUnique.push('Fees')
			}

			if (revenue === 'true') {
				chartsUnique.push('Revenue')
			}

			feesAndRevenue.forEach((item) => {
				const date = +item.date
				if (!chartData[date]) {
					chartData[date] = {}
				}

				if (fees === 'true') {
					chartData[date]['Fees'] = showNonUsdDenomination
						? +item.Fees / getPriceAtDate(date, denominationHistory.prices)
						: item.Fees
				}

				if (revenue === 'true') {
					chartData[date]['Revenue'] = showNonUsdDenomination
						? +item.Revenue / getPriceAtDate(date, denominationHistory.prices)
						: item.Revenue
				}
			})
		}

		if (emissions && emissions.length > 0 && unlocks === 'true') {
			chartsUnique.push('Unlocks')
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

					chartData[item.date]['Unlocks'] = totalUnlocked
				})
		}

		if (activeUsers === 'true' && activeUsersData) {
			chartsUnique.push('Active Users')

			activeUsersData.forEach(([date, noOfUsers]) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Active Users'] = noOfUsers || 0
			})
		}
		if (newUsers === 'true' && newUsersData) {
			chartsUnique.push('New Users')

			newUsersData.forEach(([date, noOfUsers]) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['New Users'] = noOfUsers || 0
			})
		}
		if (transactions === 'true' && transactionsData) {
			chartsUnique.push('Transactions')

			transactionsData.forEach(([date, noOfTxs]) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Transactions'] = noOfTxs || 0
			})
		}
		if (gasUsed === 'true' && gasData) {
			chartsUnique.push('Gas Used')

			gasData.forEach(([date, gasAmount]) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Gas Used'] = showNonUsdDenomination
					? gasAmount / getPriceAtDate(date, denominationHistory.prices)
					: gasAmount
			})
		}
		if (medianApy === 'true' && medianAPYData) {
			chartsUnique.push('Median APY')

			medianAPYData.forEach(({ date, medianAPY }) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Median APY'] = medianAPY
			})
		}

		if (!isHourlyChart && inflowsExist && usdInflows === 'true' && usdInflowsData) {
			chartsUnique.push('USD Inflows')

			let isHourlyInflows = usdInflowsData.length > 2 ? false : true

			usdInflowsData.slice(0, 100).forEach((item, index) => {
				if (usdInflowsData[index + 1] && +usdInflowsData[index + 1][0] - +usdInflowsData[index][0] < 86400) {
					isHourlyInflows = true
				}
			})

			let currentDate
			let data = isHourlyInflows
				? Object.entries(
						usdInflowsData.reduce((acc, curr) => {
							if (!currentDate || currentDate + 86400 < +curr[0]) {
								currentDate = Math.floor(nearestUtc(+curr[0] * 1000) / 1000)
							}

							if (!acc[currentDate]) {
								acc[currentDate] = 0
							}

							acc[currentDate] = acc[currentDate] + curr[1]

							return acc
						}, {})
				  )
				: usdInflowsData

			data.forEach(([dateS, inflows]) => {
				const date = isHourlyChart ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['USD Inflows'] = inflows
			})
		}

		if (governance === 'true' && governanceData) {
			chartsUnique.push('Total Proposals')
			chartsUnique.push('Successful Proposals')
			chartsUnique.push('Max Votes')

			governanceData.activity?.forEach((item) => {
				const date = isHourlyChart ? item.date : Math.floor(nearestUtc(+item.date * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Total Proposals'] = item['Total'] || 0
				chartData[date]['Successful Proposals'] = item['Successful'] || 0
			})

			governanceData.maxVotes?.forEach((item) => {
				const date = isHourlyChart ? item.date : Math.floor(nearestUtc(+item.date * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Max Votes'] = item['Max Votes'] || 0
			})
		}

		const finalData = groupDataByDays(
			chartData,
			isHourlyChart || typeof groupBy !== 'string' ? null : groupBy,
			chartsUnique
		)

		return {
			finalData,
			chartsUnique
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
		newUsers,
		activeUsersData,
		newUsersData,
		tokenPrice,
		fdv,
		fdvData,
		gasData,
		gasUsed,
		transactions,
		transactionsData,
		staking,
		borrowed,
		historicalChainTvls,
		medianAPYData,
		medianApy,
		usdInflows,
		usdInflowsData,
		inflowsExist,
		isHourlyChart,
		groupBy,
		governance,
		governanceData
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
	if (fetchingNewUsers) {
		fetchingTypes.push('new users')
	}
	if (fetchingTransactions) {
		fetchingTypes.push('transactions')
	}
	if (fetchingGasUsed) {
		fetchingTypes.push('gas used')
	}

	if (fetchingMedianAPY) {
		fetchingTypes.push('median apy')
	}

	const isLoading =
		loading ||
		fetchingFdv ||
		denominationLoading ||
		fetchingFees ||
		fetchingVolume ||
		fetchingActiveUsers ||
		fetchingNewUsers ||
		fetchingTransactions ||
		fetchingGasUsed ||
		fetchingMedianAPY ||
		fetchingGovernanceData

	const realPathname =
		`/protocol/${protocol}?` +
		CHART_TYPES.reduce((acc, curr) => {
			if (router.query[curr]) {
				acc += `${curr}=${router.query[curr]}&`
			}
			return acc
		}, '')

	return (
		<Wrapper>
			{geckoId ||
			hallmarks?.length > 0 ||
			metrics?.fees ||
			metrics?.dexs ||
			emissions?.length > 0 ||
			activeUsersId ||
			historicalChainTvls['borrowed']?.tvl?.length > 0 ||
			historicalChainTvls['staking']?.tvl?.length > 0 ||
			metrics.medianApy ||
			(inflowsExist && !isHourlyChart ? true : false) ||
			governanceApi ? (
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
									value="newUsers"
									checked={newUsers === 'true'}
									onChange={() =>
										router.push(
											{
												pathname: router.pathname,
												query: { ...router.query, newUsers: newUsers === 'true' ? false : true }
											},
											undefined,
											{ shallow: true }
										)
									}
								/>
								<span data-wrapper="true">
									<span>New Users</span>
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

					{metrics.medianApy && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="medianApy"
								checked={medianApy === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, medianApy: medianApy === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Median APY</span>
							</span>
						</Toggle>
					)}

					{!isHourlyChart && inflowsExist && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="usdInflows"
								checked={usdInflows === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, usdInflows: usdInflows === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>USD Inflows</span>
							</span>
						</Toggle>
					)}

					{governanceApi && (
						<Toggle backgroundColor={color}>
							<input
								type="checkbox"
								value="governance"
								checked={governance === 'true'}
								onChange={() =>
									router.push(
										{
											pathname: router.pathname,
											query: { ...router.query, governance: governance === 'true' ? false : true }
										},
										undefined,
										{ shallow: true }
									)
								}
							/>
							<span data-wrapper="true">
								<span>Governance</span>
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
								href={realPathname + `denomination=${D.symbol}` + (groupBy ? `&groupBy=${groupBy}` : '')}
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

				{!isHourlyChart ? (
					<Filters color={color}>
						<Link
							href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=daily'}
							shallow
							passHref
						>
							<Denomination active={groupBy === 'daily' || !groupBy}>Daily</Denomination>
						</Link>
						<Link
							href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=weekly'}
							shallow
							passHref
						>
							<Denomination active={groupBy === 'weekly'}>Weekly</Denomination>
						</Link>
						<Link
							href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=monthly'}
							shallow
							passHref
						>
							<Denomination active={groupBy === 'monthly'}>Monthly</Denomination>
						</Link>
						<Link
							href={realPathname + (denomination ? `denomination=${denomination}&` : '') + 'groupBy=cumulative'}
							shallow
							passHref
						>
							<Denomination active={groupBy === 'cumulative'}>Cumulative</Denomination>
						</Link>
					</Filters>
				) : null}
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
						stacks={chartsUnique}
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

const ToggleWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin: 0 16px;
`

const oneWeek = 7 * 24 * 60 * 60
const oneMonth = 30 * 24 * 60 * 60

const groupDataByDays = (data, groupBy: string | null, chartsUnique: Array<string>) => {
	if (groupBy && ['weekly', 'monthly', 'cumulative'].includes(groupBy)) {
		let chartData = {}

		let currentDate
		const cumulative = {}

		for (const date in data) {
			if (
				!currentDate ||
				currentDate + (groupBy === 'weekly' ? oneWeek : groupBy === 'monthly' ? oneMonth : 0) < +date
			) {
				currentDate = +date
			}

			chartsUnique.forEach((chartType) => {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				if (BAR_CHARTS.includes(chartType)) {
					if (groupBy === 'cumulative') {
						cumulative[chartType] = (cumulative[chartType] || 0) + (+data[date][chartType] || 0)
						chartData[currentDate][chartType] = cumulative[chartType]
					} else {
						chartData[currentDate][chartType] = (chartData[currentDate][chartType] || 0) + (+data[date][chartType] || 0)
					}
				} else {
					chartData[date][chartType] = +data[date][chartType] || 0
				}
			})
		}

		return Object.entries(chartData).map(([date, values]: [string, { [key: string]: number }]) => ({
			date,
			...values
		}))
	}

	return Object.entries(data).map(([date, values]: [string, { [key: string]: number }]) => ({
		date,
		...values
	}))
}

export { Denomination, Filters, Toggle }
