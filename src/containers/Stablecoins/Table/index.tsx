import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnOrderState,
	ColumnSizingState,
	ColumnFiltersState,
	getFilteredRowModel,
	ExpandedState,
	getExpandedRowModel
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import {
	assetsColumnSizes,
	peggedAssetsColumns,
	assetsColumnOrders,
	assetsByChainColumnSizes,
	peggedAssetsByChainColumns,
	assetsByChainColumnOrders,
	peggedChainsColumns
} from './columns'
import useWindowSize from '~/hooks/useWindowSize'
import { Icon } from '~/components/Icon'
import { IPeggedAssetByChainRow, IPeggedChain } from './types'

const assetsColumnSizesKeys = Object.keys(assetsColumnSizes)
	.map((x) => Number(x))
	.sort((a, b) => Number(b) - Number(a))

export function PeggedAssetsTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'mcap', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns: peggedAssetsColumns,
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
			? assetsColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		const cSize = windowSize.width
			? assetsColumnSizesKeys.find((size) => windowSize.width > Number(size))
			: assetsColumnSizesKeys[0]

		instance.setColumnSizing(assetsColumnSizes[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(projectName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="p-3 flex items-center justify-between">
				<div className="relative w-full sm:max-w-[280px] mr-auto">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="border border-[#E6E6E6] dark:border-[#39393E] w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

const assetsByChainColumnSizesKeys = Object.keys(assetsByChainColumnSizes)
	.map((x) => Number(x))
	.sort((a, b) => Number(b) - Number(a))

export function PeggedAssetByChainTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'circulating', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns: peggedAssetsByChainColumns,
		state: {
			sorting,
			expanded,
			columnOrder,
			columnSizing,
			columnFilters
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IPeggedAssetByChainRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? assetsByChainColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		const cSize = windowSize.width
			? assetsByChainColumnSizesKeys.find((size) => windowSize.width > Number(size))
			: assetsByChainColumnSizesKeys[0]

		instance.setColumnSizing(assetsByChainColumnSizes[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(projectName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="p-3 flex items-center justify-between">
				<div className="relative w-full sm:max-w-[280px] mr-auto">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="border border-[#E6E6E6] dark:border-[#39393E] w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

export function PeggedChainsTable({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'mcap', desc: true }])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})

	const instance = useReactTable({
		data,
		columns: peggedChainsColumns,
		state: {
			sorting,
			expanded,
			columnFilters
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IPeggedChain) => row.subRows,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			columns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="p-3 flex items-center justify-between">
				<div className="relative w-full sm:max-w-[280px] mr-auto">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="border border-[#E6E6E6] dark:border-[#39393E] w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
