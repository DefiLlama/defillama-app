import {
	type CellContext,
	type ColumnFiltersState,
	createColumnHelper,
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

const TitleCell = ({ info }: { info: CellContext<GovernanceProposal, string> }) => {
	const title = formatText(String(info.getValue()), 40)
	if (!info.row.original.link) return <>{title}</>
	return (
		<a href={info.row.original.link} target="_blank" rel="noopener noreferrer">
			{title}
		</a>
	)
}

const ControversyCell = ({ info }: { info: CellContext<GovernanceProposal, number | null | undefined> }) => {
	const value = info.getValue()
	if (value == null) return ''
	const numericValue = Number(value)
	return <>{Number.isFinite(numericValue) ? numericValue.toFixed(2) : ''}</>
}

const DateCell = ({ info }: { info: CellContext<GovernanceProposal, number | null | undefined> }) => {
	const value = info.getValue()
	if (value == null) return ''
	const timestamp = Number(value)
	return <>{Number.isFinite(timestamp) ? toNiceDayMonthAndYear(timestamp) : ''}</>
}

const columnHelper = createColumnHelper<GovernanceProposal>()

const proposalsCompoundColumns = [
	columnHelper.accessor('title', {
		header: 'Title',
		enableSorting: false,
		cell: (info) => <TitleCell info={info} />,
		size: 360
	}),
	columnHelper.accessor('start', {
		header: 'Start',
		cell: (info) => <DateCell info={info} />,
		size: 120,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('end', {
		header: 'End',
		cell: (info) => <DateCell info={info} />,
		size: 120,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('state', {
		header: 'State',
		cell: (info) => String(info.getValue() ?? ''),
		size: 90,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('scores_total', {
		header: 'Votes',
		cell: (info) => formattedNum(info.getValue()),
		size: 110,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('score_curve', {
		header: 'Controversy',
		cell: (info) => <ControversyCell info={info} />,
		size: 130,
		meta: { align: 'end', headerHelperText: 'It is calculated by number of votes * how close result is to 50%' }
	})
]

const proposalsSnapshotColumns = [
	columnHelper.accessor('title', {
		header: 'Title',
		enableSorting: false,
		cell: (info) => <TitleCell info={info} />,
		size: 360
	}),
	columnHelper.accessor('start', {
		header: 'Start',
		cell: (info) => <DateCell info={info} />,
		size: 120,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('end', {
		header: 'End',
		cell: (info) => <DateCell info={info} />,
		size: 120,
		meta: { align: 'end' }
	}),
	columnHelper.accessor((row) => (row.state === 'closed' ? 0 : 1), {
		id: 'state',
		header: 'State',
		cell: (info) => (
			<span data-isactive={info.getValue() !== 0} className="text-(--error) data-[isactive=true]:text-(--success)">
				{info.getValue() === 0 ? 'Closed' : 'Active'}
			</span>
		),
		size: 90,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('scores_total', {
		header: 'Votes',
		cell: (info) => formattedNum(info.getValue()),
		size: 110,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('winningChoice', {
		header: 'Winning Choice',
		cell: (info) => {
			const choice = info.getValue() ?? ''
			const winningPerc = info.row.original.winningPerc ?? ''
			const text = `${formatText(String(choice), 20)}${winningPerc ? ` ${winningPerc}` : ''}`.trim()
			return text || '-'
		},
		enableSorting: false,
		size: 180,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('score_curve', {
		header: 'Controversy',
		cell: (info) => <ControversyCell info={info} />,
		size: 130,
		meta: { align: 'end', headerHelperText: 'It is calculated by number of votes * how close result is to 50%' }
	}),
	columnHelper.accessor('discussion', {
		header: 'Discussion',
		enableSorting: false,
		cell: (info) =>
			info.getValue() ? (
				<a href={String(info.getValue())} target="_blank" rel="noopener noreferrer">
					View
				</a>
			) : null,
		size: 110,
		meta: { align: 'end' }
	})
]

const proposalsTallyColumns = [
	columnHelper.accessor('title', {
		header: 'Title',
		enableSorting: false,
		cell: (info) => <TitleCell info={info} />,
		size: 360
	}),
	columnHelper.accessor('start', {
		header: 'Start',
		cell: (info) => <DateCell info={info} />,
		size: 120,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('end', {
		header: 'End',
		cell: (info) => <DateCell info={info} />,
		size: 120,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('state', {
		header: 'State',
		cell: (info) => String(info.getValue() ?? ''),
		size: 90,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('scores_total', {
		header: 'Votes',
		cell: (info) => formattedNum(info.getValue()),
		size: 110,
		meta: { align: 'end' }
	}),
	columnHelper.accessor('score_curve', {
		header: 'Controversy',
		cell: (info) => <ControversyCell info={info} />,
		size: 130,
		meta: { align: 'end', headerHelperText: 'It is calculated by number of votes * how close result is to 50%' }
	})
]

const formatText = (text: string, length: number) => {
	if (!text) return ''
	return text.length > length ? text.slice(0, length + 1) + '...' : text
}
