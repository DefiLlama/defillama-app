import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	ColumnOrderState,
	ColumnFiltersState,
	getFilteredRowModel
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { chainsColumn, chainsTableColumnOrders } from './columns'
import type { IChainsRow } from './types'
import useWindowSize from '~/hooks/useWindowSize'
import { ColumnFilters2 } from '~/components/Filters/common/ColumnFilters'
import { DEFI_CHAINS_SETTINGS, useDefiChainsManager } from '~/contexts/LocalStorage'
import { TVLRange } from '~/components/Filters/protocols/TVLRange'
import { Icon } from '~/components/Icon'

export function DefiProtocolsTable({ data, columns }) {
	const [sorting, setSorting] = React.useState<SortingState>([])

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting
		},
		onSortingChange: setSorting,

		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

const chainsOverviewTableColumns = [
	{ name: 'Name', key: 'name' },
	...chainsColumn.filter((c: any) => c.accessorKey !== 'name').map((c: any) => ({ name: c.header, key: c.accessorKey }))
]

export function DefiChainsTable({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const windowSize = useWindowSize()
	const optionsKey = 'chains-overview-table-columns'

	const instance = useReactTable({
		data,
		columns: chainsColumn,
		state: {
			sorting,
			expanded,
			columnOrder,
			columnFilters
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IChainsRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
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

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? chainsTableColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	const clearAllColumns = () => {
		window.localStorage.setItem(optionsKey, '{}')
		instance.getToggleAllColumnsVisibilityHandler()({ checked: false } as any)
	}
	const toggleAllColumns = () => {
		const ops = JSON.stringify(Object.fromEntries(chainsOverviewTableColumns.map((option) => [option.key, true])))
		window.localStorage.setItem(optionsKey, ops)
		instance.getToggleAllColumnsVisibilityHandler()({ checked: true } as any)
	}

	const addColumn = (newOptions) => {
		const ops = Object.fromEntries(
			instance.getAllLeafColumns().map((col) => [col.id, newOptions.includes(col.id) ? true : false])
		)
		window.localStorage.setItem(optionsKey, JSON.stringify(ops))
		instance.setColumnVisibility(ops)
	}

	const selectedColumns = instance
		.getAllLeafColumns()
		.filter((col) => col.getIsVisible())
		.map((col) => col.id)

	const [groupTvls, updater] = useDefiChainsManager()

	const clearAllAggrOptions = () => {
		DEFI_CHAINS_SETTINGS.forEach((item) => {
			if (selectedAggregateTypes.includes(item.key)) {
				updater(item.key)()
			}
		})
	}

	const toggleAllAggrOptions = () => {
		DEFI_CHAINS_SETTINGS.forEach((item) => {
			if (!selectedAggregateTypes.includes(item.key)) {
				updater(item.key)()
			}
		})
	}

	const addAggrOption = (selectedKeys) => {
		for (const item in groupTvls) {
			// toggle on
			if (!groupTvls[item] && selectedKeys.includes(item)) {
				updater(item)()
			}

			// toggle off
			if (groupTvls[item] && !selectedKeys.includes(item)) {
				updater(item)()
			}
		}
	}

	const selectedAggregateTypes = DEFI_CHAINS_SETTINGS.filter((key) => groupTvls[key.key]).map((option) => option.key)

	return (
		<>
			<div className="flex items-center justify-end flex-wrap gap-3 -mb-3">
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
						className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
				<ColumnFilters2
					label={'Group Chains'}
					options={DEFI_CHAINS_SETTINGS}
					clearAllOptions={clearAllAggrOptions}
					toggleAllOptions={toggleAllAggrOptions}
					selectedOptions={selectedAggregateTypes}
					addOption={addAggrOption}
					nestedMenu={false}
				/>
				<ColumnFilters2
					label={'Columns'}
					options={chainsOverviewTableColumns}
					clearAllOptions={clearAllColumns}
					toggleAllOptions={toggleAllColumns}
					selectedOptions={selectedColumns}
					addOption={addColumn}
					nestedMenu={false}
				/>

				<TVLRange />
			</div>
			<VirtualTable instance={instance} />
		</>
	)
}
