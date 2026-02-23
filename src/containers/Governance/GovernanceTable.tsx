import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { formattedNum, toNiceDayMonthAndYear } from '~/utils'
import type { GovernanceProposal, GovernanceType } from './types'

export function GovernanceTable({
	data,
	governanceType,
	filters = null
}: {
	data: { proposals: GovernanceProposal[]; controversialProposals: GovernanceProposal[] }
	governanceType: GovernanceType
	filters?: React.ReactNode
}) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'start', desc: true }])
	const [filterControversialProposals, setFilterProposals] = React.useState(false)

	const instance = useReactTable({
		data: filterControversialProposals ? (data.controversialProposals ?? []) : (data.proposals ?? []),
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
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [_proposalname, setProposalName] = useTableSearch({ instance, columnToSearch: 'title' })

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
						onInput={(e) => setProposalName(e.currentTarget.value)}
						placeholder="Search proposals..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				{filters}
				<Switch
					label="Filter Controversial Proposals"
					value="controversial proposals"
					checked={filterControversialProposals}
					onChange={() => React.startTransition(() => setFilterProposals(!filterControversialProposals))}
				/>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

const TitleCell = ({ info }: { info: { row: { original: GovernanceProposal }; getValue: () => unknown } }) => {
	const title = formatText(String(info.getValue()), 40)
	if (!info.row.original.link) return <>{title}</>
	return (
		<a href={info.row.original.link} target="_blank" rel="noopener noreferrer">
			{title}
		</a>
	)
}

const ControversyCell = ({ info }: { info: { getValue: () => unknown } }) => {
	const value = info.getValue()
	const numericValue = Number(value)
	return <>{Number.isFinite(numericValue) ? numericValue.toFixed(2) : ''}</>
}

const DateCell = ({ info }: { info: { getValue: () => unknown } }) => {
	const timestamp = Number(info.getValue())
	return <>{Number.isFinite(timestamp) ? toNiceDayMonthAndYear(timestamp) : ''}</>
}

const proposalsCompoundColumns: ColumnDef<GovernanceProposal>[] = [
	{
		header: 'Title',
		accessorKey: 'title',
		enableSorting: false,
		cell: (info) => <TitleCell info={info} />
	},
	{
		header: 'Start',
		accessorKey: 'start',
		cell: (info) => <DateCell info={info} />,
		meta: { align: 'end' }
	},
	{
		header: 'End',
		accessorKey: 'end',
		cell: (info) => <DateCell info={info} />,
		meta: { align: 'end' }
	},
	{
		header: 'State',
		accessorKey: 'state',
		cell: (info) => String(info.getValue() ?? ''),
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
		cell: (info) => <ControversyCell info={info} />,
		meta: { align: 'end', headerHelperText: 'It is calculated by number of votes * how close result is to 50%' }
	}
]

const proposalsSnapshotColumns: ColumnDef<GovernanceProposal>[] = [
	{
		header: 'Title',
		accessorKey: 'title',
		enableSorting: false,
		cell: (info) => <TitleCell info={info} />
	},
	{
		header: 'Start',
		accessorKey: 'start',
		cell: (info) => <DateCell info={info} />,
		meta: { align: 'end' }
	},
	{
		header: 'End',
		accessorKey: 'end',
		cell: (info) => <DateCell info={info} />,
		meta: { align: 'end' }
	},
	{
		header: 'State',
		id: 'state',
		accessorFn: (row) => (row.state === 'closed' ? 0 : 1),
		cell: (info) => (
			<span data-isactive={info.getValue() !== 0} className="text-(--error) data-[isactive=true]:text-(--success)">
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
		cell: (info) => {
			const choice = info.getValue() ?? ''
			const winningPerc = info.row.original.winningPerc ?? ''
			const text = `${formatText(String(choice), 20)}${winningPerc ? ` ${winningPerc}` : ''}`.trim()
			return text || '-'
		},
		enableSorting: false,
		meta: { align: 'end' }
	},
	{
		header: 'Controversy',
		accessorKey: 'score_curve',
		cell: (info) => <ControversyCell info={info} />,
		meta: { align: 'end', headerHelperText: 'It is calculated by number of votes * how close result is to 50%' }
	},
	{
		header: 'Discussion',
		accessorKey: 'discussion',
		enableSorting: false,
		cell: (info) =>
			info.getValue() ? (
				<a href={String(info.getValue())} target="_blank" rel="noopener noreferrer">
					View
				</a>
			) : null,
		meta: { align: 'end' }
	}
]

const proposalsTallyColumns: ColumnDef<GovernanceProposal>[] = [
	{
		header: 'Title',
		accessorKey: 'title',
		enableSorting: false,
		cell: (info) => <TitleCell info={info} />
	},
	{
		header: 'Start',
		accessorKey: 'start',
		cell: (info) => <DateCell info={info} />,
		meta: { align: 'end' }
	},
	{
		header: 'End',
		accessorKey: 'end',
		cell: (info) => <DateCell info={info} />,
		meta: { align: 'end' }
	},
	{
		header: 'State',
		accessorKey: 'state',
		cell: (info) => String(info.getValue() ?? ''),
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
		cell: (info) => <ControversyCell info={info} />,
		meta: { align: 'end', headerHelperText: 'It is calculated by number of votes * how close result is to 50%' }
	}
]

const formatText = (text: string, length: number) => {
	if (!text) return ''
	return text.length > length ? text.slice(0, length + 1) + '...' : text
}
