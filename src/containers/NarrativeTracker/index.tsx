import { createColumnHelper } from '@tanstack/react-table'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum } from '~/utils'
import {
	buildNarrativeTreemapTreeData,
	calculateDenominatedTimeSeries,
	type NarrativeTreemapTreeData
} from './chartData'
import type { CategoryPerformanceProps, IPctChangeRow } from './types'

interface ITreemapChartProps {
	treeData: NarrativeTreemapTreeData
	variant?: 'yields' | 'narrative'
	height?: string
}

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const TreemapChart = React.lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>

const DEFAULT_SORTING_STATE = [{ id: 'change', desc: true }]
const columnHelper = createColumnHelper<IPctChangeRow>()

// for bar + heatmap
function calculateDenominatedChange2(
	data: IPctChangeRow[],
	denominatedCoin: string,
	field: PeriodConfig['field']
): IPctChangeRow[] {
	const denomRow = data.find((i) => i.name === denominatedCoin)
	const denomChange = denomRow?.[field]
	if (denomChange == null) return data

	const denominatedCoinPerformance = 1 + denomChange / 100
	if (denominatedCoinPerformance === 0) return data

	const denominatedReturns: IPctChangeRow[] = []
	for (const i of data) {
		const change = i[field]
		if (change == null) {
			denominatedReturns.push(i)
			continue
		}
		const categoryPerformance = 1 + change / 100
		const relativePerformance = (categoryPerformance / denominatedCoinPerformance - 1) * 100
		denominatedReturns.push({ ...i, [field]: relativePerformance })
	}

	return denominatedReturns
}

const PERIODS = ['7D', '30D', 'YTD', '365D'] as const
const DENOMS = ['$', 'BTC', 'ETH', 'SOL'] as const

type Period = (typeof PERIODS)[number]
type Denom = (typeof DENOMS)[number]
type PeriodField = 'change1W' | 'change1M' | 'changeYtd' | 'change1Y'
type PeriodConfig = { field: PeriodField; seriesKey: string }

// Unified period configuration to avoid redundant lookups
const PERIOD_CONFIG: Record<Period, PeriodConfig> = {
	'7D': { field: 'change1W', seriesKey: '7' },
	'30D': { field: 'change1M', seriesKey: '30' },
	YTD: { field: 'changeYtd', seriesKey: 'ytd' },
	'365D': { field: 'change1Y', seriesKey: '365' }
}

const DENOM_COIN_MAP: Record<Denom, string> = {
	$: '$',
	BTC: 'Bitcoin',
	ETH: 'Ethereum',
	SOL: 'Solana'
}

export const CategoryPerformanceContainer = ({
	pctChanges,
	performanceTimeSeries,
	areaChartLegend,
	isCoinPage,
	categoryName
}: CategoryPerformanceProps) => {
	const [tab, setTab] = React.useState('linechart')
	const [groupBy, setGroupBy] = React.useState<Period>('30D')
	const [groupByDenom, setGroupByDenom] = React.useState<Denom>('$')

	const [selectedSeries, setSelectedSeries] = React.useState<string[]>(areaChartLegend ?? [])

	// Keep selection in sync when legend options change.
	React.useEffect(() => {
		const nextOptions = areaChartLegend ?? []
		setSelectedSeries((prev) => {
			// Preserve any existing selection that still exists in the new options.
			const preserved = prev.filter((s) => nextOptions.includes(s))
			const next = preserved.length > 0 ? preserved : nextOptions
			// Avoid re-render loops when callers pass a new array instance each render.
			if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev
			return next
		})
	}, [areaChartLegend])

	const disabledDenoms = React.useMemo(() => {
		const { field, seriesKey } = PERIOD_CONFIG[groupBy]
		const series = performanceTimeSeries?.[seriesKey] ?? []

		const hasTimeSeriesDenom = (coinName: string): boolean => {
			if (series.length === 0) return false
			for (const row of series) {
				if (row[coinName] != null) return true
			}
			return false
		}

		const hasPctDenom = (coinName: string): boolean => {
			const row = pctChanges.find((i) => i.name === coinName)
			return row?.[field] != null
		}

		const disabled: Denom[] = []
		for (const denom of DENOMS) {
			if (denom === '$') continue
			const coinName = DENOM_COIN_MAP[denom]
			if (!hasTimeSeriesDenom(coinName) || !hasPctDenom(coinName)) disabled.push(denom)
		}
		return disabled
	}, [groupBy, performanceTimeSeries, pctChanges])

	React.useEffect(() => {
		// Prevent selecting a denom that can't be applied (would look like "filter doesn't work").
		if (disabledDenoms.includes(groupByDenom)) setGroupByDenom('$')
	}, [disabledDenoms, groupByDenom])

	// All values here are returns / relative returns expressed in percent.
	const chartValueSymbol = '%'

	// Keep axis on the right like before; avoid `yAxis.name` because it renders
	// at the top of the axis and can get clipped by the chart container.
	const barChartOptions = React.useMemo(() => ({ yAxis: { position: 'right' } }), [])
	const lineChartOptions = React.useMemo(() => ({ yAxis: { position: 'right' } }), [])

	const { sortedPctChanges, timeSeries, treemapChart } = React.useMemo(() => {
		const { field, seriesKey } = PERIOD_CONFIG[groupBy]
		const denomCoin = DENOM_COIN_MAP[groupByDenom]

		let pctChangesDenom = denomCoin === '$' ? pctChanges : calculateDenominatedChange2(pctChanges, denomCoin, field)
		pctChangesDenom = isCoinPage
			? pctChangesDenom.filter((i) => !['bitcoin', 'ethereum', 'solana'].includes(i.id))
			: pctChangesDenom

		const sorted = pctChangesDenom
			.toSorted((a, b) => {
				const bValue = b[field] ?? Number.NEGATIVE_INFINITY
				const aValue = a[field] ?? Number.NEGATIVE_INFINITY
				return bValue - aValue
			})
			.map((i) => ({ ...i, change: i[field] ?? null }))

		const treemapData = sorted.map((i) => ({ ...i, returnField: i[field] ?? null }))

		let chart = performanceTimeSeries?.[seriesKey]
		chart = denomCoin === '$' ? chart : calculateDenominatedTimeSeries(chart, denomCoin)

		return { sortedPctChanges: sorted, timeSeries: chart, treemapChart: treemapData }
	}, [pctChanges, groupBy, performanceTimeSeries, groupByDenom, isCoinPage])

	const selectedCharts = React.useMemo(() => {
		// Passing `undefined` shows all series; otherwise MultiSeriesChart2 filters to the set.
		if (!selectedSeries || selectedSeries.length === 0) return undefined
		return new Set(selectedSeries)
	}, [selectedSeries])

	const dataset = React.useMemo(() => {
		const seriesKeys = areaChartLegend ?? []
		const dimensions = ['timestamp', ...seriesKeys]

		const sortedRows = (timeSeries ?? []).toSorted((a, b) => a.date - b.date)
		const source = sortedRows.map((row) => {
			const out: Record<string, string | number | null | undefined> = { timestamp: row.date * 1e3 }
			for (const key of seriesKeys) out[key] = row[key] ?? null
			return out
		})

		return { dimensions, source }
	}, [timeSeries, areaChartLegend])

	const lineCharts = React.useMemo(() => {
		const seriesKeys = areaChartLegend ?? []
		return seriesKeys.map((name) => ({
			type: 'line' as const,
			name,
			encode: { x: 'timestamp', y: name },
			// Keep colors stable across tabs.
			color: undefined,
			yAxisIndex: undefined,
			large: true
		}))
	}, [areaChartLegend])

	const barCharts = React.useMemo(() => {
		const seriesKeys = areaChartLegend ?? []
		return seriesKeys.map((name) => ({
			type: 'bar' as const,
			name,
			encode: { x: 'timestamp', y: name },
			stack: 'A',
			large: true
		}))
	}, [areaChartLegend])
	const chartDataBundle = React.useMemo(() => ({ dataset, barCharts, lineCharts }), [dataset, barCharts, lineCharts])
	const deferredChartData = React.useDeferredValue(chartDataBundle)

	const treemapTreeData = React.useMemo(() => buildNarrativeTreemapTreeData(treemapChart), [treemapChart])

	const { chartInstance: exportChartInstance, handleChartReady: onChartReady } = useGetChartInstance()

	return (
		<>
			<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				{isCoinPage && categoryName ? <h1 className="text-xl font-semibold">Category: {categoryName ?? ''}</h1> : null}
				<p className="text-sm text-(--text-secondary)">
					MCap-Weighted Category Performance: Shows how a category of coins has performed over your chosen time period
					and in your selected denomination (e.g., $, BTC). Method: 1. calculating the percentage change for each
					individual coin in the category. 2. weighting these changes based on each coin's market capitalization. 3.
					averaging these weighted changes to get the overall category performance.
				</p>
			</div>

			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap overflow-x-auto border-b border-(--form-control-border)">
					<button
						className="border-b border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b-(--primary)"
						onClick={() => setTab('linechart')}
						data-selected={tab === 'linechart'}
					>
						Linechart
					</button>
					<button
						className="border-b border-l border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b-(--primary)"
						onClick={() => setTab('barchart')}
						data-selected={tab === 'barchart'}
					>
						Barchart
					</button>
					<button
						className="border-b border-l border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b-(--primary)"
						onClick={() => setTab('heatmap')}
						data-selected={tab === 'heatmap'}
					>
						Heatmap
					</button>
				</div>

				<div className="flex items-center justify-end gap-2 p-2">
					<TagGroup values={PERIODS} selectedValue={groupBy} setValue={(val) => setGroupBy(val)} />
					<TagGroup
						values={DENOMS}
						selectedValue={groupByDenom}
						setValue={(val) => setGroupByDenom(val)}
						label="Denom (vs):"
						disabledValues={disabledDenoms}
					/>
					{tab === 'barchart' || tab === 'linechart' ? (
						<>
							{areaChartLegend?.length > 1 ? (
								<SelectWithCombobox
									allValues={areaChartLegend}
									selectedValues={selectedSeries}
									setSelectedValues={setSelectedSeries}
									label={isCoinPage ? 'Coins' : 'Categories'}
									labelType="smol"
									variant="filter"
									portal
								/>
							) : null}
							<ChartExportButtons
								chartInstance={exportChartInstance}
								filename={`category-performance-${tab}`}
								title={`Category Performance ${tab}`}
							/>
						</>
					) : null}
				</div>

				<div className="min-h-[360px]">
					{tab === 'barchart' ? (
						<React.Suspense fallback={<div className="h-[533px]" />}>
							<MultiSeriesChart2
								dataset={deferredChartData.dataset}
								charts={deferredChartData.barCharts}
								selectedCharts={selectedCharts}
								valueSymbol={chartValueSymbol}
								height="533px"
								hideDataZoom={false}
								chartOptions={barChartOptions}
								exportButtons="hidden"
								onReady={onChartReady}
							/>
						</React.Suspense>
					) : tab === 'linechart' ? (
						<React.Suspense fallback={<div className="h-[533px]" />}>
							<MultiSeriesChart2
								dataset={deferredChartData.dataset}
								charts={deferredChartData.lineCharts}
								selectedCharts={selectedCharts}
								valueSymbol={chartValueSymbol}
								height="533px"
								solidChartAreaStyle={false}
								chartOptions={lineChartOptions}
								tooltipMaxItems={30}
								exportButtons="hidden"
								onReady={onChartReady}
							/>
						</React.Suspense>
					) : (
						<React.Suspense fallback={<div className="h-[533px]" />}>
							<TreemapChart treeData={treemapTreeData} variant="narrative" height="533px" />
						</React.Suspense>
					)}
				</div>
			</div>

			<TableWithSearch
				data={sortedPctChanges}
				columns={isCoinPage ? CoinPerformanceColumn : CategoryPerformanceColumn}
				columnToSearch={'name'}
				placeholder={'Search...'}
				header="Categories"
				csvFileName={isCoinPage ? 'narrative-tracker-coin' : 'narrative-tracker-category'}
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const CoinPerformanceColumn = [
	columnHelper.accessor('name', {
		header: 'Coin',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`https://www.coingecko.com/en/coins/${row.original.id}`}
						target="_blank"
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue()}
					</BasicLink>
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[min(240px,40vw)]'
		}
	}),
	columnHelper.accessor('change', {
		header: 'Δ%',
		cell: ({ getValue }) => <PercentChange percent={getValue()} />,
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end',
			headerHelperText: `Shows how a coin has performed over your chosen time period and in your selected denomination (e.g., $, BTC).`
		}
	}),
	columnHelper.accessor('mcap', {
		header: 'Market Cap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('volume1D', {
		header: '24h Volume',
		cell: ({ getValue }) => {
			const value = getValue()
			return <>{value != null ? formattedNum(value, true) : null}</>
		},
		meta: {
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	})
]

const CategoryPerformanceColumn = [
	columnHelper.accessor('name', {
		header: 'Category',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					{['bitcoin', 'ethereum', 'solana'].includes(row.original.id) ? (
						<BasicLink
							href={`https://www.coingecko.com/en/coins/${row.original.id}`}
							target="_blank"
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue()}
						</BasicLink>
					) : (
						<BasicLink
							href={`/narrative-tracker/${row.original.id}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue()}
						</BasicLink>
					)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[min(240px,40vw)]'
		}
	}),
	columnHelper.accessor('change', {
		header: 'Δ%',
		cell: ({ getValue }) => <PercentChange percent={getValue()} />,
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end',
			headerHelperText: `Shows how a category of coins has performed over your chosen time period and in your selected denomination (e.g., $, BTC). Method: 1. calculating the percentage change for each individual coin in the category. 2. weighting these changes based on each coin's market capitalization. 3. averaging these weighted changes to get the overall category performance.`
		}
	}),
	columnHelper.accessor('mcap', {
		header: 'Market Cap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('volume1D', {
		header: '24h Volume',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('nbCoins', {
		header: '# of Coins',
		meta: {
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	})
]
