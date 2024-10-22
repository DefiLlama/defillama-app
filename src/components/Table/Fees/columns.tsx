import { ColumnDef } from '@tanstack/react-table'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, slug, tokenIconUrl } from '~/utils'
import { AccordionButton, Name } from '../shared'
import { formatColumnOrder } from '../utils'
import type { IFeesRow } from './types'
import { Icon } from '~/components/Icon'

export const feesColumn: ColumnDef<IFeesRow>[] = [
	{
		header: () => <Name>Name</Name>,
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
				<Name depth={row.depth}>
					{row.subRows?.length > 0 && (
						<AccordionButton
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<Icon name="chevron-down" height={16} width={16} />
							) : (
								<Icon name="chevron-right" height={16} width={16} />
							)}
						</AccordionButton>
					)}
					<span>{index + 1}</span>
					<TokenLogo logo={logo} />
					<CustomLink href={`/fees/${slug(mappedValue as string)}`}>{`${name}${symbol}`}</CustomLink>
				</Name>
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
