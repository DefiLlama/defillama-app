import { maxAgeForNext } from '~/api'
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
import { Icon } from '~/components/Icon'

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
			<div className="flex items-center gap-4 flex-wrap last:*:ml-auto -mb-6">
				<h1 className="text-2xl font-medium">Protocol Treasuries</h1>

				<CSVDownloadButton onClick={downloadCSV} isLight />

				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
						className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
			</div>

			<VirtualTable instance={instance} />
		</>
	)
}
