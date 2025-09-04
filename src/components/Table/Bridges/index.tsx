import * as React from 'react'
import {
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import useWindowSize from '~/hooks/useWindowSize'
import {
	bridgeAddressesColumn,
	bridgeChainsColumn,
	bridgeChainsColumnOrders,
	bridgeChainsColumnSizes,
	bridgesColumn,
	bridgesColumnOrders,
	bridgesColumnSizes,
	bridgeTokensColumn,
	largeTxsColumn,
	largeTxsColumnOrders,
	largeTxsColumnSizes
} from './Bridges/columns'

const columnSizesKeys = Object.keys(bridgesColumnSizes)
	.map((x) => Number(x))
	.sort((a, b) => Number(b) - Number(a))

export function BridgesTable({ data, searchValue = '', onSearchChange = null }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'lastDailyVolume', desc: true }])
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns: bridgesColumn,
		state: {
			sorting,
			columnFilters,
			columnOrder,
			columnSizing
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	React.useEffect(() => {
		const column = instance.getColumn('displayName')
		const id = setTimeout(() => {
			column?.setFilterValue(searchValue)
		}, 200)
		return () => clearTimeout(id)
	}, [searchValue, instance])

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? (bridgesColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder)
			: defaultOrder

		const cSize = windowSize.width
			? columnSizesKeys.find((size) => windowSize.width > Number(size))
			: columnSizesKeys[0]

		instance.setColumnSizing(bridgesColumnSizes[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	return <VirtualTable instance={instance} />
}

export function BridgeChainsTable({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'prevDayNetFlow', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns: bridgeChainsColumn,
		state: {
			sorting,
			columnOrder,
			columnSizing,
			columnFilters
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? (bridgeChainsColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder)
			: defaultOrder

		const cSize = windowSize.width
			? columnSizesKeys.find((size) => windowSize.width > Number(size))
			: columnSizesKeys[0]

		instance.setColumnSizing(bridgeChainsColumnSizes[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			columns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between gap-2 p-3">
				<h1 className="mr-auto text-lg font-semibold">Chains</h1>
				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 py-0.5 pl-7 text-base text-black dark:bg-black dark:text-white"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

export function BridgesLargeTxsTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns: largeTxsColumn,
		state: {
			sorting,
			columnOrder,
			columnSizing
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? (largeTxsColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder)
			: defaultOrder

		const cSize = windowSize.width
			? columnSizesKeys.find((size) => windowSize.width > Number(size))
			: columnSizesKeys[0]

		instance.setColumnSizing(largeTxsColumnSizes[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	return <VirtualTable instance={instance} />
}

export function BridgeTokensTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'volume', desc: true }])

	const instance = useReactTable({
		data,
		columns: bridgeTokensColumn,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

export function BridgeAddressesTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'withdrawn', desc: true }])

	const instance = useReactTable({
		data,
		columns: bridgeAddressesColumn,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}
