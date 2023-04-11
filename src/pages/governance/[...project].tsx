import { maxAgeForNext } from '~/api'
import { Button, ChartsWrapper, LazyChart, Name } from '~/layout/ProtocolAndPool'
import * as React from 'react'
import Layout from '~/layout'
import styled from 'styled-components'
import { StatsSection } from '~/layout/Stats/Medium'
import TokenLogo from '~/components/TokenLogo'
import { standardizeProtocolName, toNiceDayMonthAndYear, tokenIconUrl, formattedNum, chainIconUrl } from '~/utils'
import {
	GOVERNANCE_API,
	ONCHAIN_GOVERNANCE_API,
	PROTOCOL_GOVERNANCE_API,
	PROTOCOL_ONCHAIN_GOVERNANCE_API
} from '~/constants'
import Link from 'next/link'
import { ArrowUpRight } from 'react-feather'
import { Stat } from '~/layout/Stats/Large'
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
import { SearchIcon, SearchWrapper, TableHeaderAndSearch } from '~/components/Table/shared'
import dynamic from 'next/dynamic'
import { IBarChartProps } from '~/components/ECharts/types'
import { AutoRow } from '~/components/Row'

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

	const proposals = Object.values(data.proposals).map((proposal) => {
		const winningScore = proposal.scores.sort((a, b) => b - a)[0]
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

	console.log({ data })

	const instance = useReactTable({
		data: data.proposals,
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
					{data.stats.chainName && (
						<Stat>
							<span>Chain</span>
							<AutoRow gap="4px">
								<TokenLogo logo={chainIconUrl(data.stats.chainName)} size={32} />
								<span>{data.stats.chainName}</span>
							</AutoRow>
						</Stat>
					)}

					{data.stats.proposalsCount && (
						<Stat>
							<span>Total Proposals</span>
							<span>{data.stats.proposalsCount}</span>
						</Stat>
					)}

					{data.stats.successfulProposal && (
						<Stat>
							<span>Successful Proposals</span>
							<span>{data.stats.successfulProposals}</span>
						</Stat>
					)}

					{data.stats.propsalsInLast30Days && (
						<Stat>
							<span>Successful Proposals in last 30 days</span>
							<span>{data.stats.propsalsInLast30Days}</span>
						</Stat>
					)}

					{data.stats.highestTotalScore && (
						<Stat>
							<span>Max Total Votes</span>
							<span>{data.stats.highestTotalScore.toFixed(0)}</span>
						</Stat>
					)}

					{data.metadata.followersCount && (
						<Stat>
							<span>Followers</span>
							<span>{data.metadata.followersCount}</span>
						</Stat>
					)}
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

			<TableHeaderAndSearch>
				<Header>Proposals</Header>

				<SearchWrapper>
					<SearchIcon size={16} />

					<input
						value={proposalname}
						onChange={(e) => {
							setProposalName(e.target.value)
						}}
						placeholder="Search proposals..."
					/>
				</SearchWrapper>
			</TableHeaderAndSearch>

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
	button,
	a {
		height: fit-content;
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

		meta: { align: 'end' }
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

		meta: { align: 'end' }
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

const formatText = (text: string, length) => (text.length > length ? text.slice(0, length + 1) + '...' : text)
