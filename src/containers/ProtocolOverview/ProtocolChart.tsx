import * as Ariakit from '@ariakit/react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'
import { ComponentType, lazy, Suspense, useMemo } from 'react'
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
import { BAR_CHARTS, protocolCharts } from './constants'
import { IProtocolOverviewPageData, IToggledMetrics } from './types'
import { useFetchProtocolChartData } from './useFetchProtocolChartData'

// Utility function to update any query parameter in URL
const updateQueryParamInUrl = (currentUrl: string, queryKey: string, newValue: string | null | undefined): string => {
	const url =
		typeof document === 'undefined'
			? new URL(currentUrl, 'http://localhost')
			: new URL(currentUrl, window.location.origin)

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
type ChartInterval = (typeof INTERVALS_LIST)[number]
const isChartInterval = (value: string | null): value is ChartInterval =>
	value != null && INTERVALS_LIST.includes(value as (typeof INTERVALS_LIST)[number])

interface IProtocolCoreChartProps {
	chartData: Record<string, Array<[string | number, number]>>
	chartColors: Record<string, string>
	isThemeDark: boolean
	valueSymbol: string
	groupBy: ChartInterval
	hallmarks: IProtocolOverviewPageData['hallmarks'] | null
	rangeHallmarks: IProtocolOverviewPageData['rangeHallmarks'] | null
	unlockTokenSymbol: string | null
	onReady: (instance: unknown) => void
}

const ProtocolCoreChart = lazy(() => import('./ProtocolCoreChart')) as ComponentType<IProtocolCoreChartProps>

export function ProtocolChart(props: IProtocolOverviewPageData) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isThemeDark] = useDarkModeManager()
	const { chartInstance: overviewChartInstance, handleChartReady: handleOverviewChartReady } = useChartImageExport()
	const overviewImageFilename = slug(props.name)
	const overviewImageTitle = props.name
	const chartDenominationByLowerSymbol = useMemo(
		() => new Map(props.chartDenominations.map((d) => [d.symbol.toLowerCase(), d])),
		[props.chartDenominations]
	)

	const { toggledMetrics, hasAtleasOneBarChart, toggledCharts, groupBy, defaultToggledCharts } = useMemo(() => {
		const chartsByVisibility = {}
		for (const chartLabel in protocolCharts) {
			const chartKey = protocolCharts[chartLabel]
			chartsByVisibility[chartKey] = searchParams.get(chartKey) === 'true' ? 'true' : 'false'
		}

		const denominationInSearchParams = searchParams.get('denomination')?.toLowerCase()

		const toggledMetrics = {
			...chartsByVisibility,
			denomination: denominationInSearchParams
				? (chartDenominationByLowerSymbol.get(denominationInSearchParams)?.symbol ?? null)
				: null,
			events:
				(props.hallmarks?.length > 0 || props.rangeHallmarks?.length > 0) && searchParams.get('events') !== 'false'
					? 'true'
					: 'false'
		} as IToggledMetrics

		for (const chartLabel of props.defaultToggledCharts) {
			const chartKey = protocolCharts[chartLabel]
			toggledMetrics[chartKey] = searchParams.get(chartKey) === 'false' ? 'false' : 'true'
		}

		// TVL/Total Assets are special: if chart is available, keep enabled by default unless explicitly disabled via query.
		toggledMetrics.tvl =
			props.availableCharts.includes('TVL') && searchParams.get(protocolCharts['TVL']) !== 'false' ? 'true' : 'false'
		toggledMetrics.totalAssets =
			props.availableCharts.includes('Total Assets') && searchParams.get(protocolCharts['Total Assets']) !== 'false'
				? 'true'
				: 'false'

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
			defaultToggledCharts: props.defaultToggledCharts
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
											<Icon name="x" className="h-3.5 w-3.5" />
										) : (
											<Icon name="plus" className="h-3.5 w-3.5" />
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
					<CSVDownloadButton prepareCsv={prepareCsv} smol />
					<ChartPngExportButton
						chartInstance={overviewChartInstance}
						filename={overviewImageFilename}
						title={overviewImageTitle}
						iconUrl={tokenIconUrl(props.name)}
					/>
					<AddToDashboardButton chartConfig={multiChart} unsupportedMetrics={unsupportedMetrics} smol />
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
						<ProtocolCoreChart
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
