import { ColumnDef } from '@tanstack/react-table'
import type { INftMarketplace } from '../types'
import { formattedPercent } from '~/utils'
import TokenLogo from '~/components/TokenLogo'
import { Name } from '../../shared'

export const columns: ColumnDef<INftMarketplace>[] = [
	{
		header: 'Name',
		accessorKey: 'exchangeName',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			const name = getValue()
			const icon = row.original.exchangeName.toLowerCase().replace(' aggregator', '').replace(' ', '-')

			return (
				<Name>
					<span>{index + 1}</span> <TokenLogo logo={`https://icons.llamao.fi/icons/protocols/${icon}`} data-lgonly />
					{name}
				</Name>
			)
		},
		size: 280
	},
	{
		header: 'Volume change',
		accessorKey: 'weeklyChange',
		size: 160,
		cell: (info) => <>{info.getValue() ? formattedPercent(info.getValue()) : null}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Change of last 7d volume over the previous 7d volume'
		}
	},
	{
		header: 'Volume 1d',
		accessorKey: '1DayVolume',
		size: 130,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + ' ETH' : ''}</>,
		meta: {
			align: 'end',
			headerHelperText: '24h rolling volume'
		}
	},
	{
		header: 'Volume 7d',
		accessorKey: '7DayVolume',
		size: 130,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + ' ETH' : ''}</>,
		meta: {
			align: 'end',
			headerHelperText: '7day rolling volume'
		}
	},
	{
		header: 'Market Share',
		accessorKey: 'pctOfTotal',
		size: 150,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + '%' : null}</>,
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
	},
	{
		header: '% Wash Volume 7d',
		accessorKey: 'washVolume7DPct',
		size: 190,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + '%' : null}</>,
		meta: {
			align: 'end',
			headerHelperText:
				'% of inorganic trades relative to organic ones over last 7days rolling. All our values are exclusive of wash trades'
		}
	}
]
