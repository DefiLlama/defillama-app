import { ColumnDef } from '@tanstack/react-table'
import { CustomLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, formattedPercent } from '~/utils'
import { Name, AccordionButton } from '../../shared'
import type { IPeggedChain } from './types'
import { Icon } from '~/components/Icon'

export const peggedChainsColumn: ColumnDef<IPeggedChain>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const isSubRow = value.startsWith('Bridged from')

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
							<span>{index + 1}</span>
							<span>{value}</span>
						</>
					) : (
						<>
							<span>{index + 1}</span>
							<TokenLogo logo={chainIconUrl(value)} data-lgonly />
							<CustomLink href={`/stablecoins/${value}`}>{value}</CustomLink>
						</>
					)}
				</Name>
			)
		},
		size: 200
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables Mcap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Dominant Stablecoin',
		accessorKey: 'dominance',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as IPeggedChain['dominance']

			if (!value) {
				return null
			}

			return (
				<div className="w-full flex items-center justify-end gap-1">
					<span>{`${value.name}: `}</span>
					<span>{formattedPercent(value.value, true)}</span>
				</div>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Mcap Issued On',
		accessorKey: 'minted',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 180,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Mcap Bridged To',
		accessorKey: 'bridgedTo',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 180,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: ({ getValue }) => <>{getValue() && formattedNum(getValue(), false)}</>,
		size: 160,
		meta: {
			align: 'end'
		}
	}
]
