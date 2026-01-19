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
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { alphanumericFalsyLast, sortColumnSizesAndOrders } from '~/components/Table/utils'
import {
	CHAINS_CATEGORY_GROUP_SETTINGS,
	isChainsCategoryGroupKey,
	useLocalStorageSettingsManager
} from '~/contexts/LocalStorage'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { useDebounce } from '~/hooks/useDebounce'
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

export function PeggedAssetsTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'mcap', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const width = useBreakpointWidth()

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
		sortColumnSizesAndOrders({
			instance,
			columnSizes: assetsColumnSizes,
			columnOrders: assetsColumnOrders,
			width
		})
	}, [instance, width])

	const [projectName, setProjectName] = React.useState('')
	const debouncedProjectName = useDebounce(projectName, 200)

	React.useEffect(() => {
		React.startTransition(() => {
			instance.getColumn('name')?.setFilterValue(debouncedProjectName)
		})
	}, [debouncedProjectName, instance])

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
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

export function PeggedAssetByChainTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'circulating', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const width = useBreakpointWidth()

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
		sortColumnSizesAndOrders({
			instance,
			columnSizes: assetsByChainColumnSizes,
			columnOrders: assetsByChainColumnOrders,
			width
		})
	}, [instance, width])

	const [projectName, setProjectName] = React.useState('')
	const debouncedProjectName = useDebounce(projectName, 200)

	React.useEffect(() => {
		React.startTransition(() => {
			instance.getColumn('name')?.setFilterValue(debouncedProjectName)
		})
	}, [debouncedProjectName, instance])

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
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
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
	const debouncedProjectName = useDebounce(projectName, 200)

	React.useEffect(() => {
		React.startTransition(() => {
			instance.getColumn('name')?.setFilterValue(debouncedProjectName)
		})
	}, [debouncedProjectName, instance])

	const [groupTvls, updater] = useLocalStorageSettingsManager('tvl_chains')

	const clearAllAggrOptions = () => {
		const selectedAggregateTypesSet = new Set(selectedAggregateTypes)
		for (const item of CHAINS_CATEGORY_GROUP_SETTINGS) {
			if (selectedAggregateTypesSet.has(item.key)) {
				updater(item.key)
			}
		}
	}

	const toggleAllAggrOptions = () => {
		const selectedAggregateTypesSet = new Set(selectedAggregateTypes)
		for (const item of CHAINS_CATEGORY_GROUP_SETTINGS) {
			if (!selectedAggregateTypesSet.has(item.key)) {
				updater(item.key)
			}
		}
	}

	const addAggrOption = (selectedKeys: string[]) => {
		const selectedSet = new Set(selectedKeys)
		for (const item of CHAINS_CATEGORY_GROUP_SETTINGS) {
			const shouldEnable = selectedSet.has(item.key)
			if (groupTvls[item.key] !== shouldEnable) {
				updater(item.key)
			}
		}
	}

	const addOnlyOneAggrOption = (newOption: string) => {
		if (!isChainsCategoryGroupKey(newOption)) return
		for (const item of CHAINS_CATEGORY_GROUP_SETTINGS) {
			const shouldEnable = item.key === newOption
			if (groupTvls[item.key] !== shouldEnable) {
				updater(item.key)
			}
		}
	}

	const selectedAggregateTypes = React.useMemo(() => {
		return CHAINS_CATEGORY_GROUP_SETTINGS.filter((key) => groupTvls[key.key]).map((option) => option.key)
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
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				<SelectWithCombobox
					allValues={CHAINS_CATEGORY_GROUP_SETTINGS}
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
