import { createColumnHelper, sortingFns } from '@tanstack/react-table'
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

type BankRow = Record<string, string | number> & {
	'1': string
	'4': string
	'6': number
	'7': number
	date: number
}

const columnHelper = createColumnHelper<BankRow>()

const banksTableColumns = [
	columnHelper.accessor('1', {
		header: 'Name',
		enableSorting: false,
		size: 220
	}),
	columnHelper.accessor('date', {
		header: 'Closing date',
		sortingFn: sortingFns.datetime,
		cell: (info) => (info.getValue() ? toNiceDateYear(info.getValue()) : ''),
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row['6'] * 1e6, {
		id: 'assets',
		header: 'Assets',
		cell: (info) => (info.getValue() ? formattedNum(info.getValue(), true) : ''),
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row['7'] * 1e6, {
		id: 'assets-inflation-adjusted',
		header: 'Assets (inflation adjusted)',
		cell: (info) => (info.getValue() ? formattedNum(info.getValue(), true) : ''),
		meta: {
			align: 'end'
		}
	})
]

const tableData: BankRow[] = data.banks.map((bank) => ({
	...(bank as unknown as BankRow),
	date: new Date(String(bank['4'])).getTime() / 1e3
}))

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
		<Layout
			title="Historical Bank Failures Database - DefiLlama"
			description="Track historical bank failures with dates, assets, and resolution details on DefiLlama."
		>
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
				csvFileName="banks"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</Layout>
	)
}

export default Banks
