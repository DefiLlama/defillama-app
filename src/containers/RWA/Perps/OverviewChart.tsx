import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import { LoadingDots } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import type { ExcludeQueryKey } from '~/components/Select/types'
import { CHART_COLORS } from '~/constants/colors'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { fetchJson } from '~/utils/async'
import { getErrorMessage } from '~/utils/error'
import { pushShallowQuery, readSingleQueryValue, toNonEmptyArrayParam } from '~/utils/routerQuery'
import { hasEnoughTimeSeriesHistory } from './queries'
import type { IRWAPerpsOverviewBreakdownRequest, RWAPerpsChartMetricKey, RWAPerpsOverviewBreakdown } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const CHART_TYPE_OPTIONS: Array<{ key: RWAPerpsChartMetricKey; label: string }> = [
	{ key: 'openInterest', label: 'Open Interest' },
	{ key: 'volume24h', label: 'Volume' },
	{ key: 'markets', label: 'Markets' }
]

const VALID_CHART_TYPES = new Set<RWAPerpsChartMetricKey>(CHART_TYPE_OPTIONS.map(({ key }) => key))
const DEFAULT_CHART_TYPE: RWAPerpsChartMetricKey = 'openInterest'
const EMPTY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }
const STACKS_QUERY_KEY = 'stacks'
const EXCLUDE_STACKS_QUERY_KEY: ExcludeQueryKey = 'excludeStacks'

function isChartMetricKey(value: string): value is RWAPerpsChartMetricKey {
	return VALID_CHART_TYPES.has(value as RWAPerpsChartMetricKey)
}

export function getRWAPerpsOverviewChartType(chartTypeQuery: string | undefined): RWAPerpsChartMetricKey {
	return chartTypeQuery && isChartMetricKey(chartTypeQuery) ? chartTypeQuery : DEFAULT_CHART_TYPE
}

export function getRWAPerpsOverviewChartTypeQueryPatch(nextChartType: RWAPerpsChartMetricKey) {
	return {
		chartType: nextChartType === DEFAULT_CHART_TYPE ? undefined : nextChartType
	}
}

export function resolveRWAPerpsOverviewSelectedStacks({
	stackOptions,
	selectedStacksQ,
	excludeStacksQ
}: {
	stackOptions: string[]
	selectedStacksQ: string | string[] | undefined
	excludeStacksQ: string | string[] | undefined
}) {
	if (stackOptions.length === 0) return []

	const availableStacks = new Set(stackOptions)
	if (selectedStacksQ === 'None') return []
	if (selectedStacksQ != null) {
		return toNonEmptyArrayParam(selectedStacksQ).filter((stack) => availableStacks.has(stack))
	}

	const excludedStacksSet = new Set(toNonEmptyArrayParam(excludeStacksQ).filter((stack) => availableStacks.has(stack)))
	if (excludedStacksSet.size === 0) return [...stackOptions]
	return stackOptions.filter((stack) => !excludedStacksSet.has(stack))
}

function fetchOverviewBreakdownDataset(request: IRWAPerpsOverviewBreakdownRequest): Promise<MultiSeriesChart2Dataset> {
	const searchParams = new URLSearchParams({
		breakdown: request.breakdown,
		key: request.key
	})

	return fetchJson<MultiSeriesChart2Dataset>(`/api/rwa/perps/overview-breakdown?${searchParams.toString()}`)
}

export function buildRWAPerpsOverviewChartSeries({
	chartType,
	stackOptions
}: {
	chartType: RWAPerpsChartMetricKey
	stackOptions: string[]
}): Array<MultiSeriesChart2SeriesConfig> {
	return stackOptions.map((seriesName, index) => ({
		name: seriesName,
		type: chartType === 'volume24h' ? 'bar' : 'line',
		encode: { x: 'timestamp', y: seriesName },
		color: CHART_COLORS[index % CHART_COLORS.length]
	}))
}

export function RWAPerpsOverviewChart({
	breakdown,
	initialChartDataset,
	stackLabel
}: {
	breakdown: RWAPerpsOverviewBreakdown
	initialChartDataset: MultiSeriesChart2Dataset
	stackLabel: string
}) {
	const router = useRouter()
	const chartType = getRWAPerpsOverviewChartType(readSingleQueryValue(router.query.chartType))
	const isDefaultState = chartType === DEFAULT_CHART_TYPE
	const { data, isLoading, error } = useQuery({
		queryKey: ['rwa-perps-overview-breakdown', breakdown, chartType],
		queryFn: () => fetchOverviewBreakdownDataset({ breakdown, key: chartType }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !isDefaultState
	})
	const dataset = isDefaultState ? initialChartDataset : (data ?? EMPTY_DATASET)
	const hasTimeSeriesHistory = useMemo(() => hasEnoughTimeSeriesHistory(dataset), [dataset])
	const showLoadingState = !isDefaultState && isLoading
	const stackOptions = useMemo(() => dataset.dimensions.filter((dimension) => dimension !== 'timestamp'), [dataset])
	const chartSeries = useMemo<Array<MultiSeriesChart2SeriesConfig>>(
		() => buildRWAPerpsOverviewChartSeries({ chartType, stackOptions }),
		[chartType, stackOptions]
	)
	const selectedStacksQ = router.query[STACKS_QUERY_KEY] as string | string[] | undefined
	const excludeStacksQ = router.query[EXCLUDE_STACKS_QUERY_KEY] as string | string[] | undefined
	const selectedStacks = useMemo(
		() =>
			resolveRWAPerpsOverviewSelectedStacks({
				stackOptions,
				selectedStacksQ,
				excludeStacksQ
			}),
		[excludeStacksQ, selectedStacksQ, stackOptions]
	)
	const selectedStacksSet = useMemo(() => new Set(selectedStacks), [selectedStacks])
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const onSelectChartType = (nextChartType: RWAPerpsChartMetricKey) => {
		void pushShallowQuery(router, getRWAPerpsOverviewChartTypeQueryPatch(nextChartType))
	}

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3 pb-0">
				<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					{CHART_TYPE_OPTIONS.map(({ key, label }) => (
						<button
							key={`rwa-perps-breakdown-chart-type-${key}`}
							className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
							data-active={chartType === key}
							onClick={() => onSelectChartType(key)}
						>
							{label}
						</button>
					))}
				</div>
				{stackOptions.length > 1 ? (
					<SelectWithCombobox
						allValues={stackOptions}
						selectedValues={selectedStacks}
						includeQueryKey={STACKS_QUERY_KEY}
						excludeQueryKey={EXCLUDE_STACKS_QUERY_KEY}
						defaultSelectedValues={stackOptions}
						label={stackLabel}
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons
					chartInstance={exportChartInstance}
					filename={`rwa-perps-overview-breakdown-${breakdown}-${chartType}`}
					title={`RWA Perps ${CHART_TYPE_OPTIONS.find((option) => option.key === chartType)?.label ?? 'Breakdown'}`}
					smol
				/>
			</div>
			{error ? (
				<p className="flex min-h-[360px] items-center justify-center text-xs text-(--error)">
					{getErrorMessage(error)}
				</p>
			) : showLoadingState ? (
				<p className="flex min-h-[360px] items-center justify-center">
					Loading
					<LoadingDots />
				</p>
			) : !hasTimeSeriesHistory ? (
				<p className="flex min-h-[360px] items-center justify-center text-sm text-(--text-secondary)">
					Only a single snapshot is available; time-series history is not available for this selection yet.
				</p>
			) : (
				<Suspense fallback={<div className="h-[360px]" />}>
					<MultiSeriesChart2
						dataset={dataset}
						charts={chartSeries}
						stacked
						showTotalInTooltip
						selectedCharts={selectedStacksSet}
						onReady={handleChartReady}
						valueSymbol={chartType === 'markets' ? '' : '$'}
					/>
				</Suspense>
			)}
		</div>
	)
}
