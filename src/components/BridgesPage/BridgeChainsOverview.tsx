import React from 'react'
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

function BridgeChainsOverview({ chains, filteredChains, chainToChartDataIndex, formattedVolumeChartData }) {

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
