import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { hacksColumns } from '~/components/Table/Defi/columns'
import type { IBarChartProps } from '~/components/ECharts/types'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper } from '~/components'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

function HacksTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const instance = useReactTable({
		data: data,
		columns: hacksColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

const HacksContainer = ({ data, monthlyHacks, totalHacked, totalHackedDefi, totalRugs }) => {
	

	return (
		<Layout title={`Hacks - DefiLlama`} defaultSEO>
			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Value Hacked (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>{totalHacked}b</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h1>Total Value Hacked in DeFi (USD)</h1>
						<p style={{ '--tile-text-color': '#bd3399' } as React.CSSProperties}>{totalHackedDefi}b</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h1>Total Value Hacked in Bridges (USD)</h1>
						<p style={{ '--tile-text-color': '#bd3399' } as React.CSSProperties}>{totalRugs}b</p>
					</BreakpointPanel>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper">
					{monthlyHacks && (
						<BarChart
							chartData={Object.entries(monthlyHacks).map((t) => [new Date(t[0]).getTime() / 1e3, Number(t[1])*1e6])}
							title="Monthly sum"
						/>
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>
			<HacksTable data={data} />
		</Layout>
	)
}

export default HacksContainer
