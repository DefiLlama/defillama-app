import { lazy, Suspense, useMemo } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { useQuery } from '@tanstack/react-query'
import { getProtocolEmissons } from '~/api/categories/protocols'
import {
	useFetchProtocolActiveUsers,
	useFetchProtocolGovernanceData,
	useFetchProtocolMedianAPY,
	useFetchProtocolNewUsers,
	useFetchProtocolTransactions
} from '~/api/categories/protocols/client'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { downloadChart, formatBarChart, formatLineChart } from '~/components/ECharts/utils'
import { EmbedChart } from '~/components/EmbedChart'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import {
	BRIDGEVOLUME_API_SLUG,
	CACHE_SERVER,
	NFT_MARKETPLACES_VOLUME_API,
	PROTOCOL_TREASURY_API,
	TOKEN_LIQUIDITY_API
} from '~/constants'
import { getAdapterProtocolSummary, IAdapterSummary } from '~/containers/DimensionAdapters/queries'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { capitalizeFirstLetter, firstDayOfMonth, lastDayOfWeek, nearestUtcZeroHour, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { IDenominationPriceHistory, IProtocolOverviewPageData, IToggledMetrics } from '../types'
import { buildProtocolAddlChartsData } from '../utils'
import { BAR_CHARTS, protocolCharts, ProtocolChartsLabels } from './constants'

const ProtocolLineBarChart = lazy(() => import('./Chart')) as React.FC<any>

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

const INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const

export function ProtocolChart(props: IProtocolOverviewPageData) {
	const router = useRouter()
	const [isThemeDark] = useDarkModeManager()

	const queryParamsString = useMemo(() => {
		return JSON.stringify(router.query ?? {})
	}, [router.query])

	const { toggledMetrics, hasAtleasOneBarChart, toggledCharts, groupBy, defaultToggledCharts } = useMemo(() => {
		const queryParams = JSON.parse(queryParamsString)
		const chartsByStaus = {}
		for (const pchart in protocolCharts) {
			const chartKey = protocolCharts[pchart]
			chartsByStaus[chartKey] = queryParams[chartKey] === 'true' ? 'true' : 'false'
		}

		const defaultToggledCharts: ProtocolChartsLabels[] = [props.isCEX ? 'Total Assets' : 'TVL', 'Events' as any]

		const toggled = {
			...chartsByStaus
		} as Record<(typeof protocolCharts)[keyof typeof protocolCharts], 'true' | 'false'>

		const historicalTvlsIsAlwaysZero = props.tvlChartData.every((tvl) => tvl[1] === 0)

		if (!props.metrics.tvl || historicalTvlsIsAlwaysZero) {
			if (props.metrics.dexs) {
				defaultToggledCharts.push('DEX Volume')
				toggled.dexVolume = queryParams.dexVolume === 'false' ? 'false' : 'true'
			} else if (props.metrics.perps) {
				defaultToggledCharts.push('Perp Volume')
				toggled.perpVolume = queryParams.perpVolume === 'false' ? 'false' : 'true'
			} else if (props.metrics.options) {
				defaultToggledCharts.push('Options Premium Volume')
				defaultToggledCharts.push('Options Notional Volume')
				toggled.optionsPremiumVolume = queryParams.optionsPremiumVolume === 'false' ? 'false' : 'true'
				toggled.optionsNotionalVolume = queryParams.optionsNotionalVolume === 'false' ? 'false' : 'true'
			} else if (props.metrics.dexAggregators) {
				defaultToggledCharts.push('DEX Aggregator Volume')
				toggled.dexAggregatorVolume = queryParams.dexAggregatorVolume === 'false' ? 'false' : 'true'
			} else if (props.metrics.bridgeAggregators) {
				defaultToggledCharts.push('Bridge Aggregator Volume')
				toggled.bridgeAggregatorVolume = queryParams.bridgeAggregatorVolume === 'false' ? 'false' : 'true'
			} else if (props.metrics.perpsAggregators) {
				defaultToggledCharts.push('Perp Aggregator Volume')
				toggled.perpAggregatorVolume = queryParams.perpAggregatorVolume === 'false' ? 'false' : 'true'
			} else if (props.metrics.fees) {
				defaultToggledCharts.push('Fees')
				toggled.fees = queryParams.fees === 'false' ? 'false' : 'true'
			} else if (props.metrics.revenue) {
				defaultToggledCharts.push('Revenue')
				defaultToggledCharts.push('Holders Revenue')
				toggled.revenue = queryParams.revenue === 'false' ? 'false' : 'true'
				toggled.holdersRevenue = queryParams.holdersRevenue === 'false' ? 'false' : 'true'
			} else if (props.metrics.unlocks) {
				defaultToggledCharts.push('Unlocks')
				toggled.unlocks = queryParams.unlocks === 'false' ? 'false' : 'true'
			} else if (props.metrics.treasury) {
				defaultToggledCharts.push('Treasury')
				toggled.treasury = queryParams.treasury === 'false' ? 'false' : 'true'
			} else {
				// if (props.metrics.bridge) {
				// 	 toggled.bridgeVolume = queryParams.bridgeVolume === 'false' ? 'false' : 'true'
				// }
			}
		}

		const toggledMetrics = {
			...toggled,
			...(props.isCEX
				? { totalAssets: queryParams.totalAssets === 'false' ? 'false' : 'true' }
				: { tvl: queryParams.tvl === 'false' || !props.metrics.tvl || historicalTvlsIsAlwaysZero ? 'false' : 'true' }),
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
				? typeof queryParams.groupBy === 'string' && INTERVALS_LIST.includes(queryParams.groupBy as any)
					? (queryParams.groupBy as any)
					: (props.defaultChartView ?? 'daily')
				: (props.defaultChartView ?? 'daily'),
			defaultToggledCharts
		}
	}, [queryParamsString, props])

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const { finalCharts, valueSymbol, loadingCharts } = useFetchAndFormatChartData({
		...props,
		toggledMetrics,
		groupBy: groupBy,
		tvlSettings,
		feesSettings,
		isCEX: props.isCEX
	})

	const metricsDialogStore = Ariakit.useDialogStore()

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
				{props.availableCharts.length > 0 ? (
					<Ariakit.DialogProvider store={metricsDialogStore}>
						<Ariakit.DialogDisclosure className="flex shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-white px-2 py-1 font-normal hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) dark:bg-[#181A1C]">
							<span>Add Metrics</span>
							<Icon name="plus" className="h-[14px] w-[14px]" />
						</Ariakit.DialogDisclosure>
						<Ariakit.Dialog className="dialog max-sm:drawer gap-3 sm:w-full" unmountOnHide>
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
															? defaultToggledCharts.includes(chart)
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
										className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										<span>{chart.replace('Token', props.token?.symbol ? `$${props.token.symbol}` : 'Token')}</span>
										{toggledMetrics[protocolCharts[chart]] === 'true' ? (
											<Icon name="x" className="h-[14px] w-[14px]" />
										) : (
											<Icon name="plus" className="h-[14px] w-[14px]" />
										)}
									</button>
								))}
								{props.hallmarks?.length > 0 || props.rangeHallmarks?.length > 0 ? (
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
										className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
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
						className="relative flex cursor-pointer flex-nowrap items-center gap-1 text-sm last-of-type:mr-auto"
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
										defaultToggledCharts.includes(tchart) ? 'false' : null
									),
									undefined,
									{
										shallow: true
									}
								)
							}}
							className="peer absolute h-[1em] w-[1em] opacity-[0.00001]"
						/>
						<span
							className="flex items-center gap-1 rounded-full border-2 border-(--old-blue) px-2 py-1 text-xs"
							style={{
								borderColor: props.chartColors[tchart]
							}}
						>
							<span>{tchart.replace('Token', props.token?.symbol ? `$${props.token.symbol}` : 'Token')}</span>
							<Icon name="x" className="h-[14px] w-[14px]" />
						</span>
					</label>
				))}
				{toggledMetrics.events === 'true' && (props.hallmarks?.length > 0 || props.rangeHallmarks?.length > 0) ? (
					<label className="relative flex cursor-pointer flex-nowrap items-center gap-1 text-sm last-of-type:mr-auto">
						<input
							type="checkbox"
							value="events"
							checked={true}
							onChange={() => {
								router.push(
									updateQueryParamInUrl(router.asPath, 'events', toggledMetrics.events === 'true' ? 'false' : 'true'),
									undefined,
									{
										shallow: true
									}
								)
							}}
							className="peer absolute h-[1em] w-[1em] opacity-[0.00001]"
						/>
						<span
							className="flex items-center gap-1 rounded-full border-2 border-(--old-blue) px-2 py-1 text-xs"
							style={{
								borderColor: props.chartColors['TVL']
							}}
						>
							<span>Events</span>
							<Icon name="x" className="h-[14px] w-[14px]" />
						</span>
					</label>
				) : null}
				<div className="ml-auto flex flex-wrap justify-end gap-1">
					{props.chartDenominations?.length ? (
						<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
							{props.chartDenominations.map((denom) => (
								<button
									key={`denomination-${denom.symbol}`}
									className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--old-blue)"
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
						<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
							{INTERVALS_LIST.map((dataInterval) => (
								<Tooltip
									content={capitalizeFirstLetter(dataInterval)}
									render={<button />}
									className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
									data-active={groupBy === dataInterval}
									onClick={() => {
										router.push(updateQueryParamInUrl(router.asPath, 'groupBy', dataInterval), undefined, {
											shallow: true
										})
									}}
									key={`${props.name}-overview-groupBy-${dataInterval}`}
								>
									{dataInterval.slice(0, 1).toUpperCase()}
								</Tooltip>
							))}
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
						replaceClassName
						className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-[6px] text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					/>
				</div>
			</div>
			<div className="flex min-h-[360px] flex-col">
				{loadingCharts ? (
					<p className="my-auto flex min-h-[360px] flex-col items-center justify-center text-center text-xs">
						fetching {loadingCharts}...
					</p>
				) : (
					<Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
						<ProtocolLineBarChart
							chartData={finalCharts}
							chartColors={props.chartColors}
							isThemeDark={isThemeDark}
							valueSymbol={valueSymbol}
							groupBy={groupBy}
							hallmarks={toggledMetrics.events === 'true' ? props.hallmarks : null}
							rangeHallmarks={toggledMetrics.events === 'true' ? props.rangeHallmarks : null}
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
	feesSettings,
	isCEX
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
			fetchJson(`${CACHE_SERVER}/cgchart/${denominationGeckoId}?fullChart=true`).then((res) => {
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
			fetchJson(`${CACHE_SERVER}/cgchart/${geckoId}?fullChart=true`).then((res) =>
				res.data.prices.length > 0 ? res.data : { prices: [], mcaps: [], volumes: [] }
			),
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
		queryFn: () => fetchJson(`${CACHE_SERVER}/supply/${geckoId}`).then((res) => res.data?.['total_supply']),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: geckoId && toggledMetrics.fdv === 'true' && isRouterReady ? true : false
	})

	const { data: tokenLiquidityData = null, isLoading: fetchingTokenLiquidity } = useQuery({
		queryKey: ['tokenLiquidity', protocolId],
		queryFn: () => fetchJson(`${TOKEN_LIQUIDITY_API}/${protocolId.replaceAll('#', '$')}`).catch(() => null),
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
							adapterType: 'aggregator-derivatives',
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

	const isUnlocksEnabled =
		(toggledMetrics.unlocks === 'true' || toggledMetrics.incentives === 'true') && metrics.unlocks && isRouterReady
			? true
			: false
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
				? fetchJson(`${PROTOCOL_TREASURY_API}/${slug(name)}`).then((data) => {
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
		queryKey: ['usdInflows', name, isUsdInflowsEnabled, JSON.stringify(tvlSettings)],
		queryFn: () =>
			isUsdInflowsEnabled
				? fetchJson(`https://api.llama.fi/protocol/${slug(name)}`).then((data) => {
						return (
							buildProtocolAddlChartsData({ protocolData: data as any, extraTvlsEnabled: tvlSettings })?.usdInflows ??
							null
						)
					})
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isUsdInflowsEnabled
	})

	const isBridgeVolumeEnabled = toggledMetrics.bridgeVolume === 'true' && isRouterReady ? true : false
	const { data: bridgeVolumeData = null, isLoading: fetchingBridgeVolume } = useQuery({
		queryKey: ['bridgeVolume', name, isBridgeVolumeEnabled],
		queryFn: () =>
			isBridgeVolumeEnabled
				? fetchJson(`${BRIDGEVOLUME_API_SLUG}/${slug(name)}`)
						.then((data) => {
							const store = {}
							for (const item of data.dailyVolumes) {
								store[item.date] = (store[item.date] ?? 0) + (item.depositUSD + item.withdrawUSD) / 2
							}
							const finalChart = []
							for (const date in store) {
								finalChart.push([+date * 1e3, store[date]])
							}
							return finalChart
						})
						.catch(() => null)
				: Promise.resolve(null),
		staleTime: 60 * 60 * 1000,
		retry: 0,
		enabled: isBridgeVolumeEnabled
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

	const isNftVolumeEnabled = toggledMetrics.nftVolume === 'true' && metrics.nfts && isRouterReady ? true : false
	const { data: nftVolumeData = null, isLoading: fetchingNftVolume } = useQuery({
		queryKey: ['nftVolume', name, isNftVolumeEnabled],
		queryFn: () =>
			isNftVolumeEnabled
				? fetchJson(NFT_MARKETPLACES_VOLUME_API, { timeout: 10_000 })
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
		? (chartDenominations.find((d) => d.symbol === toggledMetrics.denomination)?.symbol ?? '')
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
		if (fetchingBridgeVolume) {
			loadingCharts.push('Bridge Volume')
		}
		if (loadingCharts.length > 0) {
			return {
				finalCharts: {} as Record<string, Array<[string | number, number]>>,
				valueSymbol,
				loadingCharts: loadingCharts.join(', ').toLowerCase()
			}
		}

		const charts: { [key in ProtocolChartsLabels]?: Array<[number, number]> } = {}

		if (tvlChart?.length > 0 && (toggledMetrics.tvl === 'true' || toggledMetrics.totalAssets === 'true')) {
			const chartName: ProtocolChartsLabels = isCEX ? 'Total Assets' : ('TVL' as const)
			charts[chartName] = tvlChart
		}

		if (protocolTokenData) {
			if (toggledMetrics.mcap === 'true') {
				const chartName: ProtocolChartsLabels = 'Mcap' as const
				charts[chartName] = formatLineChart({
					data: protocolTokenData.mcaps,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
			if (toggledMetrics.tokenPrice === 'true') {
				const chartName: ProtocolChartsLabels = 'Token Price' as const
				charts[chartName] = formatLineChart({
					data: protocolTokenData.prices,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
			if (toggledMetrics.tokenVolume === 'true') {
				const chartName: ProtocolChartsLabels = 'Token Volume' as const
				charts[chartName] = formatBarChart({
					data: protocolTokenData.volumes,
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
			if (toggledMetrics.fdv === 'true') {
				const chartName: ProtocolChartsLabels = 'FDV' as const
				charts[chartName] = formatLineChart({
					data: protocolTokenData.prices.map(([date, price]) => [date, price * tokenTotalSupply]),
					groupBy,
					dateInMs: true,
					denominationPriceHistory
				})
			}
		}

		if (tokenLiquidityData) {
			const chartName: ProtocolChartsLabels = 'Token Liquidity' as const
			charts[chartName] = formatLineChart({ data: tokenLiquidityData, groupBy, denominationPriceHistory })
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
			const chartName: ProtocolChartsLabels = 'Fees' as const
			charts[chartName] = finalFeesChart
		}

		if (finalRevenueChart.length > 0) {
			const chartName: ProtocolChartsLabels = 'Revenue' as const
			charts[chartName] = finalRevenueChart
		}

		if (finalHoldersRevenueChart.length > 0) {
			const chartName: ProtocolChartsLabels = 'Holders Revenue' as const
			charts[chartName] = finalHoldersRevenueChart
		}

		if (dexVolumeData) {
			const chartName: ProtocolChartsLabels = 'DEX Volume' as const
			charts[chartName] = formatBarChart({ data: dexVolumeData.totalDataChart, groupBy, denominationPriceHistory })
		}

		if (perpsVolumeData) {
			const chartName: ProtocolChartsLabels = 'Perp Volume' as const
			charts[chartName] = formatBarChart({
				data: perpsVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (optionsPremiumVolumeData) {
			const chartName: ProtocolChartsLabels = 'Options Premium Volume' as const
			charts[chartName] = formatBarChart({
				data: optionsPremiumVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (optionsNotionalVolumeData) {
			const chartName: ProtocolChartsLabels = 'Options Notional Volume' as const
			charts[chartName] = formatBarChart({
				data: optionsNotionalVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (dexAggregatorsVolumeData) {
			const chartName: ProtocolChartsLabels = 'DEX Aggregator Volume' as const
			charts[chartName] = formatBarChart({
				data: dexAggregatorsVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (perpsAggregatorsVolumeData) {
			const chartName: ProtocolChartsLabels = 'Perp Aggregator Volume' as const
			charts[chartName] = formatBarChart({
				data: perpsAggregatorsVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (bridgeAggregatorsVolumeData) {
			const chartName: ProtocolChartsLabels = 'Bridge Aggregator Volume' as const
			charts[chartName] = formatBarChart({
				data: bridgeAggregatorsVolumeData.totalDataChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (toggledMetrics.unlocks === 'true' && unlocksAndIncentivesData?.chartData?.documented.length > 0) {
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

			const chartName: ProtocolChartsLabels = 'Unlocks' as const
			charts[chartName] = finalChart
		}

		if (toggledMetrics.incentives === 'true' && unlocksAndIncentivesData?.unlockUsdChart) {
			const chartName: ProtocolChartsLabels = 'Incentives' as const
			const nonZeroIndex = unlocksAndIncentivesData.unlockUsdChart.findIndex(([_, value]) => value > 0)
			const finalUnlocksChart = unlocksAndIncentivesData.unlockUsdChart.slice(nonZeroIndex)
			charts[chartName] = formatBarChart({
				data: finalUnlocksChart,
				groupBy,
				denominationPriceHistory
			})
		}

		if (extraTvlCharts?.staking && toggledMetrics.staking_tvl === 'true') {
			const chartData = []
			for (const date in extraTvlCharts.staking) {
				chartData.push([+date * 1e3, extraTvlCharts.staking[date]])
			}
			const chartName: ProtocolChartsLabels = 'Staking' as const
			charts[chartName] = formatLineChart({ data: chartData, groupBy, dateInMs: true, denominationPriceHistory })
		}

		if (extraTvlCharts?.borrowed && toggledMetrics.borrowed_tvl === 'true') {
			const chartData = []
			for (const date in extraTvlCharts.borrowed) {
				chartData.push([+date * 1e3, extraTvlCharts.borrowed[date]])
			}
			const chartName: ProtocolChartsLabels = 'Borrowed' as const
			charts[chartName] = formatLineChart({ data: chartData, groupBy, dateInMs: true, denominationPriceHistory })
		}

		if (medianAPYData) {
			const chartName: ProtocolChartsLabels = 'Median APY' as const
			charts[chartName] = formatLineChart({
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
			const chartName1: ProtocolChartsLabels = 'Total Proposals' as const
			charts[chartName1] = finalTotalProposals
			const chartName2: ProtocolChartsLabels = 'Successful Proposals' as const
			charts[chartName2] = finalSuccessfulProposals
			const chartName3: ProtocolChartsLabels = 'Max Votes' as const
			charts[chartName3] = finalMaxVotes
		}

		if (nftVolumeData && toggledMetrics.nftVolume === 'true') {
			const chartName: ProtocolChartsLabels = 'NFT Volume' as const
			charts[chartName] = formatBarChart({
				data: nftVolumeData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		}

		if (activeAddressesData && toggledMetrics.activeAddresses === 'true') {
			const chartName: ProtocolChartsLabels = 'Active Addresses' as const
			charts[chartName] = formatBarChart({
				data: activeAddressesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (newAddressesData && toggledMetrics.newAddresses === 'true') {
			const chartName: ProtocolChartsLabels = 'New Addresses' as const
			charts[chartName] = formatBarChart({
				data: newAddressesData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (transactionsData && toggledMetrics.transactions === 'true') {
			const chartName: ProtocolChartsLabels = 'Transactions' as const
			charts[chartName] = formatBarChart({
				data: transactionsData,
				groupBy,
				denominationPriceHistory: null,
				dateInMs: true
			})
		}

		if (treasuryData && toggledMetrics.treasury === 'true') {
			const chartName: ProtocolChartsLabels = 'Treasury' as const
			charts[chartName] = formatLineChart({
				data: treasuryData,
				groupBy,
				dateInMs: true,
				denominationPriceHistory
			})
		}

		if (usdInflowsData && toggledMetrics.usdInflows === 'true') {
			const chartName: ProtocolChartsLabels = 'USD Inflows' as const
			charts[chartName] = formatBarChart({
				data: usdInflowsData,
				groupBy,
				denominationPriceHistory
			})
		}

		if (bridgeVolumeData && toggledMetrics.bridgeVolume === 'true') {
			charts['Bridge Volume'] = formatBarChart({
				data: bridgeVolumeData,
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
		fetchingNftVolume,
		nftVolumeData,
		fetchingBridgeVolume,
		bridgeVolumeData,
		groupBy,
		extraTvlCharts,
		valueSymbol
	])

	return chartData
}

// disabled: tweets, gas used, bridge inflows
// use nearestUtcZeroHour for all dates
// check if all charts need to have same time range
