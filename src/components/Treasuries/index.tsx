import { maxAgeForNext } from '~/api'
import { Header } from '~/Theme'
import { SearchWrapper, SearchIcon, TableHeaderAndSearch } from '~/components/Table/shared'
import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnFiltersState
} from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const getTreasuryData = (url: string) => async () => {
	const treasuries = await fetch(url).then((res) => res.json())
	return {
		props: {
			treasuries: treasuries
				.map((t) => ({
					...t,
					...['majors', 'others', 'ownTokens', 'stablecoins'].reduce(
						(acc, v) => ({
							...acc,
							[v]: t.tokenBreakdowns[v]
						}),
						{}
					),
					coreTvl: t.tvl,
					tvl: t.tvl + (t.chainTvls?.['OwnTokens'] ?? 0),
					mcap: t.mcap === 0 ? null : t.mcap
				}))
				.sort((a, b) => b.coreTvl - a.coreTvl)
		},
		revalidate: maxAgeForNext([22])
	}
}

export function TreasuriesPage({ treasuries, treasuriesColumns }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])

	const instance = useReactTable({
		data: treasuries,
		columns: treasuriesColumns,
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

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('name')
		const id = setTimeout(() => {
			projectsColumns.setFilterValue(projectName)
		}, 200)
		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<>
			<TableHeaderAndSearch>
				<Header>Protocol Treasuries</Header>

				<SearchWrapper>
					<SearchIcon size={16} />

					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
					/>
				</SearchWrapper>
			</TableHeaderAndSearch>

			<VirtualTable instance={instance} />
		</>
	)
}
