import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import {
	BreakpointPanel,
	ChartAndValuesWrapper,
} from '~/components'
import { Header } from '~/Theme'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { BridgesSearch } from '~/components/Search'
import { BridgeChainsTable } from '~/components/Table'

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

const TableNoticeWrapper = styled.div`
	margin-bottom: -1rem;
`

const SmolHints = styled.div`
	display: flex;
	gap: 6px;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	margin-top: -1rem;
	opacity: 0.6;
`

function BridgeChainsOverview({ chains, filteredChains, chainToChartDataIndex, formattedVolumeChartData }) {
	
	/*
	const downloadCsv = () => {
		const filteredPeggedNames = peggedAssetNames.filter((name, i) => filteredIndexes.includes(i))
		const rows = [['Timestamp', 'Date', ...filteredPeggedNames, 'Total']]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([
					day.date,
					toNiceCsvDate(day.date),
					...filteredPeggedNames.map((peggedAsset) => day[peggedAsset] ?? ''),
					filteredPeggedNames.reduce((acc, curr) => {
						return (acc += day[curr] ?? 0)
					}, 0)
				])
			})
		download('stablecoins.csv', rows.map((r) => r.join(',')).join('\n'))
	}
	*/

	return (
		<>
			<BridgesSearch
				step={{
					category: 'Bridges',
					name: 'Chains'
				}}
			/>

			<HeaderWrapper>
				<span>Bridge Volume by Chain</span>
			</HeaderWrapper>

			<ChartAndValuesWrapper>
				<BreakpointPanel id="chartWrapper" style={{ gap: '16px', minHeight: '450px', justifyContent: 'space-between' }}>
					{formattedVolumeChartData && formattedVolumeChartData.length > 0 && (
						<StackedBarChart chartData={formattedVolumeChartData as IStackedBarChartProps['chartData']} />
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>
			<TableNoticeWrapper>
				<SmolHints>
					<i>All stats in table are for the past 24h period.</i>
				</SmolHints>
			</TableNoticeWrapper>

			<BridgeChainsTable data={filteredChains} />
		</>
	)
}

export default BridgeChainsOverview
