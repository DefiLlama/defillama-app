import * as React from 'react'
import dynamic from 'next/dynamic'
import type { IBarChartProps } from '~/components/ECharts/types'
import { BridgesSearch } from '~/components/Search/Bridges'
import { BridgeChainsTable } from '~/components/Table/Bridges'
import { toNiceCsvDate, download } from '~/utils'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export function BridgeChainsOverview({ allChains, tableData, chartData, chartStacks }) {
	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...allChains]]
		chartData.forEach(({ date, ...chains }) => {
			rows.push([date, toNiceCsvDate(date), ...allChains.map((chain) => chains[chain] ?? '')])
		})
		download('bridge-chains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	return (
		<>
			<BridgesSearch />
			<div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-[var(--cards-bg)] rounded-md">
				<h1 className="text-xl font-semibold">Bridge Inflows by Chain</h1>
				<CSVDownloadButton onClick={downloadCsv} />
			</div>
			<div className="min-h-[406px] bg-[var(--cards-bg)] rounded-md">
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
