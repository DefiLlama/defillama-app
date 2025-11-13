import * as React from 'react'
import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	PaginationState,
	SortingState,
	useReactTable,
	VisibilityState
} from '@tanstack/react-table'
import { TagGroup } from '~/components/TagGroup'
import useWindowSize from '~/hooks/useWindowSize'
import { downloadCSV } from '~/utils'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { TableBody } from '../../ProTable/TableBody'
import { trendingContractsColumns } from './columns'
import { useTrendingContractsData } from './useTrendingContractsData'
import { TablePagination } from '../../ProTable/TablePagination'

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
	tableId,
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
	const results = data?.results ?? []

	const windowSize = useWindowSize()

	const instance = useReactTable({
		data: results,
		columns: trendingContractsColumns(activeChain) as ColumnDef<any>[],
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
		getPaginationRowModel: getPaginationRowModel()
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
	}, [windowSize, instance])

	const [contractSearch, setContractSearch] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('contract')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(contractSearch)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [contractSearch, instance])

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-lg font-semibold">Trending Contracts</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="pro-text2 text-sm">Loading trending contracts...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-lg font-semibold">Trending Contracts</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 items-center justify-center">
					<div className="pro-text2 text-center">Failed to load trending contracts</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex flex-wrap items-center justify-end gap-4">
					<h3 className="pro-text1 mr-auto text-lg font-semibold">Trending Contracts</h3>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<TagGroup
							selectedValue={timeframe}
							setValue={(val: string) => {
								setTimeframe(val)
								if (onTimeframeChange) {
									onTimeframeChange(val)
								}
							}}
							values={['1d', '7d', '30d']}
							containerClassName="text-sm flex items-center overflow-x-auto flex-nowrap w-fit border pro-border pro-text1"
							buttonClassName="shrink-0 px-3 py-1.5 whitespace-nowrap hover:pro-bg2 focus-visible:pro-bg2 data-[active=true]:bg-(--primary) data-[active=true]:text-white"
						/>
						<TagGroup
							selectedValue={chain}
							setValue={(val: string) => {
								setChain(val)
								if (onChainChange) {
									onChainChange(val)
								}
							}}
							values={['Ethereum', 'Arbitrum', 'Polygon', 'Optimism', 'Base']}
							containerClassName="text-sm flex items-center overflow-x-auto flex-nowrap w-fit border pro-border pro-text1"
							buttonClassName="shrink-0 px-3 py-1.5 whitespace-nowrap hover:pro-bg2 focus-visible:pro-bg2 data-[active=true]:bg-(--primary) data-[active=true]:text-white"
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
							className="pro-border pro-text1 rounded-md border bg-(--bg-glass) px-3 py-1.5 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
						/>
					</div>
				</div>
			</div>
			<TableBody table={instance} />
			<TablePagination table={instance} />
		</div>
	)
}
