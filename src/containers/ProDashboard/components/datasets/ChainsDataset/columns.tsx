import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, formattedPercent } from '~/utils'

export const chainsDatasetColumns: ColumnDef<any>[] = [
	{
		header: 'Chain',
		accessorKey: 'name',
		size: 200,
		enableGlobalFilter: true,
		cell: ({ row }) => {
			return (
				<div className="flex items-center gap-2">
					<TokenLogo logo={chainIconUrl(row.original.name)} size={24} />
					<span className="pro-text1 font-medium">{row.original.name}</span>
				</div>
			)
		}
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols',
		size: 100,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text1 font-mono">{value || 0}</span>
		}
	},
	{
		header: 'Active Addresses',
		accessorKey: 'users',
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text1 font-mono">{value ? formattedNum(value) : ''}</span>
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		size: 90,
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
		size: 90,
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
		header: '1m Change',
		accessorKey: 'change_1m',
		size: 90,
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
		header: 'DeFi TVL',
		accessorKey: 'tvl',
		size: 140,
		cell: ({ getValue }) => <span className="pro-text1 font-mono">{formattedNum(getValue() as number, true)}</span>
	},
	{
		header: 'Bridged TVL',
		accessorKey: 'bridgedTvl',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: 'Stables',
		accessorKey: 'stablesMcap',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '24h DEXs Volume',
		accessorKey: 'totalVolume24h',
		size: 150,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '30d DEXs Volume',
		accessorKey: 'totalVolume30d',
		size: 150,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '24h Chain Fees',
		accessorKey: 'totalFees24h',
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '30d Chain Fees',
		accessorKey: 'totalFees30d',
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '24h App Revenue',
		accessorKey: 'totalAppRevenue24h',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '30d App Revenue',
		accessorKey: 'totalAppRevenue30d',
		size: 140,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '30d Chain Revenue',
		accessorKey: 'totalRevenue30d',
		size: 140,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: 'Mcap / DeFi TVL',
		accessorKey: 'mcaptvl',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? value.toFixed(2) : '-'}</span>
		}
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		size: 140,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: 'NFT Volume',
		accessorKey: 'nftVolume',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="pro-text2 font-mono">{value ? formattedNum(value, true) : '-'}</span>
		}
	}
]
