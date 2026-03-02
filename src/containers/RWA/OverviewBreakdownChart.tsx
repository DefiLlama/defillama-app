import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import MultiSeriesChart2 from '~/components/ECharts/MultiSeriesChart2'
import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import type { ExcludeQueryKey } from '~/components/Select/types'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { pushShallowQuery, readSingleQueryValue, toNonEmptyArrayParam } from '~/utils/routerQuery'
import type { IRWABreakdownDatasetsByMetric, RWAChartMetricKey } from './api.types'

const CHART_TYPE_OPTIONS: Array<{ key: RWAChartMetricKey; label: string }> = [
	{ key: 'activeMcap', label: 'Active Mcap' },
	{ key: 'onChainMcap', label: 'Onchain Mcap' },
	{ key: 'defiActiveTvl', label: 'DeFi Active TVL' }
]

const VALID_CHART_TYPES = new Set<RWAChartMetricKey>(CHART_TYPE_OPTIONS.map(({ key }) => key))

const DEFAULT_CHART_TYPE: RWAChartMetricKey = 'activeMcap'

const EMPTY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }
const STACKS_QUERY_KEY = 'stacks'
const EXCLUDE_STACKS_QUERY_KEY: ExcludeQueryKey = 'excludeStacks'

const isChartMetricKey = (value: string): value is RWAChartMetricKey => {
	return VALID_CHART_TYPES.has(value as RWAChartMetricKey)
}

export function RWAOverviewBreakdownChart({
	datasets,
	stackLabel
}: {
	datasets: IRWABreakdownDatasetsByMetric
	stackLabel: string
}) {
	const router = useRouter()
	const chartTypeQuery = readSingleQueryValue(router.query.chartType)
	const chartType = chartTypeQuery && isChartMetricKey(chartTypeQuery) ? chartTypeQuery : DEFAULT_CHART_TYPE
	const dataset = datasets[chartType] ?? datasets[DEFAULT_CHART_TYPE] ?? EMPTY_DATASET
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
		pushShallowQuery(router, { chartType: nextChartType === DEFAULT_CHART_TYPE ? undefined : nextChartType })
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
			<MultiSeriesChart2
				dataset={dataset}
				stacked
				showTotalInTooltip
				tooltipTotalPosition="top"
				selectedCharts={selectedStacksSet}
				onReady={handleChartReady}
			/>
		</div>
	)
}
