import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	type ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { VirtualTable } from '~/components/Table/Table'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import type { useGroupBridgeData } from '~/containers/Stablecoins/hooks'
import { chainIconUrl, formattedNum } from '~/utils'

type StablecoinByChainRow = ReturnType<typeof useGroupBridgeData>[number]
type BridgeInfoCell = StablecoinByChainRow['bridgeInfo']

const stablecoinsByChainColumns: ColumnDef<StablecoinByChainRow>[] = [
	{
		header: 'Name',
		id: 'name',
		accessorFn: (row) => `${row.name}${row.symbol && row.symbol !== '-' ? ` (${row.symbol})` : ''}`,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const isSubRow = row.original.name.startsWith('Bridged from')

			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 && (
						<button
							className="absolute -left-0.5"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							)}
						</button>
					)}

					{isSubRow ? (
						<>
							<span>-</span>
							<span>{getValue() as string}</span>
						</>
					) : (
						<>
							<span className="vf-row-index shrink-0" aria-hidden="true" />
							<TokenLogo logo={chainIconUrl(row.original.name)} data-lgonly />
							<BasicLink
								href={`/stablecoins/${row.original.name}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
							>
								{getValue() as string}
							</BasicLink>
						</>
					)}
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Bridge',
		accessorKey: 'bridgeInfo',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as BridgeInfoCell
			if (!value.name || value.name === '-' || value.name === 'not-found') return null
			return (
				<>
					{value.link ? (
						<BasicLink href={value.link} className="text-sm font-medium text-(--link-text)">
							{value.name}
						</BasicLink>
					) : (
						<span>{value.name}</span>
					)}
				</>
			)
		},
		size: 240,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Bridged Amount',
		accessorKey: 'bridgedAmount',
		size: 145,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => (
			<>
				<PercentChange percent={info.getValue()} />
			</>
		),
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => (
			<>
				<PercentChange percent={info.getValue()} />
			</>
		),
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => (
			<>
				<PercentChange percent={info.getValue()} />
			</>
		),
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Circulating',
		accessorKey: 'circulating',
		cell: (info) => <>{formattedNum(info.getValue())}</>,
		size: 145,
		meta: {
			align: 'end'
		}
	}
]

const assetsByChainColumnOrders: ColumnOrdersByBreakpoint = {
	0: ['name', 'change_7d', 'circulating', 'change_1d', 'change_1m', 'bridgeInfo', 'bridgedAmount'],
	480: ['name', 'change_7d', 'circulating', 'change_1d', 'change_1m', 'bridgeInfo', 'bridgedAmount'],
	1024: ['name', 'bridgeInfo', 'bridgedAmount', 'change_1d', 'change_7d', 'change_1m', 'circulating']
}

const assetsByChainColumnSizes: ColumnSizesByBreakpoint = {
	0: {
		name: 160,
		bridgeInfo: 240,
		bridgedAmount: 145,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		circulating: 145
	},
	900: {
		name: 280,
		bridgeInfo: 240,
		bridgedAmount: 145,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		circulating: 145
	}
}

export function StablecoinByChainUsageTable({ data }: { data: StablecoinByChainRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'circulating', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const instance = useReactTable({
		data,
		columns: stablecoinsByChainColumns,
		state: {
			sorting,
			expanded,
			columnOrder,
			columnSizing,
			columnFilters
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: StablecoinByChainRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnSizesAndOrders({
		instance,
		columnSizes: assetsByChainColumnSizes,
		columnOrders: assetsByChainColumnOrders
	})

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between p-3">
				<h3 className="text-base font-semibold">Stablecoins Usage by Chain</h3>
				<label className="relative ml-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
