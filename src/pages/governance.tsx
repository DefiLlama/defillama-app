import { maxAgeForNext } from '~/api'
import * as React from 'react'
import Layout from '~/layout'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnFiltersState,
	getExpandedRowModel
} from '@tanstack/react-table'
import styled from 'styled-components'
import { VirtualTable } from '~/components/Table/Table'
import { governanceColumns } from '~/components/Table/Defi/columns'
import { SearchIcon, SearchWrapper, TableHeaderAndSearch } from '~/components/Table/shared'
import { GOVERNANCE_SNAPSHOT_API, GOVERNANCE_COMPOUND_API, GOVERNANCE_TALLY_API } from '~/constants'
import { capitalizeFirstLetter } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('governance', async () => {
	const [snapshot, compound, tally] = await Promise.all([
		fetch(GOVERNANCE_SNAPSHOT_API).then((res) => res.json()),
		fetch(GOVERNANCE_COMPOUND_API).then((res) => res.json()),
		fetch(GOVERNANCE_TALLY_API).then((res) => res.json())
	])

	return {
		props: {
			data: Object.values({ ...snapshot, ...compound, ...tally }).map((x: { states: { [key: string]: number } }) => ({
				...x,
				subRowData: x.states
			}))
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Governance({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'successfulPropsalsInLast30Days', desc: true }])

	const instance = useReactTable({
		data: data,
		columns: governanceColumns,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowCanExpand: () => true
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
		<Layout title={`Governance - DefiLlama`} defaultSEO>
			<TableHeaderAndSearch>
				<h1 className="text-2xl font-medium -mb-5">Governance</h1>

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

			<VirtualTable instance={instance} renderSubComponent={renderSubComponent} />
		</Layout>
	)
}

const SubrowData = styled.span`
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding-left: 72px;
`

const renderSubComponent = ({ row }) => {
	return (
		<SubrowData>
			{Object.entries(row.original.subRowData).map(([type, value]) => (
				<span key={row.original.name + type + value}>{capitalizeFirstLetter(type) + ' Proposals : ' + value}</span>
			))}
		</SubrowData>
	)
}
