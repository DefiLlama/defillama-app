import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import type { IChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { useYieldChartData } from '~/containers/Yields/queries/client'
import { download, formattedNum } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { YieldsChartConfig } from '../types'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const TVLAPYChart = lazy(() => import('~/components/ECharts/TVLAPYChart')) as React.FC<IChartProps>

interface YieldsChartCardProps {
	config: YieldsChartConfig
}

const mainChartStacks = ['APY', 'TVL']

const mainChartStackColors = {
	APY: '#fd3c99',
	TVL: '#4f8fea'
}

export function YieldsChartCard({ config }: YieldsChartCardProps) {
	const { poolConfigId, poolName, project, chain } = config
	const { timePeriod } = useProDashboard()
	const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)

	const { data: chart, isLoading: fetchingChartData } = useYieldChartData(poolConfigId)

	const { finalChartData, latestAPY, latestTVL } = useMemo(() => {
		if (!chart || !chart.data) {
			return { finalChartData: [], latestAPY: null, latestTVL: null }
		}

		const data = chart.data.map((el: any) => ({
			date: Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			TVL: el.tvlUsd,
			APY: el.apy ?? null
		}))

		let filteredData = data
		if (timePeriod && timePeriod !== 'all') {
			const tvlPoints: [number, number][] = data.map((el: { date: number; TVL: number; APY: number | null }) => [
				el.date,
				el.TVL
			])
			const filtered = filterDataByTimePeriod(tvlPoints, timePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			filteredData = data.filter((el: { date: number; TVL: number; APY: number | null }) =>
				filteredTimestamps.has(el.date)
			)
		}

		const latestData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null
		const latestAPY = latestData?.APY ?? null
		const latestTVL = latestData?.TVL ?? null

		return { finalChartData: filteredData, latestAPY, latestTVL }
	}, [chart, timePeriod])

	const handleCsvExport = useCallback(() => {
		if (!finalChartData || finalChartData.length === 0) return
		const headers = ['Date', 'APY', 'TVL']
		const rows = finalChartData.map((el: any) => [
			new Date(el.date * 1000).toLocaleDateString(),
			el.APY ?? '',
			el.TVL ?? ''
		])
		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const fileName = `${poolName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
		download(fileName, csvContent)
	}, [finalChartData, poolName])

	const imageFilename = `${poolName.replace(/\s+/g, '_')}`
	const imageTitle = `${poolName} - ${project} (${chain})`

	if (fetchingChartData) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="pro-text1 text-sm font-semibold">{poolName}</h3>
					<p className="pro-text2 text-xs">
						{project} - {chain}
					</p>
				</div>
				{finalChartData && finalChartData.length > 0 && (
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

			{latestAPY !== null && latestTVL !== null && (
				<div className="mb-2 flex gap-4">
					<div className="flex flex-col">
						<span className="pro-text3 text-[10px] uppercase">Latest APY</span>
						<span className="font-jetbrains text-sm font-semibold" style={{ color: mainChartStackColors.APY }}>
							{latestAPY}%
						</span>
					</div>
					<div className="flex flex-col">
						<span className="pro-text3 text-[10px] uppercase">TVL</span>
						<span className="font-jetbrains text-sm font-semibold" style={{ color: mainChartStackColors.TVL }}>
							{formattedNum(latestTVL, true)}
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
					<TVLAPYChart
						height="320px"
						chartData={finalChartData}
						stackColors={mainChartStackColors}
						stacks={mainChartStacks}
						title=""
						alwaysShowTooltip={false}
						hideLegend={false}
						onReady={setChartInstance}
					/>
				</Suspense>
			</div>
		</div>
	)
}
