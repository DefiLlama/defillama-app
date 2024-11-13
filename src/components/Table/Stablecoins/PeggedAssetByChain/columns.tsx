import { ColumnDef } from '@tanstack/react-table'
import { CustomLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Name } from '../../shared'
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
		size: 145,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Circulating',
		accessorKey: 'circulating',
		cell: (info) => <>{formattedNum(info.getValue())}</>,
		size: 145,
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
		bridgedAmount: 145,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		circulating: 145
	},
	900: {
		name: 280,
		bridgeInfo: 240,
		bridgedAmount: 145,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		circulating: 145
	}
}
