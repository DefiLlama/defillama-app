import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { useRouter } from 'next/router'
import { type ComponentType, lazy, Suspense, useCallback, useDeferredValue, useMemo, useState } from 'react'
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
import { serializeProtocolChartToMultiChart } from '~/containers/ProDashboard/utils/chartSerializer'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useIsClient } from '~/hooks/useIsClient'
import { slug } from '~/utils'
import { tokenIconUrl } from '~/utils/icons'
import { pushShallowQuery } from '~/utils/routerQuery'
import {
	BAR_CHARTS,
	protocolChartCategories,
	protocolChartCategoryOrder,
	protocolCharts,
	type ProtocolChartCategory,
	type ProtocolChartsLabels
} from './constants'
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
			valueSymbol,
			gasUsedValueSymbol: props.chartDenominations[1]?.symbol ?? valueSymbol
		}),
		[finalCharts, props.chartDenominations, valueSymbol]
	)
	const deferredChartRenderModel = useDeferredValue(chartRenderModel)
	const loadingChartSet = useMemo(() => new Set(loadingCharts), [loadingCharts])

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

	const allMetricOptions = useMemo<ProtocolMetricOption[]>(() => {
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

		return options
	}, [props.availableCharts, props.token?.symbol, toggledMetrics, hasEvents])

	const filteredMetricOptions = useMemo(() => {
		if (!deferredMetricsSearchValue) return allMetricOptions
		return matchSorter(allMetricOptions, deferredMetricsSearchValue, {
			keys: ['label', 'id'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [allMetricOptions, deferredMetricsSearchValue])

	const selectedOptions = useMemo(() => allMetricOptions.filter((o) => o.active), [allMetricOptions])

	const categoryByMetric = useMemo(() => {
		const map = new Map<ProtocolChartsLabels, ProtocolChartCategory>()
		for (const category of protocolChartCategoryOrder) {
			for (const metric of protocolChartCategories[category]) {
				map.set(metric, category)
			}
		}
		return map
	}, [])

	const groupedFilteredOptions = useMemo(() => {
		const groups = new Map<ProtocolChartCategory | 'Annotations' | 'Other', ProtocolMetricOption[]>()
		const order: Array<ProtocolChartCategory | 'Annotations' | 'Other'> = [
			...protocolChartCategoryOrder,
			'Other',
			'Annotations'
		]
		for (const key of order) groups.set(key, [])

		for (const option of filteredMetricOptions) {
			if (option.type === 'events') {
				groups.get('Annotations')!.push(option)
				continue
			}
			const category = categoryByMetric.get(option.id) ?? 'Other'
			groups.get(category)!.push(option)
		}

		return order
			.map((label) => {
				const options = groups.get(label) ?? []
				return {
					label,
					options,
					selectedCount: options.reduce((acc, option) => acc + (option.active ? 1 : 0), 0)
				}
			})
			.filter((group) => group.options.length > 0)
	}, [filteredMetricOptions, categoryByMetric])

	const getOptionColor = useCallback(
		(option: ProtocolMetricOption): string => {
			if (option.type === 'events') {
				return props.chartColors['Events'] ?? props.chartColors['TVL'] ?? '#9CA3AF'
			}
			return props.chartColors[option.id] ?? '#9CA3AF'
		},
		[props.chartColors]
	)

	const handleToggleMetric = useCallback(
		(option: ProtocolMetricOption) => {
			if (option.type === 'events') {
				void pushShallowQuery(router, {
					events: toggledMetrics.events === 'true' ? (getQueryValueOnRemove(true) ?? undefined) : 'true'
				})
				return
			}
			void pushShallowQuery(router, {
				[protocolCharts[option.id]]:
					toggledMetrics[protocolCharts[option.id]] === 'true'
						? (getQueryValueOnRemove(defaultEnabledCharts[option.id] === true) ?? undefined)
						: 'true'
			})
		},
		[router, toggledMetrics, defaultEnabledCharts]
	)

	const handleClearAll = useCallback(() => {
		const updates: Record<string, string | undefined> = {}
		for (const chart of props.availableCharts) {
			if (toggledMetrics[protocolCharts[chart]] === 'true') {
				updates[protocolCharts[chart]] = getQueryValueOnRemove(defaultEnabledCharts[chart] === true) ?? undefined
			}
		}
		if (hasEvents && toggledMetrics.events === 'true') {
			updates.events = getQueryValueOnRemove(true) ?? undefined
		}
		if (Object.keys(updates).length > 0) {
			void pushShallowQuery(router, updates)
		}
	}, [router, props.availableCharts, toggledMetrics, defaultEnabledCharts, hasEvents])

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-start gap-2">
				{props.availableCharts.length > 0 ? (
					<Ariakit.DialogProvider store={metricsDialogStore}>
						<Ariakit.DialogDisclosure className="flex shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-white px-2 py-1 font-normal hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) dark:bg-[#181A1C]">
							<span>Add Metrics</span>
							<Icon name="plus" className="size-3.5" />
						</Ariakit.DialogDisclosure>
						<Ariakit.Dialog
							className="fixed inset-(--inset) top-0 right-0 bottom-0 left-0 z-50 m-auto mb-0 flex max-h-[85dvh] min-h-[40dvh] w-full max-w-full flex-col overflow-hidden rounded-t-xl border border-[color-mix(in_oklch,black_8%,transparent)] bg-(--app-bg) pb-[max(0px,env(safe-area-inset-bottom))] shadow-[0_24px_64px_-16px_rgb(0_0_0/0.45),0_0_0_1px_color-mix(in_oklch,black_4%,transparent)] max-sm:drawer sm:mb-auto sm:h-fit sm:max-h-[min(720px,calc(100%-32px))] sm:min-h-[initial] sm:max-w-[min(calc(100%-32px),600px)] sm:rounded-xl sm:pb-0 dark:border-[color-mix(in_oklch,white_9%,transparent)] dark:shadow-[0_24px_64px_-16px_rgb(0_0_0/0.6),0_0_0_1px_color-mix(in_oklch,white_3%,transparent)_inset]"
							unmountOnHide
						>
							<div className="flex items-center justify-between gap-3 border-b border-(--cards-border) px-4 py-3">
								<div className="flex items-baseline gap-2.5">
									<Ariakit.DialogHeading className="text-[15px] font-semibold tracking-tight text-(--text-primary)">
										Chart metrics
									</Ariakit.DialogHeading>
									<span className="text-xs text-(--text-tertiary) tabular-nums">
										{selectedOptions.length}/{allMetricOptions.length}
									</span>
								</div>
								<Ariakit.DialogDismiss className="-mr-1 rounded-md p-1.5 text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary) focus-visible:bg-(--link-hover-bg)">
									<Icon name="x" className="size-4" />
									<span className="sr-only">Close</span>
								</Ariakit.DialogDismiss>
							</div>

							<div className="border-b border-(--cards-border) px-4 py-3">
								<label className="relative block">
									<span className="sr-only">Search metrics</span>
									<Icon
										name="search"
										height={16}
										width={16}
										className="pointer-events-none absolute top-0 bottom-0 left-2.5 my-auto text-(--text-tertiary)"
									/>
									<input
										type="text"
										name="search"
										inputMode="search"
										placeholder={`Search ${allMetricOptions.length} metrics…`}
										autoFocus
										value={metricsSearchValue}
										className="min-h-9 w-full rounded-md border border-(--cards-border) bg-(--bg-input) py-1.5 pr-24 pl-8 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--old-blue) focus:outline-none"
										onChange={(e) => setMetricsSearchValue(e.currentTarget.value)}
									/>
									{metricsSearchValue ? (
										<div className="absolute top-0 right-1.5 bottom-0 my-auto flex items-center gap-1">
											<span className="text-[11px] text-(--text-tertiary) tabular-nums">
												{filteredMetricOptions.length} {filteredMetricOptions.length === 1 ? 'match' : 'matches'}
											</span>
											<button
												type="button"
												onClick={() => setMetricsSearchValue('')}
												className="flex size-5 items-center justify-center rounded text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
											>
												<Icon name="x" className="size-3.5" />
												<span className="sr-only">Clear search</span>
											</button>
										</div>
									) : null}
								</label>
							</div>

							<div className="flex thin-scrollbar flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-4">
								{groupedFilteredOptions.map((group) => (
									<section key={`category-${group.label}`} className="flex flex-col gap-2">
										<div className="flex items-baseline gap-1.5">
											<span className="text-[10px] font-medium tracking-[0.08em] text-(--text-tertiary) uppercase">
												{group.label}
											</span>
											<span className="text-[10px] text-(--text-tertiary)/70 tabular-nums">
												· {group.selectedCount}/{group.options.length}
											</span>
										</div>
										<div className="flex flex-wrap gap-1">
											{group.options.map((option) => {
												const dotColor = option.active
													? `color-mix(in oklch, ${getOptionColor(option)} 75%, var(--text-secondary))`
													: null
												return (
													<button
														key={`option-${group.label}-${option.id}`}
														type="button"
														onClick={() => handleToggleMetric(option)}
														data-active={option.active}
														className="group flex items-center gap-1.5 rounded-full border border-(--cards-border) bg-transparent px-2.5 py-1 text-xs text-(--text-primary) transition-[background-color,border-color,color] duration-150 ease-out hover:border-(--old-blue) hover:bg-(--link-hover-bg) focus-visible:border-(--old-blue) focus-visible:bg-(--link-hover-bg) data-[active=true]:border-[color-mix(in_oklch,var(--old-blue)_45%,transparent)] data-[active=true]:bg-[color-mix(in_oklch,var(--old-blue)_14%,transparent)]"
													>
														{option.active ? (
															<span
																aria-hidden
																className="size-1.5 rounded-full"
																style={{ backgroundColor: dotColor! }}
															/>
														) : (
															<Icon
																name="plus"
																className="size-3 text-(--text-tertiary) group-hover:text-(--old-blue)"
															/>
														)}
														<span>{option.label}</span>
														{option.active ? (
															<Icon name="x" className="size-3 opacity-50 group-hover:opacity-100" />
														) : null}
													</button>
												)
											})}
										</div>
									</section>
								))}

								{groupedFilteredOptions.length === 0 ? (
									<div className="flex flex-col items-center gap-1 py-8 text-center">
										<p className="text-sm text-(--text-secondary)">
											No metrics match{' '}
											<span className="font-medium text-(--text-primary)">
												&ldquo;{deferredMetricsSearchValue}&rdquo;
											</span>
										</p>
										<button
											type="button"
											onClick={() => setMetricsSearchValue('')}
											className="text-xs text-(--text-tertiary) underline-offset-2 hover:text-(--text-primary) hover:underline"
										>
											Clear search
										</button>
									</div>
								) : null}
							</div>

							<div className="flex items-center justify-between gap-2 border-t border-(--cards-border) bg-(--app-bg) px-4 py-3">
								{selectedOptions.length > 0 ? (
									<button
										type="button"
										onClick={handleClearAll}
										className="text-xs text-(--text-tertiary) underline-offset-2 hover:text-(--text-primary) hover:underline"
									>
										Clear all
									</button>
								) : (
									<span className="text-xs text-(--text-tertiary)">Pick metrics to plot</span>
								)}
								<button
									type="button"
									onClick={() => metricsDialogStore.hide()}
									className="rounded-md bg-(--old-blue) px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 focus-visible:brightness-110"
								>
									Done
								</button>
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
							className="peer absolute size-[1em] opacity-[0.00001]"
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
									role="status"
									className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
								/>
							) : (
								<Icon name="x" className="size-3.5" />
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
							className="peer absolute size-[1em] opacity-[0.00001]"
						/>
						<span
							className="flex items-center gap-1 rounded-full border-2 border-(--old-blue) px-2 py-1 text-xs"
							style={{
								borderColor: props.chartColors['Events'] ?? props.chartColors['TVL'] ?? '#9CA3AF'
							}}
						>
							<span>Events</span>
							<Icon name="x" className="size-3.5" />
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
				<Suspense
					fallback={
						<div className="m-auto flex min-h-[360px] items-center justify-center" role="status" aria-live="polite">
							<span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
							<span className="sr-only">Loading chart...</span>
						</div>
					}
				>
					<ProtocolChart
						chartData={deferredChartRenderModel.chartData}
						chartColors={props.chartColors}
						isThemeDark={isThemeDark}
						valueSymbol={deferredChartRenderModel.valueSymbol}
						gasUsedValueSymbol={deferredChartRenderModel.gasUsedValueSymbol}
						groupBy={groupBy}
						hallmarks={toggledMetrics.events === 'true' ? props.hallmarks : null}
						rangeHallmarks={toggledMetrics.events === 'true' ? props.rangeHallmarks : null}
						unlockTokenSymbol={props.token?.symbol}
						onReady={handleOverviewChartReady}
					/>
				</Suspense>
				{isClient && failedMetrics.length > 0 ? (
					<Ariakit.PopoverProvider>
						<Ariakit.PopoverDisclosure className="absolute right-2 bottom-2 z-10 flex items-center justify-center rounded-full border border-(--cards-border) bg-(--bg-main) p-1.5 text-(--error) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
							<Icon name="alert-triangle" className="size-3.5" />
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
