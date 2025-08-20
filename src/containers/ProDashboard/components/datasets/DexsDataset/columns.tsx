import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { formattedNum, formattedPercent } from '~/utils'

export const dexsDatasetColumns: ColumnDef<any>[] = [
	{
		header: 'Protocol',
		accessorKey: 'name',
		size: 280,
		enableGlobalFilter: true,
		cell: ({ row }) => {
			return (
				<div className="flex items-center gap-3">
					{row.original.logo && (
						<img
							src={row.original.logo}
							alt={row.original.name}
							className="h-7 w-7 rounded-full object-cover"
							onError={(e) => {
								e.currentTarget.style.display = 'none'
							}}
						/>
					)}
					<span className="pro-text1 font-medium">{row.original.name}</span>
				</div>
			)
		}
	},

	{
		header: '24h Change',
		accessorKey: 'change_1d',
		size: 100,
		sortUndefined: 'last',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return (
				<span className={`font-mono ${value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'pro-text2'}`}>
					{value ? formattedPercent(value, false, 100) : '-'}
				</span>
			)
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		size: 100,
		sortUndefined: 'last',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return (
				<span className={`font-mono ${value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'pro-text2'}`}>
					{value ? formattedPercent(value, false, 100) : '-'}
				</span>
			)
		}
	},
	{
		header: '24h Volume',
		accessorKey: 'total24h',
		size: 145,
		cell: ({ getValue }) => <span className="pro-text1 font-mono">{formattedNum(getValue() as number, true)}</span>
	},

	{
		header: '7d Volume',
		accessorKey: 'total7d',
		size: 120,
		cell: ({ getValue }) => <span className="pro-text2 font-mono">{formattedNum(getValue() as number, true)}</span>
	},
	{
		header: '7d Market Share',
		accessorKey: 'marketShare7d',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{formattedPercent(value, true)}</span>
		}
	},
	{
		header: '30d Volume',
		accessorKey: 'total30d',
		size: 120,
		cell: ({ getValue }) => <span className="pro-text2 font-mono">{formattedNum(getValue() as number, true)}</span>
	},
	{
		header: '% of Total',
		accessorKey: 'dominance',
		size: 100,
		cell: ({ row, table }) => {
			const total24h = table.getFilteredRowModel().rows.reduce((sum, r) => sum + (r.original.total24h || 0), 0)
			const percentage = total24h > 0 ? (row.original.total24h / total24h) * 100 : 0
			return <span className="pro-text2 font-mono">{formattedPercent(percentage)}</span>
		}
	}
]
