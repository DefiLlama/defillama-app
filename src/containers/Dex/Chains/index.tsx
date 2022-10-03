import dynamic from 'next/dynamic'
import * as React from 'react'
import styled from 'styled-components'
import { VolumeByChainsTable } from '~/components/Table'
import type { IBarChartProps } from '~/components/ECharts/types'
import { Panel } from '~/components'
import { DexsSearch } from '~/components/Search'
import { Header } from '~/Theme'

const ChartsWrapper = styled(Panel)`
	min-height: 370px;
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;
	padding: 8px 8px 0;

	& > * {
		grid-cols: span 1;
	}
`

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export default function VolumesByChainContainer({ tableData, chartData, chartStacks, chainColors }) {
	return (
		<>
			<DexsSearch
				step={{
					category: 'Home',
					name: 'DEXs'
				}}
			/>

			<Header>Volumes by Chain</Header>
			<ChartsWrapper>
				<BarChart
					chartData={chartData}
					stacks={chartStacks}
					stackColors={chainColors}
					hidedefaultlegend
					valueSymbol="$"
					title=""
				/>
			</ChartsWrapper>
			<VolumeByChainsTable data={tableData} />
		</>
	)
}
