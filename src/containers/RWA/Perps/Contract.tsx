import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWM_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { Icon } from '~/components/Icon'
import { MetricRow, MetricSection, SubMetricRow } from '~/components/MetricPrimitives'
import { PercentChange } from '~/components/PercentChange'
import { Tooltip } from '~/components/Tooltip'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum } from '~/utils'
import { pushShallowQuery } from '~/utils/routerQuery'
import {
	buildRWAPerpsContractChartSpec,
	buildRWAPerpsContractInfoRows,
	buildRWAPerpsContractMetricSections,
	RWA_PERPS_CONTRACT_CHART_METRICS,
	type RWAPerpsContractChartMetricConfig,
	type RWAPerpsContractChartMetricKey
} from './contractPageUtils'
import { perpsDefinitions as d } from './definitions'
import type { IRWAPerpsContractData } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const normalizeChartGroup = (value: string | null | undefined): LowercaseDwmGrouping | null => {
	const normalizedValue = value?.toLowerCase() ?? null
	if (DWM_GROUPING_OPTIONS_LOWERCASE.some((option) => option.value === normalizedValue)) {
		return normalizedValue as LowercaseDwmGrouping
	}
	return null
}

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

export function getRWAPerpsContractChartGroup(value: string | null | undefined): LowercaseDwmGrouping {
	return normalizeChartGroup(value) ?? 'daily'
}

export function getRWAPerpsContractEnabledMetrics(searchParams: URLSearchParams): RWAPerpsContractChartMetricKey[] {
	return RWA_PERPS_CONTRACT_CHART_METRICS.filter(
		(metric) =>
			resolveVisibility({
				queryValue: searchParams.get(metric.queryKey),
				defaultEnabled: metric.defaultEnabled
			}) === 'true'
	).map((metric) => metric.key)
}

export function getRWAPerpsContractMetricQueryPatch({
	metric,
	isActive
}: {
	metric: Pick<RWAPerpsContractChartMetricConfig, 'queryKey' | 'defaultEnabled'>
	isActive: boolean
}) {
	return {
		[metric.queryKey]: isActive ? (getQueryValueOnRemove(metric.defaultEnabled) ?? undefined) : 'true'
	}
}

export function getRWAPerpsContractGroupByQueryPatch(nextGroupBy: LowercaseDwmGrouping) {
	return {
		groupBy: nextGroupBy === 'daily' ? undefined : nextGroupBy
	}
}

function RWAPerpsContractHeader({
	contract,
	headingAs: Tag = 'h1'
}: {
	contract: IRWAPerpsContractData
	headingAs?: 'h1' | 'div'
}) {
	return (
		<Tag className="flex items-center gap-2 text-xl">
			<span className="font-bold">{contract.contract.contract}</span>
		</Tag>
	)
}

function RWAPerpsContractPriceSummary({ contract }: { contract: IRWAPerpsContractData }) {
	return (
		<div className="flex flex-nowrap items-end justify-between gap-8">
			<div className="flex flex-col">
				<Tooltip content={d.price.description} className="text-(--text-label) underline decoration-dotted">
					{d.price.label}
				</Tooltip>
				<p className="min-h-8 overflow-hidden font-jetbrains text-2xl font-semibold text-ellipsis whitespace-nowrap">
					{formattedNum(contract.market.price, true)}
				</p>
			</div>

			{contract.market.priceChange24h != null ? (
				<p className="relative bottom-0.5 flex flex-nowrap items-center gap-2">
					<span className="overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap">
						<PercentChange percent={contract.market.priceChange24h} fontWeight={600} />
					</span>
					<span className="text-(--text-label)">24h</span>
				</p>
			) : null}
		</div>
	)
}

export function RWAPerpsContractSummaryMetrics({ contract }: { contract: IRWAPerpsContractData }) {
	return (
		<>
			<RWAPerpsContractPriceSummary contract={contract} />
			<RWAPerpsContractMetricsList contract={contract} />
		</>
	)
}

function RWAPerpsContractMetricsList({ contract }: { contract: IRWAPerpsContractData }) {
	const sections = buildRWAPerpsContractMetricSections(contract)

	return (
		<div className="flex flex-col">
			<MetricRow
				label={sections.openInterest.label}
				tooltip={sections.openInterest.tooltip}
				value={sections.openInterest.value}
			/>

			<MetricSection label={sections.volume.label} tooltip={sections.volume.tooltip} value={sections.volume.value}>
				{sections.volume.children.map((row) => (
					<SubMetricRow key={row.label} label={row.label} tooltip={row.tooltip} value={row.value} />
				))}
			</MetricSection>

			<MetricSection label={sections.fees.label} tooltip={sections.fees.tooltip} value={sections.fees.value}>
				{sections.fees.children.map((row) => (
					<SubMetricRow key={row.label} label={row.label} tooltip={row.tooltip} value={row.value} />
				))}
			</MetricSection>

			{sections.pointInTimeRows.map((row) => (
				<MetricRow key={row.label} label={row.label} tooltip={row.tooltip} value={row.value} />
			))}

			<MetricSection
				label={sections.tradingParameters.label}
				tooltip={sections.tradingParameters.tooltip}
				value={sections.tradingParameters.value}
			>
				{sections.tradingParameters.children.map((row) => (
					<SubMetricRow key={row.label} label={row.label} tooltip={row.tooltip} value={row.value} />
				))}
			</MetricSection>

			<MetricSection
				label={sections.marketReference.label}
				tooltip={sections.marketReference.tooltip}
				value={sections.marketReference.value}
			>
				{sections.marketReference.children.map((row) => (
					<SubMetricRow key={row.label} label={row.label} tooltip={row.tooltip} value={row.value} />
				))}
			</MetricSection>
		</div>
	)
}

function RWAPerpsContractInfoCard({ contract }: { contract: IRWAPerpsContractData }) {
	const infoRows = buildRWAPerpsContractInfoRows(contract)
	const midpoint = Math.ceil(infoRows.length / 2)
	const desktopInfoColumns = [infoRows.slice(0, midpoint), infoRows.slice(midpoint)].filter((rows) => rows.length > 0)
	const renderInfoRowValue = (row: (typeof infoRows)[number]) =>
		row.label === 'Website' ? (
			<a href={row.value} target="_blank" rel="noopener noreferrer" className="text-(--link-text) hover:underline">
				{row.value}
			</a>
		) : (
			row.value
		)

	return (
		<section className="col-span-full flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 xl:p-4">
			<h2 className="text-base font-semibold">Market Information</h2>
			{contract.contract.description ? (
				<p className="text-sm text-(--text-label)">{contract.contract.description}</p>
			) : null}
			<div className="flex flex-col xl:hidden">
				{infoRows.map((row) => (
					<MetricRow key={row.label} label={row.label} tooltip={row.tooltip} value={renderInfoRowValue(row)} />
				))}
			</div>
			<div className="hidden gap-x-6 xl:grid xl:grid-cols-2">
				{desktopInfoColumns.map((rows, index) => (
					<div className="flex flex-col" key={`info-column-${index}`}>
						{rows.map((row) => (
							<MetricRow key={row.label} label={row.label} tooltip={row.tooltip} value={renderInfoRowValue(row)} />
						))}
					</div>
				))}
			</div>
		</section>
	)
}

function RWAPerpsContractChartPanel({ contract }: { contract: IRWAPerpsContractData }) {
	const router = useRouter()
	const searchParams = useMemo(() => {
		// Use the raw URL so chart controls reflect the current search string before router.query is hydrated.
		const queryString = router.asPath.split('?')[1]?.split('#')[0] ?? ''
		return new URLSearchParams(queryString)
	}, [router.asPath])
	const metricsDialogStore = Ariakit.useDialogStore()
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const groupBy = getRWAPerpsContractChartGroup(searchParams.get('groupBy'))
	const enabledMetrics = useMemo(() => getRWAPerpsContractEnabledMetrics(searchParams), [searchParams])

	const chartSpec = useMemo(
		() =>
			buildRWAPerpsContractChartSpec({
				marketPoints: contract.marketChart,
				fundingHistory: contract.fundingHistory,
				groupBy,
				enabledMetrics
			}),
		[contract.fundingHistory, contract.marketChart, enabledMetrics, groupBy]
	)
	const deferredChartSpec = useDeferredValue(chartSpec)
	const contractSlugBase = contract.contract.contract.replace(/:/g, '-').toLowerCase()

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-start gap-2">
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
							{RWA_PERPS_CONTRACT_CHART_METRICS.map((metric) => {
								const isActive = enabledMetrics.includes(metric.key)
								return (
									<button
										key={`add-metric-${metric.key}`}
										onClick={() => {
											void pushShallowQuery(router, getRWAPerpsContractMetricQueryPatch({ metric, isActive })).then(
												() => {
													metricsDialogStore.toggle()
												}
											)
										}}
										data-active={isActive}
										className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									>
										<span>{metric.label}</span>
										{isActive ? (
											<Icon name="x" className="h-3.5 w-3.5" />
										) : (
											<Icon name="plus" className="h-3.5 w-3.5" />
										)}
									</button>
								)
							})}
						</div>
					</Ariakit.Dialog>
				</Ariakit.DialogProvider>

				{enabledMetrics.map((metricKey) => {
					const metric = RWA_PERPS_CONTRACT_CHART_METRICS.find((item) => item.key === metricKey)
					if (!metric) return null

					return (
						<label
							className="relative flex cursor-pointer flex-nowrap items-center gap-1 text-sm last-of-type:mr-auto"
							key={metric.key}
						>
							<input
								type="checkbox"
								value={metric.key}
								checked={true}
								onChange={() => {
									void pushShallowQuery(router, getRWAPerpsContractMetricQueryPatch({ metric, isActive: true }))
								}}
								className="peer absolute h-[1em] w-[1em] opacity-[0.00001]"
							/>
							<span
								className="flex items-center gap-1 rounded-full border-2 px-2 py-1 text-xs"
								style={{ borderColor: metric.color }}
							>
								<span>{metric.label}</span>
								<Icon name="x" className="h-3.5 w-3.5" />
							</span>
						</label>
					)
				})}

				<div className="ml-auto flex flex-wrap justify-end gap-1">
					<ChartGroupingSelector
						value={groupBy}
						onValueChange={(nextGroupBy) => {
							void pushShallowQuery(router, getRWAPerpsContractGroupByQueryPatch(nextGroupBy))
						}}
						options={DWM_GROUPING_OPTIONS_LOWERCASE}
					/>
					<ChartExportButtons
						chartInstance={chartInstance}
						filename={`${contractSlugBase}-market-metrics`}
						title={`${contract.contract.contract} Market Metrics`}
						smol
					/>
				</div>
			</div>

			{deferredChartSpec.charts.length > 0 && deferredChartSpec.dataset.source.length > 0 ? (
				<Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={deferredChartSpec.dataset}
						charts={deferredChartSpec.charts}
						groupBy={groupBy}
						valueSymbol="$"
						onReady={handleChartReady}
					/>
				</Suspense>
			) : enabledMetrics.length === 0 ? (
				<p className="flex min-h-[360px] items-center justify-center text-sm text-(--text-label)">
					Select at least one metric.
				</p>
			) : (
				<p className="flex min-h-[360px] items-center justify-center text-sm text-(--text-label)">
					No chart data available for the selected metrics.
				</p>
			)}
		</div>
	)
}

export function RWAPerpsContractPage({ contract }: { contract: IRWAPerpsContractData }) {
	return (
		<article className="flex flex-col gap-2">
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
				<div className="col-span-1 hidden flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:flex xl:min-h-[360px]">
					<RWAPerpsContractHeader contract={contract} headingAs="h1" />
					<RWAPerpsContractSummaryMetrics contract={contract} />
				</div>

				<div className="col-span-1 grid grid-cols-2 gap-2 xl:col-[2/-1]">
					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
						<div className="flex flex-col gap-6 xl:hidden">
							<RWAPerpsContractHeader contract={contract} headingAs="h1" />
							<RWAPerpsContractPriceSummary contract={contract} />
						</div>

						<RWAPerpsContractChartPanel contract={contract} />
					</div>

					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:hidden">
						<RWAPerpsContractMetricsList contract={contract} />
					</div>
				</div>

				<RWAPerpsContractInfoCard contract={contract} />
			</div>
		</article>
	)
}
