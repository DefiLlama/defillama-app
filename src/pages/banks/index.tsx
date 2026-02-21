import { type ColumnDef, sortingFns } from '@tanstack/react-table'
import * as React from 'react'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { CHART_COLORS } from '~/constants/colors'
import Layout from '~/layout'
import { formattedNum, toNiceDateYear } from '~/utils'
import data from './final.json'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

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
			return <>{getValue() ? toNiceDateYear(getValue() as number) : ''}</>
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

const chartData: Array<[number, number]> = []
for (const year in data.years) {
	chartData.push([new Date(year).getTime() / 1e3, (data.years[year] as number) * 1e6])
}
const DEFAULT_SORTING_STATE = [{ id: 'date', desc: true }]

const chartDataset: MultiSeriesChart2Dataset = {
	source: chartData.map(([ts, value]) => ({ timestamp: ts * 1e3, Assets: value })),
	dimensions: ['timestamp', 'Assets']
}

const chartCharts: IMultiSeriesChart2Props['charts'] = [
	{
		type: 'bar',
		name: 'Assets',
		encode: { x: 'timestamp', y: 'Assets' },
		color: CHART_COLORS[0]
	}
]

const Banks = () => {
	return (
		<Layout title="Bank Failures - DefiLlama">
			<div className="relative col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<React.Suspense fallback={<div className="min-h-[398px]" />}>
					<MultiSeriesChart2
						title="Assets of failed banks (inflation adjusted)"
						dataset={chartDataset}
						charts={chartCharts}
						valueSymbol="$"
						exportButtons="auto"
					/>
				</React.Suspense>
			</div>
			<TableWithSearch
				data={tableData}
				columns={banksTableColumns}
				placeholder="Search banks..."
				columnToSearch={'1'}
				csvFileName="banks.csv"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</Layout>
	)
}

export default Banks
