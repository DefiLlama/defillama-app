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
		cell: (info) => <YieldsProject project={info.getValue()} projectslug={info.getValue()} />
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
		}
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('protocols', {
		header: 'Pools',
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.tvl ?? undefined, {
		id: 'tvl',
		header: 'Combined TVL',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('audits', {
		header: 'Audits',
		cell: (info) => (info.getValue() ? 'Yes' : 'No'),
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => row.medianApy ?? undefined, {
		id: 'medianApy',
		header: 'Median APY',
		cell: (info) => <PercentChange percent={info.getValue()} noSign />,
		meta: {
			align: 'end'
		}
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
