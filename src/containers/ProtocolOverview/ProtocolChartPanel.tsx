import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { useRouter } from 'next/router'
import { type ComponentType, lazy, Suspense, useDeferredValue, useMemo, useState } from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { prepareChartCsv } from '~/components/ECharts/utils'
import { EmbedChart } from '~/components/EmbedChart'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { serializeProtocolChartToMultiChart } from '~/containers/ProDashboard/utils/chartSerializer'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useIsClient } from '~/hooks/useIsClient'
import { slug } from '~/utils'
import { tokenIconUrl } from '~/utils/icons'
import { pushShallowQuery } from '~/utils/routerQuery'
import { BAR_CHARTS, protocolCharts, type ProtocolChartsLabels } from './constants'
import type { IProtocolOverviewPageData, IToggledMetrics, IProtocolCoreChartProps } from './types'
import { useFetchProtocolChartData } from './useFetchProtocolChartData'

const resolveVisibility = ({
	queryValue,
	defaultEnabled
}: {
	queryValue: string | null
	defaultEnabled: boolean
}): 'true' | 'false' => {
	if (queryValue === 'true') return 'true'
	if (queryValue === 'false') return 'false'
	return defaultEnabled ? 'true' : 'false'
}

const getQueryValueOnRemove = (isDefaultEnabled: boolean): 'false' | null => (isDefaultEnabled ? 'false' : null)

const isChartInterval = (value: string | null): value is LowercaseDwmcGrouping =>
	value != null && DWMC_GROUPING_OPTIONS_LOWERCASE.some((option) => option.value === value)
const normalizeChartInterval = (value: string | null | undefined): LowercaseDwmcGrouping | null => {
	const normalizedValue = value?.toLowerCase() ?? null
	return isChartInterval(normalizedValue) ? normalizedValue : null
}

const ProtocolChart = lazy(() =>
	import('./Chart').then((m) => ({ default: m.default as ComponentType<IProtocolCoreChartProps> }))
)

type ProtocolMetricOption =
	| {
			id: ProtocolChartsLabels
			label: string
			active: boolean
			type: 'chart'
	  }
	| {
			id: 'events'
			label: string
			active: boolean
			type: 'events'
	  }

const getProtocolMetricLabel = (chart: ProtocolChartsLabels, tokenSymbol?: string | null) =>
	chart.replace('Token', tokenSymbol ? `$${tokenSymbol}` : 'Token')

export function ProtocolChartPanel(props: IProtocolOverviewPageData) {
	const router = useRouter()
	const searchParams = useMemo(() => {
		const queryString = router.asPath.split('?')[1]?.split('#')[0] ?? ''
		return new URLSearchParams(queryString)
	}, [router.asPath])
	const [isThemeDark] = useDarkModeManager()
	const { chartInstance: overviewChartInstance, handleChartReady: handleOverviewChartReady } = useChartImageExport()
	const overviewImageFilename = slug(props.name)
	const overviewImageTitle = props.name
	const chartDenominationByLowerSymbol = useMemo(
		() => new Map(props.chartDenominations.map((d) => [d.symbol.toLowerCase(), d])),
		[props.chartDenominations]
	)

	const { toggledMetrics, hasAtleasOneBarChart, toggledCharts, groupBy, defaultEnabledCharts, hasEvents } =
		useMemo(() => {
			const defaultEnabledChartSet = new Set<ProtocolChartsLabels>(props.defaultToggledCharts)
			const defaultEnabledCharts: Partial<Record<ProtocolChartsLabels, boolean>> = {}
			const chartsByVisibility: Record<string, 'true' | 'false'> = {}
			for (const chartLabel of Object.keys(protocolCharts) as ProtocolChartsLabels[]) {
				const chartKey = protocolCharts[chartLabel]
				const defaultEnabled = defaultEnabledChartSet.has(chartLabel)
				defaultEnabledCharts[chartLabel] = defaultEnabled
				chartsByVisibility[chartKey] = resolveVisibility({
					queryValue: searchParams.get(chartKey),
					defaultEnabled
				})
			}

			const denominationInSearchParams = searchParams.get('denomination')?.toLowerCase()
			const hasEvents = (props.hallmarks?.length ?? 0) > 0 || (props.rangeHallmarks?.length ?? 0) > 0

			const toggledMetrics = {
				...chartsByVisibility,
				denomination: denominationInSearchParams
					? (chartDenominationByLowerSymbol.get(denominationInSearchParams)?.symbol ?? null)
					: null,
				events: hasEvents
					? resolveVisibility({ queryValue: searchParams.get('events'), defaultEnabled: true })
					: 'false'
			} as IToggledMetrics

			const toggledCharts = props.availableCharts.filter((chart) => toggledMetrics[protocolCharts[chart]] === 'true')

			const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

			return {
				toggledMetrics,
				toggledCharts,
				hasAtleasOneBarChart,
				hasEvents,
				groupBy: (() => {
					if (!hasAtleasOneBarChart) return 'daily'
					// Preserve existing shared/bookmarked URLs that still use title-cased values like `Weekly`.
					const groupByParam = normalizeChartInterval(searchParams.get('groupBy'))
					if (groupByParam) return groupByParam
					return normalizeChartInterval(props.defaultChartView) ?? 'daily'
				})(),
				defaultEnabledCharts
			}
		}, [
			searchParams,
			chartDenominationByLowerSymbol,
			props.hallmarks,
			props.rangeHallmarks,
			props.defaultToggledCharts,
			props.availableCharts,
			props.defaultChartView
		])

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')

	const { finalCharts, valueSymbol, loadingCharts, failedMetrics } = useFetchProtocolChartData({
		...props,
		toggledMetrics,
		groupBy: groupBy,
		tvlSettings,
		feesSettings,
		isCEX: props.isCEX
	})
	const chartRenderModel = useMemo(
		() => ({
			chartData: finalCharts,
			valueSymbol
		}),
		[finalCharts, valueSymbol]
	)
	const deferredChartRenderModel = useDeferredValue(chartRenderModel)
	const loadingChartSet = useMemo(() => new Set(loadingCharts), [loadingCharts])
	const loadingChartsText = loadingCharts.join(', ').toLowerCase()
	const hasVisibleCharts = Object.keys(deferredChartRenderModel.chartData).length > 0

	const metricsDialogStore = Ariakit.useDialogStore()
	const [metricsSearchValue, setMetricsSearchValue] = useState('')
	const deferredMetricsSearchValue = useDeferredValue(metricsSearchValue)

	const prepareCsv = () => prepareChartCsv(finalCharts, `${props.name}.csv`)

	const { multiChart, unsupportedMetrics } = useMemo(() => {
		return serializeProtocolChartToMultiChart({
			protocolId: slug(props.name),
			protocolName: props.name,
			geckoId: props.geckoId,
			toggledMetrics: toggledCharts,
			chartColors: props.chartColors,
			groupBy
		})
	}, [props.name, props.geckoId, toggledCharts, props.chartColors, groupBy])

	const isClient = useIsClient()
	const shouldShowEnabledEventsChip = toggledMetrics.events === 'true'

	const filteredMetricOptions = useMemo(() => {
		const options: ProtocolMetricOption[] = props.availableCharts.map((chart) => ({
			id: chart,
			label: getProtocolMetricLabel(chart, props.token?.symbol),
			active: toggledMetrics[protocolCharts[chart]] === 'true',
			type: 'chart'
		}))

		if (hasEvents) {
			options.push({
				id: 'events',
				label: 'Events',
				active: toggledMetrics.events === 'true',
				type: 'events'
			})
		}

		if (!deferredMetricsSearchValue) {
			return options
		}

		return matchSorter(options, deferredMetricsSearchValue, {
			keys: ['label', 'id'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [props.availableCharts, props.token?.symbol, toggledMetrics, hasEvents, deferredMetricsSearchValue])

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-start gap-2">
				{props.availableCharts.length > 0 ? (
					<Ariakit.DialogProvider store={metricsDialogStore}>
						<Ariakit.DialogDisclosure className="flex shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-white px-2 py-1 font-normal hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) dark:bg-[#181A1C]">
							<span>Add Metrics</span>
							<Icon name="plus" className="h-3.5 w-3.5" />
						</Ariakit.DialogDisclosure>
						<Ariakit.Dialog className="dialog gap-3 max-sm:drawer sm:w-full" unmountOnHide>
							<span className="flex items-center justify-between gap-1">
								<Ariakit.DialogHeading className="text-2xl font-bold">Add metrics to chart</Ariakit.DialogHeading>
								<Ariakit.DialogDismiss className="ml-auto p-2 opacity-50">
									<Icon name="x" className="h-5 w-5" />
								</Ariakit.DialogDismiss>
							</span>

							<label className="relative">
								<span className="sr-only">Search metrics</span>
								<Icon
									name="search"
									height={16}
									width={16}
									className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
								/>
								<input
									type="text"
									name="search"
									inputMode="search"
									placeholder="Search..."
									autoFocus
									value={metricsSearchValue}
									className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-base text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
									onChange={(e) => setMetricsSearchValue(e.currentTarget.value)}
								/>
							</label>

							<div className="flex flex-wrap gap-2">
								{filteredMetricOptions.map((option) => (
									<button
										key={`add-metric-${option.id}`}
										onClick={() => {
											if (option.type === 'events') {
												void pushShallowQuery(router, {
													events: toggledMetrics.events === 'true' ? (getQueryValueOnRemove(true) ?? undefined) : 'true'
												}).then(() => {
													metricsDialogStore.toggle()
												})
												return
											}

											void pushShallowQuery(router, {
												[protocolCharts[option.id]]:
													toggledMetrics[protocolCharts[option.id]] === 'true'
														? (getQueryValueOnRemove(defaultEnabledCharts[option.id] === true) ?? undefined)
														: 'true'
											}).then(() => {
												metricsDialogStore.toggle()
											})
										}}
										data-active={option.active}
										className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										<span>{option.label}</span>
										{option.active ? (
											<Icon name="x" className="h-3.5 w-3.5" />
										) : (
											<Icon name="plus" className="h-3.5 w-3.5" />
										)}
									</button>
								))}
								{filteredMetricOptions.length === 0 ? (
									<p className="py-2 text-sm text-(--text-tertiary)">No metrics found.</p>
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
								void pushShallowQuery(router, {
									[protocolCharts[tchart]]: getQueryValueOnRemove(defaultEnabledCharts[tchart] === true) ?? undefined
								})
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
							{loadingChartSet.has(tchart) ? (
								<span
									aria-label={`${tchart} is loading`}
									className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
								/>
							) : (
								<Icon name="x" className="h-3.5 w-3.5" />
							)}
						</span>
					</label>
				))}
				{shouldShowEnabledEventsChip ? (
					<label className="relative flex cursor-pointer flex-nowrap items-center gap-1 text-sm last-of-type:mr-auto">
						<input
							type="checkbox"
							value="events"
							checked={true}
							onChange={() => {
								void pushShallowQuery(router, {
									events: toggledMetrics.events === 'true' ? (getQueryValueOnRemove(true) ?? undefined) : 'true'
								})
							}}
							className="peer absolute h-[1em] w-[1em] opacity-[0.00001]"
						/>
						<span
							className="flex items-center gap-1 rounded-full border-2 border-(--old-blue) px-2 py-1 text-xs"
							style={{
								borderColor: props.chartColors['Events'] ?? props.chartColors['TVL'] ?? '#9CA3AF'
							}}
						>
							<span>Events</span>
							<Icon name="x" className="h-3.5 w-3.5" />
						</span>
					</label>
				) : null}
				<div className="ml-auto flex flex-wrap justify-end gap-1">
					{props.chartDenominations?.length ? (
						<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
							{props.chartDenominations.map((denom) => (
								<button
									key={`denomination-${denom.symbol}`}
									className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
									data-active={
										toggledMetrics.denomination === denom.symbol ||
										(denom.symbol === 'USD' && !toggledMetrics.denomination)
									}
									onClick={() => {
										void pushShallowQuery(router, {
											denomination: denom.symbol === 'USD' ? undefined : denom.symbol
										})
									}}
								>
									{denom.symbol}
								</button>
							))}
						</div>
					) : null}
					{hasAtleasOneBarChart ? (
						<ChartGroupingSelector
							value={groupBy}
							onValueChange={(dataInterval) => {
								void pushShallowQuery(router, {
									groupBy: dataInterval
								})
							}}
							options={DWMC_GROUPING_OPTIONS_LOWERCASE}
						/>
					) : null}
					<EmbedChart />
					<AddToDashboardButton chartConfig={multiChart} unsupportedMetrics={unsupportedMetrics} smol />
					<CSVDownloadButton prepareCsv={prepareCsv} smol />
					<ChartPngExportButton
						chartInstance={overviewChartInstance}
						filename={overviewImageFilename}
						title={overviewImageTitle}
						iconUrl={tokenIconUrl(props.name)}
					/>
				</div>
			</div>
			<div className="relative flex min-h-[360px] flex-col">
				{!isClient ? null : !hasVisibleCharts && loadingCharts.length > 0 ? (
					<p className="my-auto flex min-h-[360px] items-center justify-center gap-1 text-center text-xs">
						fetching {loadingChartsText}
						<LoadingDots />
					</p>
				) : (
					<Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
						<ProtocolChart
							chartData={deferredChartRenderModel.chartData}
							chartColors={props.chartColors}
							isThemeDark={isThemeDark}
							valueSymbol={deferredChartRenderModel.valueSymbol}
							groupBy={groupBy}
							hallmarks={toggledMetrics.events === 'true' ? props.hallmarks : null}
							rangeHallmarks={toggledMetrics.events === 'true' ? props.rangeHallmarks : null}
							unlockTokenSymbol={props.token.symbol}
							onReady={handleOverviewChartReady}
						/>
					</Suspense>
				)}
				{isClient && hasVisibleCharts && loadingCharts.length > 0 ? (
					<p className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full border border-(--cards-border) bg-(--bg-main) px-2 py-1 text-xs text-(--text-tertiary)">
						<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
						<span>Fetching {loadingChartsText}</span>
					</p>
				) : null}
				{isClient && failedMetrics.length > 0 ? (
					<Ariakit.PopoverProvider>
						<Ariakit.PopoverDisclosure className="absolute right-2 bottom-2 z-10 flex items-center justify-center rounded-full border border-(--cards-border) bg-(--bg-main) p-1.5 text-(--error) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
							<Icon name="alert-triangle" className="h-3.5 w-3.5" />
							<span className="sr-only">Show failed metric APIs</span>
						</Ariakit.PopoverDisclosure>
						<Ariakit.Popover
							unmountOnHide
							hideOnInteractOutside
							gutter={6}
							className="z-10 mr-1 flex max-h-[calc(100dvh-80px)] w-[min(calc(100vw-16px),300px)] flex-col gap-1 overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-2 text-xs dark:border-[hsl(204,3%,32%)]"
						>
							<p className="font-medium text-(--error)">Failed to load data for:</p>
							<ul className="pl-4">
								{failedMetrics.map((metric) => (
									<li key={metric} className="list-disc">
										{metric.replace('Token', props.token?.symbol ? `$${props.token.symbol}` : 'Token')}
									</li>
								))}
							</ul>
						</Ariakit.Popover>
					</Ariakit.PopoverProvider>
				) : null}
			</div>
		</div>
	)
}
