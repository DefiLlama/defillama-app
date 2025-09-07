import * as React from 'react'
import { ColumnDef, sortingFns } from '@tanstack/react-table'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { CHART_COLORS } from '~/constants/colors'
import Layout from '~/layout'
import { formattedNum, toNiceDateYear } from '~/utils'
import data from './final.json'

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<any>

const banksTableColumns: ColumnDef<any>[] = [
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
			return <>{getValue() ? formattedNum((getValue() as number) * 1e6, true) : ''}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Assets (inflation adjusted)',
		accessorKey: '7',
		cell: ({ getValue }) => {
			return <>{getValue() ? formattedNum((getValue() as number) * 1e6, true) : ''}</>
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
		<Layout title="Bank Failures - DefiLlama">
			<div className="relative col-span-2 min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
				<React.Suspense fallback={<></>}>
					<BarChart
						chartData={Object.entries(data.years).map((t) => [new Date(t[0]).getTime() / 1e3, t[1] * 1e6])}
						title="Assets of failed banks (inflation adjusted)"
						valueSymbol="$"
						color={CHART_COLORS[0]}
					/>
				</React.Suspense>
			</div>
			<TableWithSearch
				data={tableData}
				columns={banksTableColumns}
				placeholder="Search banks..."
				columnToSearch={'1'}
				sortingState={[{ id: 'date', desc: true }]}
			/>
		</Layout>
	)
}

export default Banks
