import { useRouter } from 'next/router'
import { IProtocolOverviewPageData } from '../types'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { ProtocolChartsLabels } from './constants'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { useQuery } from '@tanstack/react-query'
import { firstDayOfMonth, lastDayOfWeek } from '~/utils'

const ProtocolLineBarChart = dynamic(() => import('./Chart2'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<any>

export function ProtocolChart2(props: IProtocolOverviewPageData) {
	const router = useRouter()
	const [isThemeDark] = useDarkModeManager()
	const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly' | 'cumulative'>('daily')

	const toggledMetrics = useMemo(() => {
		const toggled = {
			...router.query,
			...((!props.metrics.tvl
				? props.metrics.dexs
					? { dexVolume: router.query.dexVolume === 'false' ? 'false' : 'true' }
					: props.metrics.perps
					? { perpVolume: router.query.perpVolume === 'false' ? 'false' : 'true' }
					: props.metrics.options
					? {
							optionsPremiumVolume: router.query.optionsPremiumVolume === 'false' ? 'false' : 'true',
							optionsNotionalVolume: router.query.optionsNotionalVolume === 'false' ? 'false' : 'true'
					  }
					: props.metrics.dexAggregators
					? { dexAggregatorVolume: router.query.dexAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.bridgeAggregators
					? { bridgeAggregatorVolume: router.query.bridgeAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.perpsAggregators
					? { perpAggregatorVolume: router.query.perpAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.bridge
					? { bridgeVolume: router.query.bridgeVolume === 'false' ? 'false' : 'true' }
					: props.metrics.fees
					? {
							fees: router.query.fees === 'false' ? 'false' : 'true'
					  }
					: props.metrics.revenue
					? {
							revenue: router.query.revenue === 'false' ? 'false' : 'true',
							holdersRevenue: router.query.holdersRevenue === 'false' ? 'false' : 'true'
					  }
					: props.metrics.unlocks
					? { unlocks: router.query.unlocks === 'false' ? 'false' : 'true' }
					: props.metrics.treasury
					? { treasury: router.query.treasury === 'false' ? 'false' : 'true' }
					: {}
				: {}) as Record<string, string>)
		}

		return {
			...toggled,
			tvl: router.query.tvl === 'false' ? 'false' : 'true',
			events: router.query.events === 'false' ? 'false' : 'true'
		} as any
	}, [router, props.metrics])

	const { finalCharts, stacks, valueSymbol, loadingCharts } = useFetchAndFormatChartData({
		...props,
		toggledMetrics,
		groupBy
	})

	return (
		<div className="flex flex-col min-h-[360px]">
			{loadingCharts ? (
				<p className="text-center text-xs my-auto min-h-[360px] flex flex-col items-center justify-center">
					fetching {loadingCharts}...
				</p>
			) : (
				<ProtocolLineBarChart
					chartData={finalCharts}
					chartColors={props.chartColors}
					color={props.pageStyles['--primary-color']}
					isThemeDark={isThemeDark}
					valueSymbol={valueSymbol}
					groupBy={groupBy}
					hallmarks={props.hallmarks}
				/>
			)}
		</div>
	)
}

export const useFetchAndFormatChartData = ({
	name,
	currentTvlByChain,
	tvlChartData,
	extraTvlCharts,
	metrics,
	toggledMetrics,
	chartDenominations,
	groupBy
}: IProtocolOverviewPageData & {
	toggledMetrics: Record<string, string>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
}) => {
	const router = useRouter()
	const isRouterReady = router.isReady
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const tvlChart = useMemo(() => {
		const extraTvls = []

		for (const extra in tvlSettings) {
			if (tvlSettings[extra] && currentTvlByChain?.[extra] != null) {
				extraTvls.push(extra)
			}
		}

		if (extraTvls.length > 0) {
			return tvlChartData.map(([date, value]) => {
				return [
					+date * 1e3,
					value + extraTvls.reduce((acc, curr) => acc + (extraTvlCharts?.[curr]?.[date] ?? 0), 0)
				] as [number, number]
			})
		}

		return formatLineChart(tvlChartData, groupBy)
	}, [tvlChartData, extraTvlCharts, tvlSettings, groupBy])

	const { data: feesData = null, isLoading: fetchingFees } = useQuery({
		queryKey: ['fees', name, toggledMetrics.fees, metrics.fees, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.fees === 'true' && metrics.fees
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.fees === 'true' && metrics.fees
	})

	const { data: revenueData = null, isLoading: fetchingRevenue } = useQuery({
		queryKey: ['revenue', name, toggledMetrics.revenue, metrics.fees, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.revenue === 'true' && metrics.revenue
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyRevenue',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.revenue === 'true' && metrics.revenue
	})

	const { data: holdersRevenueData = null, isLoading: fetchingHoldersRevenue } = useQuery({
		queryKey: ['holders-revenue', name, toggledMetrics.holdersRevenue, metrics.fees, metrics.revenue, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.holdersRevenue === 'true' && (metrics.fees || metrics.revenue)
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyHoldersRevenue',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.holdersRevenue === 'true' && (metrics.fees || metrics.revenue)
	})

	const { data: bribesData = null, isLoading: fetchingBribes } = useQuery({
		queryKey: [
			'bribes',
			name,
			toggledMetrics.fees === 'true' || toggledMetrics.revenue === 'true' || toggledMetrics.holdersRevenue === 'true',
			feesSettings?.bribes,
			metrics.bribes,
			isRouterReady
		],
		queryFn:
			isRouterReady &&
			(toggledMetrics.fees === 'true' ||
				toggledMetrics.revenue === 'true' ||
				toggledMetrics.holdersRevenue === 'true') &&
			feesSettings?.bribes &&
			metrics.bribes
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyBribesRevenue',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled:
			(toggledMetrics.fees === 'true' ||
				toggledMetrics.revenue === 'true' ||
				toggledMetrics.holdersRevenue === 'true') &&
			feesSettings?.bribes &&
			metrics.bribes
	})

	const { data: tokenTaxesData = null, isLoading: fetchingTokenTaxes } = useQuery({
		queryKey: [
			'token-taxes',
			name,
			toggledMetrics.fees === 'true' || toggledMetrics.revenue === 'true' || toggledMetrics.holdersRevenue === 'true',
			feesSettings?.tokentax,
			metrics.tokenTax,
			isRouterReady
		],
		queryFn:
			isRouterReady &&
			(toggledMetrics.fees === 'true' ||
				toggledMetrics.revenue === 'true' ||
				toggledMetrics.holdersRevenue === 'true') &&
			feesSettings?.tokentax &&
			metrics.tokenTax
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyTokenTaxes',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled:
			(toggledMetrics.fees === 'true' ||
				toggledMetrics.revenue === 'true' ||
				toggledMetrics.holdersRevenue === 'true') &&
			feesSettings?.tokentax &&
			metrics.tokenTax
	})

	const { data: dexVolumeData = null, isLoading: fetchingDexVolume } = useQuery({
		queryKey: ['dex', name, toggledMetrics.dexVolume, metrics.dexs, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.dexVolume === 'true' && metrics.dexs
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'dexs',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.dexVolume === 'true' && metrics.dexs
	})

	const { data: perpsVolumeData = null, isLoading: fetchingPerpVolume } = useQuery({
		queryKey: ['perp', name, toggledMetrics.perpVolume, metrics.perps, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.perpVolume === 'true' && metrics.perps
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'derivatives',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.perpVolume === 'true' && metrics.perps
	})

	const { data: optionsPremiumVolumeData = null, isLoading: fetchingOptionsPremiumVolume } = useQuery({
		queryKey: ['options-premium', name, toggledMetrics.optionsPremiumVolume, metrics.options, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.optionsPremiumVolume === 'true' && metrics.options
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'options',
							dataType: 'dailyPremiumVolume',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.optionsPremiumVolume === 'true' && metrics.options
	})

	const { data: optionsNotionalVolumeData = null, isLoading: fetchingOptionsNotionalVolume } = useQuery({
		queryKey: ['options-notional', name, toggledMetrics.optionsNotionalVolume, metrics.options, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.optionsNotionalVolume === 'true' && metrics.options
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'options',
							dataType: 'dailyNotionalVolume',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.optionsNotionalVolume === 'true' && metrics.options
	})

	const { data: aggregatorsVolumeData = null, isLoading: fetchingDEXAggregatorVolume } = useQuery({
		queryKey: ['dex-aggregator', name, toggledMetrics.dexAggregatorVolume, metrics.dexAggregators, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.dexAggregatorVolume === 'true' && metrics.dexAggregators
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'aggregators',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.dexAggregatorVolume === 'true' && metrics.dexAggregators
	})

	const { data: perpsAggregatorsVolumeData = null, isLoading: fetchingPerpAggregatorVolume } = useQuery({
		queryKey: ['perp-aggregator', name, toggledMetrics.perpAggregatorVolume, metrics.perpsAggregators, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.perpAggregatorVolume === 'true' && metrics.perpsAggregators
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'derivatives-aggregator',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.perpAggregatorVolume === 'true' && metrics.perpsAggregators
	})

	const { data: bridgeAggregatorsVolumeData = null, isLoading: fetchingBridgeAggregatorVolume } = useQuery({
		queryKey: [
			'bridge-aggregator',
			name,
			toggledMetrics.bridgeAggregatorVolume,
			metrics.bridgeAggregators,
			isRouterReady
		],
		queryFn:
			isRouterReady && toggledMetrics.bridgeAggregatorVolume === 'true' && metrics.bridgeAggregators
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'bridge-aggregators',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						})
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.bridgeAggregatorVolume === 'true' && metrics.bridgeAggregators
	})

	const denominationHistory = {} as any

	const showNonUsdDenomination =
		toggledMetrics.denomination &&
		toggledMetrics.denomination !== 'USD' &&
		chartDenominations.find((d) => d.symbol === toggledMetrics.denomination) &&
		denominationHistory?.prices?.length > 0
			? true
			: false

	const valueSymbol = showNonUsdDenomination
		? chartDenominations.find((d) => d.symbol === toggledMetrics.denomination)?.symbol ?? ''
		: '$'

	const chartData = useMemo(() => {
		const loadingCharts = []

		if (fetchingFees) {
			loadingCharts.push('Fees')
		}

		if (fetchingRevenue) {
			loadingCharts.push('Revenue')
		}

		if (fetchingHoldersRevenue) {
			loadingCharts.push('Holders Revenue')
		}

		if (fetchingBribes) {
			loadingCharts.push('Bribes')
		}

		if (fetchingTokenTaxes) {
			loadingCharts.push('Token Taxes')
		}

		if (fetchingDexVolume) {
			loadingCharts.push('DEX Volume')
		}
		if (fetchingPerpVolume) {
			loadingCharts.push('Perp Volume')
		}
		if (fetchingOptionsPremiumVolume) {
			loadingCharts.push('Options Premium Volume')
		}
		if (fetchingOptionsNotionalVolume) {
			loadingCharts.push('Options Notional Volume')
		}
		if (fetchingDEXAggregatorVolume) {
			loadingCharts.push('DEX Aggregator Volume')
		}
		if (fetchingPerpAggregatorVolume) {
			loadingCharts.push('Perp Aggregator Volume')
		}
		if (fetchingBridgeAggregatorVolume) {
			loadingCharts.push('Bridge Aggregator Volume')
		}

		if (loadingCharts.length > 0) {
			return { finalCharts: [], stacks: [], valueSymbol, loadingCharts: loadingCharts.join(', ').toLowerCase() }
		}

		const charts: { [key in ProtocolChartsLabels]?: Array<[number, number]> } = {}

		if (toggledMetrics.tvl === 'true') {
			charts.TVL = tvlChart
		}

		const feesStore = {}
		const revenueStore = {}
		const holdersRevenueStore = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'

		if (feesData) {
			let total = 0
			for (const [date, value] of feesData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				feesStore[dateKey] = (feesStore[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}

		if (revenueData) {
			let total = 0
			for (const [date, value] of revenueData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}

		if (holdersRevenueData) {
			let total = 0
			for (const [date, value] of holdersRevenueData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}

		if (bribesData) {
			let total = 0
			for (const [date, value] of bribesData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				if (feesData) {
					feesStore[dateKey] = (feesStore[dateKey] ?? 0) + value + total
				}
				if (revenueData) {
					revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + value + total
				}
				if (holdersRevenueData) {
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + value + total
				}
				if (isCumulative) {
					total += value
				}
			}
		}

		if (tokenTaxesData) {
			let total = 0
			for (const [date, value] of tokenTaxesData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				if (feesData) {
					feesStore[dateKey] = (feesStore[dateKey] ?? 0) + value + total
				}
				if (revenueData) {
					revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + value + total
				}
				if (holdersRevenueData) {
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + value + total
				}
				if (isCumulative) {
					total += value
				}
			}
		}

		const finalFeesChart = []
		const finalRevenueChart = []
		const finalHoldersRevenueChart = []

		for (const date in feesStore) {
			finalFeesChart.push([+date * 1e3, feesStore[date]])
		}

		for (const date in revenueStore) {
			finalRevenueChart.push([+date * 1e3, revenueStore[date]])
		}

		for (const date in holdersRevenueStore) {
			finalHoldersRevenueChart.push([+date * 1e3, holdersRevenueStore[date]])
		}

		if (finalFeesChart.length > 0) {
			charts.Fees = finalFeesChart
		}

		if (finalRevenueChart.length > 0) {
			charts.Revenue = finalRevenueChart
		}

		if (finalHoldersRevenueChart.length > 0) {
			charts['Holders Revenue'] = finalHoldersRevenueChart
		}

		if (dexVolumeData) {
			charts['DEX Volume'] = formatBarChart(dexVolumeData.totalDataChart, groupBy)
		}

		if (perpsVolumeData) {
			charts['Perp Volume'] = formatBarChart(perpsVolumeData.totalDataChart, groupBy)
		}

		if (optionsPremiumVolumeData) {
			charts['Options Premium Volume'] = formatBarChart(optionsPremiumVolumeData.totalDataChart, groupBy)
		}

		if (optionsNotionalVolumeData) {
			charts['Options Notional Volume'] = formatBarChart(optionsNotionalVolumeData.totalDataChart, groupBy)
		}

		if (aggregatorsVolumeData) {
			charts['DEX Aggregator Volume'] = formatBarChart(aggregatorsVolumeData.totalDataChart, groupBy)
		}

		if (perpsAggregatorsVolumeData) {
			charts['Perp Aggregator Volume'] = formatBarChart(perpsAggregatorsVolumeData.totalDataChart, groupBy)
		}

		if (bridgeAggregatorsVolumeData) {
			charts['Bridge Aggregator Volume'] = formatBarChart(bridgeAggregatorsVolumeData.totalDataChart, groupBy)
		}

		return { finalCharts: charts, stacks: Object.keys(charts), valueSymbol, loadingCharts: '' }
	}, [
		toggledMetrics,
		feesData,
		revenueData,
		holdersRevenueData,
		bribesData,
		tokenTaxesData,
		dexVolumeData,
		perpsVolumeData,
		optionsPremiumVolumeData,
		optionsNotionalVolumeData,
		aggregatorsVolumeData,
		perpsAggregatorsVolumeData,
		bridgeAggregatorsVolumeData,
		fetchingFees,
		fetchingRevenue,
		fetchingHoldersRevenue,
		fetchingBribes,
		fetchingTokenTaxes,
		fetchingDexVolume,
		fetchingPerpVolume,
		fetchingOptionsPremiumVolume,
		fetchingOptionsNotionalVolume,
		fetchingDEXAggregatorVolume,
		fetchingPerpAggregatorVolume,
		fetchingBridgeAggregatorVolume,
		groupBy
	])

	return chartData
}

const formatBarChart = (data: Array<[string, number]>, groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative') => {
	if (['weekly', 'monthly', 'cumulative'].includes(groupBy)) {
		const store = {}
		let total = 0
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'
		for (const [date, value] of data) {
			const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
			// sum up values as it is bar chart
			store[dateKey] = (store[dateKey] ?? 0) + value + total
			if (isCumulative) {
				total += value
			}
		}
		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}
	return data.map(([date, value]) => [+date * 1e3, value])
}

const formatLineChart = (data: Array<[string, number]>, groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative') => {
	if (['weekly', 'monthly'].includes(groupBy)) {
		const store = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		for (const [date, value] of data) {
			const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
			// do not sum up values, just use the last value for each date
			store[dateKey] = value
		}
		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}
	return data.map(([date, value]) => [+date * 1e3, value]) as Array<[number, number]>
}
