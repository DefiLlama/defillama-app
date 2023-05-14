import * as React from 'react'
import styled from 'styled-components'
import { toNiceDayMonthAndYear, formattedNum } from '~/utils'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnFiltersState,
	ColumnDef
} from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { Header } from '~/Theme'
import { SearchIcon, SearchWrapper } from '~/components/Table/shared'
import { Checkbox2 } from '~/components'
import useSWR from 'swr'
import { formatGovernanceData } from '~/api/categories/protocols'

export function GovernanceTable({ data, isOnChainGovernance }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'state', desc: true }])
	const [filterControversialProposals, setFilterProposals] = React.useState(false)

	const instance = useReactTable({
		data: filterControversialProposals ? data.controversialProposals : data.proposals,
		columns: isOnChainGovernance ? proposalsCompoundColumns : proposalsSnapshotColumns,
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

	const [proposalname, setProposalName] = React.useState('')

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('title')
		const id = setTimeout(() => {
			projectsColumns.setFilterValue(proposalname)
		}, 200)
		return () => clearTimeout(id)
	}, [proposalname, instance])

	return (
		<>
			<TableFilters>
				<Header style={{ margin: 0 }}>Proposals</Header>

				<FilterProposals>
					<Checkbox2
						type="checkbox"
						value="controversial proposals"
						checked={filterControversialProposals}
						onChange={() => setFilterProposals(!filterControversialProposals)}
					/>
					<span>Filter Controversial Proposals</span>
				</FilterProposals>

				<SearchWrapper style={{ bottom: 0, marginLeft: 0 }}>
					<SearchIcon size={16} />

					<input
						value={proposalname}
						onChange={(e) => {
							setProposalName(e.target.value)
						}}
						placeholder="Search proposals..."
					/>
				</SearchWrapper>
			</TableFilters>

			<TableWrapper instance={instance} />
		</>
	)
}

export function GovernanceData({ api }: { api: string }) {
	const { data, error } = useSWR(api, () =>
		fetch(api)
			.then((res) => res.json())
			.then((data) => {
				const { proposals, activity, maxVotes } = formatGovernanceData(data as any)

				return {
					...data,
					proposals,
					controversialProposals: proposals
						.sort((a, b) => (b['score_curve'] || 0) - (a['score_curve'] || 0))
						.slice(0, 10),
					activity,
					maxVotes
				}
			})
	)

	const isLoading = !data && !error

	if (isLoading) {
		return <p style={{ margin: '180px 0 ', textAlign: 'center' }}>Loading...</p>
	}

	return data ? (
		<Wrapper>
			<GovernanceTable data={data} isOnChainGovernance={api.includes('governance-cache/snapshot') ? false : true} />
		</Wrapper>
	) : null
}

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 24px;
	max-width: calc(100vw - 32px);

	& > * {
		@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
			max-width: calc(100vw - 276px - 66px);
		}
	}
`

const TableWrapper = styled(VirtualTable)`
	table {
		table-layout: auto;

		tr > :first-child {
			position: relative;
		}

		td > a {
			text-decoration: underline;
		}
	}
`

const TableFilters = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	flex-wrap: wrap;

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		flex-direction: row;
		align-items: center;
	}
`
const FilterProposals = styled.label`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: nowrap;
	margin-left: auto;

	span {
		white-space: nowrap;
	}
`

interface IProposal {
	title: string
	state: 'open' | 'closed'
	link: string
	discussion: string
	winningPerc: string
	winningChoice: string
	scores_total: number
}

const proposalsCompoundColumns: ColumnDef<IProposal>[] = [
	{
		header: 'Title',
		accessorKey: 'title',
		enableSorting: false,
		cell: (info) => {
			if (!info.row.original.link) {
				return formatText(info.getValue() as string, 40)
			}
			return (
				<a href={info.row.original.link} target="_blank" rel="noopener noreferrer">
					{formatText(info.getValue() as string, 40)}
				</a>
			)
		}
	},
	{
		header: 'Start',
		accessorKey: 'start',
		cell: (info) => toNiceDayMonthAndYear(info.getValue()),
		meta: { align: 'end' }
	},
	{
		header: 'End',
		accessorKey: 'end',
		cell: (info) => toNiceDayMonthAndYear(info.getValue()),
		meta: { align: 'end' }
	},
	{
		header: 'State',
		accessorKey: 'state',
		cell: (info) => info.getValue() || '',
		meta: { align: 'end' }
	},
	{
		header: 'Votes',
		accessorKey: 'scores_total',
		cell: (info) => formattedNum(info.getValue()),
		meta: { align: 'end' }
	},
	{
		header: 'Controversy',
		accessorKey: 'score_curve',
		cell: (info) => (info.getValue() ? (info.getValue() as number).toFixed(2) : ''),
		meta: { align: 'end', headerHelperText: 'It is calculated by number of votes * how close result is to 50%' }
	}
]

const proposalsSnapshotColumns: ColumnDef<IProposal>[] = [
	{
		header: 'Title',
		accessorKey: 'title',
		enableSorting: false,
		cell: (info) => {
			if (!info.row.original.link) {
				return formatText(info.getValue() as string, 40)
			}
			return (
				<a href={info.row.original.link} target="_blank" rel="noopener noreferrer">
					{formatText(info.getValue() as string, 40)}
				</a>
			)
		}
	},
	{
		header: 'Start',
		accessorKey: 'start',
		cell: (info) => toNiceDayMonthAndYear(info.getValue()),
		meta: { align: 'end' }
	},
	{
		header: 'End',
		accessorKey: 'end',
		cell: (info) => toNiceDayMonthAndYear(info.getValue()),
		meta: { align: 'end' }
	},
	{
		header: 'State',
		id: 'state',
		accessorFn: (row) => (row.state === 'closed' ? 0 : 1),
		cell: (info) => (
			<State data-isactive={info.getValue() === 0 ? false : true}>{info.getValue() === 0 ? 'Closed' : 'Active'}</State>
		),
		meta: { align: 'end' }
	},
	{
		header: 'Votes',
		accessorKey: 'scores_total',
		cell: (info) => formattedNum(info.getValue()),
		meta: { align: 'end' }
	},
	{
		header: 'Winning Choice',
		accessorKey: 'winningChoice',
		cell: (info) => formatText(info.getValue() as string, 20) + ' ' + info.row.original.winningPerc,
		enableSorting: false,
		meta: { align: 'end' }
	},
	{
		header: 'Controversy',

		accessorKey: 'score_curve',
		cell: (info) => (info.getValue() ? (info.getValue() as number).toFixed(2) : ''),
		meta: { align: 'end', headerHelperText: 'It is calculated by number of votes * how close result is to 50%' }
	},
	{
		header: 'Discussion',
		accessorKey: 'discussion',
		enableSorting: false,
		cell: (info) =>
			info.getValue() && (
				<a href={info.getValue() as string} target="_blank" rel="noopener noreferrer">
					View
				</a>
			),
		meta: { align: 'end' }
	}
]

const State = styled.span`
	&[data-isactive='false'] {
		color: #f85149;
	}
	color: #3fb950;
`
const formatText = (text: string, length) => (text.length > length ? text.slice(0, length + 1) + '...' : text)
