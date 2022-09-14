import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnOrderState
} from '@tanstack/react-table'
import VirtualTable from '../Table'
import { yieldsColumnOrders, columns } from './Columns'
import { IYieldTableRow } from './types'
import useWindowSize from '~/hooks/useWindowSize'

export function YieldsTable({ data }: { data: IYieldTableRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnOrder
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? yieldsColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	return <VirtualTable instance={instance} />
}
