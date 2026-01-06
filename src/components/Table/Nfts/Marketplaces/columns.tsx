import { ColumnDef } from '@tanstack/react-table'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedPercent } from '~/utils'
import type { INftMarketplace } from '../types'

export const columns: ColumnDef<INftMarketplace>[] = [
	{
		id: 'rank',
		header: 'Rank',
		accessorKey: 'rank',
		size: 60,
		enableSorting: false,
		cell: ({ row }) => {
			return <span className="font-bold">{row.index + 1}</span>
		},
		meta: {
			align: 'center' as const
		}
	},
	{
		header: 'Name',
		accessorKey: 'exchangeName',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const name = getValue()
			const icon = row.original.exchangeName.toLowerCase().replace(' aggregator', '').replace(' ', '-')

			return (
				<span className="flex items-center gap-2">
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
