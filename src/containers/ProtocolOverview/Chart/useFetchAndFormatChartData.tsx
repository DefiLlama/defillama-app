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
import { firstDayOfMonth, lastDayOfWeek, nearestUtcZeroHour } from '~/utils'
import { BAR_CHARTS, DISABLED_CUMULATIVE_CHARTS } from './utils'
import { useFetchBridgeVolumeOnAllChains } from '~/containers/Bridges/BridgeProtocolOverview'
import { fetchJson } from '~/utils/async'
import dayjs from 'dayjs'
import { CACHE_SERVER } from '~/constants'
import { useQuery } from '@tanstack/react-query'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'

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
	'Options Premium Volume'?: number
	'Options Notional Volume'?: number
	'Aggregators Volume'?: number
	'Perps Aggregators Volume'?: number
	'Bridge Aggregators Volume'?: number
	Fees?: number
	Revenue?: number
	Incentives?: number
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
	holdersRevenue,
	incentives,
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
	optionsPremiumVolume,
	optionsNotionalVolume,
	perpsAggregators,
	bridgeAggregators,
	incentivesData
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
			geckoId && fdv === 'true' && isRouterReady ? () => fetchJson(`${CACHE_SERVER}/supply/${geckoId}`) : () => null,
		staleTime: 60 * 60 * 1000
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
	const { data: unlocksData = null, isLoading: fetchingEmissions } = useGetProtocolEmissions(
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

	const { data: feesData, isLoading: fetchingFees } = useQuery({
		queryKey: ['fees', protocol, fees, metrics.fees, isRouterReady],
		queryFn:
			isRouterReady && fees === 'true' && metrics.fees
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: revenueData, isLoading: fetchingRevenue } = useQuery({
		queryKey: ['revenue', protocol, revenue, metrics.fees, isRouterReady],
		queryFn:
			isRouterReady && revenue === 'true' && metrics.fees
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyRevenue',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: holdersRevenueData, isLoading: fetchingHoldersRevenue } = useQuery({
		queryKey: ['holders-revenue', protocol, holdersRevenue, metrics.fees, isRouterReady],
		queryFn:
			isRouterReady && holdersRevenue === 'true' && metrics.fees
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyHoldersRevenue',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const bribes = feesSettings?.bribes
	const tokenTax = feesSettings?.tokentax

	const { data: bribesData, isLoading: fetchingBribes } = useQuery({
		queryKey: [
			'bribes',
			protocol,
			fees === 'true' || revenue === 'true' || holdersRevenue === 'true',
			bribes,
			metrics.bribes,
			isRouterReady
		],
		queryFn:
			isRouterReady && (fees === 'true' || revenue === 'true' || holdersRevenue === 'true') && bribes && metrics.bribes
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyBribesRevenue',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: tokenTaxesData, isLoading: fetchingTokenTaxes } = useQuery({
		queryKey: [
			'token-taxes',
			protocol,
			fees === 'true' || revenue === 'true' || holdersRevenue === 'true',
			tokenTax,
			metrics.tokenTax,
			isRouterReady
		],
		queryFn:
			isRouterReady &&
			(fees === 'true' || revenue === 'true' || holdersRevenue === 'true') &&
			tokenTax &&
			metrics.tokenTax
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyTokenTaxes',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: dexVolumeData, isLoading: fetchingDexVolume } = useQuery({
		queryKey: ['dex', protocol, volume, metrics.dexs, isRouterReady],
		queryFn:
			isRouterReady && volume === 'true' && metrics.dexs
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'dexs',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: perpsVolumeData, isLoading: fetchingPerpsVolume } = useQuery({
		queryKey: ['perps', protocol, perpsVolume, metrics.perps, isRouterReady],
		queryFn:
			isRouterReady && perpsVolume === 'true' && metrics.perps
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'derivatives',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: optionsPremiumVolumeData, isLoading: fetchingOptionsPremiumVolume } = useQuery({
		queryKey: ['options-premium', protocol, optionsPremiumVolume, metrics.options, isRouterReady],
		queryFn:
			isRouterReady && optionsPremiumVolume === 'true' && metrics.options
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'options',
							dataType: 'dailyPremiumVolume',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: optionsNotionalVolumeData, isLoading: fetchingOptionsNotionalVolume } = useQuery({
		queryKey: ['options-notional', protocol, optionsNotionalVolume, metrics.options, isRouterReady],
		queryFn:
			isRouterReady && optionsNotionalVolume === 'true' && metrics.options
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'options',
							dataType: 'dailyNotionalVolume',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: aggregatorsVolumeData, isLoading: fetchingAggregatorsVolume } = useQuery({
		queryKey: ['dex-aggregators', protocol, aggregators, metrics.dexAggregators, isRouterReady],
		queryFn:
			isRouterReady && aggregators === 'true' && metrics.dexAggregators
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'aggregators',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: perpsAggregatorsVolumeData, isLoading: fetchingPerpsAggregatorsVolume } = useQuery({
		queryKey: ['perp-aggregators', protocol, perpsAggregators, metrics.perpsAggregators, isRouterReady],
		queryFn:
			isRouterReady && perpsAggregators === 'true' && metrics.perpsAggregators
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'derivatives-aggregator',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { data: bridgeAggregatorsVolumeData, isLoading: fetchingBriddgeAggregatorsVolume } = useQuery({
		queryKey: ['perp-aggregators', protocol, bridgeAggregators, metrics.bridgeAggregators, isRouterReady],
		queryFn:
			isRouterReady && bridgeAggregators === 'true' && metrics.bridgeAggregators
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'bridge-aggregators',
							protocol,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
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

		if (geckoId && protocolCGData) {
			if (mcap === 'true' && protocolCGData['mcaps'] && protocolCGData['mcaps'].length > 0) {
				chartsUnique.push('Mcap')

				for (const [dateMs, Mcap] of protocolCGData['mcaps']) {
					const date = Math.floor(nearestUtcZeroHour(dateMs) / 1000)
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
						: Math.floor(nearestUtcZeroHour(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const Mcap = protocolCGData['mcaps']?.[protocolCGData['mcaps'].length - 1][1]

					chartData[date]['Mcap'] = showNonUsdDenomination
						? Mcap / getPriceAtDate(date, denominationHistory.prices)
						: Mcap
				}
			}

			if (tokenPrice === 'true') {
				chartsUnique.push('Token Price')

				for (const [dateMs, price] of protocolCGData['prices']) {
					const date = Math.floor(nearestUtcZeroHour(dateMs) / 1000)
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
						: Math.floor(nearestUtcZeroHour(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
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
					const date = Math.floor(nearestUtcZeroHour(dateMs) / 1000)
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
						: Math.floor(nearestUtcZeroHour(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenPrice = protocolCGData['prices'][protocolCGData['prices'].length - 1][1]
					const fdv = totalSupply * tokenPrice

					chartData[date]['FDV'] = showNonUsdDenomination ? fdv / getPriceAtDate(date, denominationHistory.prices) : fdv
				}
			}

			if (tokenVolume === 'true') {
				chartsUnique.push('Token Volume')

				for (const [dateMs, price] of protocolCGData['volumes']) {
					const date = Math.floor(nearestUtcZeroHour(dateMs) / 1000)
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
						: Math.floor(nearestUtcZeroHour(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
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
				const date = Math.floor(nearestUtcZeroHour(+item[0] * 1000) / 1000)
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
				const date = Math.floor(nearestUtcZeroHour(+item.date * 1000) / 1000)
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

		if (dexVolumeData) {
			chartsUnique.push('DEX Volume')

			for (const [dateS, value] of dexVolumeData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['DEX Volume'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}
		}

		if (perpsVolumeData) {
			chartsUnique.push('Perps Volume')

			for (const [dateS, value] of perpsVolumeData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Perps Volume'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}
		}

		if (optionsPremiumVolumeData) {
			chartsUnique.push('Options Premium Volume')

			for (const [dateS, value] of optionsPremiumVolumeData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Options Premium Volume'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}
		}

		if (optionsNotionalVolumeData) {
			chartsUnique.push('Options Notional Volume')

			for (const [dateS, value] of optionsNotionalVolumeData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Options Notional Volume'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}
		}

		if (aggregatorsVolumeData) {
			chartsUnique.push('DEX Aggregators Volume')

			for (const [dateS, value] of aggregatorsVolumeData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['DEX Aggregators Volume'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}
		}

		if (perpsAggregatorsVolumeData) {
			chartsUnique.push('Perps Aggregators Volume')

			for (const [dateS, value] of perpsAggregatorsVolumeData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Perps Aggregators Volume'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}
		}

		if (bridgeAggregatorsVolumeData) {
			chartsUnique.push('Bridge Aggregators Volume')

			for (const [dateS, value] of bridgeAggregatorsVolumeData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Bridge Aggregators Volume'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}
		}

		if (feesData) {
			chartsUnique.push('Fees')

			for (const [dateS, value] of feesData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Fees'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}

			if (bribesData) {
				for (const [dateS, value] of bribesData.totalDataChart ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Fees'] =
						(chartData[date]['Fees'] || 0) +
						(showNonUsdDenomination ? +value / getPriceAtDate(date, denominationHistory.prices) : value)
				}
			}

			if (tokenTaxesData) {
				for (const [dateS, value] of tokenTaxesData.totalDataChart ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Fees'] =
						(chartData[date]['Fees'] || 0) +
						(showNonUsdDenomination ? +value / getPriceAtDate(date, denominationHistory.prices) : value)
				}
			}
		}

		if (revenueData) {
			chartsUnique.push('Revenue')

			for (const [dateS, value] of revenueData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Revenue'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}

			if (bribesData) {
				for (const [dateS, value] of bribesData.totalDataChart ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Revenue'] =
						(chartData[date]['Revenue'] || 0) +
						(showNonUsdDenomination ? +value / getPriceAtDate(date, denominationHistory.prices) : value)
				}
			}

			if (tokenTaxesData) {
				for (const [dateS, value] of tokenTaxesData.totalDataChart ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Revenue'] =
						(chartData[date]['Revenue'] || 0) +
						(showNonUsdDenomination ? +value / getPriceAtDate(date, denominationHistory.prices) : value)
				}
			}
		}

		if (holdersRevenueData) {
			chartsUnique.push('Holders Revenue')

			for (const [dateS, value] of holdersRevenueData.totalDataChart ?? []) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Holders Revenue'] = showNonUsdDenomination
					? +value / getPriceAtDate(date, denominationHistory.prices)
					: value
			}

			if (bribesData) {
				for (const [dateS, value] of bribesData.totalDataChart ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Holders Revenue'] =
						(chartData[date]['Holders Revenue'] || 0) +
						(showNonUsdDenomination ? +value / getPriceAtDate(date, denominationHistory.prices) : value)
				}
			}

			if (tokenTaxesData) {
				for (const [dateS, value] of tokenTaxesData.totalDataChart ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Holders Revenue'] =
						(chartData[date]['Holders Revenue'] || 0) +
						(showNonUsdDenomination ? +value / getPriceAtDate(date, denominationHistory.prices) : value)
				}
			}
		}

		if (incentivesData && incentives === 'true' && incentivesData.incentivesChart) {
			chartsUnique.push('Incentives')

			for (const [timestamp, incentiveAmount] of incentivesData.incentivesChart) {
				const date = Math.floor(nearestUtcZeroHour(+timestamp * 1000) / 1000)
				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Incentives'] = showNonUsdDenomination
					? incentiveAmount / getPriceAtDate(date, denominationHistory.prices)
					: incentiveAmount
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
					const date = Math.floor(nearestUtcZeroHour(+item.date * 1000) / 1000)
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
				const date = Math.floor(nearestUtcZeroHour(dateS) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Active Addresses'] = noOfUsers || 0
			}
		}
		if (newAddressesData) {
			chartsUnique.push('New Addresses')

			for (const [dateS, noOfUsers] of newAddressesData) {
				const date = Math.floor(nearestUtcZeroHour(dateS) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['New Addresses'] = noOfUsers || 0
			}
		}
		if (transactionsData) {
			chartsUnique.push('Transactions')

			for (const [dateS, noOfTxs] of transactionsData) {
				const date = Math.floor(nearestUtcZeroHour(dateS) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Transactions'] = noOfTxs || 0
			}
		}
		if (gasData) {
			chartsUnique.push('Gas Used')

			for (const [dateS, gasAmount] of gasData) {
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

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
				const date = Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

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
								currentDate = Math.floor(nearestUtcZeroHour(+curr[0] * 1000) / 1000)
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
				const date = isHourlyChart ? dateS : Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

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
					const date = Math.floor(nearestUtcZeroHour(+item.date * 1000) / 1000)

					if (!chartData[date]) {
						chartData[date] = { date }
					}

					chartData[date]['Total Proposals'] = item['Total'] || 0
					chartData[date]['Successful Proposals'] = item['Successful'] || 0
				}
			}

			for (const gItem of governanceData) {
				for (const item of gItem.maxVotes ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+item.date * 1000) / 1000)

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
				const date = Math.floor(nearestUtcZeroHour(dayjs(k).toDate().getTime()) / 1000)

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
				const date = Math.floor(nearestUtcZeroHour(dayjs(k).toDate().getTime()) / 1000)

				if (!chartData[date]) {
					chartData[date] = { date }
				}

				chartData[date]['Developers'] = v || 0
			}
		}

		if (nftVolumeData?.length && nftVolume === 'true') {
			chartsUnique.push('NFT Volume')

			for (const { date, volume, volumeUsd } of nftVolumeData) {
				const ts = Math.floor(nearestUtcZeroHour(dayjs(date).toDate().getTime()) / 1000)

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
				const date = Math.floor(nearestUtcZeroHour(dayjs(k).toDate().getTime()) / 1000)

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
				const date = Math.floor(nearestUtcZeroHour(dayjs(k).toDate().getTime()) / 1000)

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
				const date = isHourlyChart ? dateS : Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

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

		const useDailyChart = chartsUnique.length === 0

		if (tvlData.length > 0 && tvl !== 'false') {
			chartsUnique.push('TVL')

			let prevDate = null

			for (const [dateS, TVL] of tvlData) {
				const date = isHourlyChart && useDailyChart ? dateS : Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

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
				const date = isHourlyChart && useDailyChart ? dateS : Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

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
				const date = isHourlyChart && useDailyChart ? dateS : Math.floor(nearestUtcZeroHour(+dateS * 1000) / 1000)

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
		dexVolumeData,
		perpsVolumeData,
		optionsPremiumVolumeData,
		optionsNotionalVolumeData,
		aggregatorsVolumeData,
		perpsAggregatorsVolumeData,
		bridgeAggregatorsVolumeData,
		feesData,
		revenueData,
		holdersRevenueData,
		bribesData,
		tokenTaxesData,
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
		denominationHistory,
		mcap,
		tokenPrice,
		fdv,
		fdvData,
		tokenVolume,
		incentives,
		incentivesData,
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
		fetchingTypes.push('fees')
	}

	if (fetchingRevenue) {
		fetchingTypes.push('revenue')
	}

	if (fetchingHoldersRevenue) {
		fetchingTypes.push('holders revenue')
	}

	if (fetchingDexVolume) {
		fetchingTypes.push('dexvolume')
	}

	if (fetchingBribes) {
		fetchingTypes.push('bribes')
	}

	if (fetchingTokenTaxes) {
		fetchingTypes.push('token taxes')
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

	if (fetchingOptionsPremiumVolume) {
		fetchingTypes.push('options premium volume')
	}

	if (fetchingOptionsNotionalVolume) {
		fetchingTypes.push('options notional volume')
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
		fetchingRevenue ||
		fetchingHoldersRevenue ||
		fetchingDexVolume ||
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
		fetchingOptionsPremiumVolume ||
		fetchingOptionsNotionalVolume ||
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
