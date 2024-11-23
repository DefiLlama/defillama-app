import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	ColumnOrderState,
	ColumnSizingState
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { columnSizes, peggedAssetByChainColumn, assetByChainColumnOrders } from './columns'
import type { IPeggedAssetByChainRow } from './types'
import useWindowSize from '~/hooks/useWindowSize'

const columnSizesKeys = Object.keys(columnSizes)
	.map((x) => Number(x))
	.sort((a, b) => Number(b) - Number(a))

export function PeggedAssetByChainTable({ data }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'circulating', desc: true }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns: peggedAssetByChainColumn,
		state: {
			sorting,
			expanded,
			columnOrder,
			columnSizing
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IPeggedAssetByChainRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? assetByChainColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		const cSize = windowSize.width
			? columnSizesKeys.find((size) => windowSize.width > Number(size))
			: columnSizesKeys[0]

		instance.setColumnSizing(columnSizes[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	return <VirtualTable instance={instance} />
}
