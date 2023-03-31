import { ColumnDef } from '@tanstack/react-table'
import type { INftMarketplace } from '../types'
import { formattedPercent } from '~/utils'

export const columns: ColumnDef<INftMarketplace>[] = [
	{
		header: 'Name',
		accessorKey: 'exchangeName',
		enableSorting: false,
		size: 200
	},
	{
		header: 'Weekly change',
		accessorKey: 'weeklyChange',
		size: 120,
		cell: (info) => <>{info.getValue() ? formattedPercent(info.getValue()) : null}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Change of last 7d volume over the previous 7d volume'
		}
	},
	{
		header: 'Volume 1d',
		accessorKey: '1DayVolume',
		size: 120,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + ' ETH' : ''}</>,
		meta: {
			align: 'end',
			headerHelperText: '24h rolling volume'
		}
	},
	{
		header: 'Volume 7d',
		accessorKey: '7DayVolume',
		size: 120,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + ' ETH' : ''}</>,
		meta: {
			align: 'end',
			headerHelperText: '7day rolling volume'
		}
	},
	{
		header: '% of total',
		accessorKey: 'pctOfTotal',
		size: 120,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + '%' : null}</>,
		meta: {
			align: 'end',
			headerHelperText: 'based on Volume 1d'
		}
	},
	{
		header: 'Trades 1d',
		accessorKey: '1DayNbTrades',
		size: 120,
		meta: {
			align: 'end'
		}
	}
]
