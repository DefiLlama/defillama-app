import * as React from 'react'
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
import { VirtualTable } from '~/components/Table/Table'
import { formatGovernanceData } from '~/api/categories/protocols'

import { fetchJson } from '~/utils/async'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'

export function GovernanceTable({ data, governanceType }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'start', desc: true }])
	const [filterControversialProposals, setFilterProposals] = React.useState(false)

	const instance = useReactTable({
		data: filterControversialProposals ? data.controversialProposals : data.proposals,
		columns:
			governanceType === 'compound'
				? proposalsCompoundColumns
				: governanceType === 'snapshot'
				? proposalsSnapshotColumns
				: proposalsTallyColumns,
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
		<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
			<div className="flex items-center gap-2 flex-wrap justify-end p-3">
				<h1 className="text-xl font-semibold mr-auto">Proposals</h1>
				<Switch
					label="Filter Controversial Proposals"
					value="controversial proposals"
					checked={filterControversialProposals}
					onChange={() => setFilterProposals(!filterControversialProposals)}
				/>
				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search proposals...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
					/>
					<input
						name="search"
						value={proposalname}
						onChange={(e) => {
							setProposalName(e.target.value)
						}}
						placeholder="Search proposals..."
						className="border border-(--form-control-border) w-full p-1 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

export const fetchAndFormatGovernanceData = async (
	apis: Array<string> | null
): Promise<
	Array<{
		proposals: {
			winningChoice: string
			winningPerc: string
			scores: number[]
			choices: string[]
			id: string
		}[]
		controversialProposals: {
			winningChoice: string
			winningPerc: string
			scores: number[]
			choices: string[]
			id: string
		}[]
		activity: {
			date: number
			Total: number
			Successful: number
		}[]
		maxVotes: {
			date: number
			'Max Votes': string
		}[]
	}>
> => {
	if (!apis) return null

	const data = await Promise.allSettled(
		apis.map((gapi) =>
			fetchJson(gapi).then((data) => {
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
	)

	return data.map((item) => (item.status === 'fulfilled' ? item.value : null)).filter((item) => !!item)
}

export function GovernanceData({ apis = [] }: { apis: Array<string> }) {
	const [apiCategoryIndex, setApiCategoryIndex] = React.useState<number>(0)

	const { data, isLoading } = useQuery({
		queryKey: [JSON.stringify(apis)],
		queryFn: () => fetchAndFormatGovernanceData(apis),
		staleTime: 60 * 60 * 1000
	})

	if (isLoading) {
		return <p className="my-[180px] text-center">Loading...</p>
	}

	const apisByCategory = apis.map((apiUrl) =>
		apiUrl.includes('governance-cache/snapshot')
			? 'Snapshot'
			: apiUrl.includes('governance-cache/compound')
			? 'Compound'
			: 'Tally'
	)

	return data && data.length > 0 ? (
		<div className="flex flex-col">
			{apisByCategory.length > 1 ? (
				<div className="p-4">
					<div className="ml-auto text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--btn-hover-bg)">
						{apisByCategory.map((apiCat, index) => (
							<button
								key={apiCat + 'governance-table-filter'}
								onClick={() => setApiCategoryIndex(index)}
								data-active={apiCategoryIndex === index}
								className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--btn-hover-bg)"
							>
								{apiCat}
							</button>
						))}
					</div>
				</div>
			) : null}

			<GovernanceTable
				data={data[apiCategoryIndex]}
				governanceType={
					apis[apiCategoryIndex].includes('governance-cache/snapshot')
						? 'snapshot'
						: apis[apiCategoryIndex].includes('governance-cache/compound')
						? 'compound'
						: 'tally'
				}
			/>
		</div>
	) : null
}

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
			<span
				data-isactive={info.getValue() === 0 ? false : true}
				className="text-(--pct-red) data-[isactive=true]:text-(--pct-green)"
			>
				{info.getValue() === 0 ? 'Closed' : 'Active'}
			</span>
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

const proposalsTallyColumns: ColumnDef<IProposal>[] = [
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

const formatText = (text: string, length) => (text.length > length ? text.slice(0, length + 1) + '...' : text)
