import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import type { IBarChartProps } from '~/components/ECharts/types'
import { IChartProps as IAreaChartProps } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { formattedNum, formattedPercent } from '~/utils'

interface IChartProps {
	chartData: any[]
	title?: string
}

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart/NonTimeSeries')) as React.FC<IBarChartProps>

const TreemapChart = React.lazy(() => import('~/components/ECharts/TreemapChart2')) as React.FC<IChartProps>

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IAreaChartProps>

// for linechart
function calculateDenominatedChange(data, denominatedCoin) {
	const sortedData = data.sort((a, b) => a.date - b.date)
	const denominatedReturns = []

	sortedData.forEach((dayData) => {
		const newDayData = { date: dayData.date }

		Object.keys(dayData).forEach((category) => {
			if (category !== 'date' && category !== denominatedCoin) {
				// calculate relative performance
				const categoryPerformance = 1 + dayData[category] / 100
				const denominatedCoinPerformance = 1 + dayData[denominatedCoin] / 100
				const relativePerformance = (categoryPerformance / denominatedCoinPerformance - 1) * 100

				newDayData[category] = relativePerformance
			}
		})

		denominatedReturns.push(newDayData)
	})

	return denominatedReturns
}

// for bar + heatmap
function calculateDenominatedChange2(data, denominatedCoin, field) {
	const denominatedReturns = []

	const denominatedCoinPerformance = 1 + data.find((i) => i.name === denominatedCoin)[field] / 100

	data.forEach((i) => {
		const categoryPerformance = 1 + i[field] / 100
		const relativePerformance = (categoryPerformance / denominatedCoinPerformance - 1) * 100

		denominatedReturns.push({ ...i, [field]: relativePerformance })
	})

	return denominatedReturns
}

const PERIODS = ['7D', '30D', 'YTD', '365D'] as const
const DENOMS = ['$', 'BTC', 'ETH', 'SOL'] as const

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

	const { sortedPctChanges, barChart, treemapChart, lineChart } = React.useMemo(() => {
		const field = {
			'7D': 'change1W',
			'30D': 'change1M',
			YTD: 'changeYtd',
			'365D': 'change1Y'
		}[groupBy]

		const denomCoin = {
			$: '$',
			BTC: 'Bitcoin',
			ETH: 'Ethereum',
			SOL: 'Solana'
		}[groupByDenom]

		const cumulativeWindow = {
			'7D': '7D',
			'30D': '30D',
			YTD: 'YTD',
			'365D': '365D'
		}[groupBy]

		let pctChangesDenom = denomCoin === '$' ? pctChanges : calculateDenominatedChange2(pctChanges, denomCoin, field)
		pctChangesDenom = isCoinPage
			? pctChangesDenom.filter((i) => !['bitcoin', 'ethereum', 'solana'].includes(i.id))
			: pctChangesDenom

		const sorted = [...pctChangesDenom].sort((a, b) => b[field] - a[field]).map((i) => ({ ...i, change: i[field] }))

		const treemapChart = sorted.map((i) => ({ ...i, returnField: i[field] }))

		let chart =
			cumulativeWindow === '7D'
				? performanceTimeSeries['7']
				: cumulativeWindow === '30D'
					? performanceTimeSeries['30']
					: cumulativeWindow === 'YTD'
						? performanceTimeSeries['ytd']
						: performanceTimeSeries['365']

		chart = denomCoin === '$' ? chart : calculateDenominatedChange(chart, denomCoin)

		return { sortedPctChanges: sorted, barChart: chart, treemapChart, lineChart: chart }
	}, [pctChanges, groupBy, performanceTimeSeries, groupByDenom, isCoinPage])

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

				<div className="flex items-center justify-end gap-3 p-2">
					<TagGroup values={PERIODS} selectedValue={groupBy} setValue={(val: typeof groupBy) => setGroupBy(val)} />
					<TagGroup
						values={DENOMS}
						selectedValue={groupByDenom}
						setValue={(val: typeof groupByDenom) => setGroupByDenom(val)}
						label="Show as:"
					/>
				</div>

				<div className="min-h-[360px]">
					{tab === 'barchart' ? (
						<React.Suspense fallback={<></>}>
							<BarChart title="" chartData={barChart} valueSymbol="%" height="533px" />
						</React.Suspense>
					) : tab === 'linechart' ? (
						<React.Suspense fallback={<></>}>
							<AreaChart
								title=""
								chartData={lineChart}
								stacks={areaChartLegend}
								valueSymbol="%"
								hideDefaultLegend={true}
								hideGradient={true}
								customLegendName={isCoinPage ? 'Coin' : 'Category'}
								customLegendOptions={areaChartLegend}
								tooltipValuesRelative
								hideOthersInTooltip
								chartOptions={areaChartoptions}
								height="533px"
							/>
						</React.Suspense>
					) : (
						<React.Suspense fallback={<></>}>
							<TreemapChart chartData={treemapChart} />
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
				sortingState={[{ id: 'change', desc: true }]}
			/>
		</>
	)
}

const areaChartoptions = {
	yAxis: {
		position: 'right'
	}
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
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<span className="relative flex items-center gap-2">
					<span>{index + 1}.</span>
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
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="relative flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
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
