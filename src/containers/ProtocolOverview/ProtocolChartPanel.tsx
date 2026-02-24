import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { type ComponentType, lazy, Suspense, useMemo } from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { prepareChartCsv } from '~/components/ECharts/utils'
import { EmbedChart } from '~/components/EmbedChart'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { serializeProtocolChartToMultiChart } from '~/containers/ProDashboard/utils/chartSerializer'
import { useDarkModeManager, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useIsClient } from '~/hooks/useIsClient'
import { capitalizeFirstLetter, slug, tokenIconUrl } from '~/utils'
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

const INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const
type ChartInterval = (typeof INTERVALS_LIST)[number]
const isChartInterval = (value: string | null): value is ChartInterval =>
	value != null && INTERVALS_LIST.includes(value as (typeof INTERVALS_LIST)[number])

const ProtocolChart = lazy(() =>
	import('./Chart').then((m) => ({ default: m.default as ComponentType<IProtocolCoreChartProps> }))
)

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

	const { toggledMetrics, hasAtleasOneBarChart, toggledCharts, groupBy, defaultEnabledCharts } = useMemo(() => {
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
			events: hasEvents ? resolveVisibility({ queryValue: searchParams.get('events'), defaultEnabled: true }) : 'false'
		} as IToggledMetrics

		const toggledCharts = props.availableCharts.filter((chart) => toggledMetrics[protocolCharts[chart]] === 'true')

		const hasAtleasOneBarChart = toggledCharts.some((chart) => BAR_CHARTS.includes(chart))

		return {
			toggledMetrics,
			toggledCharts,
			hasAtleasOneBarChart,
			groupBy: (() => {
				if (!hasAtleasOneBarChart) return 'daily' as ChartInterval
				const groupByParam = searchParams.get('groupBy')
				if (isChartInterval(groupByParam)) return groupByParam
				return (props.defaultChartView ?? 'daily') as ChartInterval
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

	const { finalCharts, valueSymbol, loadingCharts } = useFetchProtocolChartData({
		...props,
		toggledMetrics,
		groupBy: groupBy,
		tvlSettings,
		feesSettings,
		isCEX: props.isCEX
	})

	const metricsDialogStore = Ariakit.useDialogStore()

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

							<div className="flex flex-wrap gap-2">
								{props.availableCharts.map((chart) => (
									<button
										key={`add-metric-${chart}`}
										onClick={() => {
											pushShallowQuery(router, {
												[protocolCharts[chart]]:
													toggledMetrics[protocolCharts[chart]] === 'true'
														? (getQueryValueOnRemove(defaultEnabledCharts[chart] === true) ?? undefined)
														: 'true'
											}).then(() => {
												metricsDialogStore.toggle()
											})
										}}
										data-active={toggledMetrics[protocolCharts[chart]] === 'true'}
										className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										<span>{chart.replace('Token', props.token?.symbol ? `$${props.token.symbol}` : 'Token')}</span>
										{toggledMetrics[protocolCharts[chart]] === 'true' ? (
											<Icon name="x" className="h-3.5 w-3.5" />
										) : (
											<Icon name="plus" className="h-3.5 w-3.5" />
										)}
									</button>
								))}
								{props.hallmarks?.length > 0 || props.rangeHallmarks?.length > 0 ? (
									<button
										onClick={() => {
											pushShallowQuery(router, {
												events: toggledMetrics.events === 'true' ? (getQueryValueOnRemove(true) ?? undefined) : 'true'
											}).then(() => {
												metricsDialogStore.toggle()
											})
										}}
										data-active={toggledMetrics.events === 'true'}
										className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										<span>Events</span>
										{toggledMetrics.events === 'true' ? (
											<Icon name="x" className="h-3.5 w-3.5" />
										) : (
											<Icon name="plus" className="h-3.5 w-3.5" />
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
								pushShallowQuery(router, {
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
							<Icon name="x" className="h-3.5 w-3.5" />
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
								pushShallowQuery(router, {
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
										pushShallowQuery(router, {
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
						<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
							{INTERVALS_LIST.map((dataInterval) => (
								<Tooltip
									content={capitalizeFirstLetter(dataInterval)}
									render={<button />}
									className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
									data-active={groupBy === dataInterval}
									onClick={() => {
										pushShallowQuery(router, {
											groupBy: dataInterval
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
			<div className="flex min-h-[360px] flex-col">
				{!isClient ? null : loadingCharts ? (
					<p className="my-auto flex min-h-[360px] items-center justify-center gap-1 text-center text-xs">
						fetching {loadingCharts}
						<LoadingDots />
					</p>
				) : (
					<Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
						<ProtocolChart
							chartData={finalCharts}
							chartColors={props.chartColors}
							isThemeDark={isThemeDark}
							valueSymbol={valueSymbol}
							groupBy={groupBy}
							hallmarks={toggledMetrics.events === 'true' ? props.hallmarks : null}
							rangeHallmarks={toggledMetrics.events === 'true' ? props.rangeHallmarks : null}
							unlockTokenSymbol={props.token.symbol}
							onReady={handleOverviewChartReady}
						/>
					</Suspense>
				)}
			</div>
		</div>
	)
}
