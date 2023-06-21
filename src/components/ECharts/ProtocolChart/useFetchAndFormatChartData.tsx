import * as React from 'react'
import {
	useDenominationPriceHistory,
	useFetchProtocolActiveUsers,
	useFetchProtocolGasUsed,
	useFetchProtocolGovernanceData,
	useFetchProtocolMedianAPY,
	useFetchProtocolNewUsers,
	useFetchProtocolTokenLiquidity,
	useFetchProtocolTransactions,
	useFetchProtocolTreasury,
	useGetProtocolEmissions,
	useFetchProtocolTwitter
} from '~/api/categories/protocols/client'
import { nearestUtc } from '~/utils'
import { useGetOverviewChartData } from '~/containers/DexsAndFees/charts/hooks'
import useSWR from 'swr'
import { BAR_CHARTS } from './utils'
import { useFetchBridgeVolumeOnAllChains } from '~/containers/BridgeContainer'
import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export function useFetchAndFormatChartData({
	isRouterReady,
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
	governance,
	treasury,
	bridgeVolume,
	tokenVolume,
	tokenLiquidity,
	protocol,
	chartDenominations,
	geckoId,
	metrics,
	activeUsersId,
	governanceApis,
	protocolId,
	historicalChainTvls,
	extraTvlEnabled,
	isHourlyChart,
	usdInflowsData,
	twitter,
	twitterHandle
}) {
	// fetch denomination on protocol chains
	const { data: denominationHistory, loading: denominationLoading } = useDenominationPriceHistory(
		isRouterReady && denomination ? chartDenominations.find((d) => d.symbol === denomination)?.geckoId : null
	)

	// fetch protocol mcap data
	const { data: protocolCGData, loading } = useDenominationPriceHistory(
		isRouterReady && (mcap === 'true' || tokenPrice === 'true' || fdv === 'true' || tokenVolume === 'true')
			? geckoId
			: null
	)

	const { data: fdvData = null, error: fdvError } = useSWR(
		`fdv-${geckoId && fdv === 'true' && isRouterReady ? geckoId : null}`,
		geckoId && fdv === 'true' && isRouterReady
			? () =>
					fetch(
						`https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
					).then((res) => res.json())
			: () => null
	)

	const fetchingFdv = !fdvData && fdvData !== null && !fdvError

	const { data: feesAndRevenue, loading: fetchingFees } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'fees',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && (fees === 'true' || revenue === 'true') && metrics.fees ? false : true
	})

	const { data: activeUsersData, loading: fetchingActiveUsers } = useFetchProtocolActiveUsers(
		isRouterReady && activeUsers === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: newUsersData, loading: fetchingNewUsers } = useFetchProtocolNewUsers(
		isRouterReady && newUsers === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: transactionsData, loading: fetchingTransactions } = useFetchProtocolTransactions(
		isRouterReady && transactions === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: gasData, loading: fetchingGasUsed } = useFetchProtocolGasUsed(
		isRouterReady && gasUsed === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: medianAPYData, loading: fetchingMedianAPY } = useFetchProtocolMedianAPY(
		isRouterReady && medianApy === 'true' && metrics.medianApy ? protocol : null
	)
	const { data: governanceData, loading: fetchingGovernanceData } = useFetchProtocolGovernanceData(
		isRouterReady && governance === 'true' && governanceApis && governanceApis.length > 0 ? governanceApis : null
	)
	const { data: treasuryData, loading: fetchingTreasury } = useFetchProtocolTreasury(
		isRouterReady && metrics.treasury && treasury === 'true' ? protocol : null
	)
	const { data: emissions, loading: fetchingEmissions } = useGetProtocolEmissions(
		isRouterReady && metrics.unlocks && unlocks === 'true' ? protocol : null
	)
	const { data: bridgeVolumeData, loading: fetchingBridgeVolume } = useFetchBridgeVolumeOnAllChains(
		isRouterReady && metrics.bridge && bridgeVolume === 'true' ? protocol : null
	)
	const { data: tokenLiquidityData, loading: fetchingTokenLiquidity } = useFetchProtocolTokenLiquidity(
		isRouterReady && metrics.tokenLiquidity && tokenLiquidity === 'true' ? protocolId : null
	)
	const { data: twitterData, loading: fetchingTwitter } = useFetchProtocolTwitter(
		isRouterReady && twitter === 'true' ? twitterHandle : null
	)

	const { data: volumeData, loading: fetchingVolume } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'dexs',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && volume === 'true' && metrics.dexs ? false : true
	})

	const showNonUsdDenomination =
		denomination &&
		denomination !== 'USD' &&
		chartDenominations.find((d) => d.symbol === denomination) &&
		denominationHistory?.prices?.length > 0
			? true
			: false

	let valueSymbol = '$'
	if (showNonUsdDenomination) {
		const d = chartDenominations.find((d) => d.symbol === denomination)

		valueSymbol = d.symbol || ''
	}

	const { chartData, chartsUnique } = React.useMemo(() => {
		if (!isRouterReady) {
			return { chartData: [], chartsUnique: [] }
		}
		const chartsUnique = []

		const chartData = {}

		const tvlData = tvl !== 'false' ? formatProtocolsTvlChartData({ historicalChainTvls, extraTvlEnabled }) : []

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

				prevDate = +date

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

			if (tokenVolume === 'true') {
				chartsUnique.push('Token Volume')

				protocolCGData['total_volumes'].forEach(([dateMs, price]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}

					chartData[date]['Token Volume'] = showNonUsdDenomination
						? price / getPriceAtDate(date, denominationHistory.prices)
						: price
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['total_volumes'].length > 0 &&
					protocolCGData['total_volumes'][protocolCGData['total_volumes'].length - 1][0] <
						+tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyChart
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenVolume = protocolCGData['total_volumes'][protocolCGData['total_volumes'].length - 1][1]

					chartData[date]['Token Volume'] = showNonUsdDenomination
						? tokenVolume / getPriceAtDate(date, denominationHistory.prices)
						: tokenVolume
				}
			}
		}

		if (tokenLiquidity === 'true' && tokenLiquidityData) {
			chartsUnique.push('Token Liquidity')

			tokenLiquidityData.forEach((item) => {
				const date = Math.floor(nearestUtc(+item[0] * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Token Liquidity'] = showNonUsdDenomination
					? item[1] / getPriceAtDate(date, denominationHistory.prices)
					: item[1]
			})
		}

		if (bridgeVolume === 'true' && bridgeVolumeData) {
			chartsUnique.push('Bridge Deposits')
			chartsUnique.push('Bridge Withdrawals')

			bridgeVolumeData.forEach((item) => {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Bridge Deposits'] = showNonUsdDenomination
					? item.Deposited / getPriceAtDate(date, denominationHistory.prices)
					: item.Deposited
				chartData[date]['Bridge Withdrawals'] = showNonUsdDenomination
					? item.Withdrawn / getPriceAtDate(date, denominationHistory.prices)
					: item.Withdrawn
			})
		}

		if (volume === 'true' && volumeData) {
			chartsUnique.push('Volume')

			volumeData.forEach((item) => {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
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
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
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

		if (twitter === 'true') {
			chartsUnique.push('Tweets')

			twitterData?.tweets?.forEach((tweet) => {
				const date = Math.floor(nearestUtc(tweet.date) / 1000)
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Tweets'] = chartData[date]['Tweets'] ? chartData[date]['Tweets'] + 1 : 1
			})
		}

		if (emissions && unlocks === 'true') {
			chartsUnique.push('Unlocks')
			emissions.chartData
				.filter((emission) => +emission.date * 1000 <= Date.now())
				.forEach((item) => {
					const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}

					let totalUnlocked = 0

					for (const label in item) {
						if (label !== 'date') {
							totalUnlocked += item[label]
						}
					}

					chartData[date]['Unlocks'] = totalUnlocked
				})
		}

		if (activeUsers === 'true' && activeUsersData) {
			chartsUnique.push('Active Users')

			activeUsersData.forEach(([dateS, noOfUsers]) => {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Active Users'] = noOfUsers || 0
			})
		}
		if (newUsers === 'true' && newUsersData) {
			chartsUnique.push('New Users')

			newUsersData.forEach(([dateS, noOfUsers]) => {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['New Users'] = noOfUsers || 0
			})
		}
		if (transactions === 'true' && transactionsData) {
			chartsUnique.push('Transactions')

			transactionsData.forEach(([dateS, noOfTxs]) => {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Transactions'] = noOfTxs || 0
			})
		}
		if (gasUsed === 'true' && gasData) {
			chartsUnique.push('Gas Used')

			gasData.forEach(([dateS, gasAmount]) => {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

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

			medianAPYData.forEach(({ date: dateS, medianAPY }) => {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Median APY'] = medianAPY
			})
		}

		if (!isHourlyChart && usdInflows === 'true' && usdInflowsData) {
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

			governanceData.forEach((item) =>
				item.activity?.forEach((item) => {
					const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = {}
					}

					chartData[date]['Total Proposals'] = item['Total'] || 0
					chartData[date]['Successful Proposals'] = item['Successful'] || 0
				})
			)

			governanceData.forEach((item) =>
				item.maxVotes?.forEach((item) => {
					const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = {}
					}

					chartData[date]['Max Votes'] = item['Max Votes'] || 0
				})
			)
		}

		if (treasury === 'true' && treasuryData) {
			chartsUnique.push('Treasury')
			const tData = formatProtocolsTvlChartData({ historicalChainTvls: treasuryData.chainTvls, extraTvlEnabled: {} })

			let prevDate = null

			tData.forEach(([dateS, treasuryValue]) => {
				const date = isHourlyChart ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

				// if (prevDate && +date - prevDate > 86400) {
				// 	const noOfDatesMissing = Math.floor((+date - prevDate) / 86400)

				// 	for (let i = 1; i < noOfDatesMissing + 1; i++) {
				// 		const missingDate = prevDate + 86400 * i

				// 		if (!chartData[missingDate]) {
				// 			chartData[missingDate] = {}
				// 		}

				// 		const missingTvl =
				// 			((chartData[prevDate]?.['Treasury'] ?? 0) +
				// 				(showNonUsdDenomination
				// 					? treasuryValue / getPriceAtDate(dateS, denominationHistory.prices)
				// 					: treasuryValue)) /
				// 			2

				// 		chartData[missingDate]['Treasury'] = missingTvl
				// 	}
				// }

				// prevDate = date

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date]['Treasury'] = showNonUsdDenomination
					? treasuryValue / getPriceAtDate(dateS, denominationHistory.prices)
					: treasuryValue
			})
		}

		return {
			chartData,
			chartsUnique
		}
	}, [
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
		isRouterReady,
		unlocks,
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
		isHourlyChart,
		governance,
		governanceData,
		extraTvlEnabled,
		treasury,
		treasuryData,
		emissions,
		bridgeVolume,
		bridgeVolumeData,
		tokenVolume,
		tokenLiquidity,
		tokenLiquidityData,
		twitter,
		twitterData?.tweets
	])

	const finalData = React.useMemo(() => {
		return groupDataByDays(chartData, isHourlyChart || typeof groupBy !== 'string' ? null : groupBy, chartsUnique)
	}, [chartData, chartsUnique, isHourlyChart, groupBy])

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

		if (tokenVolume === 'true') {
			fetchingTypes.push('token volume')
		}
	}

	if ((loading || fetchingFdv) && fdv === 'true') {
		fetchingTypes.push('fdv')
	}

	if (fetchingTokenLiquidity) {
		fetchingTypes.push('token liquidity')
	}

	if (fetchingBridgeVolume) {
		fetchingTypes.push('bridge volume')
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

	if (fetchingEmissions) {
		fetchingTypes.push('unlocks')
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

	if (fetchingGovernanceData) {
		fetchingTypes.push('governance')
	}

	if (fetchingTreasury) {
		fetchingTypes.push('treasury')
	}

	if (fetchingTwitter) {
		fetchingTypes.push('twitter')
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
		fetchingGovernanceData ||
		fetchingTreasury ||
		fetchingEmissions ||
		fetchingBridgeVolume ||
		fetchingTokenLiquidity ||
		fetchingTwitter

	return {
		fetchingTypes,
		isLoading,
		chartData: finalData,
		chartsUnique,
		unlockTokenSymbol: emissions?.tokenPrice?.symbol,
		valueSymbol
	}
}

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

const getPriceAtDate = (date: string | number, history: Array<[number, number]>) => {
	let priceAtDate = history.find((x) => x[0] === Number(date) * 1000)

	if (!priceAtDate) {
		priceAtDate = history.find((x) => -432000000 < x[0] - Number(date) * 1000 && x[0] - Number(date) * 1000 < 432000000)
	}

	return priceAtDate?.[1] ?? 0
}

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
