import {
	createColumnHelper,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { PercentChange } from '~/components/PercentChange'
import { VirtualTable } from '~/components/Table/Table'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum } from '~/utils'
import { YieldsProject } from './Name'
import type { IYieldsProjectsTableRow } from './types'

const columnHelper = createColumnHelper<IYieldsProjectsTableRow>()

const columns = [
	columnHelper.accessor('name', {
		header: 'Project',
		enableSorting: false,
		cell: (info) => <YieldsProject project={info.getValue()} projectslug={info.getValue()} />,
		size: 220
	}),
	columnHelper.accessor('airdrop', {
		header: 'Airdrop',
		cell: ({ getValue }) => {
			if (!getValue()) {
				return null
			}
			return (
				<Tooltip
					content="This project has no token and might airdrop one to depositors in the future"
					className="ml-auto"
				>
					🪂
				</Tooltip>
			)
		},
		meta: {
			align: 'end'
		},
		size: 90
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		meta: {
			align: 'end'
		},
		size: 140
	}),
	columnHelper.accessor('protocols', {
		header: 'Pools',
		meta: {
			align: 'end'
		},
		size: 90
	}),
	columnHelper.accessor((row) => row.tvl ?? undefined, {
		id: 'tvl',
		header: 'Combined TVL',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			align: 'end'
		},
		size: 120
	}),
	columnHelper.accessor('audits', {
		header: 'Audits',
		cell: (info) => (info.getValue() ? 'Yes' : 'No'),
		meta: {
			align: 'end'
		},
		size: 90
	}),
	columnHelper.accessor((row) => row.medianApy ?? undefined, {
		id: 'medianApy',
		header: 'Median APY',
		cell: (info) => <PercentChange percent={info.getValue()} noSign />,
		meta: {
			align: 'end'
		},
		size: 120
	})
]

export function YieldsProjectsTable({ data }: { data: Array<IYieldsProjectsTableRow> }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'tvl', desc: true }])

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}
