import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'react-feather'
import { CustomLink } from '~/components/Link'
import { AutoRow } from '~/components/Row'
import TokenLogo from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, formattedPercent } from '~/utils'
import { Name, AccordionButton } from '../../shared'
import type { IPeggedChain } from './types'

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
							{row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
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
				<>
					{
						<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
							<span>{`${value.name}: `}</span>
							<span>{formattedPercent(value.value, true)}</span>
						</AutoRow>
					}
				</>
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
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Mcap Bridged To',
		accessorKey: 'bridgedTo',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: ({ getValue }) => <>{getValue() && formattedNum(getValue(), false)}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	}
]
