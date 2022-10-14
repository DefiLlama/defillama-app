import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { hacksColumns } from '~/components/Table/Defi/columns'
import type { IBarChartProps } from '~/components/ECharts/types'

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

const HacksContainer = ({ data, monthlyHacks }) => {
	return (
		<Layout title={`Hacks - DefiLlama`} defaultSEO>
			{monthlyHacks  && <BarChart chartData={Object.entries(monthlyHacks).map(t=>[new Date(t[0]).getTime()/1e3, t[1]])} title="Monthly sum"/>}
			<HacksTable data={data} />
		</Layout>
	)
}

export default HacksContainer