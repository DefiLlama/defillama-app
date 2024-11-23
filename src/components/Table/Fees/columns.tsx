import { ColumnDef } from '@tanstack/react-table'
import { CustomLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, slug, tokenIconUrl } from '~/utils'
import { formatColumnOrder } from '../utils'
import type { IFeesRow } from './types'
import { Icon } from '~/components/Icon'

export const feesColumn: ColumnDef<IFeesRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const itemType = row.original.logo ? 'fees' : 'chain'
			const mappedValue = getValue() === 'AAVE V2' ? 'AAVE' : getValue()
			const logo = itemType === 'fees' ? tokenIconUrl(mappedValue) : chainIconUrl(mappedValue)
			const symbol = row.original.symbol !== '-' && !row.original.version ? ` (${row.original.symbol})` : ''
			const name = row.original.version ? `${mappedValue} ${row.original.version}` : `${mappedValue}`
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 && (
						<button
							className="absolute -left-[2px]"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							)}
						</button>
					)}
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={logo} />
					<CustomLink
						href={`/fees/${slug(mappedValue as string)}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>{`${name}${symbol}`}</CustomLink>
				</span>
			)
		},
		size: 200
	},
	{
		header: 'Category',
		accessorKey: 'category',
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Fees (24h)',
		accessorKey: 'total1dFees',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Fees paid by protocol users (excluding gas fees)'
		}
	},
	{
		header: 'Revenue (24h)',
		accessorKey: 'total1dRevenue',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Fees accrued to the protocol (going to either treasury or holders)'
		}
	}
]

// key: min width of window/screen
// values: table columns order
export const feesTableColumnOrders = formatColumnOrder({
	0: ['name', 'total1dFees', 'category', 'total1dRevenue', 'change_1d', 'change_1m', 'mcaptvl'],
	400: ['name', 'category', 'total1dFees', 'total1dRevenue', 'change_1d', 'change_1m', 'mcaptvl']
})
