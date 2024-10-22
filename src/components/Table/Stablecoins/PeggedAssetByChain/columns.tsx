import { ColumnDef } from '@tanstack/react-table'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { AccordionButton, Name } from '../../shared'
import { chainIconUrl, formattedNum, formattedPercent } from '~/utils'
import { formatColumnOrder } from '../../utils'
import type { IPeggedAssetByChainRow } from './types'
import { Icon } from '~/components/Icon'

export const peggedAssetByChainColumn: ColumnDef<IPeggedAssetByChainRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const isSubRow = value.startsWith('Bridged from')
			const symbol = row.original.symbol && row.original.symbol !== '-' ? ` (${row.original.symbol})` : ''

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

					{isSubRow ? (
						<>
							<span>-</span>
							<span>{value}</span>
						</>
					) : (
						<>
							<span>{index + 1}</span>
							<TokenLogo logo={chainIconUrl(value)} data-lgonly />
							<CustomLink href={`/stablecoins/${value}`}>{value + symbol}</CustomLink>
						</>
					)}
				</Name>
			)
		},
		size: 280
	},
	{
		header: 'Bridge',
		accessorKey: 'bridgeInfo',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as IPeggedAssetByChainRow['bridgeInfo']
			return <>{value.link ? <CustomLink href={value.link}>{value.name}</CustomLink> : <span>{value.name}</span>}</>
		},
		size: 240,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Bridged Amount',
		accessorKey: 'bridgedAmount',
		size: 140,
		meta: {
			align: 'end'
		}
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
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Circulating',
		accessorKey: 'circulating',
		cell: (info) => <>{formattedNum(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
export const assetByChainColumnOrders = formatColumnOrder({
	0: ['name', 'change_7d', 'circulating', 'change_1d', 'change_1m', 'bridgeInfo', 'bridgedAmount'],
	480: ['name', 'change_7d', 'circulating', 'change_1d', 'change_1m', 'bridgeInfo', 'bridgedAmount'],
	1024: ['name', 'bridgeInfo', 'bridgedAmount', 'change_1d', 'change_7d', 'change_1m', 'circulating']
})

export const columnSizes = {
	0: {
		name: 160,
		bridgeInfo: 240,
		bridgedAmount: 140,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		circulating: 100
	},
	900: {
		name: 280,
		bridgeInfo: 240,
		bridgedAmount: 140,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		circulating: 140
	}
}
