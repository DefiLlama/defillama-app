import { lazy, Suspense, useMemo } from 'react'
import type { IChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { useYieldChartData } from '~/containers/Yields/queries/client'
import { formattedNum } from '~/utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { YieldsChartConfig } from '../types'

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
			const tvlPoints: [number, number][] = data.map((el) => [el.date, el.TVL])
			const filtered = filterDataByTimePeriod(tvlPoints, timePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			filteredData = data.filter((el) => filteredTimestamps.has(el.date))
		}

		const latestData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null
		const latestAPY = latestData?.APY ?? null
		const latestTVL = latestData?.TVL ?? null

		return { finalChartData: filteredData, latestAPY, latestTVL }
	}, [chart, timePeriod])

	if (fetchingChartData) {
		return (
			<div className="flex h-full min-h-[360px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col p-2">
			<div className="mb-2 flex flex-col gap-1">
				<h3 className="pro-text1 text-sm font-semibold">{poolName}</h3>
				<p className="pro-text2 text-xs">
					{project} - {chain}
				</p>
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

			<div className="min-h-[300px] flex-1">
				<Suspense
					fallback={
						<div className="flex h-full min-h-[300px] items-center justify-center">
							<LocalLoader />
						</div>
					}
				>
					<TVLAPYChart
						height="100%"
						chartData={finalChartData}
						stackColors={mainChartStackColors}
						stacks={mainChartStacks}
						title=""
						alwaysShowTooltip={false}
					/>
				</Suspense>
			</div>
		</div>
	)
}
