import { createColumnHelper } from '@tanstack/react-table'
import { PercentChange } from '~/components/PercentChange'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'

export interface ChainsDatasetRow {
	name: string
	protocols?: number
	users?: number
	change_1d?: number
	change_7d?: number
	change_1m?: number
	tvl?: number
	bridgedTvl?: number
	stablesMcap?: number
	totalVolume24h?: number
	totalVolume30d?: number
	totalFees24h?: number
	totalFees30d?: number
	totalAppRevenue24h?: number
	totalAppRevenue30d?: number
	totalRevenue30d?: number
	mcaptvl?: number
	mcap?: number
	nftVolume?: number
}

const columnHelper = createColumnHelper<ChainsDatasetRow>()

export const chainsDatasetColumns = [
	columnHelper.accessor('name', {
		header: 'Chain',
		size: 200,
		enableGlobalFilter: true,
		cell: ({ row }) => {
			return (
				<div className="flex items-center gap-2">
					<TokenLogo name={row.original.name} kind="chain" alt={`Logo of ${row.original.name}`} size={24} />
					<span className="font-medium pro-text1">{row.original.name}</span>
				</div>
			)
		}
	}),
	columnHelper.accessor('protocols', {
		header: 'Protocols',
		size: 100,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text1">{value || 0}</span>
		}
	}),
	columnHelper.accessor('users', {
		header: 'Active Addresses',
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text1">{value ? formattedNum(value) : ''}</span>
		}
	}),
	columnHelper.accessor('change_1d', {
		header: '1d Change',
		size: 90,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className={`${value > 0 ? 'text-(--success)' : value < 0 ? 'text-(--error)' : 'pro-text2'}`}>
					{value ? <PercentChange percent={value} fontWeight={100} /> : '-'}
				</span>
			)
		}
	}),
	columnHelper.accessor('change_7d', {
		header: '7d Change',
		size: 90,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className={`${value > 0 ? 'text-(--success)' : value < 0 ? 'text-(--error)' : 'pro-text2'}`}>
					{value ? <PercentChange percent={value} fontWeight={100} /> : '-'}
				</span>
			)
		}
	}),
	columnHelper.accessor('change_1m', {
		header: '1m Change',
		size: 90,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className={`${value > 0 ? 'text-(--success)' : value < 0 ? 'text-(--error)' : 'pro-text2'}`}>
					{value ? <PercentChange percent={value} fontWeight={100} /> : '-'}
				</span>
			)
		}
	}),
	columnHelper.accessor('tvl', {
		header: 'DeFi TVL',
		size: 140,
		cell: ({ getValue }) => <span className="pro-text1">{formattedNum(getValue(), true)}</span>
	}),
	columnHelper.accessor('bridgedTvl', {
		header: 'Bridged TVL',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('stablesMcap', {
		header: 'Stables',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('totalVolume24h', {
		header: '24h DEXs Volume',
		size: 150,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('totalVolume30d', {
		header: '30d DEXs Volume',
		size: 150,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('totalFees24h', {
		header: '24h Chain Fees',
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('totalFees30d', {
		header: '30d Chain Fees',
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('totalAppRevenue24h', {
		header: '24h App Revenue',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('totalAppRevenue30d', {
		header: '30d App Revenue',
		size: 140,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('totalRevenue30d', {
		header: '30d Chain Revenue',
		size: 140,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('mcaptvl', {
		header: 'Mcap / DeFi TVL',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? value.toFixed(2) : '-'}</span>
		}
	}),
	columnHelper.accessor('mcap', {
		header: 'Market Cap',
		size: 140,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	}),
	columnHelper.accessor('nftVolume', {
		header: 'NFT Volume',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue()
			return <span className="pro-text2">{value ? formattedNum(value, true) : '-'}</span>
		}
	})
]
