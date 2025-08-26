import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
	ColumnDef,
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { formatGovernanceData } from '~/api/categories/protocols'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { VirtualTable } from '~/components/Table/Table'
import { TagGroup } from '~/components/TagGroup'
import { formattedNum, toNiceDayMonthAndYear } from '~/utils'
import { fetchJson } from '~/utils/async'

export function GovernanceTable({ data, governanceType, filters = null }) {
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
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search proposals...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={proposalname}
						onChange={(e) => {
							setProposalName(e.target.value)
						}}
						placeholder="Search proposals..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 py-[2px] pl-7 text-base text-black dark:bg-black dark:text-white"
					/>
				</label>
				{filters}
				<Switch
					label="Filter Controversial Proposals"
					value="controversial proposals"
					checked={filterControversialProposals}
					onChange={() => setFilterProposals(!filterControversialProposals)}
				/>
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

	const { finalData, governanceType } = React.useMemo(() => {
		if (!data || data.length === 0) {
			return { finalData: {}, governanceType: null }
		}
		return {
			finalData: data[apiCategoryIndex],
			governanceType: apis[apiCategoryIndex].includes('governance-cache/snapshot')
				? 'snapshot'
				: apis[apiCategoryIndex].includes('governance-cache/compound')
					? 'compound'
					: 'tally'
		}
	}, [data, apiCategoryIndex, apis])

	if (isLoading) {
		return (
			<p className="flex min-h-[360px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 text-center">
				Loading...
			</p>
		)
	}

	const apisByCategory = apis.map((apiUrl) =>
		apiUrl.includes('governance-cache/snapshot')
			? 'Snapshot'
			: apiUrl.includes('governance-cache/compound')
				? 'Compound'
				: 'Tally'
	)

	if (!data || data.length === 0) {
		return (
			<p className="flex min-h-[360px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 text-center">
				No data found
			</p>
		)
	}

	return (
		<div className="flex flex-col">
			<GovernanceTable
				data={finalData}
				governanceType={governanceType}
				filters={
					apisByCategory.length > 1 ? (
						<TagGroup
							selectedValue={apisByCategory[apiCategoryIndex]}
							setValue={(value) => setApiCategoryIndex(apisByCategory.indexOf(value as any))}
							values={apisByCategory}
							className="ml-auto"
						/>
					) : null
				}
			/>
		</div>
	)
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
				className="text-(--error) data-[isactive=true]:text-(--success)"
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
