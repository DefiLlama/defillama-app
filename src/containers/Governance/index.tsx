import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { capitalizeFirstLetter, slug, tokenIconUrl } from '~/utils'

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
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowCanExpand: () => true
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<h1 className="mr-auto text-xl font-semibold">Governance Proposals by Project</h1>
				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search projects...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} renderSubComponent={renderSubComponent} />
		</div>
	)
}

const RenderSubComponent = ({ row }) => {
	const subRowEntries = Object.entries(row.original.subRowData)

	return (
		<span className="flex flex-col gap-1 pl-[72px]">
			{subRowEntries.map(([type, value]) => (
				<span key={row.original.name + type + value}>{capitalizeFirstLetter(type) + ' Proposals : ' + value}</span>
			))}
		</span>
	)
}

const renderSubComponent = ({ row }) => <RenderSubComponent row={row} />

interface IGovernance {
	name: string
	proposalsCount: string
	followersCount: string
	strategyCount: string
	states: {
		active?: number
		closed?: number
	}
	months: {
		[month: string]: { proposals: Array<string>; states: { active?: number; closed?: number } }
	}
	propsalsInLast30Days: number
	successfulPropsalsInLast30Days: number
}

const governanceColumns: ColumnDef<IGovernance>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />
					<BasicLink
						href={`/governance/${slug(getValue() as string)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue() as string}
					</BasicLink>
				</span>
			)
		},
		size: 220
	},
	{
		header: 'Proposals',
		accessorKey: 'proposalsCount',
		size: 100,
		meta: { align: 'end' }
	},
	{
		accessorKey: 'successfulProposals',
		header: 'Successful Proposals',
		size: 180,
		meta: { align: 'end' }
	},
	{
		header: 'Proposals in last 30 days',
		accessorKey: 'propsalsInLast30Days',
		size: 200,
		meta: { align: 'end' }
	},
	{
		header: 'Successful Proposals in last 30 days',
		accessorKey: 'successfulPropsalsInLast30Days',
		size: 280,
		meta: { align: 'end' }
	}
]
