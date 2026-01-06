import { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, slug, tokenIconUrl } from '~/utils'

interface TokenUsageRow {
	name: string
	category: string
	amountUsd: number
	amountUsdByChain?: Record<string, number>
	logo?: string
	misrepresentedTokens?: boolean
	tokens?: Record<string, number>
}

export const getColumns = (tokenSymbols: string[]): ColumnDef<TokenUsageRow>[] => {
	const isMultiToken = tokenSymbols.length > 1

	const baseColumns: ColumnDef<TokenUsageRow>[] = [
		{
			id: 'rank',
			header: 'Rank',
			accessorKey: 'rank',
			size: 60,
			enableSorting: false,
			cell: ({ row }) => {
				const index = row.index
				return <span className="font-bold">{index + 1}</span>
			},
			meta: {
				align: 'center' as const
			}
		},
		{
			header: 'Protocol',
			accessorKey: 'name',
			enableSorting: false,
			cell: ({ getValue, row }) => {
				const value = getValue() as string

				return (
					<div className="flex items-center gap-2">
						<TokenLogo logo={tokenIconUrl(value)} data-lgonly />
						<BasicLink
							href={`/protocol/${slug(value)}`}
							className="text-sm font-medium text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>
					</div>
				)
			}
		},
		{
			header: 'Category',
			accessorKey: 'category',
			enableSorting: false,
			cell: ({ getValue }) => {
				const value = getValue() as string
				return <span className="text-xs font-medium text-(--text-primary)">{value || 'Unknown'}</span>
			}
		}
	]

	if (isMultiToken) {
		tokenSymbols.forEach((symbol) => {
			baseColumns.push({
				header: symbol.toUpperCase(),
				accessorFn: (row) => row.tokens?.[symbol] || 0,
				cell: ({ getValue }) => {
					const value = getValue() as number
					return value > 0 ? (
						<span className="text-sm font-medium">{formattedNum(value, true)}</span>
					) : (
						<span className="text-sm text-(--text-tertiary)">-</span>
					)
				},
				meta: {
					align: 'end'
				}
			})
		})
	}

	baseColumns.push({
		header: isMultiToken ? 'Total Amount' : 'Token Amount',
		accessorKey: 'amountUsd',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <span className="text-sm font-semibold">{formattedNum(value, true)}</span>
		},
		meta: {
			align: 'end'
		}
	})

	return baseColumns
}
