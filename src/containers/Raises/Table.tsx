import {
	type ColumnFiltersState,
	type ColumnOrderState,
	type Table,
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { chainHref, toChainIconItems } from '~/components/IconsRow/utils'
import { VirtualTable } from '~/components/Table/Table'
import type { ColumnOrdersByBreakpoint } from '~/components/Table/utils'
import { prepareTableCsv, useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, toNiceDayMonthYear } from '~/utils'
import type { IRaise } from './types'
import { formatRaiseAmount } from './utils'

const columnResizeMode = 'onChange'

const handleDownloadJson = () => {
	window.open('https://api.llama.fi/raises', '_blank', 'noopener,noreferrer')
}

const columnHelper = createColumnHelper<IRaise>()

export const raisesColumns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		size: 180
	}),
	columnHelper.accessor('date', {
		size: 120,
		header: 'Date',
		cell: (info) => toNiceDayMonthYear(info.getValue())
	}),
	columnHelper.accessor((row) => formatRaiseAmount(row.amount), {
		id: 'amount',
		header: 'Amount Raised',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		size: 140
	}),
	columnHelper.accessor('round', { header: 'Round', enableSorting: false, size: 140 }),
	columnHelper.accessor('category', {
		header: 'Category',
		size: 160,
		enableSorting: false,
		cell: (info) => <Tooltip content={info.getValue()}>{info.getValue()}</Tooltip>
	}),
	columnHelper.accessor('sector', {
		header: 'Description',
		size: 140,
		enableSorting: false,
		cell: (info) => <Tooltip content={info.getValue()}>{info.getValue()}</Tooltip>
	}),
	columnHelper.accessor('leadInvestors', {
		header: 'Lead Investor',
		size: 120,
		enableSorting: false,
		cell: (info) => <Tooltip content={info.getValue().join(', ')}>{info.getValue().join(', ')}</Tooltip>
	}),
	columnHelper.accessor((row) => formatRaiseAmount(row.valuation), {
		id: 'valuation',
		header: 'Valuation',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		size: 100
	}),
	columnHelper.accessor('chains', {
		header: 'Chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow items={toChainIconItems(getValue(), (chain) => chainHref('/chain', chain))} />,
		size: 80
	}),
	columnHelper.accessor('otherInvestors', {
		header: 'Other Investors',
		size: 400,
		enableSorting: false,
		cell: (info) => <Tooltip content={info.getValue().join(', ')}>{info.getValue().join(', ')}</Tooltip>
	})
]

export const raisesColumnOrders: ColumnOrdersByBreakpoint = {
	0: [
		'name',
		'amount',
		'date',
		'round',
		'category',
		'sector',
		'leadInvestors',
		'valuation',
		'chains',
		'otherInvestors'
	],
	1024: [
		'name',
		'date',
		'amount',
		'round',
		'category',
		'sector',
		'leadInvestors',
		'valuation',
		'chains',
		'otherInvestors'
	]
}

const prepareRaisesCsv = (instance: Table<IRaise>) => {
	const csv = prepareTableCsv({ instance, filename: 'raises' })
	if (csv.rows.length === 0) return csv

	const headers = csv.rows[0] as string[]
	const dateIdx = headers.indexOf('Date')
	const newHeaders = [...headers]

	if (dateIdx !== -1) {
		newHeaders.splice(dateIdx, 1, 'Timestamp', 'Date')
	}

	return {
		...csv,
		rows: [
			newHeaders,
			...csv.rows.slice(1).map((row) => {
				const newRow = [...row]
				if (dateIdx !== -1 && typeof newRow[dateIdx] === 'number') {
					const ts = newRow[dateIdx] as number
					const d = new Date(ts * 1000)
					const formatted = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
					newRow.splice(dateIdx, 1, ts, formatted)
				}
				return newRow
			})
		]
	}
}

export function RaisesTable({ raises }: { raises: IRaise[] }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])

	const instance = useReactTable({
		data: raises,
		columns: raisesColumns,
		columnResizeMode,
		state: {
			columnFilters,
			columnOrder,
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnOrderChange: (updater) => React.startTransition(() => setColumnOrder(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnSizesAndOrders({
		instance,
		columnOrders: raisesColumnOrders
	})

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search projects...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						onInput={(e) => setProjectName(e.currentTarget.value)}
						placeholder="Search projects..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				<a
					target="_blank"
					rel="noreferrer noopener"
					href="https://github.com/DefiLlama/DefiLlama-Adapters/discussions/7093"
					className="flex items-center gap-1"
				>
					<span className="whitespace-nowrap">Methodology & biases</span>
					<Icon name="external-link" height={12} width={12} />
				</a>
				<CSVDownloadButton onClick={handleDownloadJson} isLoading={false}>
					Download.json
				</CSVDownloadButton>
				<CSVDownloadButton prepareCsv={() => prepareRaisesCsv(instance)} smol />
			</div>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}
