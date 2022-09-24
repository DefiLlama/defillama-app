import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'react-feather'
import styled from 'styled-components'
import { CustomLink } from '~/components/Link'
import { AutoRow } from '~/components/Row'
import TokenLogo from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, formattedPercent } from '~/utils'
import { formatColumnOrder } from '../utils'
import type { ICategoryRow, IChainsRow, IForksRow, IOraclesRow } from './types'

export const oraclesColumn: ColumnDef<IOraclesRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<AutoRow as="span" gap="8px">
					<span>{index + 1}</span> <CustomLink href={`/oracles/${getValue()}`}>{getValue()}</CustomLink>
				</AutoRow>
			)
		}
	},
	{
		header: 'Protocols Secured',
		accessorKey: 'protocolsSecured',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVS',
		accessorKey: 'tvs',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Excludes CeFi'
		}
	}
]

export const forksColumn: ColumnDef<IForksRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<AutoRow as="span" gap="8px">
					<span>{index + 1}</span> <CustomLink href={`/forks/${getValue()}`}>{getValue()}</CustomLink>
				</AutoRow>
			)
		}
	},
	{
		header: 'Forked Protocols',
		accessorKey: 'forkedProtocols',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Forks TVL / Original TVL',
		accessorKey: 'ftot',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value && value.toFixed(2) + '%'}</>
		},
		meta: {
			align: 'end'
		}
	}
]

export const categoriesColumn: ColumnDef<ICategoryRow>[] = [
	{
		header: 'Category',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<AutoRow as="span" gap="8px">
					<span>{index + 1}</span> <CustomLink href={`/protocols/${getValue()}`}>{getValue()}</CustomLink>
				</AutoRow>
			)
		},
		size: 180
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols'
	},
	{
		header: 'Combined TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>
	},
	{
		header: 'Description',
		accessorKey: 'description',
		enableSorting: false,
		size: 900
	}
]

export const chainsColumn: ColumnDef<IChainsRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

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
					<span>{index + 1}</span>
					<TokenLogo logo={chainIconUrl(getValue())} />
					<CustomLink href={`/chain/${getValue()}`}>{getValue()}</CustomLink>
				</Name>
			)
		},
		size: 200
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols',
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: (info) => {
			return <>{'$' + formattedNum(info.getValue())}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => {
			return <>{info.getValue() && formattedNum(info.getValue())}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
export const chainsTableColumnOrders = formatColumnOrder({
	0: ['name', 'tvl', 'change_7d', 'protocols', 'change_1d', 'change_1m', 'mcaptvl'],
	400: ['name', 'change_7d', 'tvl', 'protocols', 'change_1d', 'change_1m', 'mcaptvl'],
	600: ['name', 'protocols', 'change_7d', 'tvl', 'change_1d', 'change_1m', 'mcaptvl'],
	900: ['name', 'protocols', 'change_1d', 'change_7d', 'change_1m', 'tvl', 'mcaptvl']
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
