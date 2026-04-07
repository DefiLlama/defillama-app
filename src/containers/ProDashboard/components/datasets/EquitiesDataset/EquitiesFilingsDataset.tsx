import { useQuery } from '@tanstack/react-query'
import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { useContext, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useTableSearch } from '~/components/Table/utils'
import { ProxyAuthTokenContext } from '~/containers/ProDashboard/queries'
import { fetchEquitiesFilingsViaProxy } from '~/containers/ProDashboard/services/fetchViaProxy'
import { fetchEquitiesFilings } from '~/containers/Equities/api'
import type { IEquitiesFilingApiItem } from '~/containers/Equities/api.types'
import { formatEquitiesDate } from '~/containers/Equities/utils'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { downloadCSV } from '~/utils/download'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'

const columnHelper = createColumnHelper<IEquitiesFilingApiItem>()

const columns: ColumnDef<IEquitiesFilingApiItem, any>[] = [
	columnHelper.accessor('filingDate', {
		id: 'filingDate',
		header: 'Filing Date',
		cell: (info) => formatEquitiesDate(info.getValue()),
		size: 120
	}),
	columnHelper.accessor('reportDate', {
		id: 'reportDate',
		header: 'Report Date',
		cell: (info) => formatEquitiesDate(info.getValue()),
		size: 120
	}),
	columnHelper.accessor('form', {
		id: 'form',
		header: 'Form',
		cell: (info) => <span className="font-medium">{info.getValue()}</span>,
		size: 90
	}),
	columnHelper.accessor('documentDescription', {
		id: 'documentDescription',
		header: 'Description',
		cell: (info) => <span className="block truncate text-sm">{info.getValue()}</span>,
		size: 400
	}),
	columnHelper.accessor('primaryDocumentUrl', {
		id: 'primaryDocumentUrl',
		header: 'Source',
		enableSorting: false,
		cell: (info) => (
			<span className="flex w-full max-w-[80px] items-center justify-end">
				<a
					href={info.getValue()}
					target="_blank"
					rel="noopener noreferrer"
					className="flex flex-1 items-center justify-center gap-4 rounded-md bg-(--btn2-bg) p-1.5 hover:bg-(--btn2-hover-bg)"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
			</span>
		),
		meta: { align: 'end' },
		size: 80
	})
]

const STALE_TIME = 5 * 60 * 1000

function useEquitiesFilingsData(ticker: string) {
	const authToken = useContext(ProxyAuthTokenContext)

	return useQuery({
		queryKey: ['pro-dashboard', 'equities-filings-table', ticker],
		queryFn: async () => {
			if (authToken) {
				return fetchEquitiesFilingsViaProxy(ticker, authToken)
			}
			return fetchEquitiesFilings(ticker)
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1,
		enabled: Boolean(ticker)
	})
}

const EMPTY_DATA: IEquitiesFilingApiItem[] = []

export function EquitiesFilingsDataset({ ticker }: { ticker: string }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'filingDate', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})
	const [selectedForm, setSelectedForm] = useState<string>('All')

	const { data, isLoading, error } = useEquitiesFilingsData(ticker)
	const width = useBreakpointWidth()

	const filingForms = useMemo(() => {
		if (!data) return []
		const forms = new Set<string>()
		for (const filing of data) {
			if (filing.form) forms.add(filing.form)
		}
		return Array.from(forms).sort()
	}, [data])

	const filteredData = useMemo(() => {
		if (!data) return EMPTY_DATA
		if (selectedForm === 'All') return data
		return data.filter((filing) => filing.form === selectedForm)
	}, [data, selectedForm])

	const instance = useReactTable({
		data: filteredData,
		columns: columns as ColumnDef<any>[],
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters,
			pagination
		},
		onSortingChange: setSorting,
		enableSortingRemoval: false,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		autoResetPageIndex: false
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)
		instance.setColumnOrder(defaultOrder)
	}, [instance, width])

	const [_searchValue, setSearchValue] = useTableSearch({ instance, columnToSearch: 'documentDescription' })

	if (!ticker) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">Equities Filings</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">No ticker specified</div>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">Filings — {ticker}</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading SEC filings...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">Filings — {ticker}</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load SEC filings</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="mr-auto text-lg font-semibold pro-text1">Filings — {ticker}</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<label className="flex items-center gap-2 text-sm">
							<span className="pro-text2">Form</span>
							<select
								value={selectedForm}
								onChange={(e) => setSelectedForm(e.currentTarget.value)}
								className="rounded-md border pro-border bg-(--bg-glass) px-2 py-1 text-sm pro-text1"
							>
								<option value="All">All</option>
								{filingForms.map((form) => (
									<option key={form} value={form}>
										{form}
									</option>
								))}
							</select>
						</label>
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers = ['Filing Date', 'Report Date', 'Form', 'Description', 'URL']
								const csv = [
									headers.join(','),
									...csvData.map((item: IEquitiesFilingApiItem) =>
										[
											`"${item.filingDate}"`,
											`"${item.reportDate}"`,
											`"${item.form}"`,
											`"${item.documentDescription}"`,
											`"${item.primaryDocumentUrl}"`
										].join(',')
									)
								].join('\n')

								downloadCSV(`equities-${ticker}-filings.csv`, csv, { addTimestamp: true })
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search filings..."
							onInput={(e) => setSearchValue(e.currentTarget.value)}
							className="rounded-md border pro-border bg-(--bg-glass) px-3 py-1.5 text-sm pro-text1 transition-colors focus:border-(--primary) focus:outline-hidden"
						/>
					</div>
				</div>
			</div>
			<TableBody table={instance} />
			<TablePagination table={instance} />
		</div>
	)
}
