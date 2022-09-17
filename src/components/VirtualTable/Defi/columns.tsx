import { ColumnDef } from '@tanstack/react-table'
import { CustomLink } from '~/components/Link'
import { AutoRow } from '~/components/Row'
import { formattedNum } from '~/utils'
import type { ICategoryRow, IForksRow, IOraclesRow } from './types'

export const oraclesColumn: ColumnDef<IOraclesRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<AutoRow as="span" gap="8px">
					<span>{row.index + 1}</span> <CustomLink href={`/oracles/${getValue()}`}>{getValue()}</CustomLink>
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
		cell: ({ getValue, row }) => {
			return (
				<AutoRow as="span" gap="8px">
					<span>{row.index + 1}</span> <CustomLink href={`/forks/${getValue()}`}>{getValue()}</CustomLink>
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
		cell: ({ getValue, row }) => {
			return (
				<AutoRow as="span" gap="8px">
					<span>{row.index + 1}</span> <CustomLink href={`/protocols/${getValue()}`}>{getValue()}</CustomLink>
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
