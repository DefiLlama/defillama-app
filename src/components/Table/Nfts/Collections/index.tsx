import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnFiltersState,
	getFilteredRowModel
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { columns } from './columns'
import type { INftCollection } from '../types'
import { Icon } from '~/components/Icon'

export function NftsCollectionTable({ data }: { data: Array<INftCollection> }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'volume1d', desc: true }])

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
		const collectionsColumns = instance.getColumn('name')
		const id = setTimeout(() => {
			collectionsColumns.setFilterValue(collectionName)
		}, 200)
		return () => clearTimeout(id)
	}, [collectionName, instance])

	return (
		<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
			<div className="flex items-center gap-2 justify-end flex-wrap p-3">
				<h1 className="text-xl font-semibold mr-auto">NFT Collections</h1>
				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search collections...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
					/>
					<input
						name="search"
						value={collectionName}
						onChange={(e) => {
							setCollectionName(e.target.value)
						}}
						placeholder="Search collections..."
						className="border border-(--form-control-border) w-full p-1 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
