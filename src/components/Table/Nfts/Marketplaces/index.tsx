import * as React from 'react'
import {
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import type { INftMarketplace } from '../types'
import { columns } from './columns'

export function NftsMarketplaceTable({ data }: { data: Array<INftMarketplace> }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: '1DayVolume', desc: true }])

	const instance = useReactTable({
		data,
		columns,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [collectionName, setCollectionName] = React.useState('')

	React.useEffect(() => {
		const collectionsColumns = instance.getColumn('exchangeName')
		const id = setTimeout(() => {
			collectionsColumns.setFilterValue(collectionName)
		}, 200)
		return () => clearTimeout(id)
	}, [collectionName, instance])

	return (
		<>
			<div className="relative -mb-6 ml-auto w-full sm:max-w-[280px]">
				<Icon
					name="search"
					height={16}
					width={16}
					className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
				/>
				<input
					value={collectionName}
					onChange={(e) => {
						setCollectionName(e.target.value)
					}}
					placeholder="Search marketplace..."
					className="w-full rounded-md border border-(--form-control-border) bg-white py-[6px] pr-2 pl-7 text-sm text-black dark:bg-black dark:text-white"
				/>
			</div>
			<VirtualTable instance={instance} />
		</>
	)
}
