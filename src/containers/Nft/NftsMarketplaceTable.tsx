import {
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { renderPercentChange } from '~/utils'

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

const EthIcon = () => (
	<svg fill="#777E91" height={12} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 9">
		<path d="M5.56641 4.55935L2.76099 0L0 4.56239L2.78244 6.22185L5.56641 4.55935Z"></path>
		<path d="M5.56641 5.11627L2.77631 6.74082L0 5.11627L2.78244 8.99999L5.56641 5.11627Z"></path>
	</svg>
)

const EthVolumeCell = ({ value }: { value: unknown }) => {
	const numericValue = Number(value)
	if (!Number.isFinite(numericValue)) return null

	return (
		<span className="flex flex-nowrap items-center justify-end gap-1">
			<span>{numericValue.toFixed(2)}</span>
			<EthIcon />
		</span>
	)
}

const columns: ColumnDef<INftMarketplace>[] = [
	{
		header: 'Name',
		accessorKey: 'exchangeName',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const name = String(getValue())
			const icon = row.original.exchangeName.toLowerCase().replace(' aggregator', '').replace(' ', '-')

			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={`https://icons.llamao.fi/icons/protocols/${icon}`} data-lgonly />
					<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{name}</span>
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Volume change',
		accessorKey: 'weeklyChange',
		size: 160,
		cell: (info) => <>{info.getValue() != null ? renderPercentChange(info.getValue()) : null}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Change of last 7d volume over the previous 7d volume'
		}
	},
	{
		header: 'Volume 1d',
		accessorKey: '1DayVolume',
		size: 130,
		cell: (info) => <EthVolumeCell value={info.getValue()} />,
		meta: {
			align: 'end',
			headerHelperText: '24h rolling volume'
		}
	},
	{
		header: 'Volume 7d',
		accessorKey: '7DayVolume',
		size: 130,
		cell: (info) => <EthVolumeCell value={info.getValue()} />,
		meta: {
			align: 'end',
			headerHelperText: '7day rolling volume'
		}
	},
	{
		header: 'Market Share',
		accessorKey: 'pctOfTotal',
		size: 150,
		cell: (info) => {
			const numericValue = Number(info.getValue())
			return <>{Number.isFinite(numericValue) ? numericValue.toFixed(2) + '%' : null}</>
		},
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
			<label className="relative ml-auto w-full sm:max-w-[280px]">
				<span className="sr-only">Search marketplaces</span>
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
			</label>
			<VirtualTable instance={instance} />
		</>
	)
}
