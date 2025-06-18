import { useRouter } from 'next/router'
import { IProtocolOverviewPageData } from '../types'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ProtocolChartsLabels } from './constants'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { useQuery } from '@tanstack/react-query'

const ProtocolLineBarChart = dynamic(() => import('./Chart2'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<any>

export function ProtocolChart2(props: IProtocolOverviewPageData) {
	const router = useRouter()
	const [isThemeDark] = useDarkModeManager()

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
		toggledMetrics
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
				/>
			)}
		</div>
	)
}

export const useFetchAndFormatChartData = ({
	name,
	tvlChartData,
	extraTvlCharts,
	metrics,
	toggledMetrics,
	chartDenominations
}: IProtocolOverviewPageData & { toggledMetrics: Record<string, string> }) => {
	const router = useRouter()
	const isRouterReady = router.isReady
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const tvlChart = useMemo(() => {
		const extraTvls = []

		for (const extra in tvlSettings) {
			if (tvlSettings[extra] && extraTvlCharts?.[extra]) {
				extraTvls.push(extra)
			}
		}

		if (extraTvls.length > 0) {
			return tvlChartData.map(([date, value]) => {
				return [date, value + extraTvls.reduce((acc, curr) => acc + (extraTvlCharts?.[curr]?.[date] ?? 0), 0)] as [
					number,
					number
				]
			})
		}

		return tvlChartData
	}, [tvlChartData, extraTvlCharts, tvlSettings])

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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.fees === 'true' && metrics.fees
	})

	const { data: revenueData = null, isLoading: fetchingRevenue } = useQuery({
		queryKey: ['revenue', name, toggledMetrics.revenue, metrics.fees, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.revenue === 'true' && metrics.fees
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyRevenue',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.revenue === 'true' && metrics.fees
	})

	const { data: holdersRevenueData = null, isLoading: fetchingHoldersRevenue } = useQuery({
		queryKey: ['holders-revenue', name, toggledMetrics.holdersRevenue, metrics.fees, isRouterReady],
		queryFn:
			isRouterReady && toggledMetrics.holdersRevenue === 'true' && metrics.revenue
				? () =>
						getAdapterProtocolSummary({
							adapterType: 'fees',
							dataType: 'dailyHoldersRevenue',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
				: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: toggledMetrics.holdersRevenue === 'true' && metrics.revenue
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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
						}).then((data) => data.totalDataChart.map(([date, value]) => [+date * 1e3, value]))
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

		// some protocols do not have revenue chart at all, but they have bribes and token taxes
		// so dates might be missing if you only iterate over revenue chart
		// example: revenueData?.map(([date, value]) => [date, value + (bribesData?.[date] ?? 0)) will return empty chart
		if (bribesData || tokenTaxesData) {
			const feesStore = {}
			const revenueStore = {}
			const holdersRevenueStore = {}

			if (feesData) {
				feesData.forEach(([date, value]) => {
					feesStore[date] = (feesStore[date] ?? 0) + value
				})
			}

			if (revenueData) {
				revenueData.forEach(([date, value]) => {
					revenueStore[date] = (revenueStore[date] ?? 0) + value
				})
			}

			if (holdersRevenueData) {
				holdersRevenueData.forEach(([date, value]) => {
					holdersRevenueStore[date] = (holdersRevenueStore[date] ?? 0) + value
				})
			}

			if (bribesData) {
				bribesData.forEach(([date, value]) => {
					feesStore[date] = (feesStore[date] ?? 0) + value
					revenueStore[date] = (revenueStore[date] ?? 0) + value
					holdersRevenueStore[date] = (holdersRevenueStore[date] ?? 0) + value
				})
			}

			if (tokenTaxesData) {
				tokenTaxesData.forEach(([date, value]) => {
					feesStore[date] = (feesStore[date] ?? 0) + value
					revenueStore[date] = (revenueStore[date] ?? 0) + value
					holdersRevenueStore[date] = (holdersRevenueStore[date] ?? 0) + value
				})
			}

			const finalFeesChart = []
			const finalRevenueChart = []
			const finalHoldersRevenueChart = []

			for (const date in feesStore) {
				finalFeesChart.push([+date, feesStore[date]])
			}

			for (const date in revenueStore) {
				finalRevenueChart.push([+date, revenueStore[date]])
			}

			for (const date in holdersRevenueStore) {
				finalHoldersRevenueChart.push([+date, holdersRevenueStore[date]])
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
		} else {
			if (feesData) {
				charts.Fees = feesData
			}

			if (revenueData) {
				charts.Revenue = revenueData
			}

			if (holdersRevenueData) {
				charts['Holders Revenue'] = holdersRevenueData
			}
		}

		if (dexVolumeData) {
			charts['DEX Volume'] = dexVolumeData
		}

		if (perpsVolumeData) {
			charts['Perp Volume'] = perpsVolumeData
		}

		if (optionsPremiumVolumeData) {
			charts['Options Premium Volume'] = optionsPremiumVolumeData
		}

		if (optionsNotionalVolumeData) {
			charts['Options Notional Volume'] = optionsNotionalVolumeData
		}

		if (aggregatorsVolumeData) {
			charts['DEX Aggregator Volume'] = aggregatorsVolumeData
		}

		if (perpsAggregatorsVolumeData) {
			charts['Perp Aggregator Volume'] = perpsAggregatorsVolumeData
		}

		if (bridgeAggregatorsVolumeData) {
			charts['Bridge Aggregator Volume'] = bridgeAggregatorsVolumeData
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
		fetchingBridgeAggregatorVolume
	])

	return chartData
}
