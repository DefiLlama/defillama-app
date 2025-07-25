import { SortingState, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import { VirtualTable } from '~/components/Table/Table'
import type { IYieldsProjectsTableRow } from './types'

import { ColumnDef } from '@tanstack/react-table'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, formattedPercent } from '~/utils'
import { YieldsProject } from './Name'

const columns: ColumnDef<IYieldsProjectsTableRow>[] = [
	{
		header: 'Project',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <YieldsProject project={getValue() as string} projectslug={getValue() as string} />
		}
	},
	{
		header: 'Airdrop',
		accessorKey: 'airdrop',
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
	},
	{
		header: 'Category',
		accessorKey: 'category',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Pools',
		accessorKey: 'protocols',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Combined TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => {
			return <>{formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Audits',
		accessorKey: 'audits',
		cell: ({ getValue }) => {
			return <>{getValue() ? 'Yes' : 'No'}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Median APY',
		accessorKey: 'medianApy',
		cell: ({ getValue }) => {
			return <>{formattedPercent(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		}
	}
]

export function YieldsProjectsTable({ data }: { data: Array<IYieldsProjectsTableRow> }) {
	const [sorting, setSorting] = React.useState<SortingState>([])

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}
