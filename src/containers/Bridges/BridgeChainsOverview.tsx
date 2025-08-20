import * as React from 'react'
import { lazy } from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { BridgeChainsTable } from '~/components/Table/Bridges'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

export function BridgeChainsOverview({ allChains, tableData, chartData, chartStacks }) {
	return (
		<>
			<div className="min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
				{chartData && chartData.length > 0 && (
					<BarChart
						chartData={chartData}
						stacks={chartStacks}
						title=""
						valueSymbol="$"
						hideDefaultLegend
						customLegendName="Chain"
						customLegendOptions={allChains}
					/>
				)}
			</div>
			<BridgeChainsTable data={tableData} />
		</>
	)
}
