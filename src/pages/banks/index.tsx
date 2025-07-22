import * as React from 'react'
import Layout from '~/layout'
import data from './final.json'
import { formattedNum } from '~/utils'
import { toNiceDateYear } from '~/utils'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { sortingFns } from '@tanstack/react-table'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<any>

const banksTableColumns = [
	{
		header: 'Name',
		accessorKey: '1',
		enableSorting: false,
		size: 220
	},
	{
		header: 'Closing date',
		accessorKey: 'date',
		sortingFn: sortingFns.datetime,
		cell: ({ getValue }) => {
			return <>{getValue() ? toNiceDateYear(getValue()) : ''}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Assets',
		accessorKey: '6',
		cell: ({ getValue }) => {
			return <>{getValue() ? formattedNum(getValue() * 1e6, true) : ''}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Assets (inflation adjusted)',
		accessorKey: '7',
		cell: ({ getValue }) => {
			return <>{getValue() ? formattedNum(getValue() * 1e6, true) : ''}</>
		},
		meta: {
			align: 'end'
		}
	}
]

const tableData = data.banks.map((b: any) => {
	b.date = new Date(b[4]).getTime() / 1e3
	return b
})

const Banks = () => {
	return (
		<Layout title="Bank Failures">
			<ProtocolsChainsSearch />
			<div className="relative col-span-2 bg-(--cards-bg) border border-(--cards-border) rounded-md p-3 min-h-[384px]">
				<React.Suspense fallback={<></>}>
					<BarChart
						chartData={Object.entries(data.years).map((t) => [new Date(t[0]).getTime() / 1e3, t[1] * 1e6])}
						title="Assets of failed banks (inflation adjusted)"
						valueSymbol="$"
					/>
				</React.Suspense>
			</div>
			<TableWithSearch
				data={tableData}
				columns={banksTableColumns}
				placeholder="Search banks..."
				columnToSearch={'1'}
			/>
		</Layout>
	)
}

export default Banks
