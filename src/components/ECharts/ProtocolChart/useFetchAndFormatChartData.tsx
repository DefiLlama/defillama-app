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
	useFetchProtocolTwitter,
	useFetchProtocolDevMetrics
} from '~/api/categories/protocols/client'
import { nearestUtc } from '~/utils'
import { useGetOverviewChartData } from '~/containers/DexsAndFees/charts/hooks'
import { BAR_CHARTS, DISABLED_CUMULATIVE_CHARTS } from './utils'
import { useFetchBridgeVolumeOnAllChains } from '~/containers/BridgeContainer'
import { fetchWithErrorLogging } from '~/utils/async'
import dayjs from 'dayjs'
import { CACHE_SERVER } from '~/constants'
import { useQuery } from '@tanstack/react-query'

const fetch = fetchWithErrorLogging

interface ChartData {
	date: string
	TVL?: number
	Staking?: number
	Borrowed?: number
	Mcap?: number
	'Token Price'?: number
	FDV?: number
	'Token Volume'?: number
	'Token Liquidity'?: number
	'Bridge Deposits'?: number
	'Bridge Withdrawals'?: number
	Volume?: number
	'Perps Volume'?: number
	'Premium Volume'?: number
	'Aggregators Volume'?: number
	'Perps Aggregators Volume'?: number
	'Bridge Aggregators Volume'?: number
	Fees?: number
	Revenue?: number
	Tweets?: number
	Unlocks?: number
	'Active Addresses'?: number
	'New Addresses'?: number
	Transactions?: number
	'Gas Used'?: number
	'Median APY'?: number
	'USD Inflows'?: number
	'Total Proposals'?: number
	'Successful Proposals'?: number
	'Max Votes'?: number
	Contributers?: number
	Developers?: number
	'NFT Volume'?: number
	'Devs Commits'?: number
	'Contributers Commits'?: number
	Treasury?: number
	Events?: number
}
interface ReturnType {
	fetchingTypes: string[]
	isLoading: boolean
	chartData: ChartData[]
	chartsUnique: Array<keyof ChartData>
	unlockTokenSymbol: string
	valueSymbol: string
}

export function useFetchAndFormatChartData({
	isRouterReady,
	denomination,
	groupBy,
	tvl,
	mcap,
	tokenPrice,
	fdv,
	volume,
	perpsVolume,
	fees,
	revenue,
	unlocks,
	activeAddresses,
	newAddresses,
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
	twitterHandle,
	devMetrics,
	contributersMetrics,
	contributersCommits,
	devCommits,
	nftVolume,
	nftVolumeData,
	aggregators,
	premiumVolume,
	perpsAggregators,
	bridgeAggregators
}): ReturnType {
	// fetch denomination on protocol chains
	const { data: denominationHistory, isLoading: denominationLoading } = useDenominationPriceHistory(
		isRouterReady && denomination ? chartDenominations.find((d) => d.symbol === denomination)?.geckoId : null
	)

	// fetch protocol mcap data
	const { data: protocolCGData, isLoading } = useDenominationPriceHistory(
		isRouterReady && (mcap === 'true' || tokenPrice === 'true' || fdv === 'true' || tokenVolume === 'true')
			? geckoId
			: null
	)

	const { data: fdvData = null, isLoading: fetchingFdv } = useQuery({
		queryKey: [`fdv-${geckoId && fdv === 'true' && isRouterReady ? geckoId : null}`],
		queryFn:
			geckoId && fdv === 'true' && isRouterReady
				? () => fetch(`${CACHE_SERVER}/supply/${geckoId}`).then((res) => res.json())
				: () => null,
		staleTime: 60 * 60 * 1000
	})

	const { data: feesAndRevenue, isLoading: fetchingFees } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'fees',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && (fees === 'true' || revenue === 'true') && metrics.fees ? false : true
	})

	const { data: activeAddressesData, isLoading: fetchingActiveAddresses } = useFetchProtocolActiveUsers(
		isRouterReady && activeAddresses === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: newAddressesData, isLoading: fetchingNewAddresses } = useFetchProtocolNewUsers(
		isRouterReady && newAddresses === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: transactionsData, isLoading: fetchingTransactions } = useFetchProtocolTransactions(
		isRouterReady && transactions === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: gasData, isLoading: fetchingGasUsed } = useFetchProtocolGasUsed(
		isRouterReady && gasUsed === 'true' && activeUsersId ? activeUsersId : null
	)
	const { data: medianAPYData, isLoading: fetchingMedianAPY } = useFetchProtocolMedianAPY(
		isRouterReady && medianApy === 'true' && metrics.medianApy ? protocol : null
	)
	const { data: governanceData, isLoading: fetchingGovernanceData } = useFetchProtocolGovernanceData(
		isRouterReady && governance === 'true' && governanceApis && governanceApis.length > 0 ? governanceApis : null
	)
	const { data: treasuryData, isLoading: fetchingTreasury } = useFetchProtocolTreasury(
		isRouterReady && metrics.treasury && treasury === 'true' ? protocol : null,
		true
	)
	const { data: unlocksData, isLoading: fetchingEmissions } = useGetProtocolEmissions(
		isRouterReady && metrics.unlocks && unlocks === 'true' ? protocol : null
	)
	const { data: bridgeVolumeData, isLoading: fetchingBridgeVolume } = useFetchBridgeVolumeOnAllChains(
		isRouterReady && metrics.bridge && bridgeVolume === 'true' ? protocol : null
	)
	const { data: tokenLiquidityData, isLoading: fetchingTokenLiquidity } = useFetchProtocolTokenLiquidity(
		isRouterReady && metrics.tokenLiquidity && tokenLiquidity === 'true' ? protocolId : null
	)
	const { data: twitterData, isLoading: fetchingTwitter } = useFetchProtocolTwitter(
		isRouterReady && twitter === 'true' ? twitterHandle : null
	)

	const { data: devMetricsData, isLoading: fetchingDevMetrics } = useFetchProtocolDevMetrics(
		isRouterReady && [devMetrics, contributersMetrics, contributersCommits, devCommits].some((v) => v === 'true')
			? protocol.id || protocolId
			: null
	)

	const { data: volumeData, isLoading: fetchingVolume } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'dexs',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && volume === 'true' && metrics.dexs ? false : true
	})

	const { data: perpsVolumeData, isLoading: fetchingPerpsVolume } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'derivatives',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && perpsVolume === 'true' && metrics.perps ? false : true
	})

	const { data: optionsVolumeData, isLoading: fetchingOptionsVolume } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'options',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && premiumVolume === 'true' && metrics.options ? false : true
	})

	const { data: aggregatorsVolumeData, isLoading: fetchingAggregatorsVolume } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'aggregators',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && metrics.aggregators && aggregators === 'true' ? false : true
	})

	const { data: perpsAggregatorsVolumeData, isLoading: fetchingPerpsAggregatorsVolume } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'aggregator-derivatives',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && metrics.perpsAggregators && perpsAggregators === 'true' ? false : true
	})

	const { data: bridgeAggregatorsVolumeData, isLoading: fetchingBriddgeAggregatorsVolume } = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'bridge-aggregators',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: isRouterReady && metrics.bridgeAggregators && bridgeAggregators === 'true' ? false : true
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

			for (const [dateS, TVL] of tvlData) {
				const date = isHourlyChart ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (prevDate && +date - prevDate > 86400) {
					const noOfDatesMissing = Math.floor((+date - prevDate) / 86400)

					for (let i = 1; i < noOfDatesMissing + 1; i++) {
						const missingDate = prevDate + 86400 * i

						if (!chartData[missingDate]) {
							chartData[missingDate] = { date: missingDate }
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
					chartData[date] = { date }
				}

				chartData[date]['TVL'] = showNonUsdDenomination ? TVL / getPriceAtDate(dateS, denominationHistory.prices) : TVL
			}
		}

		if (staking === 'true' && historicalChainTvls['staking']?.tvl?.length > 0) {
			chartsUnique.push('Staking')

			let prevDate = null

			for (const { date: dateS, totalLiquidityUSD } of historicalChainTvls['staking'].tvl) {
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
					chartData[date] = { date }
				}

				chartData[date]['Staking'] = showNonUsdDenomination
					? totalLiquidityUSD / getPriceAtDate(dateS, denominationHistory.prices)
					: totalLiquidityUSD
			}
		}

		if (borrowed === 'true' && historicalChainTvls['borrowed']?.tvl?.length > 0) {
			chartsUnique.push('Borrowed')

			let prevDate = null

			for (const { date: dateS, totalLiquidityUSD } of historicalChainTvls['borrowed'].tvl) {
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
					chartData[date] = { date }
				}

				chartData[date]['Borrowed'] = showNonUsdDenomination
					? totalLiquidityUSD / getPriceAtDate(dateS, denominationHistory.prices)
					: totalLiquidityUSD
			}
		}

		if (geckoId && protocolCGData) {
			if (mcap === 'true' && protocolCGData['mcaps'] && protocolCGData['mcaps'].length > 0) {
				chartsUnique.push('Mcap')

				for (const [dateMs, Mcap] of protocolCGData['mcaps']) {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Mcap'] = showNonUsdDenomination
						? Mcap / getPriceAtDate(date, denominationHistory.prices)
						: Mcap
				}

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['mcaps']?.length > 0 &&
					protocolCGData['mcaps'][protocolCGData['mcaps'].length - 1][0] < +tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyChart
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const Mcap = protocolCGData['mcaps']?.[protocolCGData['mcaps'].length - 1][1]

					chartData[date]['Mcap'] = showNonUsdDenomination
						? Mcap / getPriceAtDate(date, denominationHistory.prices)
						: Mcap
				}
			}

			if (tokenPrice === 'true') {
				chartsUnique.push('Token Price')

				for (const [dateMs, price] of protocolCGData['prices']) {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Token Price'] = showNonUsdDenomination
						? price / getPriceAtDate(date, denominationHistory.prices)
						: price
				}

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

				const totalSupply = fdvData['data']['total_supply']

				for (const [dateMs, price] of protocolCGData['prices']) {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = { date }
					}
					const fdv = totalSupply * price

					chartData[date]['FDV'] = showNonUsdDenomination ? fdv / getPriceAtDate(date, denominationHistory.prices) : fdv
				}

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

				for (const [dateMs, price] of protocolCGData['volumes']) {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Token Volume'] = showNonUsdDenomination
						? price / getPriceAtDate(date, denominationHistory.prices)
						: price
				}

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['volumes'].length > 0 &&
					protocolCGData['volumes'][protocolCGData['volumes'].length - 1][0] < +tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyChart
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenVolume = protocolCGData['volumes'][protocolCGData['volumes'].length - 1][1]

					chartData[date]['Token Volume'] = showNonUsdDenomination
						? tokenVolume / getPriceAtDate(date, denominationHistory.prices)
						: tokenVolume
				}
			}
		}

		if (tokenLiquidityData) {
			chartsUnique.push('Token Liquidity')

			for (const item of tokenLiquidityData) {
				const date = Math.floor(nearestUtc(+item[0] * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Token Liquidity'] = showNonUsdDenomination
					? item[1] / getPriceAtDate(date, denominationHistory.prices)
					: item[1]
			}
		}

		if (bridgeVolumeData) {
			chartsUnique.push('Bridge Deposits')
			chartsUnique.push('Bridge Withdrawals')

			for (const item of bridgeVolumeData) {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Bridge Deposits'] = showNonUsdDenomination
					? item.Deposited / getPriceAtDate(date, denominationHistory.prices)
					: item.Deposited
				chartData[date]['Bridge Withdrawals'] = showNonUsdDenomination
					? item.Withdrawn / getPriceAtDate(date, denominationHistory.prices)
					: item.Withdrawn
			}
		}

		if (volumeData) {
			chartsUnique.push('Volume')

			for (const item of volumeData) {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Volume'] = showNonUsdDenomination
					? +item.Dexs / getPriceAtDate(date, denominationHistory.prices)
					: item.Dexs
			}
		}

		if (perpsVolumeData) {
			chartsUnique.push('Perps Volume')

			for (const item of perpsVolumeData) {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Perps Volume'] = showNonUsdDenomination
					? +item.Derivatives / getPriceAtDate(date, denominationHistory.prices)
					: item.Derivatives
			}
		}

		if (optionsVolumeData) {
			chartsUnique.push('Premium Volume')

			for (const item of optionsVolumeData) {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Premium Volume'] = showNonUsdDenomination
					? +item['Premium volume'] / getPriceAtDate(date, denominationHistory.prices)
					: item['Premium volume']
			}
		}

		if (aggregatorsVolumeData) {
			chartsUnique.push('Aggregators Volume')

			for (const item of aggregatorsVolumeData) {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Aggregators Volume'] = showNonUsdDenomination
					? +item.Aggregators / getPriceAtDate(date, denominationHistory.prices)
					: item.Aggregators
			}
		}

		if (perpsAggregatorsVolumeData) {
			chartsUnique.push('Perps Aggregators Volume')

			for (const item of perpsAggregatorsVolumeData) {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Perps Aggregators Volume'] = showNonUsdDenomination
					? +item['Aggregator-derivatives'] / getPriceAtDate(date, denominationHistory.prices)
					: item['Aggregator-derivatives']
			}
		}

		if (bridgeAggregatorsVolumeData) {
			chartsUnique.push('Bridge Aggregators Volume')

			for (const item of bridgeAggregatorsVolumeData) {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Bridge Aggregators Volume'] = showNonUsdDenomination
					? +item['Bridge-aggregators'] / getPriceAtDate(date, denominationHistory.prices)
					: item['Bridge-aggregators']
			}
		}

		if (feesAndRevenue) {
			if (fees === 'true') {
				chartsUnique.push('Fees')
			}

			if (revenue === 'true') {
				chartsUnique.push('Revenue')
			}

			for (const item of feesAndRevenue) {
				const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
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
			}
		}

		if (twitterData && twitterData?.tweets && twitterData?.lastTweet) {
			chartsUnique.push('Tweets')

			for (const tweet of twitterData?.tweets ?? []) {
				const date = dayjs(tweet[0] * 1000)
					.startOf('day')
					.unix()
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Tweets'] = (chartData[date]['Tweets'] || 0) + tweet[1]
			}
		}

		if (unlocksData && unlocksData.chartData.documented && unlocksData.chartData.documented.length > 0) {
			chartsUnique.push('Unlocks')
			unlocksData.chartData.documented
				.filter((emission) => +emission.date * 1000 <= Date.now())
				.forEach((item) => {
					const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)
					if (!chartData[date]) {
						chartData[date] = { date }
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

		if (activeAddressesData) {
			chartsUnique.push('Active Addresses')

			for (const [dateS, noOfUsers] of activeAddressesData) {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Active Addresses'] = noOfUsers || 0
			}
		}
		if (newAddressesData) {
			chartsUnique.push('New Addresses')

			for (const [dateS, noOfUsers] of newAddressesData) {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['New Addresses'] = noOfUsers || 0
			}
		}
		if (transactionsData) {
			chartsUnique.push('Transactions')

			for (const [dateS, noOfTxs] of transactionsData) {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Transactions'] = noOfTxs || 0
			}
		}
		if (gasData) {
			chartsUnique.push('Gas Used')

			for (const [dateS, gasAmount] of gasData) {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Gas Used'] = showNonUsdDenomination
					? gasAmount / getPriceAtDate(date, denominationHistory.prices)
					: gasAmount
			}
		}
		if (medianAPYData) {
			chartsUnique.push('Median APY')

			for (const { date: dateS, medianAPY } of medianAPYData) {
				const date = Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Median APY'] = medianAPY
			}
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
					chartData[date] = { date }
				}

				chartData[date]['USD Inflows'] = inflows
			})
		}

		if (governanceData) {
			chartsUnique.push('Total Proposals')
			chartsUnique.push('Successful Proposals')
			chartsUnique.push('Max Votes')

			for (const gItem of governanceData) {
				for (const item of gItem.activity ?? []) {
					const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Total Proposals'] = item['Total'] || 0
					chartData[date]['Successful Proposals'] = item['Successful'] || 0
				}
			}

			for (const gItem of governanceData) {
				for (const item of gItem.maxVotes ?? []) {
					const date = Math.floor(nearestUtc(+item.date * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Max Votes'] = item['Max Votes'] || 0
				}
			}
		}

		if (devMetricsData && contributersMetrics === 'true') {
			chartsUnique.push('Contributers')

			const metricKey = groupBy === 'monthly' ? 'monthly_contributers' : 'weekly_contributers'

			for (const { k, v } of devMetricsData.report?.[metricKey] ?? []) {
				const date = Math.floor(nearestUtc(dayjs(k).toDate().getTime()) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Contributers'] = v || 0
			}
		}

		if (devMetricsData && devMetrics === 'true') {
			chartsUnique.push('Developers')

			const metricKey = groupBy === 'monthly' ? 'monthly_devs' : 'weekly_devs'

			for (const { k, v } of devMetricsData.report?.[metricKey] ?? []) {
				const date = Math.floor(nearestUtc(dayjs(k).toDate().getTime()) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Developers'] = v || 0
			}
		}

		if (nftVolumeData?.length && nftVolume === 'true') {
			chartsUnique.push('NFT Volume')

			for (const { date, volume, volumeUsd } of nftVolumeData) {
				const ts = Math.floor(nearestUtc(dayjs(date).toDate().getTime()) / 1000)

				if (!chartData[ts]) {
					chartData[ts] = {}
				}

				chartData[ts]['NFT Volume'] = (showNonUsdDenomination ? volume : volumeUsd) || 0
			}
		}

		if (devMetricsData && devCommits === 'true') {
			chartsUnique.push('Devs Commits')

			const metricKey = groupBy === 'monthly' ? 'monthly_devs' : 'weekly_devs'

			for (const { k, cc } of devMetricsData.report?.[metricKey] ?? []) {
				const date = Math.floor(nearestUtc(dayjs(k).toDate().getTime()) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Devs Commits'] = cc || 0
			}
		}

		if (devMetricsData && contributersCommits === 'true') {
			chartsUnique.push('Contributers Commits')

			const metricKey = groupBy === 'monthly' ? 'monthly_devs' : 'weekly_devs'

			for (const { k, cc } of devMetricsData.report?.[metricKey] ?? []) {
				const date = Math.floor(nearestUtc(dayjs(k).toDate().getTime()) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Contributers Commits'] = cc || 0
			}
		}

		if (treasuryData) {
			chartsUnique.push('Treasury')
			const tData = formatProtocolsTvlChartData({ historicalChainTvls: treasuryData.chainTvls, extraTvlEnabled: {} })

			let prevDate = null

			for (const [dateS, treasuryValue] of tData) {
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
					chartData[date] = { date }
				}

				chartData[date]['Treasury'] = showNonUsdDenomination
					? treasuryValue / getPriceAtDate(dateS, denominationHistory.prices)
					: treasuryValue
			}
		}

		return {
			chartData,
			chartsUnique
		}
	}, [
		isRouterReady,
		tvl,
		historicalChainTvls,
		extraTvlEnabled,
		isHourlyChart,
		staking,
		borrowed,
		geckoId,
		protocolCGData,
		tokenLiquidityData,
		bridgeVolumeData,
		volumeData,
		perpsVolumeData,
		optionsVolumeData,
		aggregatorsVolumeData,
		perpsAggregatorsVolumeData,
		bridgeAggregatorsVolumeData,
		feesAndRevenue,
		twitterData,
		unlocksData,
		activeAddressesData,
		newAddressesData,
		transactionsData,
		gasData,
		medianAPYData,
		usdInflows,
		usdInflowsData,
		governanceData,
		devMetricsData,
		contributersMetrics,
		devMetrics,
		nftVolumeData,
		nftVolume,
		devCommits,
		contributersCommits,
		treasuryData,
		showNonUsdDenomination,
		denominationHistory.prices,
		mcap,
		tokenPrice,
		fdv,
		fdvData,
		tokenVolume,
		fees,
		revenue,
		groupBy
	])

	const finalData = React.useMemo(() => {
		return groupDataByDays(chartData, typeof groupBy !== 'string' ? null : groupBy, chartsUnique)
	}, [chartData, chartsUnique, groupBy])

	const fetchingTypes = []

	if (denominationLoading) {
		fetchingTypes.push(denomination + ' price')
	}

	if (isLoading) {
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

	if ((isLoading || fetchingFdv) && fdv === 'true') {
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

	if (fetchingPerpsVolume) {
		fetchingTypes.push('perps volume')
	}

	if (fetchingAggregatorsVolume) {
		fetchingTypes.push('aggregators volume')
	}

	if (fetchingEmissions) {
		fetchingTypes.push('unlocks')
	}

	if (fetchingActiveAddresses) {
		fetchingTypes.push('active addresses')
	}
	if (fetchingNewAddresses) {
		fetchingTypes.push('new addresses')
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

	if (fetchingDevMetrics) {
		fetchingTypes.push('dev metrics')
		fetchingTypes.push('contributers metrics')
	}

	if (fetchingAggregatorsVolume) {
		fetchingTypes.push('aggregators volume')
	}

	if (fetchingOptionsVolume) {
		fetchingTypes.push('options volume')
	}

	if (fetchingPerpsAggregatorsVolume) {
		fetchingTypes.push('perps aggregators volume')
	}

	if (fetchingBriddgeAggregatorsVolume) {
		fetchingTypes.push('bridge aggregators volume')
	}

	const isLoadingData =
		isLoading ||
		fetchingFdv ||
		denominationLoading ||
		fetchingFees ||
		fetchingVolume ||
		fetchingPerpsVolume ||
		fetchingActiveAddresses ||
		fetchingNewAddresses ||
		fetchingTransactions ||
		fetchingGasUsed ||
		fetchingMedianAPY ||
		fetchingGovernanceData ||
		fetchingTreasury ||
		fetchingEmissions ||
		fetchingBridgeVolume ||
		fetchingTokenLiquidity ||
		fetchingTwitter ||
		fetchingDevMetrics ||
		fetchingAggregatorsVolume ||
		fetchingOptionsVolume ||
		fetchingPerpsAggregatorsVolume ||
		fetchingBriddgeAggregatorsVolume

	return {
		fetchingTypes,
		isLoading: isLoadingData,
		chartData: finalData as ChartData[],
		chartsUnique,
		unlockTokenSymbol: unlocksData?.tokenPrice?.symbol,
		valueSymbol
	}
}

const oneWeek = 7 * 24 * 60 * 60

export const groupDataByDays = (data, groupBy: string | null, chartsUnique: Array<string>, forceGroup?: boolean) => {
	if (groupBy && ['weekly', 'monthly', 'cumulative'].includes(groupBy)) {
		let chartData = {}

		let currentDate
		const cumulative = {}

		for (let defaultDate in data) {
			if (!defaultDate) return

			let date = +defaultDate

			if (groupBy === 'monthly') {
				date = firstDayOfMonth(+defaultDate * 1000)
			}

			if (groupBy === 'weekly') {
				date = lastDayOfWeek(+defaultDate * 1000)
			}

			if (!currentDate || (groupBy === 'weekly' ? currentDate + oneWeek <= +date : true)) {
				currentDate = +date
			}

			chartsUnique.forEach((chartType) => {
				if (forceGroup) {
					if (!chartData[currentDate]) {
						chartData[currentDate] = { date: currentDate }
					}
				} else {
					if (!chartData[date]) {
						chartData[date] = { date }
					}
				}

				if (BAR_CHARTS.includes(chartType) || forceGroup) {
					if (groupBy === 'cumulative' && !DISABLED_CUMULATIVE_CHARTS.includes(chartType)) {
						cumulative[chartType] = (cumulative[chartType] || 0) + (+data[defaultDate][chartType] || 0)
						chartData[currentDate][chartType] = cumulative[chartType]
					} else {
						chartData[currentDate][chartType] =
							(chartData[currentDate][chartType] || 0) + (+data[defaultDate][chartType] || 0)
					}
				} else {
					chartData[date][chartType] = +data[defaultDate][chartType] || 0
				}
			})
		}

		const finalData = Object.values(chartData)
		const invalidDateIndex =
			groupBy === 'weekly'
				? finalData.slice(-7).findIndex((x: any) => +x.date > Math.floor(new Date().getTime() / 1000))
				: null

		return invalidDateIndex && invalidDateIndex !== -1 ? finalData.slice(0, -7 + invalidDateIndex) : finalData
	}

	return Object.values(data)
}

const getPriceAtDate = (date: string | number, history: Array<[number, number]>) => {
	if (!history) return 0
	let priceAtDate = history.find((x) => x[0] === Number(date) * 1000)

	if (!priceAtDate) {
		if (Number(date) * 1000 > history[history.length - 1][1]) {
			priceAtDate = history[history.length - 1]
		} else {
			priceAtDate = history.find(
				(x) => -432000000 < x[0] - Number(date) * 1000 && x[0] - Number(date) * 1000 < 432000000
			)
		}
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
							if (
								prevDate &&
								new Date(prevDate * 1000).getUTCHours() === 0 &&
								new Date(date * 1000).getUTCHours() !== 0
							) {
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
	const final = Object.entries(tvlDictionary)
	return final.length < 50 ? final.filter((x) => x[1] !== 0) : final
}

const firstDayOfMonth = (dateString) => {
	const date = new Date(dateString)

	date.setDate(1)
	date.setHours(0)
	date.setSeconds(0)
	date.setMilliseconds(0)

	return date.getTime() / 1000
}

function lastDayOfWeek(dateString) {
	const date = new Date(dateString)
	const weekDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
	const monthDay = date.getUTCDate() - weekDay
	return Math.trunc(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), monthDay) / 1000)
}
export const lastDayOfMonth = (dateString) => {
	let date = new Date(dateString)

	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}
