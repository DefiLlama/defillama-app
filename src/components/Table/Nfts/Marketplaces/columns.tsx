import { ColumnDef } from '@tanstack/react-table'
import type { INftMarketplace } from '../types'

export const columns: ColumnDef<INftMarketplace>[] = [
	{
		header: 'Name',
		accessorKey: 'exchangeName',
		enableSorting: false,
		size: 200
	},
	{
		header: 'Volume 1d',
		accessorKey: '1DayVolume',
		size: 120,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + ' ETH' : ''}</>,

		meta: {
			align: 'end'
		}
	},
	{
		header: 'Volume 7d',
		accessorKey: '7DayVolume',
		size: 120,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + ' ETH' : ''}</>,

		meta: {
			align: 'end'
		}
	},
	{
		header: 'Volume 30d',
		accessorKey: '30DayVolume',
		size: 120,
		cell: (info) => <>{info.getValue() ? (+info.getValue()).toFixed(2) + ' ETH' : ''}</>,

		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Trades',
		accessorKey: '1DayNbTrades',
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Trades',
		accessorKey: '7DayNbTrades',
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '30d Trades',
		accessorKey: '30DayNbTrades',
		size: 120,
		meta: {
			align: 'end'
		}
	}
]
