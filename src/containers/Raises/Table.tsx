import {
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnDef,
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
import { VirtualTable } from '~/components/Table/Table'
import type { ColumnOrdersByBreakpoint } from '~/components/Table/utils'
import { prepareTableCsv, useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { toNiceDayMonthYear } from '~/utils'
import type { IRaise } from './types'

const columnResizeMode = 'onChange'

const handleDownloadJson = () => {
	window.open('https://api.llama.fi/raises', '_blank', 'noopener,noreferrer')
}

const formatRaise = (n: number) => {
	if (n >= 1e3) {
		return `${n / 1e3}b`
	}
	return `${n}m`
}

export const raisesColumns: ColumnDef<IRaise>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		size: 180
	},
	{
		size: 120,
		header: 'Date',
		accessorKey: 'date',
		cell: ({ getValue }) => <>{toNiceDayMonthYear(getValue<number>())}</>
	},
	{
		header: 'Amount Raised',
		accessorKey: 'amount',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return <>{value != null ? '$' + formatRaise(value) : ''}</>
		},
		size: 140
	},
	{ header: 'Round', accessorKey: 'round', enableSorting: false, size: 140 },
	{
		header: 'Category',
		accessorKey: 'category',
		size: 160,
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue<string>()
			return <Tooltip content={value}>{value}</Tooltip>
		}
	},
	{
		header: 'Description',
		accessorKey: 'sector',
		size: 140,
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue<string>()
			return <Tooltip content={value}>{value}</Tooltip>
		}
	},
	{
		header: 'Lead Investor',
		accessorKey: 'leadInvestors',
		size: 120,
		enableSorting: false,
		cell: ({ getValue }) => {
			const formattedValue = getValue<string[]>().join(', ')
			return <Tooltip content={formattedValue}>{formattedValue}</Tooltip>
		}
	},
	{
		header: 'Link',
		accessorKey: 'source',
		size: 60,
		enableSorting: false,
		cell: ({ getValue }) => (
			<a
				href={getValue<string>()}
				target="_blank"
				rel="noopener noreferrer"
				className="flex shrink-0 items-center justify-center rounded-md bg-(--link-button) p-1.5 hover:bg-(--link-button-hover)"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
				<span className="sr-only">open in new tab</span>
			</a>
		)
	},
	{
		header: 'Valuation',
		accessorKey: 'valuation',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return <>{value != null ? '$' + formatRaise(value) : ''}</>
		},
		size: 100
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue<string[]>()} url="/chain" iconType="chain" />,
		size: 80
	},
	{
		header: 'Other Investors',
		accessorKey: 'otherInvestors',
		size: 400,
		enableSorting: false,
		cell: ({ getValue }) => {
			const formattedValue = getValue<string[]>().join(', ')
			return <Tooltip content={formattedValue}>{formattedValue}</Tooltip>
		}
	}
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
		'source',
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
		'source',
		'valuation',
		'chains',
		'otherInvestors'
	]
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
				<CSVDownloadButton
					prepareCsv={() => {
						const csv = prepareTableCsv({ instance, filename: 'raises' })
						if (csv.rows.length === 0) return csv
						const headers = csv.rows[0] as string[]
						const dateIdx = headers.indexOf('Date')
						const amountIdx = headers.indexOf('Amount Raised')
						const valuationIdx = headers.indexOf('Valuation')
						const newHeaders = [...headers]
						if (dateIdx !== -1) newHeaders.splice(dateIdx, 1, 'Timestamp', 'Date')
						return {
							...csv,
							rows: [
								newHeaders,
								...csv.rows.slice(1).map((row) => {
									const newRow = [...row]
									if (amountIdx !== -1 && typeof newRow[amountIdx] === 'number') {
										newRow[amountIdx] = (newRow[amountIdx] as number) * 1e6
									}
									if (valuationIdx !== -1 && newRow[valuationIdx]) {
										newRow[valuationIdx] = Number(newRow[valuationIdx]) * 1e6
									}
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
					}}
					smol
				/>
			</div>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}
