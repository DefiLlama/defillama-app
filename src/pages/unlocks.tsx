import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissions } from '~/api/categories/protocols'
import * as React from 'react'
import Layout from '~/layout'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnFiltersState
} from '@tanstack/react-table'
import styled from 'styled-components'
import { StatsSection } from '~/layout/Stats/Medium'
import VirtualTable from '~/components/Table/Table'
import { emissionsColumns } from '~/components/Table/Defi/columns'
import { Header } from '~/Theme'
import { SearchIcon, SearchWrapper, TableHeaderAndSearch } from '~/components/Table/shared'
import { withPerformanceLogging } from '~/utils/perf'
import { AnnouncementWrapper } from '~/components/Announcement'

export const getStaticProps = withPerformanceLogging('unlocks', async () => {
	const data = await getAllProtocolEmissions()

	return {
		props: {
			data
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])

	const instance = useReactTable({
		data,
		columns: emissionsColumns,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
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
		<Layout title={`Unlocks - DefiLlama`} defaultSEO>
			<AnnouncementWrapper>
				<span>Are we missing any protocol?</span>{' '}
				<a
					href="https://airtable.com/shrD1bSGYNcdFQ6kd"
					style={{ color: '#2f80ed' }}
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</AnnouncementWrapper>

			<TableHeaderAndSearch>
				<Header>Token Unlocks</Header>

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

			<TableWrapper
				instance={instance}
				skipVirtualization
				cellStyles={{ padding: '8px', whiteSpace: 'nowrap' }}
				stripedBg
			/>
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

const TableWrapper = styled(VirtualTable)`
	table {
		table-layout: auto;
	}
`
