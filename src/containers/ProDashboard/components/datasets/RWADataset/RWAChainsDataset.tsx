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
import { fetchRWAStatsViaProxy } from '~/containers/ProDashboard/services/fetchViaProxy'
import { fetchRWAStats } from '~/containers/RWA/api'
import type { IRWAStatsResponse } from '~/containers/RWA/api.types'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { formattedNum } from '~/utils'
import { downloadCSV } from '~/utils/download'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'

type RWAChainsTableRow = {
	chain: string
	totalAssetIssuers: number
	totalAssetCount: number
	totalActiveMcap: number
	totalOnChainMcap: number
	totalDefiActiveTvl: number
}

const columnHelper = createColumnHelper<RWAChainsTableRow>()

const columns: ColumnDef<RWAChainsTableRow, any>[] = [
	columnHelper.accessor('chain', {
		id: 'chain',
		header: 'Chain',
		cell: (info) => <span className="block truncate text-sm font-medium">{info.getValue()}</span>,
		size: 200,
		maxSize: 200
	}),
	columnHelper.accessor('totalAssetIssuers', {
		id: 'totalAssetIssuers',
		header: 'Asset Issuers',
		cell: (info) => formattedNum(info.getValue(), false),
		meta: { align: 'end' },
		size: 140
	}),
	columnHelper.accessor('totalAssetCount', {
		id: 'totalAssetCount',
		header: 'Asset Count',
		cell: (info) => formattedNum(info.getValue(), false),
		meta: { align: 'end' },
		size: 140
	}),
	columnHelper.accessor('totalActiveMcap', {
		id: 'totalActiveMcap',
		header: 'Active Mcap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 160
	}),
	columnHelper.accessor('totalOnChainMcap', {
		id: 'totalOnChainMcap',
		header: 'Onchain Mcap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 160
	}),
	columnHelper.accessor('totalDefiActiveTvl', {
		id: 'totalDefiActiveTvl',
		header: 'DeFi Active TVL',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' },
		size: 160
	})
]

const STALE_TIME = 5 * 60 * 1000

function useRWAChainsTableData() {
	const authToken = useContext(ProxyAuthTokenContext)

	return useQuery({
		queryKey: ['pro-dashboard', 'rwa-chains-table'],
		queryFn: async () => {
			if (authToken) {
				return fetchRWAStatsViaProxy(authToken)
			}
			return fetchRWAStats()
		},
		staleTime: STALE_TIME,
		refetchOnWindowFocus: false,
		retry: 1,
		select: (data: IRWAStatsResponse): RWAChainsTableRow[] => {
			if (!data?.byChain) return []
			const rows: RWAChainsTableRow[] = []
			for (const chain in data.byChain) {
				const stats = data.byChain[chain]
				// Use base stats (excluding stablecoins and governance tokens)
				rows.push({
					chain,
					totalAssetIssuers: stats.base.assetIssuers.length,
					totalAssetCount: stats.base.assetCount,
					totalActiveMcap: stats.base.activeMcap,
					totalOnChainMcap: stats.base.onChainMcap,
					totalDefiActiveTvl: stats.base.defiActiveTvl
				})
			}
			return rows.sort((a, b) => b.totalActiveMcap - a.totalActiveMcap)
		}
	})
}

const EMPTY_DATA: RWAChainsTableRow[] = []

export function RWAChainsDataset() {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'totalActiveMcap', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const { data, isLoading, error } = useRWAChainsTableData()
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
			chain: 200,
			totalAssetIssuers: 140,
			totalAssetCount: 140,
			totalActiveMcap: 160,
			totalOnChainMcap: 160,
			totalDefiActiveTvl: 160
		}

		instance.setColumnSizing(defaultSizing)
		instance.setColumnOrder(defaultOrder)
	}, [instance, width])

	const [_chainName, setChainName] = useTableSearch({ instance, columnToSearch: 'chain' })

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">RWA By Chain</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading RWA chains data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<h3 className="text-lg font-semibold pro-text1">RWA By Chain</h3>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load RWA chains data</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="mr-auto text-lg font-semibold pro-text1">RWA By Chain</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers = [
									'Chain',
									'Asset Issuers',
									'Asset Count',
									'Active Mcap',
									'Onchain Mcap',
									'DeFi Active TVL'
								]
								const csv = [
									headers.join(','),
									...csvData.map((item) =>
										[
											`"${item.chain}"`,
											item.totalAssetIssuers,
											item.totalAssetCount,
											item.totalActiveMcap,
											item.totalOnChainMcap,
											item.totalDefiActiveTvl
										].join(',')
									)
								].join('\n')

								downloadCSV('rwa-by-chain.csv', csv, { addTimestamp: true })
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search chains..."
							onInput={(e) => setChainName(e.currentTarget.value)}
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
