import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'react-feather'
import styled from 'styled-components'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { formattedNum, formattedPercent, slug, tokenIconUrl } from '~/utils'
import { formatColumnOrder } from '../utils'
import type { IDexsRow } from './types'

export const dexsColumn: ColumnDef<IDexsRow>[] = [
	{
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue() as string

			const splittedName = value.split(' - ')
			const name = splittedName.length > 1 ? splittedName.slice(0, splittedName.length - 1).join('') : value

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
					<TokenLogo logo={tokenIconUrl(name)} data-logo />
					<CustomLink href={`/dex/${slug(name)}`}>{`${value}`}</CustomLink>
				</Name>
			)
		},
		size: 260
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => <IconsRow links={info.getValue() as Array<string>} url="/yields?chain" iconType="chain" />,
		meta: {
			align: 'end'
		},
		size: 140
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
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h volume',
		accessorKey: 'totalVolume24h',
		enableSorting: true,
		cell: (info) => <>{formattedNum(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: "This colum shows yesterday's volume and it's updated daily at 00:00UTC"
		}
	},
	{
		header: 'Volume/TVL',
		accessorKey: 'volumetvl',
		enableSorting: true,
		cell: (info) => <>{formattedNum(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '% of total',
		accessorKey: 'dominance',
		enableSorting: true,
		cell: (info) => <>{formattedPercent(info.getValue(), true, 400)}</>,
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

interface INameProps {
	depth?: number
}

const Name = styled.span<INameProps>`
	display: flex;
	align-items: center;
	gap: 8px;
	padding-left: ${({ depth }) => (depth ? depth * 48 : 24)}px;
	position: relative;

	a {
		overflow: hidden;
		text-overflow: ellipsis;
		whitespace: nowrap;
	}

	& > *[data-logo] {
		display: none;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		& > *[data-logo] {
			display: flex;
		}
	}
`

const AccordionButton = styled.button`
	position: absolute;
	left: -8px;
`
