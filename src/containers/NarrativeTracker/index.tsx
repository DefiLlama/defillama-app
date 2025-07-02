import * as React from 'react'
import dynamic from 'next/dynamic'
import type { IBarChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { CategoryPerformanceColumn, CoinPerformanceColumn } from '~/components/Table/Defi/columns'
import { useScrollToTop } from '~/hooks'
import { IChartProps as IAreaChartProps } from '~/components/ECharts/types'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

interface IChartProps {
	chartData: any[]
	title?: string
}

const BarChart = dynamic(() => import('~/components/ECharts/BarChart/NonTimeSeries'), {
	ssr: false
}) as React.FC<IBarChartProps>

const TreemapChart = dynamic(() => import('~/components/ECharts/TreemapChart2'), {
	ssr: false
}) as React.FC<IChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IAreaChartProps>

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
			<ProtocolsChainsSearch />

			<div className="bg-(--cards-bg) rounded-md">
				<h1 className="text-xl font-semibold p-3">
					{isCoinPage ? `Category: ${categoryName ?? ''}` : 'MCap-Weighted Category Performance'}
				</h1>

				<div className="flex flex-wrap overflow-x-auto border-b border-(--form-control-border)">
					<button
						className="py-2 px-6 whitespace-nowrap border-b border-(--form-control-border) data-[selected=true]:border-b-(--primary1) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						onClick={() => setTab('linechart')}
						data-selected={tab === 'linechart'}
					>
						Linechart
					</button>
					<button
						className="py-2 px-6 whitespace-nowrap border-b border-l border-(--form-control-border) data-[selected=true]:border-b-(--primary1) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						onClick={() => setTab('barchart')}
						data-selected={tab === 'barchart'}
					>
						Barchart
					</button>
					<button
						className="py-2 px-6 whitespace-nowrap border-b border-l border-(--form-control-border) data-[selected=true]:border-b-(--primary1) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						onClick={() => setTab('heatmap')}
						data-selected={tab === 'heatmap'}
					>
						Heatmap
					</button>
				</div>

				<div className="flex items-center gap-3 p-3 justify-end">
					<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-(--form-control-border) text-[#666] dark:text-[#919296]">
						{(['7D', '30D', 'YTD', '365D'] as const).map((period) => (
							<button
								key={period}
								className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
								data-active={groupBy === period}
								onClick={() => setGroupBy(period)}
							>
								{period}
							</button>
						))}
					</div>
					<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-(--form-control-border) text-[#666] dark:text-[#919296]">
						<p className="pl-3 pr-1">Show as:</p>
						{(['$', 'BTC', 'ETH', 'SOL'] as const).map((denom) => (
							<button
								key={denom}
								className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
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
						<BarChart title="" chartData={barChart} valueSymbol="%" height="533px" />
					) : tab === 'linechart' ? (
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
					) : (
						<TreemapChart chartData={treemapChart} />
					)}
				</div>

				<TableWithSearch
					data={sortedPctChanges}
					columns={isCoinPage ? CoinPerformanceColumn : CategoryPerformanceColumn}
					columnToSearch={'name'}
					placeholder={'Search...'}
				/>
			</div>
		</>
	)
}

const areaChartoptions = {
	yAxis: {
		position: 'right'
	}
}
