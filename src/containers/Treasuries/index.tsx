import { maxAgeForNext } from '~/api'
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
import { VirtualTable } from '~/components/Table/Table'

import { fetchWithErrorLogging } from '~/utils/async'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download } from '~/utils'

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

	const downloadCSV = () => {
		const headers = [
			'Name',
			'Category',
			'Own Tokens',
			'Stablecoins',
			'Major Tokens',
			'Other Tokens',
			'Total excl. own tokens',
			'Total Treasury',
			'Mcap',
			'Change 1d',
			'Change 7d',
			'Change 1m'
		]
		const data = treasuries.map((row) => {
			return {
				Name: row.name,
				Category: row.category,
				'Own Tokens': row.ownTokens,
				Stablecoins: row.stablecoins,
				'Major Tokens': row.majors,
				'Other Tokens': row.others,
				'Total excl. own tokens': row.coreTvl,
				'Total Treasury': row.tvl,
				Mcap: row.mcap,
				'Change 1d': row.change_1d,
				'Change 7d': row.change_7d,
				'Change 1m': row.change_1m
			}
		})
		const csv = [headers.join(',')].concat(data.map((row) => headers.map((header) => row[header]).join(','))).join('\n')
		download('treasuries.csv', csv)
	}

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
				<h1 className="text-2xl font-medium -mb-5 flex items-center justify-between flex-wrap gap-3">
					<span>Protocol Treasuries</span>
					<CSVDownloadButton onClick={downloadCSV} isLight />
				</h1>

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
