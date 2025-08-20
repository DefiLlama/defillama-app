import * as React from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { IChartProps as IAreaChartProps } from '~/components/ECharts/types'
import { CategoryPerformanceColumn, CoinPerformanceColumn } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useScrollToTop } from '~/hooks'

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

export const CategoryPerformanceContainer = ({
	pctChanges,
	performanceTimeSeries,
	areaChartLegend,
	isCoinPage,
	categoryName
}) => {
	useScrollToTop()

	const [tab, setTab] = React.useState('linechart')
	const [groupBy, setGroupBy] = React.useState<'7D' | '30D' | 'YTD' | '365D'>('30D')
	const [groupByDenom, setGroupByDenom] = React.useState<'$' | 'BTC' | 'ETH' | 'SOL'>('$')

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
		const barChart = sorted.map((i) => [i.name, i[field]?.toFixed(2)])
		const treemapChart = sorted.map((i) => ({ ...i, returnField: i[field] }))

		let lineChart =
			cumulativeWindow === '7D'
				? performanceTimeSeries['7']
				: cumulativeWindow === '30D'
					? performanceTimeSeries['30']
					: cumulativeWindow === 'YTD'
						? performanceTimeSeries['ytd']
						: performanceTimeSeries['365']

		lineChart = denomCoin === '$' ? lineChart : calculateDenominatedChange(lineChart, denomCoin)

		return { sortedPctChanges: sorted, barChart, treemapChart, lineChart }
	}, [pctChanges, groupBy, performanceTimeSeries, groupByDenom, isCoinPage])

	return (
		<>
			{isCoinPage ? (
				<h1 className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 text-xl font-semibold">
					{isCoinPage ? `Category: ${categoryName ?? ''}` : 'Narrative Tracker: Change in market cap by category'}
				</h1>
			) : (
				<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<h1 className="text-xl font-semibold">Narrative Tracker</h1>
					<p className="text-sm text-(--text-secondary)">
						MCap-Weighted Category Performance: Shows how a category of coins has performed over your chosen time period
						and in your selected denomination (e.g., $, BTC). Method: 1. calculating the percentage change for each
						individual coin in the category. 2. weighting these changes based on each coin's market capitalization. 3.
						averaging these weighted changes to get the overall category performance.
					</p>
				</div>
			)}

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

				<div className="flex items-center justify-end gap-3 p-3">
					<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
						{(['7D', '30D', 'YTD', '365D'] as const).map((period) => (
							<button
								key={period}
								className="shrink-0 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
								data-active={groupBy === period}
								onClick={() => setGroupBy(period)}
							>
								{period}
							</button>
						))}
					</div>
					<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
						<p className="pr-1 pl-3">Show as:</p>
						{(['$', 'BTC', 'ETH', 'SOL'] as const).map((denom) => (
							<button
								key={denom}
								className="shrink-0 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
								data-active={groupByDenom === denom}
								onClick={() => setGroupByDenom(denom)}
							>
								{denom}
							</button>
						))}
					</div>
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
			/>
		</>
	)
}

const areaChartoptions = {
	yAxis: {
		position: 'right'
	}
}
