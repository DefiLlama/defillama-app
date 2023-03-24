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
import { Search } from 'react-feather'
import { emissionsColumns } from '~/components/Table/Defi/columns'
import { Header } from '~/Theme'

export const getStaticProps = async () => {
	const data = await getAllProtocolEmissions()

	return {
		props: {
			data
		},
		revalidate: maxAgeForNext([22])
	}
}

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
		<Layout title={`Emissions - DefiLlama`} defaultSEO>
			<Filters>
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
			</Filters>

			<VirtualTable instance={instance} />
		</Layout>
	)
}
export const Filters = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
`
export const SearchWrapper = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	position: relative;
	bottom: -6px;
	margin-left: auto;

	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		input {
			max-width: 400px;
		}
	}
`

export const SearchIcon = styled(Search)`
	position: absolute;
	top: 8px;
	left: 8px;
	color: ${({ theme }) => theme.text3};
`

export const Wrapper = styled(StatsSection)`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
`
