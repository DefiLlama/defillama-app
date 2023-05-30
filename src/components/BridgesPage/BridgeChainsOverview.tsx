import * as React from 'react'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BreakpointPanel, ChartAndValuesWrapper } from '~/components'
import { Header } from '~/Theme'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { BridgesSearch } from '~/components/Search'
import { BridgeChainsTable } from '~/components/Table'
import { ButtonDark } from '~/components/ButtonStyled'
import { toNiceCsvDate, download } from '~/utils'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const HeaderWrapper = styled(Header)`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	border: 1px solid transparent;
`

function BridgeChainsOverview({ chains, filteredChains, chainToChartDataIndex, formattedVolumeChartData }) {
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

	console.log(filteredChains)

	return (
		<>
			<BridgesSearch
				step={{
					category: 'Bridges',
					name: 'Chains'
				}}
			/>

			<HeaderWrapper>
				<span>Bridge Inflows by Chain</span>
				<ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
			</HeaderWrapper>

			<ChartAndValuesWrapper>
				<BreakpointPanel id="chartWrapper" style={{ gap: '16px', minHeight: '450px', justifyContent: 'space-between' }}>
					{formattedVolumeChartData && formattedVolumeChartData.length > 0 && (
						<StackedBarChart chartData={formattedVolumeChartData as IStackedBarChartProps['chartData']} />
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<BridgeChainsTable data={filteredChains} />
		</>
	)
}

export default BridgeChainsOverview
