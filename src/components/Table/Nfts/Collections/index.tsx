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
		<>
			<div className="flex items-center gap-4 flex-wrap last:*:ml-auto -mb-6">
				<h1 className="text-2xl font-medium">NFT Collections</h1>

				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={collectionName}
						onChange={(e) => {
							setCollectionName(e.target.value)
						}}
						placeholder="Search collections..."
						className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
			</div>
			<VirtualTable instance={instance} />
		</>
	)
}
