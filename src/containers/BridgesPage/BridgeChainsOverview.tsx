import * as React from 'react'
import dynamic from 'next/dynamic'
import type { IStackedBarChartProps } from '~/components/ECharts/types'
import { BridgesSearch } from '~/components/Search/Bridges'
import { BridgeChainsTable } from '~/components/Table/Bridges'
import { toNiceCsvDate, download } from '~/utils'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

function BridgeChainsOverview({ chains, filteredChains, formattedVolumeChartData }) {
	const downloadCsv = () => {
		const rows = [['Timestamp', 'Date', ...chains]]
		let stackedDatasetObject = {} as any
		formattedVolumeChartData.map((volumeChart) => {
			const chain = volumeChart.name
			const chart = volumeChart.data
			chart.map((chart) => {
				const date = Math.floor(new Date(chart[0]).getTime() / 1000)
				stackedDatasetObject[date] = stackedDatasetObject[date] || {}
				stackedDatasetObject[date][chain] = chart[1]
			})
		})
		const stackedData = Object.entries(stackedDatasetObject).map((data: [string, object]) => {
			return { date: parseInt(data[0]), ...data[1] }
		})
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([day.date, toNiceCsvDate(day.date), ...chains.map((chain) => day[chain] ?? '')])
			})
		download('bridge-chains.csv', rows.map((r) => r.join(',')).join('\n'))
	}

	return (
		<>
			<BridgesSearch />

			<h1 className="text-2xl font-medium -mb-5 flex items-center justify-between flex-wrap gap-4">
				<span>Bridge Inflows by Chain</span>
				<CSVDownloadButton onClick={downloadCsv} />
			</h1>

			<div className="border border-[var(--divider)] shadow rounded-md p-4 min-h-[394px]">
				{formattedVolumeChartData && formattedVolumeChartData.length > 0 && (
					<StackedBarChart chartData={formattedVolumeChartData as IStackedBarChartProps['chartData']} />
				)}
			</div>

			<BridgeChainsTable data={filteredChains} />
		</>
	)
}

export default BridgeChainsOverview
