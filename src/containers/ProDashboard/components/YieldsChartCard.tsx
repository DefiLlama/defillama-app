import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import { useYieldChartData, useYieldChartLendBorrow } from '~/containers/Yields/queries/client'
import { download, formattedNum } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import type { YieldsChartConfig } from '../types'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'
import { useYieldChartTransformations } from './useYieldChartTransformations'

const TVLAPYChart = lazy(() => import('~/components/ECharts/TVLAPYChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

interface YieldsChartCardProps {
	config: YieldsChartConfig
}

const mainChartStacks = ['APY', 'TVL']

const mainChartStackColors = {
	APY: '#fd3c99',
	TVL: '#4f8fea'
}

const barChartStacks = { Base: 'a', Reward: 'a' }
const barChartColors = { Base: CHART_COLORS[0], Reward: CHART_COLORS[1] }
const liquidityChartColors = { Supplied: CHART_COLORS[0], Borrowed: CHART_COLORS[1], Available: CHART_COLORS[2] }
const liquidityLegendOptions = ['Supplied', 'Borrowed', 'Available']

export function YieldsChartCard({ config }: YieldsChartCardProps) {
	const { poolConfigId, poolName, project, chain, chartType = 'tvl-apy' } = config
	const { timePeriod, customTimePeriod } = useProDashboard()
	const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)
	const handleChartReady = useCallback((instance: echarts.ECharts) => {
		setChartInstance((prev) => (prev === instance ? prev : instance))
	}, [])

	const { data: chart, isLoading: fetchingChartData, isError: chartError } = useYieldChartData(poolConfigId)

	const needsBorrowData = ['borrow-apy', 'net-borrow-apy', 'pool-liquidity'].includes(chartType)
	const {
		data: borrowChart,
		isLoading: fetchingBorrowData,
		isError: borrowError
	} = useYieldChartLendBorrow(needsBorrowData ? poolConfigId : null)

	const {
		tvlApyData,
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

	const handleCsvExport = useCallback(() => {
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
	}, [currentChartData, poolName, chartType])

	const imageFilename = `${poolName.replace(/\s+/g, '_')}`
	const imageTitle = `${poolName} - ${project} (${chain})`

	const isLoading = useMemo(() => {
		if (needsBorrowData) {
			return fetchingChartData || fetchingBorrowData
		}
		return fetchingChartData
	}, [needsBorrowData, fetchingChartData, fetchingBorrowData])

	const hasError = useMemo(() => {
		if (needsBorrowData) {
			return chartError || borrowError
		}
		return chartError
	}, [needsBorrowData, chartError, borrowError])

	const hasRequiredData = useMemo(() => {
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
	}, [chartType, tvlApyData, supplyApyBarData, supplyApy7dData, borrowApyBarData, netBorrowApyData, poolLiquidityData])

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
				<span className="pro-text3 text-sm">Failed to load chart data</span>
			</div>
		)
	}

	if (!hasRequiredData) {
		return (
			<div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 text-center">
				<span className="pro-text3 text-sm">No data available for this chart type</span>
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
					<h3 className="pro-text1 text-sm font-semibold">{poolName}</h3>
					<p className="pro-text2 text-xs">
						{project} - {chain} {chartType !== 'tvl-apy' && <span className="pro-text3">({chartTitle})</span>}
					</p>
				</div>
				{currentChartData && currentChartData.length > 0 && (
					<div className="flex gap-2">
						<ChartExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="hover:not-disabled:pro-btn-blue focus-visible:not-disabled:pro-btn-blue flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent focus-visible:border-transparent disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						/>
					</div>
				)}
			</div>

			{chartType === 'tvl-apy' && latestData.apy !== null && latestData.tvl !== null && (
				<div className="mb-2 flex gap-4">
					<div className="flex flex-col">
						<span className="pro-text3 text-[10px] uppercase">Latest APY</span>
						<span className="font-jetbrains text-sm font-semibold" style={{ color: mainChartStackColors.APY }}>
							{latestData.apy}%
						</span>
					</div>
					<div className="flex flex-col">
						<span className="pro-text3 text-[10px] uppercase">TVL</span>
						<span className="font-jetbrains text-sm font-semibold" style={{ color: mainChartStackColors.TVL }}>
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
						<TVLAPYChart
							height="320px"
							chartData={tvlApyData}
							stackColors={mainChartStackColors}
							stacks={mainChartStacks}
							title=""
							alwaysShowTooltip={false}
							hideLegend={false}
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
