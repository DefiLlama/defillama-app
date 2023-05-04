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
import { StatsSection } from '~/layout/Stats/Medium'
import VirtualTable from '~/components/Table/Table'
import { governanceColumns } from '~/components/Table/Defi/columns'
import { Header } from '~/Theme'
import { SearchIcon, SearchWrapper, TableHeaderAndSearch } from '~/components/Table/shared'
import { GOVERNANCE_API, ONCHAIN_GOVERNANCE_API } from '~/constants'
import { capitalizeFirstLetter } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('governance', async () => {
	const [snapshot, compound] = await Promise.all([
		fetch(GOVERNANCE_API).then((res) => res.json()),
		fetch(ONCHAIN_GOVERNANCE_API).then((res) => res.json())
	])

	return {
		props: {
			data: Object.values({ ...snapshot, ...compound }).map((x: { states: { [key: string]: number } }) => ({
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
				<Header>Governance</Header>

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

export const Wrapper = styled(StatsSection)`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
`

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
