import * as React from 'react'
import {
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { alphanumericFalsyLast } from '~/components/Table/utils'
import { DEFI_CHAINS_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import useWindowSize from '~/hooks/useWindowSize'
import {
	assetsByChainColumnOrders,
	assetsByChainColumnSizes,
	assetsColumnOrders,
	assetsColumnSizes,
	peggedAssetsByChainColumns,
	peggedAssetsColumns,
	peggedChainsColumns
} from './columns'
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
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => alphanumericFalsyLast(rowA, rowB, columnId, sorting)
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
			? (assetsColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder)
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
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search stablecoins</span>
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
						className="w-full rounded-md border border-(--form-control-border) bg-white py-0.5 pr-2 pl-7 text-base text-black dark:bg-black dark:text-white"
					/>
				</label>
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
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => alphanumericFalsyLast(rowA, rowB, columnId, sorting)
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
			? (assetsByChainColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder)
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
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
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
						className="w-full rounded-md border border-(--form-control-border) bg-white py-0.5 pr-2 pl-7 text-base text-black dark:bg-black dark:text-white"
					/>
				</label>
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
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => alphanumericFalsyLast(rowA, rowB, columnId, sorting)
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

	const [groupTvls, updater] = useLocalStorageSettingsManager('tvl_chains')

	const clearAllAggrOptions = () => {
		DEFI_CHAINS_SETTINGS.forEach((item) => {
			if (selectedAggregateTypes.includes(item.key)) {
				updater(item.key)
			}
		})
	}

	const toggleAllAggrOptions = () => {
		DEFI_CHAINS_SETTINGS.forEach((item) => {
			if (!selectedAggregateTypes.includes(item.key)) {
				updater(item.key)
			}
		})
	}

	const addAggrOption = (selectedKeys) => {
		for (const item in groupTvls) {
			// toggle on
			if (!groupTvls[item] && selectedKeys.includes(item)) {
				updater(item)
			}

			// toggle off
			if (groupTvls[item] && !selectedKeys.includes(item)) {
				updater(item)
			}
		}
	}

	const addOnlyOneAggrOption = (newOption) => {
		DEFI_CHAINS_SETTINGS.forEach((item) => {
			if (item.key === newOption) {
				if (!selectedAggregateTypes.includes(item.key)) {
					updater(item.key)
				}
			} else {
				if (selectedAggregateTypes.includes(item.key)) {
					updater(item.key)
				}
			}
		})
	}

	const selectedAggregateTypes = React.useMemo(() => {
		return DEFI_CHAINS_SETTINGS.filter((key) => groupTvls[key.key]).map((option) => option.key)
	}, [groupTvls])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
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
						className="w-full rounded-md border border-(--form-control-border) bg-white py-0.5 pr-2 pl-7 text-base text-black dark:bg-black dark:text-white"
					/>
				</label>
				<SelectWithCombobox
					allValues={DEFI_CHAINS_SETTINGS}
					selectedValues={selectedAggregateTypes}
					setSelectedValues={addAggrOption}
					selectOnlyOne={addOnlyOneAggrOption}
					toggleAll={toggleAllAggrOptions}
					clearAll={clearAllAggrOptions}
					nestedMenu={false}
					label={'Group Chains'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
					}}
				/>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
