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
import { useContext } from 'react'
import { useTableSearch } from '~/components/Table/utils'
import { fetchEquitiesCompanies } from '~/containers/Equities/api'
import type { IEquitiesCompanyApiItem } from '~/containers/Equities/api.types'
import { ProxyAuthTokenContext } from '~/containers/ProDashboard/queries'
import { fetchEquitiesCompaniesViaProxy } from '~/containers/ProDashboard/services/fetchViaProxy'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { formattedNum } from '~/utils'
import { downloadCSV } from '~/utils/download'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'

type EquitiesCompanyRow = {
	ticker: string
	name: string
	currentPrice: number
	volume: number
	marketCap: number
	priceChangePercentage1d: number
	priceChangePercentage7d: number
	priceChangePercentage1m: number
	trailingPE: number | null
	dividendYield: number | null
	revenueTTM: number
	earningsTTM: number
}

function formatPercent(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '—'
	return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatRatio(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '—'
	return value.toFixed(2)
}

const columnHelper = createColumnHelper<EquitiesCompanyRow>()

const columns: ColumnDef<EquitiesCompanyRow, any>[] = [
	columnHelper.accessor('ticker', {
		id: 'ticker',
		header: 'Ticker',
		cell: (info) => <span className="block truncate text-sm font-semibold">{info.getValue()}</span>,
		size: 100,
		maxSize: 100
	}),
	columnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		cell: (info) => <span className="block truncate text-sm">{info.getValue()}</span>,
		size: 200,
		maxSize: 200
	}),
	columnHelper.accessor('currentPrice', {
		id: 'currentPrice',
		header: 'Price',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 120
	}),
	columnHelper.accessor('marketCap', {
		id: 'marketCap',
		header: 'Market Cap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 140
	}),
	columnHelper.accessor('volume', {
		id: 'volume',
		header: 'Volume',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 130
	}),
	columnHelper.accessor('priceChangePercentage1d', {
		id: 'priceChangePercentage1d',
		header: '1d Change',
		cell: (info) => {
			const val = info.getValue()
			const color = val >= 0 ? 'text-green-500' : 'text-red-500'
			return <span className={color}>{formatPercent(val)}</span>
		},
		meta: { align: 'end' },
		size: 110
	}),
	columnHelper.accessor('priceChangePercentage7d', {
		id: 'priceChangePercentage7d',
		header: '7d Change',
		cell: (info) => {
			const val = info.getValue()
			const color = val >= 0 ? 'text-green-500' : 'text-red-500'
			return <span className={color}>{formatPercent(val)}</span>
		},
		meta: { align: 'end' },
		size: 110
	}),
	columnHelper.accessor('priceChangePercentage1m', {
		id: 'priceChangePercentage1m',
		header: '1m Change',
		cell: (info) => {
			const val = info.getValue()
			const color = val >= 0 ? 'text-green-500' : 'text-red-500'
			return <span className={color}>{formatPercent(val)}</span>
		},
		meta: { align: 'end' },
		size: 110
	}),
	columnHelper.accessor('trailingPE', {
		id: 'trailingPE',
		header: 'P/E',
		cell: (info) => formatRatio(info.getValue()),
		meta: { align: 'end' },
		size: 90
	}),
	columnHelper.accessor('dividendYield', {
		id: 'dividendYield',
		header: 'Div Yield',
		cell: (info) => {
			const val = info.getValue()
			return val != null && Number.isFinite(val) ? `${(val * 100).toFixed(2)}%` : '—'
		},
		meta: { align: 'end' },
		size: 100
	}),
	columnHelper.accessor('revenueTTM', {
		id: 'revenueTTM',
		header: 'Revenue TTM',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 140
	}),
	columnHelper.accessor('earningsTTM', {
		id: 'earningsTTM',
		header: 'Earnings TTM',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 140
	})
]

const STALE_TIME = 5 * 60 * 1000

function useEquitiesCompaniesTableData() {
	const authToken = useContext(ProxyAuthTokenContext)

	return useQuery({
		queryKey: ['pro-dashboard', 'equities-companies-table'],
		queryFn: async () => {
			if (authToken) {
				return fetchEquitiesCompaniesViaProxy(authToken)
			}
			return fetchEquitiesCompanies()
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1,
		select: (data: IEquitiesCompanyApiItem[]): EquitiesCompanyRow[] => {
			if (!data) return []
			return data
				.map((item) => ({
					ticker: item.ticker,
					name: item.name,
					currentPrice: item.currentPrice,
					volume: item.volume,
					marketCap: item.marketCap,
					priceChangePercentage1d: item.priceChangePercentage1d,
					priceChangePercentage7d: item.priceChangePercentage7d,
					priceChangePercentage1m: item.priceChangePercentage1m,
					trailingPE: item.trailingPE,
					dividendYield: item.dividendYield,
					revenueTTM: item.revenueTTM,
					earningsTTM: item.earningsTTM
				}))
				.sort((a, b) => b.marketCap - a.marketCap)
		}
	})
}

const EMPTY_DATA: EquitiesCompanyRow[] = []

export function EquitiesCompaniesDataset() {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'marketCap', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const { data, isLoading, error } = useEquitiesCompaniesTableData()
	const width = useBreakpointWidth()

	const instance = useReactTable({
		data: data ?? EMPTY_DATA,
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

	const [_searchValue, setSearchValue] = useTableSearch({ instance, columnToSearch: 'name' })

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">Equities</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading equities data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">Equities</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load equities data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="mr-auto text-lg font-semibold pro-text1">Equities</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers = [
									'Ticker',
									'Name',
									'Price',
									'Market Cap',
									'Volume',
									'1d Change',
									'7d Change',
									'1m Change',
									'P/E',
									'Div Yield',
									'Revenue TTM',
									'Earnings TTM'
								]
								const csv = [
									headers.join(','),
									...csvData.map((item: EquitiesCompanyRow) =>
										[
											`"${item.ticker}"`,
											`"${item.name}"`,
											item.currentPrice,
											item.marketCap,
											item.volume,
											item.priceChangePercentage1d,
											item.priceChangePercentage7d,
											item.priceChangePercentage1m,
											item.trailingPE ?? '',
											item.dividendYield ?? '',
											item.revenueTTM,
											item.earningsTTM
										].join(',')
									)
								].join('\n')

								downloadCSV('equities-companies.csv', csv, { addTimestamp: true })
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search companies..."
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
