import { useRouter } from 'next/router'
import { IDenominationPriceHistory, IProtocolOverviewPageData, IToggledMetrics } from '../types'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { lazy, Suspense, useMemo, useState } from 'react'
import { BAR_CHARTS, protocolCharts, ProtocolChartsLabels } from './constants'
import { getAdapterProtocolSummary, IAdapterSummary } from '~/containers/DimensionAdapters/queries'
import { useQuery } from '@tanstack/react-query'
import { download, firstDayOfMonth, lastDayOfWeek, nearestUtcZeroHour, slug, toNiceCsvDate } from '~/utils'
import { CACHE_SERVER, NFT_MARKETPLACES_VOLUME_API, PROTOCOL_TREASURY_API, TOKEN_LIQUIDITY_API } from '~/constants'
import { getProtocolEmissons } from '~/api/categories/protocols'
import {
	useFetchProtocolActiveUsers,
	useFetchProtocolDevMetrics,
	useFetchProtocolGovernanceData,
	useFetchProtocolMedianAPY,
	useFetchProtocolNewUsers,
	useFetchProtocolTransactions
} from '~/api/categories/protocols/client'
import { fetchWithTimeout } from '~/utils/async'
import { EmbedChart } from '~/components/EmbedChart'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

const ProtocolLineBarChart = lazy(() => import('./Chart2')) as React.FC<any>

// Utility function to update any query parameter in URL
const updateQueryParamInUrl = (currentUrl: string, queryKey: string, newValue: string): string => {
	if (typeof document === 'undefined') return `${currentUrl}?${queryKey}=${newValue}`
	const url = new URL(currentUrl, window.location.origin)

	// If value is falsy or empty, remove the parameter
	if (!newValue || newValue === '') {
		url.searchParams.delete(queryKey)
	} else {
		// Replace or add the parameter
		url.searchParams.set(queryKey, newValue)
	}

	return url.pathname + url.search
}

const groupByOptions = ['daily', 'weekly', 'monthly', 'cumulative'] as const

function downloadChart(data: Record<string, Array<[string | number, number]>>, filename: string) {
	let rows = []
	const charts = []
	const dateStore = {}
	for (const chartName in data) {
		charts.push(chartName)
		for (const [date, value] of data[chartName]) {
			if (!dateStore[date]) {
				dateStore[date] = {}
			}
			dateStore[date][chartName] = value
		}
	}
	rows.push(['Timestamp', 'Date', ...charts])
	for (const date in dateStore) {
		const values = []
		for (const chartName in data) {
			values.push(dateStore[date]?.[chartName] ?? '')
		}
		rows.push([date, toNiceCsvDate(+date / 1000), ...values])
	}
	download(filename, rows.map((r) => r.join(',')).join('\n'))
}

export function ProtocolChart2(props: IProtocolOverviewPageData) {
	const router = useRouter()
	const [isThemeDark] = useDarkModeManager()

	const queryParamsString = useMemo(() => {
		return JSON.stringify(router.query ?? {})
	}, [router.query])

	const { toggledMetrics, hasAtleasOneBarChart, toggledCharts, groupBy } = useMemo(() => {
		const queryParams = JSON.parse(queryParamsString)
		const chartsByStaus = {}
		for (const pchart in protocolCharts) {
			const chartKey = protocolCharts[pchart]
			chartsByStaus[chartKey] = queryParams[chartKey] === 'true' ? 'true' : 'false'
		}
		const toggled = {
			...chartsByStaus,
			...((!props.metrics.tvl
				? props.metrics.dexs
					? { dexVolume: queryParams.dexVolume === 'false' ? 'false' : 'true' }
					: props.metrics.perps
					? { perpVolume: queryParams.perpVolume === 'false' ? 'false' : 'true' }
					: props.metrics.options
					? {
							optionsPremiumVolume: queryParams.optionsPremiumVolume === 'false' ? 'false' : 'true',
							optionsNotionalVolume: queryParams.optionsNotionalVolume === 'false' ? 'false' : 'true'
					  }
					: props.metrics.dexAggregators
					? { dexAggregatorVolume: queryParams.dexAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.bridgeAggregators
					? { bridgeAggregatorVolume: queryParams.bridgeAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.perpsAggregators
					? { perpAggregatorVolume: queryParams.perpAggregatorVolume === 'false' ? 'false' : 'true' }
					: props.metrics.bridge
					? { bridgeVolume: queryParams.bridgeVolume === 'false' ? 'false' : 'true' }
					: props.metrics.fees
					? {
							fees: queryParams.fees === 'false' ? 'false' : 'true'
					  }
					: props.metrics.revenue
					? {
							revenue: queryParams.revenue === 'false' ? 'false' : 'true',
							holdersRevenue: queryParams.holdersRevenue === 'false' ? 'false' : 'true'
					  }
					: props.metrics.unlocks
					? { unlocks: queryParams.unlocks === 'false' ? 'false' : 'true' }
					: props.metrics.treasury
					? { treasury: queryParams.treasury === 'false' ? 'false' : 'true' }
					: {}
				: {}) as Record<string, 'true' | 'false'>)
		} as Record<typeof protocolCharts[keyof typeof protocolCharts], 'true' | 'false'>

		const toggledMetrics = {
			...toggled,
			tvl: queryParams.tvl === 'false' ? 'false' : 'true',
			events: queryParams.events === 'false' ? 'false' : 'true',
			denomination: typeof queryParams.denomination === 'string' ? queryParams.denomination : null
		} as IToggledMetrics

		const toggledCharts = props.availableCharts.filter((chart) => toggledMetrics[protocolCharts[chart]] === 'true')

		const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

		return {
			toggledMetrics,
			toggledCharts,
			hasAtleasOneBarChart,
			groupBy: hasAtleasOneBarChart
				? typeof queryParams.groupBy === 'string' && groupByOptions.includes(queryParams.groupBy as any)
					? (queryParams.groupBy as any)
					: 'daily'
				: 'daily'
		}
	}, [queryParamsString, props.availableCharts, props.metrics])

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const { finalCharts, valueSymbol, loadingCharts } = useFetchAndFormatChartData({
		...props,
		toggledMetrics,
		groupBy: groupBy,
		tvlSettings,
		feesSettings
	})

	const metricsDialogStore = Ariakit.useDialogStore()

	const [isDownloading, setIsDownloading] = useState(false)

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:justify-start">
				{props.availableCharts.length > 0 ? (
					<Ariakit.DialogProvider store={metricsDialogStore}>
						<Ariakit.DialogDisclosure className="flex shrink-0 items-center justify-between gap-2 py-1 px-2 font-normal rounded-md cursor-pointer bg-white dark:bg-[#181A1C] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) border border-[#e6e6e6] dark:border-[#222324]">
							<span>Add Metrics</span>
							<Icon name="plus" className="h-[14px] w-[14px]" />
						</Ariakit.DialogDisclosure>
						<Ariakit.Dialog className="dialog gap-3 sm:w-full max-sm:drawer" unmountOnHide>
							<Ariakit.DialogHeading className="text-2xl font-bold">Add metrics to chart</Ariakit.DialogHeading>
							<div className="flex flex-wrap gap-2">
								{props.availableCharts.map((chart) => (
									<button
										key={`add-metric-${chart}`}
										onClick={() => {
											router
												.push(
													updateQueryParamInUrl(
														router.asPath,
														protocolCharts[chart],
														toggledMetrics[protocolCharts[chart]] === 'true'
															? chart === 'TVL'
																? 'false'
																: null
															: 'true'
													),
													undefined,
													{
														shallow: true
													}
												)
												.then(() => {
													metricsDialogStore.toggle()
												})
										}}
										data-active={toggledMetrics[protocolCharts[chart]] === 'true'}
										className="flex items-center gap-1 border border-(--old-blue) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) rounded-full px-2 py-1 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										<span>{chart}</span>
										{toggledMetrics[protocolCharts[chart]] === 'true' ? (
											<Icon name="x" className="h-[14px] w-[14px]" />
										) : (
											<Icon name="plus" className="h-[14px] w-[14px]" />
										)}
									</button>
								))}
								{props.hallmarks.length > 0 ? (
									<button
										onClick={() => {
											router
												.push(
													updateQueryParamInUrl(
														router.asPath,
														'events',
														toggledMetrics.events === 'true' ? 'false' : 'true'
													),
													undefined,
													{
														shallow: true
													}
												)
												.then(() => {
													metricsDialogStore.toggle()
												})
										}}
										data-active={toggledMetrics.events === 'true'}
										className="flex items-center gap-1 border border-(--old-blue) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) rounded-full px-2 py-1 data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										<span>Events</span>
										{toggledMetrics.events === 'true' ? (
											<Icon name="x" className="h-[14px] w-[14px]" />
										) : (
											<Icon name="plus" className="h-[14px] w-[14px]" />
										)}
									</button>
								) : null}
							</div>
						</Ariakit.Dialog>
					</Ariakit.DialogProvider>
				) : null}
				{toggledCharts.map((tchart) => (
					<label
						className="relative text-sm cursor-pointer flex items-center gap-1 flex-nowrap last-of-type:mr-auto"
						key={`add-or-remove-metric-${tchart}`}
					>
						<input
							type="checkbox"
							value={tchart}
							checked={true}
							onChange={() => {
								router.push(
									updateQueryParamInUrl(
										router.asPath,
										protocolCharts[tchart],
										['TVL', 'Events'].includes(tchart) ? 'false' : null
									),
									undefined,
									{
										shallow: true
									}
								)
							}}
							className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
						/>
						<span
							className="text-xs flex items-center gap-1 border-2 border-(--old-blue) rounded-full px-2 py-1"
							style={{
								borderColor: props.chartColors[tchart]
							}}
						>
							<span>{tchart}</span>
							<Icon name="x" className="h-[14px] w-[14px]" />
						</span>
					</label>
				))}
				<div className="ml-auto flex flex-wrap justify-end gap-1">
					{props.chartDenominations?.length ? (
						<div className="flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-[#666] dark:text-[#919296]">
							{props.chartDenominations.map((denom) => (
								<button
									key={`denomination-${denom.symbol}`}
									className="shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--old-blue)"
									data-active={
										toggledMetrics.denomination === denom.symbol ||
										(denom.symbol === 'USD' && !toggledMetrics.denomination)
									}
									onClick={() => {
										router.push(
											updateQueryParamInUrl(router.asPath, 'denomination', denom.symbol === 'USD' ? '' : denom.symbol),
											undefined,
											{ shallow: true }
										)
									}}
								>
									{denom.symbol}
								</button>
							))}
						</div>
					) : null}
					{hasAtleasOneBarChart ? (
						<div className="flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-[#666] dark:text-[#919296]">
							<Tooltip
								content="Daily"
								render={<button />}
								className="shrink-0 py-1 px-2 whitespace-nowrap font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
								data-active={groupBy === 'daily' || !groupBy}
								onClick={() => {
									router.push(updateQueryParamInUrl(router.asPath, 'groupBy', 'daily'), undefined, { shallow: true })
								}}
							>
								D
							</Tooltip>
							<Tooltip
								content="Weekly"
								render={<button />}
								className="shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
								data-active={groupBy === 'weekly'}
								onClick={() => {
									router.push(updateQueryParamInUrl(router.asPath, 'groupBy', 'weekly'), undefined, { shallow: true })
								}}
							>
								W
							</Tooltip>
							<Tooltip
								content="Monthly"
								render={<button />}
								className="shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
								data-active={groupBy === 'monthly'}
								onClick={() => {
									router.push(updateQueryParamInUrl(router.asPath, 'groupBy', 'monthly'), undefined, { shallow: true })
								}}
							>
								M
							</Tooltip>
							<button
								className="shrink-0 py-1 px-2 whitespace-nowrap data-[active=true]:font-medium text-sm hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
								data-active={groupBy === 'cumulative'}
								onClick={() => {
									router.push(updateQueryParamInUrl(router.asPath, 'groupBy', 'cumulative'), undefined, {
										shallow: true
									})
								}}
							>
								Cumulative
							</button>
						</div>
					) : null}
					<EmbedChart />
					<CSVDownloadButton
						onClick={() => {
							try {
								downloadChart(finalCharts, `${props.name}.csv`)
							} catch (error) {
								console.error('Error generating CSV:', error)
							}
						}}
						smol
						className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
					/>
				</div>
			</div>
			<div className="flex flex-col min-h-[360px]">
				{loadingCharts ? (
					<p className="text-center text-xs my-auto min-h-[360px] flex flex-col items-center justify-center">
						fetching {loadingCharts}...
					</p>
				) : (
					<Suspense fallback={<div className="flex items-center justify-center m-auto min-h-[360px]" />}>
						<ProtocolLineBarChart
							chartData={finalCharts}
							chartColors={props.chartColors}
							isThemeDark={isThemeDark}
							valueSymbol={valueSymbol}
							groupBy={groupBy}
							hallmarks={toggledMetrics.events === 'true' ? props.hallmarks : null}
							unlockTokenSymbol={props.token.symbol}
						/>
					</Suspense>
				)}
			</div>
		</div>
	)
}

export const useFetchAndFormatChartData = ({
	name,
	id: protocolId,
	geckoId,
	currentTvlByChain,
	tvlChartData,
	extraTvlCharts,
	metrics,
	toggledMetrics,
	groupBy,
	chartDenominations,
	governanceApis,
	tvlSettings,
	feesSettings
}: IProtocolOverviewPageData & {
	toggledMetrics: IToggledMetrics
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	tvlSettings: Record<string, boolean>
	feesSettings: Record<string, boolean>
}) => {
	const router = useRouter()
	const isRouterReady = router.isReady

	const denominationGeckoId =
		isRouterReady && toggledMetrics.denomination
			? chartDenominations.find((d) => d.symbol === toggledMetrics.denomination)?.geckoId
			: null
	// date in the chart is in ms
	const { data: denominationPriceHistory = null, isLoading: fetchingDenominationPriceHistory } = useQuery<
		Record<string, number>
	>({
		queryKey: ['priceHistory', denominationGeckoId],
		queryFn: () =>
			fetch(`${CACHE_SERVER}/cgchart/${denominationGeckoId}?fullChart=true`)
				.then((r) => r.json())
				.then((res) => {
					if (!res.data?.prices?.length) return null

					const store = {}
					for (const [date, value] of res.data.prices) {
						store[date] = value
					}

					return store
				}),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: denominationGeckoId ? true : false
	})

	// date in the chart is in ms
	const { data: protocolTokenData = null, isLoading: fetchingProtocolTokenData } = useQuery<IDenominationPriceHistory>({
		queryKey: ['priceHistory', geckoId],
		queryFn: () =>
			fetch(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`)
				.then((r) => r.json())
				.then((res) => (res.data.prices.length > 0 ? res.data : { prices: [], mcaps: [], volumes: [] })),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled:
			isRouterReady &&
			(toggledMetrics.mcap === 'true' ||
				toggledMetrics.tokenPrice === 'true' ||
				toggledMetrics.tokenVolume === 'true' ||
				toggledMetrics.fdv === 'true') &&
			geckoId
				? true
				: false
	})

	const { data: tokenTotalSupply = null, isLoading: fetchingTokenTotalSupply } = useQuery({
		queryKey: ['tokenSupply', geckoId],
		queryFn: () =>
			fetch(`${CACHE_SERVER}/supply/${geckoId}`)
				.then((res) => res.json())
				.then((res) => res.data?.['total_supply']),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: geckoId && toggledMetrics.fdv === 'true' && isRouterReady ? true : false
	})

	const { data: tokenLiquidityData = null, isLoading: fetchingTokenLiquidity } = useQuery({
		queryKey: ['tokenLiquidity', protocolId],
		queryFn: () =>
			fetch(`${TOKEN_LIQUIDITY_API}/${protocolId.replaceAll('#', '$')}`)
				.then((res) => res.json())
				.catch(() => null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isRouterReady && metrics.liquidity && toggledMetrics.tokenLiquidity === 'true' ? true : false
	})

	const tvlChart = useMemo(() => {
		const extraTvls = []

		for (const extra in tvlSettings) {
			if (tvlSettings[extra] && currentTvlByChain?.[extra] != null) {
				extraTvls.push(extra)
			}
		}

		if (extraTvls.length > 0) {
			const store = {}
			const isWeekly = groupBy === 'weekly'
			const isMonthly = groupBy === 'monthly'
			for (const [date, value] of tvlChartData) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				store[dateKey] = value + extraTvls.reduce((acc, curr) => acc + (extraTvlCharts?.[curr]?.[dateKey] ?? 0), 0)
			}
			const finalChart = []
			for (const date in store) {
				const finalValue = denominationPriceHistory
					? denominationPriceHistory[String(+date * 1e3)]
						? store[date] / denominationPriceHistory[String(+date * 1e3)]
						: null
					: store[date]
				finalChart.push([+date * 1e3, finalValue])
			}
			return finalChart as Array<[number, number]>
		}

		return formatLineChart({ data: tvlChartData, groupBy, denominationPriceHistory })
	}, [tvlChartData, extraTvlCharts, tvlSettings, groupBy, denominationPriceHistory, currentTvlByChain])

	const isFeesEnabled = toggledMetrics.fees === 'true' && metrics.fees && isRouterReady ? true : false
	const { data: feesData = null, isLoading: fetchingFees } = useQuery<IAdapterSummary>({
		queryKey: ['fees', name, isFeesEnabled],
		queryFn: () =>
			isFeesEnabled
				? getAdapterProtocolSummary({
						adapterType: 'fees',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isFeesEnabled
	})

	const isRevenueEnabled = toggledMetrics.revenue === 'true' && metrics.revenue && isRouterReady ? true : false
	const { data: revenueData = null, isLoading: fetchingRevenue } = useQuery<IAdapterSummary>({
		queryKey: ['revenue', name, isRevenueEnabled],
		queryFn: () =>
			isRevenueEnabled
				? getAdapterProtocolSummary({
						adapterType: 'fees',
						dataType: 'dailyRevenue',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isRevenueEnabled
	})

	const isHoldersRevenueEnabled =
		toggledMetrics.holdersRevenue === 'true' && (metrics.fees || metrics.revenue) && isRouterReady ? true : false
	const { data: holdersRevenueData = null, isLoading: fetchingHoldersRevenue } = useQuery<IAdapterSummary>({
		queryKey: ['holders-revenue', name, isHoldersRevenueEnabled],
		queryFn: () =>
			isHoldersRevenueEnabled
				? getAdapterProtocolSummary({
						adapterType: 'fees',
						dataType: 'dailyHoldersRevenue',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isHoldersRevenueEnabled
	})

	const isBribesEnabled =
		(toggledMetrics.fees === 'true' || toggledMetrics.revenue === 'true' || toggledMetrics.holdersRevenue === 'true') &&
		feesSettings?.bribes &&
		metrics.bribes &&
		isRouterReady
			? true
			: false
	const { data: bribesData = null, isLoading: fetchingBribes } = useQuery<IAdapterSummary>({
		queryKey: ['bribes', name, isBribesEnabled],
		queryFn: () =>
			isBribesEnabled
				? getAdapterProtocolSummary({
						adapterType: 'fees',
						dataType: 'dailyBribesRevenue',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isBribesEnabled
	})

	const isTokenTaxesEnabled =
		(toggledMetrics.fees === 'true' || toggledMetrics.revenue === 'true' || toggledMetrics.holdersRevenue === 'true') &&
		feesSettings?.tokentax &&
		metrics.tokenTax &&
		isRouterReady
	const { data: tokenTaxesData = null, isLoading: fetchingTokenTaxes } = useQuery<IAdapterSummary>({
		queryKey: ['token-taxes', name, isTokenTaxesEnabled],
		queryFn: () =>
			isTokenTaxesEnabled
				? getAdapterProtocolSummary({
						adapterType: 'fees',
						dataType: 'dailyTokenTaxes',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isTokenTaxesEnabled
	})

	const isDexVolumeEnabled = toggledMetrics.dexVolume === 'true' && metrics.dexs && isRouterReady ? true : false
	const { data: dexVolumeData = null, isLoading: fetchingDexVolume } = useQuery<IAdapterSummary>({
		queryKey: ['dexVolume', name, isDexVolumeEnabled],
		queryFn: () =>
			isDexVolumeEnabled
				? getAdapterProtocolSummary({
						adapterType: 'dexs',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isDexVolumeEnabled
	})

	const isPerpsVolumeEnabled = toggledMetrics.perpVolume === 'true' && metrics.perps && isRouterReady ? true : false
	const { data: perpsVolumeData = null, isLoading: fetchingPerpVolume } = useQuery<IAdapterSummary>({
		queryKey: ['perpVolume', name, isPerpsVolumeEnabled],
		queryFn: () =>
			isPerpsVolumeEnabled
				? getAdapterProtocolSummary({
						adapterType: 'derivatives',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isPerpsVolumeEnabled
	})

	const isOptionsPremiumVolumeEnabled =
		toggledMetrics.optionsPremiumVolume === 'true' && metrics.options && isRouterReady ? true : false
	const { data: optionsPremiumVolumeData = null, isLoading: fetchingOptionsPremiumVolume } = useQuery<IAdapterSummary>({
		queryKey: ['optionsPremiumVolume', name, isOptionsPremiumVolumeEnabled],
		queryFn: () =>
			isOptionsPremiumVolumeEnabled
				? getAdapterProtocolSummary({
						adapterType: 'options',
						dataType: 'dailyPremiumVolume',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isOptionsPremiumVolumeEnabled
	})

	const isOptionsNotionalVolumeEnabled =
		toggledMetrics.optionsNotionalVolume === 'true' && metrics.options && isRouterReady ? true : false
	const { data: optionsNotionalVolumeData = null, isLoading: fetchingOptionsNotionalVolume } =
		useQuery<IAdapterSummary>({
			queryKey: ['optionsNotionalVolume', name, isOptionsNotionalVolumeEnabled],
			queryFn: () =>
				isOptionsNotionalVolumeEnabled
					? getAdapterProtocolSummary({
							adapterType: 'options',
							dataType: 'dailyNotionalVolume',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
					  })
					: Promise.resolve(null),
			staleTime: 60 * 60 * 1000,
			retry: 0,
			enabled: isOptionsNotionalVolumeEnabled
		})

	const isDexAggregatorsVolumeEnabled =
		toggledMetrics.dexAggregatorVolume === 'true' && metrics.dexAggregators && isRouterReady ? true : false
	const { data: dexAggregatorsVolumeData = null, isLoading: fetchingDexAggregatorVolume } = useQuery<IAdapterSummary>({
		queryKey: ['dexAggregatorVolume', name, isDexAggregatorsVolumeEnabled],
		queryFn: () =>
			isDexAggregatorsVolumeEnabled
				? getAdapterProtocolSummary({
						adapterType: 'aggregators',
						protocol: name,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
				  })
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isDexAggregatorsVolumeEnabled
	})

	const isPerpsAggregatorsVolumeEnabled =
		toggledMetrics.perpAggregatorVolume === 'true' && metrics.perpsAggregators && isRouterReady ? true : false
	const { data: perpsAggregatorsVolumeData = null, isLoading: fetchingPerpAggregatorVolume } =
		useQuery<IAdapterSummary>({
			queryKey: ['perpAggregatorVolume', name, isPerpsAggregatorsVolumeEnabled],
			queryFn: () =>
				isPerpsAggregatorsVolumeEnabled
					? getAdapterProtocolSummary({
							adapterType: 'derivatives-aggregator',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
					  })
					: Promise.resolve(null),
			staleTime: 60 * 60 * 1000,
			retry: 0,
			enabled: isPerpsAggregatorsVolumeEnabled
		})

	const isBridgeAggregatorsVolumeEnabled =
		toggledMetrics.bridgeAggregatorVolume === 'true' && metrics.bridgeAggregators && isRouterReady ? true : false
	const { data: bridgeAggregatorsVolumeData = null, isLoading: fetchingBridgeAggregatorVolume } =
		useQuery<IAdapterSummary>({
			queryKey: ['bridgeAggregatorVolume', name, isBridgeAggregatorsVolumeEnabled],
			queryFn: () =>
				isBridgeAggregatorsVolumeEnabled
					? getAdapterProtocolSummary({
							adapterType: 'bridge-aggregators',
							protocol: name,
							excludeTotalDataChart: false,
							excludeTotalDataChartBreakdown: true
					  })
					: Promise.resolve(null),
			staleTime: 60 * 60 * 1000,
			retry: 0,
			enabled: isBridgeAggregatorsVolumeEnabled
		})

	const isUnlocksEnabled = toggledMetrics.unlocks === 'true' && metrics.unlocks && isRouterReady ? true : false
	const { data: unlocksAndIncentivesData = null, isLoading: fetchingUnlocksAndIncentives } = useQuery({
		queryKey: ['unlocks', name, isUnlocksEnabled],
		queryFn: () => (isUnlocksEnabled ? getProtocolEmissons(slug(name)) : Promise.resolve(null)),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isUnlocksEnabled
	})

	const isTreasuryEnabled = toggledMetrics.treasury === 'true' && metrics.treasury && isRouterReady ? true : false
	const { data: treasuryData = null, isLoading: fetchingTreasury } = useQuery({
		queryKey: ['treasury', name, isTreasuryEnabled],
		queryFn: () =>
			isTreasuryEnabled
				? fetch(`${PROTOCOL_TREASURY_API}/${slug(name)}`)
						.then((res) => res.json())
						.then((data) => {
							const store = {}
							for (const chain in data.chainTvls) {
								if (chain.includes('-')) continue
								for (const item of data.chainTvls[chain].tvl ?? []) {
									store[item.date] = (store[item.date] ?? 0) + (item.totalLiquidityUSD ?? 0)
								}
							}
							const finalChart = []
							for (const date in store) {
								finalChart.push([+date * 1e3, store[date]])
							}
							return finalChart
						})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isTreasuryEnabled
	})

	const isUsdInflowsEnabled = toggledMetrics.usdInflows === 'true' && metrics.tvl && isRouterReady ? true : false
	const { data: usdInflowsData = null, isLoading: fetchingUsdInflows } = useQuery({
		queryKey: ['usdInflows', name, isUsdInflowsEnabled],
		queryFn: () =>
			isUsdInflowsEnabled
				? fetch(`https://api.llama.fi/protocol/${slug(name)}`)
						.then((res) => res.json())
						.then((data) => {
							const store = {}
							for (const item of data.tokensInUsd) {
								for (const token in item.tokens) {
									store[item.date] = (store[item.date] ?? 0) + (item.tokens?.[token] ?? 0)
								}
							}
							const finalChart = []
							for (const date in store) {
								finalChart.push([+date * 1e3, store[date]])
							}
							return finalChart
						})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isUsdInflowsEnabled
	})

	const { data: medianAPYData = null, isLoading: fetchingMedianAPY } = useFetchProtocolMedianAPY(
		isRouterReady && toggledMetrics.medianApy === 'true' && metrics.yields && !protocolId.startsWith('parent#')
			? slug(name)
			: null
	)

	const { data: activeAddressesData = null, isLoading: fetchingActiveAddresses } = useFetchProtocolActiveUsers(
		isRouterReady && toggledMetrics.activeAddresses === 'true' && metrics.activeUsers ? protocolId : null
	)
	const { data: newAddressesData = null, isLoading: fetchingNewAddresses } = useFetchProtocolNewUsers(
		isRouterReady && toggledMetrics.newAddresses === 'true' && metrics.activeUsers ? protocolId : null
	)
	const { data: transactionsData = null, isLoading: fetchingTransactions } = useFetchProtocolTransactions(
		isRouterReady && toggledMetrics.transactions === 'true' && metrics.activeUsers ? protocolId : null
	)
	// const { data: gasData, isLoading: fetchingGasUsed } = useFetchProtocolGasUsed(
	// 	isRouterReady && toggledMetrics.gasUsed === 'true' && metrics.activeUsers ? protocolId : null
	// )

	const { data: governanceData = null, isLoading: fetchingGovernanceData } = useFetchProtocolGovernanceData(
		isRouterReady &&
			[toggledMetrics.totalProposals, toggledMetrics.successfulProposals, toggledMetrics.maxVotes].some(
				(v) => v === 'true'
			) &&
			governanceApis &&
			governanceApis.length > 0
			? governanceApis
			: null
	)

	const { data: devMetricsData = null, isLoading: fetchingDevMetrics } = useFetchProtocolDevMetrics(
		isRouterReady &&
			[
				toggledMetrics.devsMetrics,
				toggledMetrics.devsCommits,
				toggledMetrics.contributersMetrics,
				toggledMetrics.contributersCommits
			].some((v) => v === 'true')
			? protocolId
			: null
	)

	const isNftVolumeEnabled = toggledMetrics.nftVolume === 'true' && metrics.nfts && isRouterReady ? true : false
	const { data: nftVolumeData = null, isLoading: fetchingNftVolume } = useQuery({
		queryKey: ['nftVolume', name, isNftVolumeEnabled],
		queryFn: () =>
			isNftVolumeEnabled
				? fetchWithTimeout(NFT_MARKETPLACES_VOLUME_API, 10_000)
						.then((r) => r.json())
						.then((r) => {
							const chartByDate = r
								.filter((r) => slug(r.exchangeName) === slug(name))
								.map(({ day, sumUsd }) => {
									return [new Date(day).getTime(), sumUsd]
								})
							return chartByDate
						})
						.catch(() => [])
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isNftVolumeEnabled
	})

	const showNonUsdDenomination =
		toggledMetrics.denomination &&
		toggledMetrics.denomination !== 'USD' &&
		chartDenominations.find((d) => d.symbol === toggledMetrics.denomination) &&
		denominationPriceHistory
			? true
			: false

	const valueSymbol = showNonUsdDenomination
		? chartDenominations.find((d) => d.symbol === toggledMetrics.denomination)?.symbol ?? ''
		: '$'

	const chartData = useMemo(() => {
		const loadingCharts = []

		if (fetchingDenominationPriceHistory) {
			loadingCharts.push('Denomination Price History')
		}

		if (fetchingProtocolTokenData) {
			loadingCharts.push('Mcap, Token price, Token volume')
		}

		if (fetchingTokenTotalSupply) {
			loadingCharts.push('Token Supply')
		}

		if (fetchingTokenLiquidity) {
			loadingCharts.push('Token Liquidity')
		}

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
		if (fetchingDexAggregatorVolume) {
			loadingCharts.push('DEX Aggregator Volume')
		}
		if (fetchingPerpAggregatorVolume) {
			loadingCharts.push('Perp Aggregator Volume')
		}
		if (fetchingBridgeAggregatorVolume) {
			loadingCharts.push('Bridge Aggregator Volume')
		}
		if (fetchingUnlocksAndIncentives) {
			loadingCharts.push('Emissions')
		}
		if (fetchingTreasury) {
			loadingCharts.push('Treasury')
		}
		if (fetchingUsdInflows) {
			loadingCharts.push('USD Inflows')
		}
		if (fetchingMedianAPY) {
			loadingCharts.push('Median APY')
		}
		if (fetchingGovernanceData) {
			loadingCharts.push('Governance')
		}
		if (fetchingDevMetrics) {
			loadingCharts.push('Dev Metrics')
		}
		if (fetchingNftVolume) {
			loadingCharts.push('NFT Volume')
		}
		if (fetchingActiveAddresses) {
			loadingCharts.push('Active Addresses')
		}
		if (fetchingNewAddresses) {
			loadingCharts.push('New Addresses')
		}
		if (fetchingTransactions) {
			loadingCharts.push('Transactions')
		}

		if (loadingCharts.length > 0) {
			return {
				finalCharts: {} as Record<string, Array<[string | number, number]>>,
				stacks: [],
				valueSymbol,
				loadingCharts: loadingCharts.join(', ').toLowerCase()
			}
		}

		const charts: { [key in ProtocolChartsLabels]?: Array<[number, number]> } = {}

		if (tvlChart?.length > 0 && toggledMetrics.tvl === 'true') {
			charts.TVL = tvlChart
		}

		if (protocolTokenData) {
			if (toggledMetrics.mcap === 'true') {
				charts.Mcap = formatLineChart({
					data: protocolTokenData.mcaps,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
			if (toggledMetrics.tokenPrice === 'true') {
				charts['Token Price'] = formatLineChart({
					data: protocolTokenData.prices,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
			if (toggledMetrics.tokenVolume === 'true') {
				charts['Token Volume'] = formatLineChart({
					data: protocolTokenData.volumes,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
			if (toggledMetrics.fdv === 'true') {
				charts['FDV'] = formatLineChart({
					data: protocolTokenData.prices.map(([date, price]) => [date, price * tokenTotalSupply]),
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
		}

		if (tokenLiquidityData) {
			charts['Token Liquidity'] = formatLineChart({ data: tokenLiquidityData, groupBy, denominationPriceHistory })
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
				const finalValue = denominationPriceHistory
					? denominationPriceHistory[String(+date * 1e3)]
						? value / denominationPriceHistory[String(+date * 1e3)]
						: 0
					: value
				feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) {
					total += finalValue
				}
			}
		}

		if (revenueData) {
			let total = 0
			for (const [date, value] of revenueData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				const finalValue = denominationPriceHistory
					? denominationPriceHistory[String(+date * 1e3)]
						? value / denominationPriceHistory[String(+date * 1e3)]
						: 0
					: value
				revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) {
					total += finalValue
				}
			}
		}

		if (holdersRevenueData) {
			let total = 0
			for (const [date, value] of holdersRevenueData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				const finalValue = denominationPriceHistory
					? denominationPriceHistory[String(+date * 1e3)]
						? value / denominationPriceHistory[String(+date * 1e3)]
						: 0
					: value
				holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				if (isCumulative) {
					total += finalValue
				}
			}
		}

		if (bribesData) {
			let total = 0
			for (const [date, value] of bribesData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				const finalValue = denominationPriceHistory
					? denominationPriceHistory[String(+date * 1e3)]
						? value / denominationPriceHistory[String(+date * 1e3)]
						: 0
					: value

				if (feesData) {
					feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				}
				if (revenueData) {
					revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				}
				if (holdersRevenueData) {
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				}
				if (isCumulative) {
					total += finalValue
				}
			}
		}

		if (tokenTaxesData) {
			let total = 0
			for (const [date, value] of tokenTaxesData.totalDataChart) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				const finalValue = denominationPriceHistory
					? denominationPriceHistory[String(+date * 1e3)]
						? value / denominationPriceHistory[String(+date * 1e3)]
						: 0
					: value

				if (feesData) {
					feesStore[dateKey] = (feesStore[dateKey] ?? 0) + finalValue + total
				}
				if (revenueData) {
					revenueStore[dateKey] = (revenueStore[dateKey] ?? 0) + finalValue + total
				}
				if (holdersRevenueData) {
					holdersRevenueStore[dateKey] = (holdersRevenueStore[dateKey] ?? 0) + finalValue + total
				}
				if (isCumulative) {
					total += finalValue
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
			charts['DEX Volume'] = formatBarChart({ data: dexVolumeData.totalDataChart, groupBy, denominationPriceHistory })
		}

		if (perpsVolumeData) {
			charts['Perp Volume'] = formatBarChart({
				data: perpsVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (optionsPremiumVolumeData) {
			charts['Options Premium Volume'] = formatBarChart({
				data: optionsPremiumVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (optionsNotionalVolumeData) {
			charts['Options Notional Volume'] = formatBarChart({
				data: optionsNotionalVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (dexAggregatorsVolumeData) {
			charts['DEX Aggregator Volume'] = formatBarChart({
				data: dexAggregatorsVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (perpsAggregatorsVolumeData) {
			charts['Perp Aggregator Volume'] = formatBarChart({
				data: perpsAggregatorsVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (bridgeAggregatorsVolumeData) {
			charts['Bridge Aggregator Volume'] = formatBarChart({
				data: bridgeAggregatorsVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (unlocksAndIncentivesData?.chartData?.documented.length > 0) {
			const isWeekly = groupBy === 'weekly'
			const isMonthly = groupBy === 'monthly'
			const store = {}
			for (const { date, ...rest } of unlocksAndIncentivesData.chartData.documented) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1000) : isMonthly ? firstDayOfMonth(+date * 1000) : date
				let total = 0
				for (const label in rest) {
					total += rest[label]
				}
				store[dateKey] = (store[dateKey] ?? 0) + total
			}

			const finalChart = []
			for (const date in store) {
				finalChart.push([+date * 1e3, store[date]])
			}

			charts['Unlocks'] = finalChart
		}

		if (unlocksAndIncentivesData?.unlockUsdChart) {
			charts['Incentives'] = formatBarChart({
				data: unlocksAndIncentivesData.unlockUsdChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (extraTvlCharts?.staking && toggledMetrics.staking_tvl === 'true') {
			const chartData = []
			for (const date in extraTvlCharts.staking) {
				chartData.push([+date * 1e3, extraTvlCharts.staking[date]])
			}
			charts['Staking'] = formatLineChart({ data: chartData, groupBy, dateInMs: true, denominationPriceHistory })
		}

		if (extraTvlCharts?.borrowed && toggledMetrics.borrowed_tvl === 'true') {
			const chartData = []
			for (const date in extraTvlCharts.borrowed) {
				chartData.push([+date * 1e3, extraTvlCharts.borrowed[date]])
			}
			charts['Borrowed'] = formatLineChart({ data: chartData, groupBy, dateInMs: true, denominationPriceHistory })
		}

		if (medianAPYData) {
			charts['Median APY'] = formatLineChart({
				data: medianAPYData.map((item) => [+item.date * 1e3, item.medianAPY]),
				groupBy,
				dateInMs: true,
				denominationPriceHistory: null
			})
		}

		if (governanceData) {
			const totalProposals = {}
			const successfulProposals = {}
			const maxVotes = {}
			for (const gItem of governanceData) {
				for (const item of gItem.activity ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+item.date * 1000) / 1000)
					totalProposals[date] = (totalProposals[date] ?? 0) + (item['Total'] || 0)
					successfulProposals[date] = (successfulProposals[date] ?? 0) + (item['Successful'] || 0)
				}
				for (const item of gItem.maxVotes ?? []) {
					const date = Math.floor(nearestUtcZeroHour(+item.date * 1000) / 1000)
					maxVotes[date] = (maxVotes[date] ?? 0) + (item['Max Votes'] || 0)
				}
			}
			const finalTotalProposals = []
			const finalSuccessfulProposals = []
			const finalMaxVotes = []
			for (const date in totalProposals) {
				finalTotalProposals.push([+date * 1e3, totalProposals[date]])
			}
			for (const date in successfulProposals) {
				finalSuccessfulProposals.push([+date * 1e3, successfulProposals[date]])
			}
			for (const date in maxVotes) {
				finalMaxVotes.push([+date * 1e3, maxVotes[date]])
			}
			charts['Total Proposals'] = finalTotalProposals
			charts['Successful Proposals'] = finalSuccessfulProposals
			charts['Max Votes'] = finalMaxVotes
		}

		if (devMetricsData && (toggledMetrics.devsMetrics === 'true' || toggledMetrics.devsCommits === 'true')) {
			const developers = []
			const commits = []

			const metricKey = groupBy === 'monthly' ? 'monthly_devs' : 'weekly_devs'

			for (const { k, v, cc } of devMetricsData.report?.[metricKey] ?? []) {
				const date = Math.floor(nearestUtcZeroHour(new Date(k).getTime()) / 1000)

				developers.push([+date * 1e3, v])
				commits.push([+date * 1e3, cc])
			}

			if (toggledMetrics.devsMetrics === 'true') {
				charts['Developers'] = developers
			}

			if (toggledMetrics.devsCommits === 'true') {
				charts['Devs Commits'] = commits
			}
		}

		if (
			devMetricsData &&
			(toggledMetrics.contributersMetrics === 'true' || toggledMetrics.contributersCommits === 'true')
		) {
			const contributers = []
			const commits = []

			const metricKey = groupBy === 'monthly' ? 'monthly_contributers' : 'weekly_contributers'

			for (const { k, v, cc } of devMetricsData.report?.[metricKey] ?? []) {
				const date = Math.floor(nearestUtcZeroHour(new Date(k).getTime()) / 1000)

				contributers.push([+date * 1e3, v])
				commits.push([+date * 1e3, cc])
			}

			if (toggledMetrics.contributersMetrics === 'true') {
				charts['Contributers'] = contributers
			}

			if (toggledMetrics.contributersCommits === 'true') {
				charts['Contributers Commits'] = commits
			}
		}

		if (nftVolumeData && toggledMetrics.nftVolume === 'true') {
			charts['NFT Volume'] = formatBarChart({
				data: nftVolumeData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		}

		if (activeAddressesData && toggledMetrics.activeAddresses === 'true') {
			charts['Active Addresses'] = formatLineChart({
				data: activeAddressesData,
				groupBy,
				denominationPriceHistory: null
			})
		}

		if (newAddressesData && toggledMetrics.newAddresses === 'true') {
			charts['New Addresses'] = formatLineChart({
				data: newAddressesData,
				groupBy,
				denominationPriceHistory: null
			})
		}

		if (transactionsData && toggledMetrics.transactions === 'true') {
			charts['Transactions'] = formatLineChart({
				data: transactionsData,
				groupBy,
				denominationPriceHistory: null
			})
		}

		if (treasuryData && toggledMetrics.treasury === 'true') {
			charts['Treasury'] = formatLineChart({
				data: treasuryData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		}

		if (usdInflowsData && toggledMetrics.usdInflows === 'true') {
			charts['USD Inflows'] = formatBarChart({
				data: usdInflowsData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		}

		return { finalCharts: charts, valueSymbol, loadingCharts: '' }
	}, [
		toggledMetrics,
		tvlChart,
		fetchingDenominationPriceHistory,
		denominationPriceHistory,
		fetchingProtocolTokenData,
		protocolTokenData,
		fetchingTokenTotalSupply,
		tokenTotalSupply,
		fetchingTokenLiquidity,
		tokenLiquidityData,
		fetchingFees,
		feesData,
		fetchingRevenue,
		revenueData,
		fetchingHoldersRevenue,
		holdersRevenueData,
		fetchingBribes,
		bribesData,
		fetchingTokenTaxes,
		tokenTaxesData,
		fetchingDexVolume,
		dexVolumeData,
		fetchingPerpVolume,
		perpsVolumeData,
		fetchingOptionsPremiumVolume,
		optionsPremiumVolumeData,
		fetchingOptionsNotionalVolume,
		optionsNotionalVolumeData,
		fetchingDexAggregatorVolume,
		dexAggregatorsVolumeData,
		fetchingPerpAggregatorVolume,
		perpsAggregatorsVolumeData,
		fetchingBridgeAggregatorVolume,
		bridgeAggregatorsVolumeData,
		fetchingUnlocksAndIncentives,
		unlocksAndIncentivesData,
		fetchingTreasury,
		treasuryData,
		fetchingUsdInflows,
		usdInflowsData,
		fetchingMedianAPY,
		medianAPYData,
		fetchingActiveAddresses,
		activeAddressesData,
		fetchingNewAddresses,
		newAddressesData,
		fetchingTransactions,
		transactionsData,
		fetchingGovernanceData,
		governanceData,
		fetchingDevMetrics,
		devMetricsData,
		fetchingNftVolume,
		nftVolumeData,
		groupBy,
		extraTvlCharts,
		valueSymbol
	])

	return chartData
}

const formatBarChart = ({
	data,
	groupBy,
	dateInMs = false,
	denominationPriceHistory
}: {
	data: Array<[string | number, number]>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	dateInMs?: boolean
	hasNoPrice?: boolean
	denominationPriceHistory: Record<string, number> | null
}): Array<[number, number]> => {
	if (['weekly', 'monthly', 'cumulative'].includes(groupBy)) {
		const store = {}
		let total = 0
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'
		for (const [date, value] of data) {
			const dateKey = isWeekly
				? lastDayOfWeek(dateInMs ? +date : +date * 1e3)
				: isMonthly
				? firstDayOfMonth(dateInMs ? +date : +date * 1e3)
				: date
			// sum up values as it is bar chart
			if (denominationPriceHistory) {
				const price = denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
				store[dateKey] = (store[dateKey] ?? 0) + (price ? value / price : 0) + total
				if (isCumulative && price) {
					total += value / price
				}
			} else {
				store[dateKey] = (store[dateKey] ?? 0) + value + total
				if (isCumulative) {
					total += value
				}
			}
		}
		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}
	if (denominationPriceHistory) {
		return data.map(([date, value]) => {
			const price = denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
			return [dateInMs ? +date : +date * 1e3, price ? value / price : null]
		})
	} else {
		return dateInMs ? (data as Array<[number, number]>) : data.map(([date, value]) => [+date * 1e3, value])
	}
}

const formatLineChart = ({
	data,
	groupBy,
	dateInMs = false,
	denominationPriceHistory
}: {
	data: Array<[string | number, number]>
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	dateInMs?: boolean
	denominationPriceHistory: Record<string, number> | null
}): Array<[number, number]> => {
	if (['weekly', 'monthly'].includes(groupBy)) {
		const store = {}
		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		for (const [date, value] of data) {
			const dateKey = isWeekly
				? lastDayOfWeek(dateInMs ? +date : +date * 1e3)
				: isMonthly
				? firstDayOfMonth(dateInMs ? +date : +date * 1e3)
				: date
			// do not sum up values, just use the last value for each date
			const finalValue = denominationPriceHistory
				? denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
					? value / denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
					: null
				: value
			store[dateKey] = finalValue
		}
		const finalChart = []
		for (const date in store) {
			finalChart.push([+date * 1e3, store[date]])
		}
		return finalChart
	}
	if (denominationPriceHistory) {
		return data.map(([date, value]) => {
			const price = denominationPriceHistory[String(dateInMs ? date : +date * 1e3)]
			return [dateInMs ? +date : +date * 1e3, price ? value / price : null]
		})
	} else {
		return dateInMs ? (data as Array<[number, number]>) : data.map(([date, value]) => [+date * 1e3, value])
	}
}

// disabled: tweets, gas used, bridge inflows
// use nearestUtcZeroHour for all dates
// check if all charts need to have same time range
