import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnOrderState,
	ColumnSizingState,
	ColumnFiltersState,
	VisibilityState,
	getFilteredRowModel,
	getPaginationRowModel,
	PaginationState,
	ColumnDef
} from '@tanstack/react-table'
import { TableBody } from '../../ProTable/TableBody'
import { trendingContractsColumns } from './columns'
import useWindowSize from '~/hooks/useWindowSize'
import { LoadingSpinner } from '../../LoadingSpinner'
import { useTrendingContractsData } from './useTrendingContractsData'
import { TagGroup } from '~/components/TagGroup'
import { ProTableCSVButton } from '../../ProTable/CsvButton'

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
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">Trending Contracts</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading trending contracts...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-lg font-semibold pro-text1">Trending Contracts</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex items-center justify-center">
					<div className="text-center pro-text2">Failed to load trending contracts</div>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full p-4 h-full flex flex-col">
			<div className="mb-3">
				<div className="flex items-center justify-between gap-4">
					<h3 className="text-lg font-semibold pro-text1">Trending Contracts</h3>
					<div className="flex items-center gap-2">
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

								const blob = new Blob([csv], { type: 'text/csv' })
								const url = URL.createObjectURL(blob)
								const a = document.createElement('a')
								a.href = url
								a.download = `trending-contracts-${chain.toLowerCase()}-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`
								document.body.appendChild(a)
								a.click()
								document.body.removeChild(a)
								URL.revokeObjectURL(url)
							}}
							smol
						/>
						<input
							type="text"
							placeholder="Search contracts..."
							value={contractSearch}
							onChange={(e) => setContractSearch(e.target.value)}
							className="px-3 py-1.5 text-sm border pro-border pro-bg1 pro-text1
								focus:outline-hidden focus:ring-1 focus:ring-(--primary)"
						/>
					</div>
				</div>
			</div>
			<TableBody table={instance} />
			<div className="flex items-center justify-between w-full mt-2">
				<TagGroup
					selectedValue={null}
					setValue={(val) => (val === 'Next' ? instance.nextPage() : instance.previousPage())}
					values={['Previous', 'Next']}
					containerClassName="text-sm flex items-center overflow-x-auto flex-nowrap w-fit border pro-border pro-text1"
					buttonClassName="shrink-0 px-3 py-1.5 whitespace-nowrap hover:pro-bg2 focus-visible:pro-bg2"
				/>
				<div className="flex items-center">
					<div className="mr-2 text-xs">Per page</div>
					<TagGroup
						selectedValue={String(pagination.pageSize)}
						values={['10', '30', '50']}
						setValue={(val) => setPagination((prev) => ({ ...prev, pageSize: Number(val), pageIndex: 0 }))}
						containerClassName="text-sm flex items-center overflow-x-auto flex-nowrap w-fit border pro-border pro-text1"
						buttonClassName="shrink-0 px-3 py-1.5 whitespace-nowrap hover:pro-bg2 focus-visible:pro-bg2 data-[active=true]:bg-(--primary) data-[active=true]:text-white"
					/>
				</div>
			</div>
		</div>
	)
}
