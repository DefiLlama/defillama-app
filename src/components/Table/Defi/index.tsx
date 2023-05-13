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
import VirtualTable from '~/components/Table/Table'
import { chainsColumn, chainsTableColumnOrders } from './columns'
import type { IChainsRow } from './types'
import useWindowSize from '~/hooks/useWindowSize'

export default function DefiProtocolsTable({ data, columns }) {
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

export function DefiChainsTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const windowSize = useWindowSize()

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

	return <VirtualTable instance={instance} />
}
