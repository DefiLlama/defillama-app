import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, formattedPercent, slug, tokenIconUrl } from '~/utils'
import { AccordionButton, Name } from '../shared'
import { formatColumnOrder } from '../utils'
import type { IDexsRow } from './types'
import { Icon } from '~/components/Icon'

export const dexsColumn: ColumnDef<IDexsRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const splittedName = value.split(' - ')
			const name = splittedName.length > 1 ? splittedName.slice(0, splittedName.length - 1).join('') : value
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
					<TokenLogo logo={tokenIconUrl(name)} data-lgonly />
					<CustomLink href={`/dex/${slug(name)}`}>{`${value}`}</CustomLink>
				</Name>
			)
		},
		size: 240
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => <IconsRow links={info.getValue() as Array<string>} url="/dexs" iconType="chain" />,
		meta: {
			align: 'end'
		},
		size: 140
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h volume',
		accessorKey: 'totalVolume24h',
		enableSorting: true,
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: "This column shows yesterday's volume and it's updated daily at 00:00UTC"
		}
	},
	{
		header: 'Volume/TVL',
		accessorKey: 'volumetvl',
		enableSorting: true,
		cell: (info) => <>{formattedNum(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'This ratio can be interpreted as capital efficiency'
		}
	},
	{
		header: '% of total',
		accessorKey: 'dominance',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue(), true)}</>,
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: '% of the 24h total volume'
		}
	}
]

export const volumesByChainsColumns: ColumnDef<IDexsRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<Name>
					<span>{index + 1}</span>
					<TokenLogo logo={chainIconUrl(value)} data-lgonly />
					<CustomLink href={`/dexs/${slug(value)}`}>{`${value}`}</CustomLink>
				</Name>
			)
		},
		size: 240
	},
	{
		header: '1d Change',
		accessorKey: 'changeVolume1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'changeVolume7d',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'changeVolume30d',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h volume',
		accessorKey: 'totalVolume',
		enableSorting: true,
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: "This column shows yesterday's volume and it's updated daily at 00:00UTC"
		}
	},
	{
		header: '24h dominance',
		accessorKey: 'dominance',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue(), true)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
export const dexsTableColumnOrders = formatColumnOrder({
	0: ['name', 'totalVolume24h', 'change_7d', 'chains', 'change_1d', 'change_1m', 'volumetvl', 'dominance'],
	900: ['name', 'chains', 'change_1d', 'change_7d', 'change_1m', 'totalVolume24h', 'volumetvl', 'dominance']
})

export const columnSizes = {
	0: {
		name: 140,
		chains: 140,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		totalVolume24h: 140,
		volumetvl: 140,
		dominance: 140
	},
	600: {
		name: 200,
		chains: 120,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		totalVolume24h: 140,
		volumetvl: 140,
		dominance: 140
	},
	900: {
		name: 240,
		chains: 140,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		totalVolume24h: 140,
		volumetvl: 140,
		dominance: 140
	}
}
