import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnFiltersState,
	getFilteredRowModel
} from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { columns } from './columns'
import type { INftMarketplace } from '../types'
import { TableHeaderAndSearch, SearchWrapper, SearchIcon } from '../../shared'
import { Header } from '~/Theme'

export default function NftsMarketplaceTable({ data }: { data: Array<INftMarketplace> }) {
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
			<TableHeaderAndSearch>
				<Header>NFT Marketplaces</Header>

				<SearchWrapper>
					<SearchIcon size={16} />

					<input
						value={collectionName}
						onChange={(e) => {
							setCollectionName(e.target.value)
						}}
						placeholder="Search marketplace..."
					/>
				</SearchWrapper>
			</TableHeaderAndSearch>
			<VirtualTable instance={instance} />
		</>
	)
}
