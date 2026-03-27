import type { ParsedUrlQuery } from 'querystring'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { LoadingDots } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import type { ExcludeQueryKey } from '~/components/Select/types'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { fetchJson } from '~/utils/async'
import { getErrorMessage } from '~/utils/error'
import { isTrueQueryParam, pushShallowQuery, readSingleQueryValue, toNonEmptyArrayParam } from '~/utils/routerQuery'
import type { RWAChartMetricKey, RWAOverviewBreakdownRequest, RWAOverviewPage } from './api.types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const CHART_TYPE_OPTIONS: Array<{ key: RWAChartMetricKey; label: string }> = [
	{ key: 'activeMcap', label: 'Active Mcap' },
	{ key: 'onChainMcap', label: 'Onchain Mcap' },
	{ key: 'defiActiveTvl', label: 'DeFi Active TVL' }
]

const VALID_CHART_TYPES = new Set<RWAChartMetricKey>(CHART_TYPE_OPTIONS.map(({ key }) => key))
const DEFAULT_CHART_TYPE: RWAChartMetricKey = 'activeMcap'
const EMPTY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }
const Y_AXIS_FLOOR = { yAxis: { min: 0 } } as const
const STACKS_QUERY_KEY = 'stacks'
const EXCLUDE_STACKS_QUERY_KEY: ExcludeQueryKey = 'excludeStacks'

function assertNever(value: never): never {
	throw new Error(`Unknown page kind: ${value}`)
}

function isChartMetricKey(value: string): value is RWAChartMetricKey {
	return VALID_CHART_TYPES.has(value as RWAChartMetricKey)
}

export function getOverviewBreakdownRequestState(
	page: RWAOverviewPage,
	chartType: RWAChartMetricKey,
	query: ParsedUrlQuery
) {
	const includeStablecoin = isTrueQueryParam(query.includeStablecoins)
	const includeGovernance = isTrueQueryParam(query.includeGovernance)

	switch (page.kind) {
		case 'chain':
			return {
				request: {
					breakdown: 'chain',
					key: chartType,
					includeStablecoin,
					includeGovernance
				} satisfies RWAOverviewBreakdownRequest,
				isDefaultState: chartType === DEFAULT_CHART_TYPE && !includeStablecoin && !includeGovernance
			}
		case 'platform':
			return {
				request: {
					breakdown: 'platform',
					key: chartType,
					includeStablecoin,
					includeGovernance
				} satisfies RWAOverviewBreakdownRequest,
				isDefaultState: chartType === DEFAULT_CHART_TYPE && !includeStablecoin && !includeGovernance
			}
		case 'category':
			return {
				request: {
					breakdown: 'category',
					key: chartType,
					includeStablecoin,
					includeGovernance
				} satisfies RWAOverviewBreakdownRequest,
				isDefaultState: chartType === DEFAULT_CHART_TYPE && !includeStablecoin && !includeGovernance
			}
		case 'assetGroup':
			return {
				request: {
					breakdown: 'assetGroup',
					key: chartType,
					includeStablecoin,
					includeGovernance
				} satisfies RWAOverviewBreakdownRequest,
				isDefaultState: chartType === DEFAULT_CHART_TYPE && !includeStablecoin && !includeGovernance
			}
		default:
			return assertNever(page)
	}
}

function fetchOverviewBreakdownDataset(request: RWAOverviewBreakdownRequest): Promise<MultiSeriesChart2Dataset> {
	const searchParams = new URLSearchParams({
		breakdown: request.breakdown,
		key: request.key
	})

	if (request.includeStablecoin) searchParams.set('includeStablecoin', 'true')
	if (request.includeGovernance) searchParams.set('includeGovernance', 'true')

	return fetchJson<MultiSeriesChart2Dataset>(`/api/rwa/overview-breakdown?${searchParams.toString()}`)
}

export function RWAOverviewBreakdownChart({
	page,
	initialChartDataset,
	stackLabel
}: {
	page: RWAOverviewPage
	initialChartDataset: MultiSeriesChart2Dataset
	stackLabel: string
}) {
	const router = useRouter()
	const chartTypeQuery = readSingleQueryValue(router.query.chartType)
	const chartType = chartTypeQuery && isChartMetricKey(chartTypeQuery) ? chartTypeQuery : DEFAULT_CHART_TYPE
	const { request, isDefaultState } = getOverviewBreakdownRequestState(page, chartType, router.query)
	const { data, isLoading, error } = useQuery({
		queryKey: [
			'rwa-overview-breakdown',
			request.breakdown,
			request.key,
			request.includeStablecoin,
			request.includeGovernance
		],
		queryFn: () => fetchOverviewBreakdownDataset(request),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: !isDefaultState
	})
	const dataset = isDefaultState ? initialChartDataset : (data ?? EMPTY_DATASET)
	const showLoadingState = !isDefaultState && isLoading
	const stackOptions = useMemo(() => dataset.dimensions.filter((dimension) => dimension !== 'timestamp'), [dataset])
	const selectedStacksQ = router.query[STACKS_QUERY_KEY] as string | string[] | undefined
	const excludeStacksQ = router.query[EXCLUDE_STACKS_QUERY_KEY] as string | string[] | undefined
	const selectedStacks = useMemo(() => {
		if (stackOptions.length === 0) return []
		const availableStacks = new Set(stackOptions)
		if (selectedStacksQ === 'None') return []
		if (selectedStacksQ != null) {
			return toNonEmptyArrayParam(selectedStacksQ).filter((stack) => availableStacks.has(stack))
		}

		const excludedStacksSet = new Set(
			toNonEmptyArrayParam(excludeStacksQ).filter((stack) => availableStacks.has(stack))
		)
		if (excludedStacksSet.size === 0) return [...stackOptions]
		return stackOptions.filter((stack) => !excludedStacksSet.has(stack))
	}, [excludeStacksQ, selectedStacksQ, stackOptions])
	const selectedStacksSet = useMemo(() => new Set(selectedStacks), [selectedStacks])
	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

	const onSelectChartType = (nextChartType: RWAChartMetricKey) => {
		void pushShallowQuery(router, { chartType: nextChartType === DEFAULT_CHART_TYPE ? undefined : nextChartType })
	}

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3 pb-0">
				<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
					{CHART_TYPE_OPTIONS.map(({ key, label }) => (
						<button
							key={`rwa-breakdown-chart-type-${key}`}
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
					filename={`rwa-overview-breakdown-${chartType}`}
					title={`RWA ${CHART_TYPE_OPTIONS.find((option) => option.key === chartType)?.label ?? 'Breakdown'}`}
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
			) : (
				<Suspense fallback={<div className="h-[360px]" />}>
					<MultiSeriesChart2
						dataset={dataset}
						stacked
						showTotalInTooltip
						selectedCharts={selectedStacksSet}
						onReady={handleChartReady}
						chartOptions={Y_AXIS_FLOOR}
					/>
				</Suspense>
			)}
		</div>
	)
}
