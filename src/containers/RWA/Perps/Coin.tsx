import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { Icon } from '~/components/Icon'
import { MetricRow, MetricSection, SubMetricRow } from '~/components/MetricPrimitives'
import { PercentChange } from '~/components/PercentChange'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum } from '~/utils'
import { pushShallowQuery } from '~/utils/routerQuery'
import {
	buildRWAPerpsCoinChartSpec,
	buildRWAPerpsCoinInfoRows,
	buildRWAPerpsCoinMetricSections,
	RWA_PERPS_COIN_CHART_METRICS,
	type RWAPerpsCoinChartMetricConfig,
	type RWAPerpsCoinChartMetricKey
} from './coinPageUtils'
import type { IRWAPerpsCoinData } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const normalizeChartGroup = (value: string | null | undefined): LowercaseDwmcGrouping | null => {
	const normalizedValue = value?.toLowerCase() ?? null
	if (DWMC_GROUPING_OPTIONS_LOWERCASE.some((option) => option.value === normalizedValue)) {
		return normalizedValue as LowercaseDwmcGrouping
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

export function getRWAPerpsCoinChartGroup(value: string | null | undefined): LowercaseDwmcGrouping {
	return normalizeChartGroup(value) ?? 'daily'
}

export function getRWAPerpsCoinEnabledMetrics(searchParams: URLSearchParams): RWAPerpsCoinChartMetricKey[] {
	return RWA_PERPS_COIN_CHART_METRICS.filter(
		(metric) =>
			resolveVisibility({
				queryValue: searchParams.get(metric.queryKey),
				defaultEnabled: metric.defaultEnabled
			}) === 'true'
	).map((metric) => metric.key)
}

export function getRWAPerpsCoinMetricQueryPatch({
	metric,
	isActive
}: {
	metric: Pick<RWAPerpsCoinChartMetricConfig, 'queryKey' | 'defaultEnabled'>
	isActive: boolean
}) {
	return {
		[metric.queryKey]: isActive ? (getQueryValueOnRemove(metric.defaultEnabled) ?? undefined) : 'true'
	}
}

export function getRWAPerpsCoinGroupByQueryPatch(nextGroupBy: LowercaseDwmcGrouping) {
	return {
		groupBy: nextGroupBy === 'daily' ? undefined : nextGroupBy
	}
}

function RWAPerpsCoinHeader({ coin, headingAs: Tag = 'h1' }: { coin: IRWAPerpsCoinData; headingAs?: 'h1' | 'div' }) {
	return (
		<Tag className="flex items-center gap-2 text-xl">
			<span className="font-bold">{coin.coin.coin}</span>
		</Tag>
	)
}

function RWAPerpsCoinPriceSummary({ coin }: { coin: IRWAPerpsCoinData }) {
	return (
		<div className="flex flex-nowrap items-end justify-between gap-8">
			<div className="flex flex-col">
				<span className="text-(--text-label)">Price</span>
				<p className="min-h-8 overflow-hidden font-jetbrains text-2xl font-semibold text-ellipsis whitespace-nowrap">
					{formattedNum(coin.market.price, true)}
				</p>
			</div>

			{coin.market.priceChange24h != null ? (
				<p className="relative bottom-0.5 flex flex-nowrap items-center gap-2">
					<span className="overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap">
						<PercentChange percent={coin.market.priceChange24h} fontWeight={600} />
					</span>
					<span className="text-(--text-label)">24h</span>
				</p>
			) : null}
		</div>
	)
}

export function RWAPerpsCoinSummaryMetrics({ coin }: { coin: IRWAPerpsCoinData }) {
	return (
		<>
			<RWAPerpsCoinPriceSummary coin={coin} />
			<RWAPerpsCoinMetricsList coin={coin} />
		</>
	)
}

function RWAPerpsCoinMetricsList({ coin }: { coin: IRWAPerpsCoinData }) {
	const sections = buildRWAPerpsCoinMetricSections(coin)

	return (
		<div className="flex flex-col">
			<MetricRow label={sections.openInterest.label} value={sections.openInterest.value} />

			<MetricSection label={sections.volume.label} value={sections.volume.value}>
				{sections.volume.children.map((row) => (
					<SubMetricRow key={row.label} label={row.label} value={row.value} />
				))}
			</MetricSection>

			<MetricSection label={sections.fees.label} value={sections.fees.value}>
				{sections.fees.children.map((row) => (
					<SubMetricRow key={row.label} label={row.label} value={row.value} />
				))}
			</MetricSection>

			{sections.pointInTimeRows.map((row) => (
				<MetricRow key={row.label} label={row.label} value={row.value} />
			))}

			<MetricSection label={sections.tradingParameters.label} value={sections.tradingParameters.value}>
				{sections.tradingParameters.children.map((row) => (
					<SubMetricRow key={row.label} label={row.label} value={row.value} />
				))}
			</MetricSection>

			<MetricSection label={sections.marketReference.label} value={sections.marketReference.value}>
				{sections.marketReference.children.map((row) => (
					<SubMetricRow key={row.label} label={row.label} value={row.value} />
				))}
			</MetricSection>
		</div>
	)
}

function RWAPerpsCoinInfoCard({ coin }: { coin: IRWAPerpsCoinData }) {
	const infoRows = buildRWAPerpsCoinInfoRows(coin)
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
			{coin.coin.description ? <p className="text-sm text-(--text-label)">{coin.coin.description}</p> : null}
			<div className="flex flex-col xl:hidden">
				{infoRows.map((row) => (
					<MetricRow key={row.label} label={row.label} value={renderInfoRowValue(row)} />
				))}
			</div>
			<div className="hidden gap-x-6 xl:grid xl:grid-cols-2">
				{desktopInfoColumns.map((rows, index) => (
					<div className="flex flex-col" key={`info-column-${index}`}>
						{rows.map((row) => (
							<MetricRow key={row.label} label={row.label} value={renderInfoRowValue(row)} />
						))}
					</div>
				))}
			</div>
		</section>
	)
}

function RWAPerpsCoinChartPanel({ coin }: { coin: IRWAPerpsCoinData }) {
	const router = useRouter()
	const searchParams = useMemo(() => {
		// Use the raw URL so chart controls reflect the current search string before router.query is hydrated.
		const queryString = router.asPath.split('?')[1]?.split('#')[0] ?? ''
		return new URLSearchParams(queryString)
	}, [router.asPath])
	const metricsDialogStore = Ariakit.useDialogStore()
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const groupBy = getRWAPerpsCoinChartGroup(searchParams.get('groupBy'))
	const enabledMetrics = useMemo(() => getRWAPerpsCoinEnabledMetrics(searchParams), [searchParams])

	const chartSpec = useMemo(
		() =>
			buildRWAPerpsCoinChartSpec({
				marketPoints: coin.marketChart,
				fundingHistory: coin.fundingHistory,
				groupBy,
				enabledMetrics
			}),
		[coin.fundingHistory, coin.marketChart, enabledMetrics, groupBy]
	)
	const deferredChartSpec = useDeferredValue(chartSpec)
	const coinSlugBase = coin.coin.coin.replace(/:/g, '-').toLowerCase()

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
							{RWA_PERPS_COIN_CHART_METRICS.map((metric) => {
								const isActive = enabledMetrics.includes(metric.key)
								return (
									<button
										key={`add-metric-${metric.key}`}
										onClick={() => {
											void pushShallowQuery(router, getRWAPerpsCoinMetricQueryPatch({ metric, isActive })).then(() => {
												metricsDialogStore.toggle()
											})
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
					const metric = RWA_PERPS_COIN_CHART_METRICS.find((item) => item.key === metricKey)
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
									void pushShallowQuery(router, getRWAPerpsCoinMetricQueryPatch({ metric, isActive: true }))
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
							void pushShallowQuery(router, getRWAPerpsCoinGroupByQueryPatch(nextGroupBy))
						}}
						options={DWMC_GROUPING_OPTIONS_LOWERCASE}
					/>
					<ChartExportButtons
						chartInstance={chartInstance}
						filename={`${coinSlugBase}-market-metrics`}
						title={`${coin.coin.coin} Market Metrics`}
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

export function RWAPerpsCoinPage({ coin }: { coin: IRWAPerpsCoinData }) {
	return (
		<article className="flex flex-col gap-2">
			<div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
				<div className="col-span-1 hidden flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:flex xl:min-h-[360px]">
					<RWAPerpsCoinHeader coin={coin} headingAs="h1" />
					<RWAPerpsCoinSummaryMetrics coin={coin} />
				</div>

				<div className="col-span-1 grid grid-cols-2 gap-2 xl:col-[2/-1]">
					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
						<div className="flex flex-col gap-6 xl:hidden">
							<RWAPerpsCoinHeader coin={coin} headingAs="div" />
							<RWAPerpsCoinPriceSummary coin={coin} />
						</div>

						<RWAPerpsCoinChartPanel coin={coin} />
					</div>

					<div className="col-span-full flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:hidden">
						<RWAPerpsCoinMetricsList coin={coin} />
					</div>
				</div>

				<RWAPerpsCoinInfoCard coin={coin} />
			</div>
		</article>
	)
}
