import { ColumnDef } from '@tanstack/react-table'
import { TokenLogo } from '~/components/TokenLogo'
import { BasicLink } from '~/components/Link'
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
			header: 'Protocol',
			accessorKey: 'name',
			enableSorting: false,
			cell: ({ getValue, row, table }) => {
				const value = getValue() as string
				const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

				return (
					<div className="flex items-center gap-2">
						<span className="shrink-0 text-(--text-tertiary) min-w-[30px] text-sm font-medium">{index + 1}</span>
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
				return <span className="text-xs text-(--text-primary) font-medium">{value || 'Unknown'}</span>
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
