import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { prepareChartCsv } from '~/components/ECharts/utils'
import { EmbedChart } from '~/components/EmbedChart'
import { Icon } from '~/components/Icon'
import { LoadingDots } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { serializeChainChartToMultiChart } from '~/containers/ProDashboard/utils/chartSerializer'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { capitalizeFirstLetter, chainIconUrl, slug } from '~/utils'
import { pushShallowQuery } from '~/utils/routerQuery'
import { type ChainChartLabels, chainCharts, chainOverviewChartColors } from './constants'
import type { IChainOverviewData } from './types'

const ChainCoreChart: any = lazy(() => import('~/containers/ChainOverview/Chart'))

const INTERVALS_LIST = ['daily', 'weekly', 'monthly', 'cumulative'] as const

interface ChainChartPanelProps {
	charts: IChainOverviewData['charts']
	chainTokenInfo: IChainOverviewData['chainTokenInfo']
	metadata: IChainOverviewData['metadata']
	chain: string
	toggledCharts: ChainChartLabels[]
	denominations: string[]
	denomination: string
	hasBarChart: boolean
	groupBy: 'daily' | 'weekly' | 'monthly' | 'cumulative'
	chainGeckoId: string | null
	finalCharts: any
	valueSymbol: string
	isFetchingChartData: boolean
	darkMode: boolean
}

export function ChainChartPanel({
	charts,
	chainTokenInfo,
	metadata,
	chain,
	toggledCharts,
	denominations,
	denomination,
	hasBarChart,
	groupBy,
	chainGeckoId,
	finalCharts,
	valueSymbol,
	isFetchingChartData,
	darkMode
}: ChainChartPanelProps) {
	const router = useRouter()
	const chartRenderModel = useMemo(
		() => ({
			chartData: finalCharts,
			valueSymbol
		}),
		[finalCharts, valueSymbol]
	)
	const deferredChartRenderModel = useDeferredValue(chartRenderModel)

	const { multiChart, unsupportedMetrics } = useMemo(() => {
		if (!metadata?.name) {
			return { multiChart: null, unsupportedMetrics: [] as ChainChartLabels[] }
		}

		return serializeChainChartToMultiChart({
			chainName: metadata.name,
			geckoId: chainGeckoId,
			toggledMetrics: toggledCharts,
			chartColors: chainOverviewChartColors,
			groupBy
		})
	}, [metadata.name, chainGeckoId, toggledCharts, groupBy])

	const canAddToDashboard = metadata.name !== 'All' && multiChart && toggledCharts.length > 0 && denomination === 'USD'

	const metricsDialogStore = Ariakit.useDialogStore()
	const prepareCsv = () => prepareChartCsv(chartRenderModel.chartData, `${chain}.csv`)

	const { chartInstance: chainChartInstance, handleChartReady } = useChartImageExport()
	const imageExportFilename = slug(metadata.name)
	const imageExportTitle = metadata.name === 'All' ? 'All Chains' : metadata.name

	const updateGroupBy = (newGroupBy: string) => {
		pushShallowQuery(router, { groupBy: newGroupBy })
	}

	return (
		<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<div className="mr-auto flex flex-wrap items-center gap-2">
					{charts.length > 0 ? (
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
									{charts.map((tchart) => (
										<button
											key={`add-chain-metric-${chainCharts[tchart]}`}
											onClick={() => {
												pushShallowQuery(router, {
													[chainCharts[tchart]]: toggledCharts.includes(tchart) ? 'false' : 'true'
												})
												metricsDialogStore.toggle()
											}}
											data-active={toggledCharts.includes(tchart)}
											className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
										>
											<span>
												{tchart.includes('Token')
													? tchart.replace(
															'Token',
															chainTokenInfo?.token_symbol ? `$${chainTokenInfo?.token_symbol}` : 'Token'
														)
													: tchart}
											</span>
											{toggledCharts.includes(tchart) ? (
												<Icon name="x" className="h-3.5 w-3.5" />
											) : (
												<Icon name="plus" className="h-3.5 w-3.5" />
											)}
										</button>
									))}
								</div>
							</Ariakit.Dialog>
						</Ariakit.DialogProvider>
					) : null}
					{toggledCharts.map((tchart) => (
						<label
							className="relative flex cursor-pointer flex-nowrap items-center gap-1 text-sm last-of-type:mr-auto"
							key={`add-or-remove-metric-${chainCharts[tchart]}`}
						>
							<input
								type="checkbox"
								value={tchart}
								checked={true}
								onChange={() => {
									pushShallowQuery(router, {
										[chainCharts[tchart]]: toggledCharts.includes(tchart) ? 'false' : 'true'
									})
								}}
								className="peer absolute h-[1em] w-[1em] opacity-[0.00001]"
							/>
							<span
								className="flex items-center gap-1 rounded-full border-2 border-(--old-blue) px-2 py-1 text-xs hover:bg-(--bg-input) focus-visible:bg-(--bg-input)"
								style={{
									borderColor: chainOverviewChartColors[tchart]
								}}
							>
								<span>
									{tchart.includes('Token')
										? tchart.replace(
												'Token',
												chainTokenInfo?.token_symbol ? `$${chainTokenInfo?.token_symbol}` : 'Token'
											)
										: tchart}
								</span>
								<Icon name="x" className="h-3.5 w-3.5" />
							</span>
						</label>
					))}
				</div>

				{denominations.length > 1 ? (
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						{denominations.map((denom) => (
							<button
								key={`denom-${denom}`}
								className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
								data-active={denomination === denom}
								onClick={() => pushShallowQuery(router, { currency: denom })}
							>
								{denom}
							</button>
						))}
					</div>
				) : null}

				{hasBarChart ? (
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						{INTERVALS_LIST.map((dataInterval) => (
							<Tooltip
								content={capitalizeFirstLetter(dataInterval)}
								render={<button />}
								className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
								data-active={groupBy === dataInterval}
								onClick={() => updateGroupBy(dataInterval)}
								key={`${chain}-overview-groupBy-${dataInterval}`}
							>
								{dataInterval.slice(0, 1).toUpperCase()}
							</Tooltip>
						))}
					</div>
				) : null}
				<EmbedChart />
				<CSVDownloadButton prepareCsv={prepareCsv} smol />
				<ChartPngExportButton
					chartInstance={chainChartInstance}
					filename={imageExportFilename}
					title={imageExportTitle}
					iconUrl={metadata.name !== 'All' ? chainIconUrl(metadata.name) : undefined}
				/>
				{canAddToDashboard && (
					<AddToDashboardButton chartConfig={multiChart} unsupportedMetrics={unsupportedMetrics} smol />
				)}
			</div>

			{isFetchingChartData ? (
				<div className="m-auto flex min-h-[360px] items-center justify-center">
					<p className="flex items-center gap-1">
						Loading
						<LoadingDots />
					</p>
				</div>
			) : (
				<Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
					<ChainCoreChart
						chartData={deferredChartRenderModel.chartData}
						valueSymbol={deferredChartRenderModel.valueSymbol}
						isThemeDark={darkMode}
						groupBy={groupBy}
						onReady={handleChartReady}
					/>
				</Suspense>
			)}
		</div>
	)
}
