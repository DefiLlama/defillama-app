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
					<span className="font-medium pro-text1">{row.original.name}</span>
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
			return <span className="font-mono pro-text1">{value || 0}</span>
		}
	},
	{
		header: 'Active Addresses',
		accessorKey: 'users',
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="font-mono pro-text1">{value ? formattedNum(value) : '0'}</span>
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
		cell: ({ getValue }) => <span className="font-mono pro-text1">{formattedNum(getValue() as number, true)}</span>
	},
	{
		header: 'Stables',
		accessorKey: 'stablesMcap',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="font-mono pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '24h DEXs Volume',
		accessorKey: 'totalVolume24h',
		size: 150,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="font-mono pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '24h Chain Fees',
		accessorKey: 'totalFees24h',
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="font-mono pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: '24h App Revenue',
		accessorKey: 'totalAppRevenue24h',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="font-mono pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	},
	{
		header: 'Mcap / DeFi TVL',
		accessorKey: 'mcaptvl',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="font-mono pro-text2">{value ? value.toFixed(2) : '-'}</span>
		}
	},
	{
		header: 'NFT Volume',
		accessorKey: 'nftVolume',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="font-mono pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}
]
