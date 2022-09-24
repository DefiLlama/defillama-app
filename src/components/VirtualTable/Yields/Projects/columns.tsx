import { ColumnDef } from '@tanstack/react-table'
import { formattedNum, formattedPercent } from '~/utils'
import { NameYield } from '../Name'
import type { IYieldsProjectsTableRow } from '../types'

export const columns: ColumnDef<IYieldsProjectsTableRow>[] = [
	{
		header: 'Project',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return <NameYield project={getValue() as string} projectslug={row.original.slug} />
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
			return <>{'$' + formattedNum(getValue())}</>
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
