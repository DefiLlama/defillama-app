import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'react-feather'
import styled from 'styled-components'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, tokenIconUrl } from '~/utils'
import { formatColumnOrder } from '../utils'
import type { IFeesRow } from './types'

export const feesColumn: ColumnDef<IFeesRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const itemType = row.original.logo ? 'fees' : 'chain'
			const mappedValue = getValue() === 'AAVE V2' ? 'AAVE' : getValue()
			const logo = itemType === 'fees' ? tokenIconUrl(mappedValue) : chainIconUrl(mappedValue)
			const symbol = row.original.symbol !== '-' && !row.original.version ? ` (${row.original.symbol})` : ''
			const name = row.original.version ? `${mappedValue} ${row.original.version}` : `${mappedValue}`

			return (
				<Name depth={row.depth}>
					{row.subRows?.length > 0 && (
						<AccordionButton
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						</AccordionButton>
					)}
					<span>{row.index + 1}</span>
					<TokenLogo logo={logo} />
					<CustomLink href={`/fees/${mappedValue}`}>{`${name}${symbol}`}</CustomLink>
				</Name>
			)
		},
		size: 200
	},
	{
		header: 'Category',
		accessorKey: 'category',
		enableSorting: false,
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

interface INameProps {
	depth?: number
}

const Name = styled.span<INameProps>`
	display: flex;
	align-items: center;
	gap: 8px;
	padding-left: ${({ depth }) => (depth ? depth * 48 : 24)}px;
	position: relative;
`

const AccordionButton = styled.button`
	position: absolute;
	left: -8px;
`
