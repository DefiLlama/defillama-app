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
import type { INftCollection } from '../types'
import { columns } from './columns'

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
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<h1 className="mr-auto text-xl font-semibold">NFT Collection Metrics</h1>
				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search collections...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={collectionName}
						onChange={(e) => {
							setCollectionName(e.target.value)
						}}
						placeholder="Search collections..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-sm text-black dark:bg-black dark:text-white"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
