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
import { ProxyAuthTokenContext } from '~/containers/ProDashboard/queries'
import { fetchRWAAssetsListViaProxy } from '~/containers/ProDashboard/services/fetchViaProxy'
import { fetchRWAActiveTVLs } from '~/containers/RWA/api'
import type { IFetchedRWAProject } from '~/containers/RWA/api.types'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { formattedNum } from '~/utils'
import { downloadCSV } from '~/utils/download'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'

type RWAAssetRow = {
	name: string
	ticker: string
	assetGroup: string
	activeMcap: number
	onChainMcap: number
	defiActiveTvl: number
	category: string
	type: string
}

function getTotalFromMap(map: Record<string, number> | null | undefined): number {
	if (!map) return 0
	let total = 0
	for (const v of Object.values(map)) {
		if (Number.isFinite(v)) total += v
	}
	return total
}

function getDefiTvlTotal(map: Record<string, Record<string, number>> | null | undefined): number {
	if (!map) return 0
	let total = 0
	for (const chain of Object.values(map)) {
		for (const v of Object.values(chain)) {
			if (Number.isFinite(v)) total += v
		}
	}
	return total
}

const columnHelper = createColumnHelper<RWAAssetRow>()

const columns: ColumnDef<RWAAssetRow, any>[] = [
	columnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		cell: (info) => <span className="block truncate text-sm font-medium">{info.getValue()}</span>,
		size: 240,
		maxSize: 240
	}),
	columnHelper.accessor('assetGroup', {
		id: 'assetGroup',
		header: 'Asset Group',
		cell: (info) => info.getValue() || '—',
		size: 140
	}),
	columnHelper.accessor('activeMcap', {
		id: 'activeMcap',
		header: 'Active Mcap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 150
	}),
	columnHelper.accessor('onChainMcap', {
		id: 'onChainMcap',
		header: 'Onchain Mcap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 150
	}),
	columnHelper.accessor('defiActiveTvl', {
		id: 'defiActiveTvl',
		header: 'DeFi Active TVL',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 150
	}),
	columnHelper.accessor('category', {
		id: 'category',
		header: 'Category',
		cell: (info) => info.getValue() || '—',
		size: 140
	}),
	columnHelper.accessor('type', {
		id: 'type',
		header: 'Type',
		cell: (info) => info.getValue() || '—',
		size: 120
	})
]

const STALE_TIME = 5 * 60 * 1000

function useRWAAssetsTableData() {
	const authToken = useContext(ProxyAuthTokenContext)

	return useQuery({
		queryKey: ['pro-dashboard', 'rwa-assets-table'],
		queryFn: async () => {
			if (authToken) {
				return fetchRWAAssetsListViaProxy(authToken)
			}
			return fetchRWAActiveTVLs()
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1,
		select: (data: IFetchedRWAProject[]): RWAAssetRow[] => {
			if (!data) return []
			return data
				.filter((a) => a.id && a.ticker && !a.stablecoin && !a.governance)
				.map((a) => ({
					name: a.assetName || a.ticker || a.id,
					ticker: a.ticker,
					assetGroup: a.assetGroup || '',
					activeMcap: getTotalFromMap(a.activeMcap),
					onChainMcap: getTotalFromMap(a.onChainMcap),
					defiActiveTvl: getDefiTvlTotal(a.defiActiveTvl),
					category: Array.isArray(a.category) ? a.category.join(', ') : '',
					type: a.type || ''
				}))
				.sort((a, b) => b.activeMcap - a.activeMcap)
		}
	})
}

const EMPTY_DATA: RWAAssetRow[] = []

export function RWAAssetsDataset() {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'activeMcap', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const { data, isLoading, error } = useRWAAssetsTableData()
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
		const defaultSizing = {
			name: 240,
			assetGroup: 140,
			activeMcap: 150,
			onChainMcap: 150,
			defiActiveTvl: 150,
			category: 140,
			type: 120
		}

		instance.setColumnSizing(defaultSizing)
		instance.setColumnOrder(defaultOrder)
	}, [instance, width])

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">RWA Assets</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading RWA assets data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">RWA Assets</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load RWA assets data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="mr-auto text-lg font-semibold pro-text1">RWA Assets</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers = [
									'Name',
									'Ticker',
									'Asset Group',
									'Active Mcap',
									'Onchain Mcap',
									'DeFi Active TVL',
									'Category',
									'Type'
								]
								const csv = [
									headers.join(','),
									...csvData.map((item) =>
										[
											`"${item.name}"`,
											`"${item.ticker}"`,
											`"${item.assetGroup}"`,
											item.activeMcap,
											item.onChainMcap,
											item.defiActiveTvl,
											`"${item.category}"`,
											`"${item.type}"`
										].join(',')
									)
								].join('\n')

								downloadCSV('rwa-assets.csv', csv, { addTimestamp: true })
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search assets..."
							onInput={(e) => setProjectName(e.currentTarget.value)}
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
