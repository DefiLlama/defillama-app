import { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, formattedPercent } from '~/utils'

interface ITreemapChartProps {
	treeData: any[]
	variant?: 'yields' | 'narrative'
	height?: string
}

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const TreemapChart = React.lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapChartProps>

const DEFAULT_SORTING_STATE = [{ id: 'change', desc: true }]

// for linechart
function calculateDenominatedChange(data, denominatedCoin) {
	// Avoid mutating upstream arrays (performanceTimeSeries is reused across views).
	const sortedData = [...(data ?? [])].sort((a, b) => a.date - b.date)
	const denominatedReturns = []

	const denominatedCoinDay0 = sortedData?.[0]?.[denominatedCoin]
	if (denominatedCoinDay0 == null) return sortedData

	for (const dayData of sortedData) {
		const newDayData = { date: dayData.date }

		for (const category in dayData) {
			if (category !== 'date' && category !== denominatedCoin) {
				// calculate relative performance
				const categoryPerformance = 1 + dayData[category] / 100
				const denominatedCoinPerformance = 1 + dayData[denominatedCoin] / 100
				const relativePerformance = (categoryPerformance / denominatedCoinPerformance - 1) * 100

				newDayData[category] = relativePerformance
			}
		}

		denominatedReturns.push(newDayData)
	}

	return denominatedReturns
}

// for bar + heatmap
function calculateDenominatedChange2(data, denominatedCoin, field) {
	// If we don't have a denom coin entry for the current period,
	// we can't compute a relative return. Return the original data (no-op).
	const denomRow = data?.find?.((i) => i?.name === denominatedCoin)
	const denomChangeRaw = denomRow?.[field]
	const denomChange = typeof denomChangeRaw === 'number' ? denomChangeRaw : Number(denomChangeRaw)
	if (!Number.isFinite(denomChange)) return data

	const denominatedCoinPerformance = 1 + denomChange / 100
	if (!Number.isFinite(denominatedCoinPerformance) || denominatedCoinPerformance === 0) return data

	const denominatedReturns = []
	for (const i of data ?? []) {
		const raw = i?.[field]
		const change = typeof raw === 'number' ? raw : Number(raw)
		if (!Number.isFinite(change)) {
			denominatedReturns.push({ ...i, [field]: raw })
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

// Unified period configuration to avoid redundant lookups
const PERIOD_CONFIG: Record<(typeof PERIODS)[number], { field: string; seriesKey: string }> = {
	'7D': { field: 'change1W', seriesKey: '7' },
	'30D': { field: 'change1M', seriesKey: '30' },
	YTD: { field: 'changeYtd', seriesKey: 'ytd' },
	'365D': { field: 'change1Y', seriesKey: '365' }
}

const DENOM_COIN_MAP: Record<(typeof DENOMS)[number], string> = {
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
}) => {
	const [tab, setTab] = React.useState('linechart')
	const [groupBy, setGroupBy] = React.useState<(typeof PERIODS)[number]>('30D')
	const [groupByDenom, setGroupByDenom] = React.useState<(typeof DENOMS)[number]>('$')

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

		const hasTimeSeriesDenom = (coinName: string) => {
			if (!Array.isArray(series) || series.length === 0) return false
			// Need at least one finite datapoint to denominate.
			for (const row of series) {
				if (!row || typeof row !== 'object') continue
				const v = (row as any)[coinName]
				const n = typeof v === 'number' ? v : Number(v)
				if (Number.isFinite(n)) return true
			}
			return false
		}

		const hasPctDenom = (coinName: string) => {
			const row = pctChanges?.find?.((i) => i?.name === coinName)
			const v = row?.[field]
			const n = typeof v === 'number' ? v : Number(v)
			return Number.isFinite(n)
		}

		const disabled: (typeof DENOMS)[number][] = []
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

		const sorted = [...pctChangesDenom].sort((a, b) => b[field] - a[field]).map((i) => ({ ...i, change: i[field] }))

		const treemapChart = sorted.map((i) => ({ ...i, returnField: i[field] }))

		let chart = performanceTimeSeries?.[seriesKey]
		chart = denomCoin === '$' ? chart : calculateDenominatedChange(chart, denomCoin)

		return { sortedPctChanges: sorted, timeSeries: chart, treemapChart }
	}, [pctChanges, groupBy, performanceTimeSeries, groupByDenom, isCoinPage])

	const selectedCharts = React.useMemo(() => {
		// Passing `undefined` shows all series; otherwise MultiSeriesChart2 filters to the set.
		if (!selectedSeries || selectedSeries.length === 0) return undefined
		return new Set(selectedSeries)
	}, [selectedSeries])

	const dataset = React.useMemo(() => {
		const seriesKeys = areaChartLegend ?? []
		const dimensions = ['timestamp', ...seriesKeys]

		const sortedRows = [...(timeSeries ?? [])].sort((a, b) => a.date - b.date)
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

	const treemapTreeData = React.useMemo(() => {
		const safeReturn = (v: number | null | undefined) => {
			return typeof v === 'number' && Number.isFinite(v) ? parseFloat(v.toFixed(2)) : 0
		}

		const treeData = []
		const cData = treemapChart

		// structure into hierarchy
		for (let cat of [...new Set(cData.map((p) => p.categoryName))]) {
			const catData = cData.filter((p) => p.categoryName === cat)
			const catMcap = catData.map((p) => p.mcap).reduce((a, b) => a + b, 0)

			treeData.push({
				value: [catMcap, null, null],
				name: cat,
				path: cat,
				children: catData.map((p) => ({
					value: [p.mcap, safeReturn(p.returnField), safeReturn(p.returnField)],
					name: p.name,
					path: `${p.categoryName}/${p.name}`
				}))
			})
		}

		return treeData
	}, [treemapChart])

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
						onClick={() => React.startTransition(() => setTab('linechart'))}
						data-selected={tab === 'linechart'}
					>
						Linechart
					</button>
					<button
						className="border-b border-l border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b-(--primary)"
						onClick={() => React.startTransition(() => setTab('barchart'))}
						data-selected={tab === 'barchart'}
					>
						Barchart
					</button>
					<button
						className="border-b border-l border-(--form-control-border) px-6 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[selected=true]:border-b-(--primary)"
						onClick={() => React.startTransition(() => setTab('heatmap'))}
						data-selected={tab === 'heatmap'}
					>
						Heatmap
					</button>
				</div>

				<div className="flex items-center justify-end gap-2 p-2">
					<TagGroup values={PERIODS} selectedValue={groupBy} setValue={(val: typeof groupBy) => setGroupBy(val)} />
					<TagGroup
						values={DENOMS}
						selectedValue={groupByDenom}
						setValue={(val: typeof groupByDenom) => setGroupByDenom(val)}
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
								dataset={dataset}
								charts={barCharts}
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
								dataset={dataset}
								charts={lineCharts}
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
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

interface CategoryPerformanceRow {
	id: string
	name: string
	mcap: number
	change1W: number
	change1M: number
	change1Y: number
	nbCoins: number
}

interface CoinPerformanceRow {
	id: string
	mcap: number
	change1W: number
	change1M: number
	change1Y: number
}

const CoinPerformanceColumn: ColumnDef<CoinPerformanceRow>[] = [
	{
		header: 'Coin',
		accessorKey: 'name',
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
						{getValue() as string | null}
					</BasicLink>
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Δ%',
		accessorKey: 'change',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end',
			headerHelperText: `Shows how a coin has performed over your chosen time period and in your selected denomination (e.g., $, BTC).`
		},
		size: 120
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '24h Volume',
		accessorKey: 'volume1D',
		cell: ({ getValue }) => <>{getValue() ? formattedNum(getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 110
	}
]

const CategoryPerformanceColumn: ColumnDef<CategoryPerformanceRow>[] = [
	{
		header: 'Category',
		accessorKey: 'name',
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
							{getValue() as string | null}
						</BasicLink>
					) : (
						<BasicLink
							href={`/narrative-tracker/${row.original.id}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue() as string | null}
						</BasicLink>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Δ%',
		accessorKey: 'change',
		cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
		meta: {
			align: 'end',
			headerHelperText: `Shows how a category of coins has performed over your chosen time period and in your selected denomination (e.g., $, BTC). Method: 1. calculating the percentage change for each individual coin in the category. 2. weighting these changes based on each coin's market capitalization. 3. averaging these weighted changes to get the overall category performance.`
		},
		size: 120
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'end'
		},
		size: 110
	},
	{
		header: '24h Volume',
		accessorKey: 'volume1D',
		cell: ({ getValue }) => <>{getValue() ? formattedNum(getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: '# of Coins',
		accessorKey: 'nbCoins',
		meta: {
			align: 'end'
		},
		size: 110
	}
]
