import { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, formattedPercent, slug, tokenIconUrl } from '~/utils'

interface IRevenueRow {
	name: string
	displayName?: string
	logo: string
	slug: string
	category: string
	total24h: number
	total7d: number
	total30d: number
	total1y: number
	change_1d: number
	change_7d: number
	change_1m: number
	chains: string[]
}

export const revenueDatasetColumns: ColumnDef<IRevenueRow>[] = [
	{
		header: 'Name',
		id: 'name',
		accessorFn: (row) => row.displayName || row.name,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const index = row.index
			const name = getValue() as string
			return (
				<span className="flex items-center gap-2 relative pl-6">
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo size={20} logo={tokenIconUrl(slug(name))} data-lgonly />
					<BasicLink
						href={`/revenue/${row.original.slug}`}
						className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis"
					>
						{name}
					</BasicLink>
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Category',
		accessorKey: 'category',
		cell: ({ getValue }) => {
			const value = getValue() as string
			return <span className="text-sm text-[var(--text2)]">{value || '-'}</span>
		},
		size: 120
	},
	{
		header: '24h Revenue',
		accessorKey: 'total24h',
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
		header: '7d Revenue',
		accessorKey: 'total7d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{formattedNum(value, true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '30d Revenue',
		accessorKey: 'total30d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{formattedNum(value, true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
]
