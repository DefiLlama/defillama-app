import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	ColumnOrderState
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { chainsColumn, chainsTableColumnOrders } from './columns'
import type { IChainsRow } from './types'
import useWindowSize from '~/hooks/useWindowSize'
import { ColumnFilters2 } from '~/components/Filters/common/ColumnFilters'
import { DEFI_CHAINS_SETTINGS, useDefiChainsManager } from '~/contexts/LocalStorage'
import styled from 'styled-components'
import { TVLRange } from '~/components/Filters/protocols/TVLRange'

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
			columnOrder
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IChainsRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

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
			<TableOptions>
				<ColumnFilters2
					label={'Group Chains'}
					options={DEFI_CHAINS_SETTINGS}
					clearAllOptions={clearAllAggrOptions}
					toggleAllOptions={toggleAllAggrOptions}
					selectedOptions={selectedAggregateTypes}
					addOption={addAggrOption}
					subMenu={false}
				/>
				<ColumnFilters2
					label={'Columns'}
					options={chainsOverviewTableColumns}
					clearAllOptions={clearAllColumns}
					toggleAllOptions={toggleAllColumns}
					selectedOptions={selectedColumns}
					addOption={addColumn}
					subMenu={false}
				/>

				<TVLRange />
			</TableOptions>
			<VirtualTable instance={instance} />
		</>
	)
}

const TableOptions = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 0 0 -12px;
	justify-content: flex-end;
	flex-wrap: wrap;

	button {
		font-weight: 600;
	}
`
