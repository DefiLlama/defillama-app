import {
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedPercent } from '~/utils'

interface INftMarketplace {
	exchangeName: string
	'1DayVolume': string
	'7DayVolume': string
	'30DayVolume': string
	'1DaySales': string
	'1DayNbTrades': string
	'7DayNbTrades': string
	'30DayNbTrades': string
	pctOfTotal: string
	weeklyChange: string
}

const columns: ColumnDef<INftMarketplace>[] = [
	{
		header: 'Name',
		accessorKey: 'exchangeName',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const name = getValue()
			const icon = row.original.exchangeName.toLowerCase().replace(' aggregator', '').replace(' ', '-')

			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={`https://icons.llamao.fi/icons/protocols/${icon}`} data-lgonly />
					<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{name as string}</span>
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Volume change',
		accessorKey: 'weeklyChange',
		size: 160,
		cell: (info) => <>{info.getValue() != null ? formattedPercent(info.getValue()) : null}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Change of last 7d volume over the previous 7d volume'
		}
	},
	{
		header: 'Volume 1d',
		accessorKey: '1DayVolume',
		size: 130,
		cell: (info) => (
			<>
				{info.getValue() != null ? (
					<span className="flex flex-nowrap items-center justify-end gap-1">
						<span>{(+info.getValue()).toFixed(2)}</span>
						<svg fill="#777E91" height={12} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 9">
							<path d="M5.56641 4.55935L2.76099 0L0 4.56239L2.78244 6.22185L5.56641 4.55935Z"></path>
							<path d="M5.56641 5.11627L2.77631 6.74082L0 5.11627L2.78244 8.99999L5.56641 5.11627Z"></path>
						</svg>
					</span>
				) : (
					''
				)}
			</>
		),
		meta: {
			align: 'end',
			headerHelperText: '24h rolling volume'
		}
	},
	{
		header: 'Volume 7d',
		accessorKey: '7DayVolume',
		size: 130,
		cell: (info) => (
			<>
				{info.getValue() != null ? (
					<span className="flex flex-nowrap items-center justify-end gap-1">
						<span>{(+info.getValue()).toFixed(2)}</span>
						<svg fill="#777E91" height={12} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 9">
							<path d="M5.56641 4.55935L2.76099 0L0 4.56239L2.78244 6.22185L5.56641 4.55935Z"></path>
							<path d="M5.56641 5.11627L2.77631 6.74082L0 5.11627L2.78244 8.99999L5.56641 5.11627Z"></path>
						</svg>
					</span>
				) : (
					''
				)}
			</>
		),
		meta: {
			align: 'end',
			headerHelperText: '7day rolling volume'
		}
	},
	{
		header: 'Market Share',
		accessorKey: 'pctOfTotal',
		size: 150,
		cell: (info) => <>{info.getValue() != null ? (+info.getValue()).toFixed(2) + '%' : null}</>,
		meta: {
			align: 'end',
			headerHelperText: 'based on Volume 1d'
		}
	},
	{
		header: 'Trades 1d',
		accessorKey: '1DayNbTrades',
		size: 130,
		meta: {
			align: 'end',
			headerHelperText: '24h rolling trades'
		}
	},
	{
		header: 'Trades 7d',
		accessorKey: '7DayNbTrades',
		size: 130,
		meta: {
			align: 'end',
			headerHelperText: '7day rolling trades'
		}
	}
]

export function NftsMarketplaceTable({ data }: { data: Array<INftMarketplace> }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: '1DayVolume', desc: true }])

	const instance = useReactTable({
		data,
		columns,
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
		getFilteredRowModel: getFilteredRowModel()
	})

	const [marketplaceName, setMarketplaceName] = useTableSearch({ instance, columnToSearch: 'exchangeName' })

	return (
		<>
			<div className="relative ml-auto w-full sm:max-w-[280px]">
				<Icon
					name="search"
					height={16}
					width={16}
					className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
				/>
				<input
					value={marketplaceName}
					onChange={(e) => {
						setMarketplaceName(e.target.value)
					}}
					placeholder="Search marketplace..."
					className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
				/>
			</div>
			<VirtualTable instance={instance} />
		</>
	)
}
