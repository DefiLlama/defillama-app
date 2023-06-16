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
import VirtualTable from '../StickyTable'
import { volumesColumnSizes, getColumnsByType, getColumnsOrdernSizeByType } from './columns'
import type { IDexsRow } from './types'
import useWindowSize from '~/hooks/useWindowSize'

const columnSizesKeys = Object.keys(volumesColumnSizes)
	.map((x) => Number(x))
	.sort((a, b) => Number(b) - Number(a))

export function OverviewTable({ data, type, allChains }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'total24h' }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns: getColumnsByType(type, allChains),
		state: {
			sorting,
			expanded,
			columnOrder,
			columnSizing
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IDexsRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		enableSortingRemoval: false
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? getColumnsOrdernSizeByType(type)?.order?.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		const cSize = windowSize.width
			? columnSizesKeys.find((size) => windowSize.width > Number(size))
			: columnSizesKeys[0]

		instance.setColumnSizing(getColumnsOrdernSizeByType(type).size[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance, type])

	return <VirtualTable instance={instance} />
}
