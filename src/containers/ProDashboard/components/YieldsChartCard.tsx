import { lazy, Suspense, useMemo } from 'react'
import { formatTvlApyTooltip } from '~/components/ECharts/formatters'
import type { IBarChartProps, IChartProps, IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import { useYieldChartData, useYieldChartLendBorrow } from '~/containers/Yields/queries/client'
import { download, formattedNum } from '~/utils'
import { useChartImageExport } from '../hooks/useChartImageExport'
import { useProDashboardTime } from '../ProDashboardAPIContext'
import type { YieldsChartConfig } from '../types'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'
import { useYieldChartTransformations } from './useYieldChartTransformations'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

interface YieldsChartCardProps {
	config: YieldsChartConfig
}

const tvlApyCharts = [
	{
		type: 'line' as const,
		name: 'APY',
		encode: { x: 'timestamp', y: 'APY' },
		color: '#fd3c99',
		yAxisIndex: 0,
		valueSymbol: '%'
	},
	{
		type: 'line' as const,
		name: 'TVL',
		encode: { x: 'timestamp', y: 'TVL' },
		color: '#4f8fea',
		yAxisIndex: 1,
		valueSymbol: '$'
	}
]
const tvlApyChartOptions = { tooltip: { formatter: formatTvlApyTooltip } }

const barChartStacks = { Base: 'a', Reward: 'a' }
const barChartColors = { Base: CHART_COLORS[0], Reward: CHART_COLORS[1] }
const liquidityChartColors = { Supplied: CHART_COLORS[0], Borrowed: CHART_COLORS[1], Available: CHART_COLORS[2] }
const liquidityLegendOptions = ['Supplied', 'Borrowed', 'Available']

export function YieldsChartCard({ config }: YieldsChartCardProps) {
	const { poolConfigId, poolName, project, chain, chartType = 'tvl-apy' } = config
	const { timePeriod, customTimePeriod } = useProDashboardTime()
	const { chartInstance, handleChartReady } = useChartImageExport()

	const { data: chart, isLoading: fetchingChartData, isError: chartError } = useYieldChartData(poolConfigId)

	const needsBorrowData = ['borrow-apy', 'net-borrow-apy', 'pool-liquidity'].includes(chartType)
	const {
		data: borrowChart,
		isLoading: fetchingBorrowData,
		isError: borrowError
	} = useYieldChartLendBorrow(needsBorrowData ? poolConfigId : null)

	const {
		tvlApyData,
		tvlApyDataset,
		supplyApyBarData,
		supplyApy7dData,
		borrowApyBarData,
		netBorrowApyData,
		poolLiquidityData,
		latestData
	} = useYieldChartTransformations({
		chartData: chart,
		borrowData: borrowChart,
		timePeriod,
		customTimePeriod
	})

	const currentChartData = useMemo(() => {
		switch (chartType) {
			case 'tvl-apy':
				return tvlApyData
			case 'supply-apy':
				return supplyApyBarData
			case 'supply-apy-7d':
				return supplyApy7dData
			case 'borrow-apy':
				return borrowApyBarData
			case 'net-borrow-apy':
				return netBorrowApyData
			case 'pool-liquidity':
				return poolLiquidityData
			default:
				return tvlApyData
		}
	}, [chartType, tvlApyData, supplyApyBarData, supplyApy7dData, borrowApyBarData, netBorrowApyData, poolLiquidityData])

	const handleCsvExport = () => {
		if (!currentChartData || currentChartData.length === 0) return

		let headers: string[]
		let rows: any[][]

		switch (chartType) {
			case 'tvl-apy':
				headers = ['Date', 'APY', 'TVL']
				rows = currentChartData.map((el: any) => [
					new Date(el.date * 1000).toLocaleDateString(),
					el.APY ?? '',
					el.TVL ?? ''
				])
				break
			case 'supply-apy':
			case 'borrow-apy':
				headers = ['Date', 'Base', 'Reward']
				rows = currentChartData.map((el: any) => [
					new Date(el.date * 1000).toLocaleDateString(),
					el.Base ?? '',
					el.Reward ?? ''
				])
				break
			case 'supply-apy-7d':
			case 'net-borrow-apy':
				headers = ['Date', 'APY']
				rows = currentChartData.map((el: any) => [new Date(el[0] * 1000).toLocaleDateString(), el[1] ?? ''])
				break
			case 'pool-liquidity':
				headers = ['Date', 'Supplied', 'Borrowed', 'Available']
				rows = currentChartData.map((el: any) => [
					new Date(el.date * 1000).toLocaleDateString(),
					el.Supplied ?? '',
					el.Borrowed ?? '',
					el.Available ?? ''
				])
				break
			default:
				headers = ['Date', 'APY', 'TVL']
				rows = currentChartData.map((el: any) => [
					new Date(el.date * 1000).toLocaleDateString(),
					el.APY ?? '',
					el.TVL ?? ''
				])
		}

		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const chartTypeSuffix = chartType !== 'tvl-apy' ? `_${chartType}` : ''
		const fileName = `${poolName.replace(/\s+/g, '_')}${chartTypeSuffix}_${new Date().toISOString().split('T')[0]}.csv`
		download(fileName, csvContent)
	}

	const imageFilename = `${poolName.replace(/\s+/g, '_')}`
	const imageTitle = `${poolName} - ${project} (${chain})`

	const isLoading = needsBorrowData ? fetchingChartData || fetchingBorrowData : fetchingChartData

	const hasError = needsBorrowData ? chartError || borrowError : chartError

	const hasRequiredData = (() => {
		switch (chartType) {
			case 'tvl-apy':
				return tvlApyData.length > 0
			case 'supply-apy':
				return supplyApyBarData.length > 0
			case 'supply-apy-7d':
				return supplyApy7dData.length > 0
			case 'borrow-apy':
				return borrowApyBarData.length > 0
			case 'net-borrow-apy':
				return netBorrowApyData.length > 0
			case 'pool-liquidity':
				return poolLiquidityData.length > 0
			default:
				return tvlApyData.length > 0
		}
	})()

	if (isLoading) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 text-center">
				<span className="text-sm pro-text3">Failed to load chart data</span>
			</div>
		)
	}

	if (!hasRequiredData) {
		return (
			<div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 text-center">
				<span className="text-sm pro-text3">No data available for this chart type</span>
			</div>
		)
	}

	const chartTitles: Record<string, string> = {
		'tvl-apy': 'TVL & APY',
		'supply-apy': 'Supply APY',
		'supply-apy-7d': '7 Day Avg Supply APY',
		'borrow-apy': 'Borrow APY',
		'net-borrow-apy': 'Net Borrow APY',
		'pool-liquidity': 'Pool Liquidity'
	}
	const chartTitle = chartTitles[chartType] || 'TVL & APY'

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-semibold pro-text1">{poolName}</h3>
					<p className="text-xs pro-text2">
						{project} - {chain} {chartType !== 'tvl-apy' && <span className="pro-text3">({chartTitle})</span>}
					</p>
				</div>
				{currentChartData && currentChartData.length > 0 && (
					<div className="flex gap-2">
						<ChartExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						/>
					</div>
				)}
			</div>

			{chartType === 'tvl-apy' && latestData.apy !== null && latestData.tvl !== null && (
				<div className="mb-2 flex gap-4">
					<div className="flex flex-col">
						<span className="text-[10px] pro-text3 uppercase">Latest APY</span>
						<span className="font-jetbrains text-sm font-semibold" style={{ color: '#fd3c99' }}>
							{latestData.apy}%
						</span>
					</div>
					<div className="flex flex-col">
						<span className="text-[10px] pro-text3 uppercase">TVL</span>
						<span className="font-jetbrains text-sm font-semibold" style={{ color: '#4f8fea' }}>
							{formattedNum(latestData.tvl, true)}
						</span>
					</div>
				</div>
			)}

			<div className="flex-1">
				<Suspense
					fallback={
						<div className="flex h-[320px] items-center justify-center">
							<LocalLoader />
						</div>
					}
				>
					{chartType === 'tvl-apy' && (
						<MultiSeriesChart2
							height="320px"
							dataset={tvlApyDataset}
							charts={tvlApyCharts}
							chartOptions={tvlApyChartOptions}
							valueSymbol=""
							alwaysShowTooltip={false}
							hideDefaultLegend={false}
							onReady={handleChartReady}
						/>
					)}
					{chartType === 'supply-apy' && (
						<BarChart
							height="320px"
							chartData={supplyApyBarData}
							stacks={barChartStacks}
							stackColors={barChartColors}
							title=""
							valueSymbol="%"
							onReady={handleChartReady}
						/>
					)}
					{chartType === 'supply-apy-7d' && (
						<AreaChart
							height="320px"
							chartData={supplyApy7dData}
							title=""
							valueSymbol="%"
							color={CHART_COLORS[0]}
							onReady={handleChartReady}
						/>
					)}
					{chartType === 'borrow-apy' && (
						<BarChart
							height="320px"
							chartData={borrowApyBarData}
							stacks={barChartStacks}
							stackColors={barChartColors}
							title=""
							valueSymbol="%"
							onReady={handleChartReady}
						/>
					)}
					{chartType === 'net-borrow-apy' && (
						<AreaChart
							height="320px"
							chartData={netBorrowApyData}
							title=""
							valueSymbol="%"
							color={CHART_COLORS[0]}
							onReady={handleChartReady}
						/>
					)}
					{chartType === 'pool-liquidity' && (
						<AreaChart
							height="320px"
							chartData={poolLiquidityData}
							title=""
							customLegendName="Filter"
							customLegendOptions={liquidityLegendOptions}
							valueSymbol="$"
							stackColors={liquidityChartColors}
							onReady={handleChartReady}
						/>
					)}
				</Suspense>
			</div>
		</div>
	)
}
