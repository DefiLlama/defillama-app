import { maxAgeForNext } from '~/api'
import { Button, ChartsWrapper, LazyChart, Name } from '~/layout/ProtocolAndPool'
import * as React from 'react'
import Layout from '~/layout'
import styled from 'styled-components'
import { StatsSection } from '~/layout/Stats/Medium'
import TokenLogo from '~/components/TokenLogo'
import { standardizeProtocolName, toNiceDayMonthAndYear, tokenIconUrl, formattedNum, chainIconUrl, toK } from '~/utils'
import {
	GOVERNANCE_API,
	ONCHAIN_GOVERNANCE_API,
	PROTOCOL_GOVERNANCE_API,
	PROTOCOL_ONCHAIN_GOVERNANCE_API
} from '~/constants'
import Link from 'next/link'
import { ArrowUpRight } from 'react-feather'
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
import dynamic from 'next/dynamic'
import { IBarChartProps } from '~/components/ECharts/types'
import { AutoRow } from '~/components/Row'
import { Checkbox2 } from '~/components'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export const getStaticProps = async ({
	params: {
		project: [project]
	}
}) => {
	const [snapshot, compound]: [
		{ [key: string]: { name: string; id: string } },
		{ [key: string]: { name: string; id: string } }
	] = await Promise.all([
		fetch(GOVERNANCE_API).then((res) => res.json()),
		fetch(ONCHAIN_GOVERNANCE_API).then((res) => res.json())
	])

	const snapshotProjectId = Object.values(snapshot).find((p) => standardizeProtocolName(p.name) === project)?.id
	const compoundProjectId = Object.values(compound).find((p) => standardizeProtocolName(p.name) === project)?.id

	if (!snapshotProjectId && !compoundProjectId) {
		return { notFound: true }
	}

	const api = snapshotProjectId
		? PROTOCOL_GOVERNANCE_API + '/' + snapshotProjectId + '.json'
		: PROTOCOL_ONCHAIN_GOVERNANCE_API + '/' + compoundProjectId + '.json'

	const data: {
		proposals: {
			[id: string]: {
				id: string
				title: string
				choices: Array<string>
				scores: Array<number>
			}
		}
		stats: {
			months: {
				[month: string]: { total: number; successful: number; proposals: Array<string> }
			}
		}
	} = await fetch(api).then((res) => res.json())

	const recentMonth = Object.keys(data.stats.months).sort().pop()
	const missingMonths = getDateRange(recentMonth)

	missingMonths.forEach((month) => {
		data.stats.months[month] = { total: 0, successful: 0, proposals: [] }
	})

	const proposals = Object.values(data.proposals).map((proposal) => {
		const winningScore = [...proposal.scores].sort((a, b) => b - a)[0]
		const totalVotes = proposal.scores.reduce((acc, curr) => (acc += curr), 0)

		return {
			...proposal,
			winningChoice: winningScore ? proposal.choices[proposal.scores.findIndex((x) => x === winningScore)] : '',
			winningPerc:
				totalVotes && winningScore ? `(${Number(((winningScore / totalVotes) * 100).toFixed(2))}% of votes)` : ''
		}
	})

	const activity = Object.entries(data.stats.months || {}).map(([date, values]) => ({
		date: Math.floor(new Date(date).getTime() / 1000),
		Total: values.total || 0,
		Successful: values.successful || 0
	}))

	const maxVotes = Object.entries(data.stats.months || {}).map(([date, values]) => {
		let maxVotes = 0
		values.proposals.forEach((proposal) => {
			const votes = proposals.find((p) => p.id === proposal)?.['scores_total'] ?? 0

			if (votes > maxVotes) {
				maxVotes = votes
			}
		})

		return {
			date: Math.floor(new Date(date).getTime() / 1000),
			'Max Votes': maxVotes.toFixed(2)
		}
	})

	return {
		props: {
			data: {
				...data,
				proposals,
				controversialProposals: proposals
					.sort((a, b) => (b['score_curve'] || 0) - (a['score_curve'] || 0))
					.slice(0, 10),
				activity,
				maxVotes
			},
			isOnChainGovernance: snapshotProjectId ? false : true
		},
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocol({ data, isOnChainGovernance }) {
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
		<Layout title={`${data.metadata.name} Governance - DefiLlama`} defaultSEO>
			<Wrapper>
				<Name>
					<TokenLogo logo={tokenIconUrl(data.metadata.name)} />
					<span>{data.metadata.name}</span>
				</Name>

				<LinksWrapper>
					{data.stats.chainName ? (
						<p>
							<span>Chain</span>
							<AutoRow gap="4px">
								<TokenLogo logo={chainIconUrl(data.stats.chainName)} size={32} />
								<span>{data.stats.chainName}</span>
							</AutoRow>
						</p>
					) : null}

					{data.stats.proposalsCount ? (
						<p>
							<span>Total Proposals</span>
							<span>{data.stats.proposalsCount}</span>
						</p>
					) : null}

					{data.stats.successfulProposal ? (
						<p>
							<span>Successful Proposals</span>
							<span>{data.stats.successfulProposals}</span>
						</p>
					) : null}

					{data.stats.propsalsInLast30Days ? (
						<p>
							<span>Successful Proposals in last 30 days</span>
							<span>{data.stats.propsalsInLast30Days}</span>
						</p>
					) : null}

					{data.stats.highestTotalScore ? (
						<p>
							<span>Max Total Votes</span>
							<span>{toK(data.stats.highestTotalScore)}</span>
						</p>
					) : null}

					{data.metadata.followersCount ? (
						<p>
							<span>Followers</span>
							<span>{toK(data.metadata.followersCount)}</span>
						</p>
					) : null}
				</LinksWrapper>

				<ChartsWrapper>
					<LazyChart>
						<BarChart
							title={'Activity'}
							chartData={data.activity}
							stacks={simpleStack}
							stackColors={stackedBarChartColors}
						/>
					</LazyChart>
					<LazyChart>
						<BarChart
							title={'Max Votes'}
							chartData={data.maxVotes}
							stacks={maxVotesStack}
							stackColors={stackedBarChartColors}
						/>
					</LazyChart>
				</ChartsWrapper>

				<LinksWrapper>
					{data.metadata.domain && (
						<Link href={`https://${data.metadata.domain}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Website</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.metadata.twitter && (
						<Link href={`https://twitter.com/${data.metadata.twitter}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Twitter</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.metadata.github && (
						<Link href={`https://github.com/${data.metadata.github}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>Github</span>
								<ArrowUpRight size={14} />
							</Button>
						</Link>
					)}

					{data.metadata.coingecko && (
						<Link href={`https://www.coingecko.com/en/coins/${data.metadata.coingecko}`} passHref>
							<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true}>
								<span>View on CoinGecko</span> <ArrowUpRight size={14} />
							</Button>
						</Link>
					)}
				</LinksWrapper>
			</Wrapper>

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
		</Layout>
	)
}

const Wrapper = styled(StatsSection)`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
`

const LinksWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 36px;

	p {
		display: flex;
		flex-direction: column;
		gap: 16px;

		& > *:nth-child(1) {
			font-family: var(--font-inter);
			font-weight: 600;
			font-size: 0.875rem;
			text-align: left;
			color: ${({ theme }) => (theme.mode === 'dark' ? '#a9a9a9' : '#737373')};
			margin: -2px 0;
		}

		& > *:nth-child(2) {
			font-family: var(--font-jetbrains);
			font-weight: 800;
			font-size: 2.25rem;
			margin: -10px 0;
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

const stackedBarChartColors = {
	Total: '#4f8fea',
	Successful: '#E59421',
	'Max Votes': '#4f8fea'
}

const simpleStack = {
	Total: 'stackA',
	Successful: 'stackB'
}

const maxVotesStack = {
	'Max Votes': 'maxvotes'
}

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

const formatText = (text: string, length) => (text.length > length ? text.slice(0, length + 1) + '...' : text)

function getDateRange(startDateStr) {
	const startDate = new Date(startDateStr)
	const endDate = new Date()
	const dateRange = []
	while (startDate <= endDate) {
		dateRange.push(startDate.toISOString().slice(0, 7))
		startDate.setMonth(startDate.getMonth() + 1)
	}
	return dateRange.slice(1)
}
