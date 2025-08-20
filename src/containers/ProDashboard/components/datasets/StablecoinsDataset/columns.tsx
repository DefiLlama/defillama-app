import { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, formattedPercent, peggedAssetIconUrl } from '~/utils'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

interface IPeggedAssetRow {
	name: string
	symbol: string
	mcap: number
	price: number
	change_1d: number
	change_7d: number
	change_1m: number
	pegDeviation?: number
	chains: string[]
	pegType?: string
	gecko_id?: string
}

export const stablecoinsDatasetColumns: ColumnDef<IPeggedAssetRow>[] = [
	{
		header: 'Name',
		id: 'name',
		accessorFn: (row) => row.name,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			// Use row.index which is already calculated by tanstack table
			const index = row.index
			const name = getValue() as string
			const symbol = row.original.symbol

			return (
				<span className="relative flex items-center gap-2 pl-6">
					<span className="shrink-0">{index + 1}</span>
					<TokenLogo logo={peggedAssetIconUrl(name)} data-lgonly />
					<BasicLink
						href={`/stablecoins/${row.original.gecko_id || name}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
						{symbol && symbol !== '-' && <span className="text-(--text-tertiary)"> ({symbol})</span>}
					</BasicLink>
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Price',
		accessorKey: 'price',
		cell: ({ getValue, row }) => {
			const value = getValue() as number
			const pegDeviation = row.original.pegDeviation

			return (
				<span className="flex items-center gap-1">
					{pegDeviation && Math.abs(pegDeviation) >= 0.5 && (
						<Tooltip content={`${pegDeviation > 0 ? '+' : ''}${pegDeviation.toFixed(2)}% from peg`}>
							<Icon
								name="alert-triangle"
								height={14}
								width={14}
								className={pegDeviation > 0 ? 'text-(--success)' : 'text-(--error)'}
							/>
						</Tooltip>
					)}
					<span>${value?.toFixed(4) || '0.0000'}</span>
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{formattedNum(value, true)}</>
		},
		size: 145,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return (
				<span className={`font-mono ${value < 0 ? 'text-(--error)' : 'text-(--success)'}`}>
					{formattedPercent(value)}
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return (
				<span className={`font-mono ${value < 0 ? 'text-(--error)' : 'text-(--success)'}`}>
					{formattedPercent(value)}
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return (
				<span className={`font-mono ${value < 0 ? 'text-(--error)' : 'text-(--success)'}`}>
					{formattedPercent(value)}
				</span>
			)
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		cell: ({ getValue }) => {
			const chains = getValue() as string[]
			const displayChains = chains.slice(0, 3)
			const remainingCount = chains.length - 3

			return (
				<Tooltip content={chains.join(', ')}>
					<span className="text-sm text-(--text-secondary)">
						{displayChains.join(', ')}
						{remainingCount > 0 && ` +${remainingCount}`}
					</span>
				</Tooltip>
			)
		},
		size: 200,
		enableSorting: false
	}
]
