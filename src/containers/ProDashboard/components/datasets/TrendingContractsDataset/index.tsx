import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
	type VisibilityState
} from '@tanstack/react-table'
import * as React from 'react'
import { useTableSearch } from '~/components/Table/utils'
import { TagGroup } from '~/components/TagGroup'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { downloadCSV } from '~/utils'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { TablePagination } from '../../ProTable/TablePagination'
import { trendingContractsColumns } from './columns'
import { useTrendingContractsData } from './useTrendingContractsData'

const TIME_VALUES = ['1d', '7d', '30d'] as const
const CHAIN_VALUES = ['Ethereum', 'Arbitrum', 'Polygon', 'Optimism', 'Base'] as const
const EMPTY_RESULTS: any[] = []
const TRENDING_CONTRACTS_COLUMNS_BY_CHAIN = {
	ethereum: trendingContractsColumns('ethereum'),
	arbitrum: trendingContractsColumns('arbitrum'),
	polygon: trendingContractsColumns('polygon'),
	optimism: trendingContractsColumns('optimism'),
	base: trendingContractsColumns('base')
} as const

interface TrendingContractsDatasetProps {
	chain?: string
	timeframe?: string
	tableId?: string
	onChainChange?: (chain: string) => void
	onTimeframeChange?: (timeframe: string) => void
}

export function TrendingContractsDataset({
	chain: initialChain = 'Ethereum',
	timeframe: initialTimeframe = '1d',
	tableId: _tableId,
	onChainChange,
	onTimeframeChange
}: TrendingContractsDatasetProps) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'gas_spend', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})

	const [timeframe, setTimeframe] = React.useState(initialTimeframe)
	const [chain, setChain] = React.useState(initialChain)

	const activeChain = chain.toLowerCase()
	const { data, isLoading, error } = useTrendingContractsData(activeChain, timeframe)
	const results = data?.results ?? EMPTY_RESULTS
	const columns =
		TRENDING_CONTRACTS_COLUMNS_BY_CHAIN[activeChain as keyof typeof TRENDING_CONTRACTS_COLUMNS_BY_CHAIN] ??
		trendingContractsColumns(activeChain)

	const width = useBreakpointWidth()

	const instance = useReactTable({
		data: results,
		columns: columns as ColumnDef<any>[],
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters,
			columnVisibility,
			pagination
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
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
			contract: 280,
			txns: 120,
			txns_percentage_growth: 100,
			active_accounts: 140,
			accounts_percentage_growth: 120,
			gas_spend: 120,
			gas_spend_percentage_growth: 100
		}

		instance.setColumnSizing(defaultSizing)
		instance.setColumnOrder(defaultOrder)
	}, [width, instance])

	const [contractSearch, setContractSearch] = useTableSearch({ instance, columnToSearch: 'contract' })

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">Trending Contracts</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading trending contracts...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">Trending Contracts</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="text-center pro-text2">Failed to load trending contracts</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="mr-auto text-lg font-semibold pro-text1">Trending Contracts</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<TagGroup
							selectedValue={timeframe}
							setValue={(val: string) => {
								setTimeframe(val)
								if (onTimeframeChange) {
									onTimeframeChange(val)
								}
							}}
							values={TIME_VALUES}
							variant="pro"
						/>
						<TagGroup
							selectedValue={chain}
							setValue={(val: string) => {
								setChain(val)
								if (onChainChange) {
									onChainChange(val)
								}
							}}
							values={CHAIN_VALUES}
							variant="pro"
						/>
						<ProTableCSVButton
							onClick={() => {
								const rows = instance.getFilteredRowModel().rows
								const csvData = rows.map((row) => row.original)
								const headers = [
									'Contract',
									'Name',
									'Transactions',
									'Tx Growth',
									'Active Accounts',
									'Account Growth',
									'Gas Spent',
									'Gas Growth'
								]
								const csv = [
									headers.join(','),
									...csvData.map((item) => {
										return [
											item.contract,
											item.name || '',
											item.txns,
											item.txns_percentage_growth,
											item.active_accounts,
											item.accounts_percentage_growth,
											item.gas_spend,
											item.gas_spend_percentage_growth
										].join(',')
									})
								].join('\n')

								downloadCSV(`trending-contracts-${chain.toLowerCase()}-${timeframe}.csv`, csv, { addTimestamp: true })
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search contracts..."
							value={contractSearch}
							onChange={(e) => setContractSearch(e.target.value)}
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
