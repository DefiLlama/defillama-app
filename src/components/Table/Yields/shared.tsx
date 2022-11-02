import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnOrderState,
	ColumnSizingState
} from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import useWindowSize from '~/hooks/useWindowSize'

interface IYieldsTableWrapper {
	data: any
	columns: any
	columnSizes: any
	columnSizesKeys: any
	columnOrders: any
	skipVirtualization?: boolean
}

export const YieldsTableWrapper = ({
	data,
	columns,
	columnSizes,
	columnSizesKeys,
	columnOrders,
	skipVirtualization
}: IYieldsTableWrapper) => {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns,
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
			? columnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		const cSize = windowSize.width
			? columnSizesKeys.find((size) => windowSize.width > Number(size))
			: columnSizesKeys[0]

		instance.setColumnSizing(columnSizes[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance, columnSizes, columnSizesKeys, columnOrders])

	return <VirtualTable instance={instance} skipVirtualization={skipVirtualization} />
}
