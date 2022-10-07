import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { raisesColumns } from '~/components/Table/Defi/columns'
import { AnnouncementWrapper } from '~/components/Announcement'
import { RaisesSearch } from '~/components/Search'
import type { IBarChartProps } from '~/components/ECharts/types'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>


function RaisesTable({ raises }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const instance = useReactTable({
		data: raises,
		columns: raisesColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

const RaisesContainer = ({ raises, investorName, monthlyInvestment }: {raises:any[], investorName:any, monthlyInvestment?:any}) => {
	return (
		<Layout title={`Raises - DefiLlama`} defaultSEO>
			<RaisesSearch step={{ category: investorName ? 'Raises' : 'Home', name: investorName || 'Raises' }} />

			<AnnouncementWrapper>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					style={{ color: '#2f80ed' }}
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</AnnouncementWrapper>
			{monthlyInvestment  && <BarChart chartData={Object.entries(monthlyInvestment).map(t=>[new Date(t[0]).getTime()/1e3, t[1]])} title="Monthly sum"/>}
			<RaisesTable raises={raises} />
		</Layout>
	)
}

export default RaisesContainer
