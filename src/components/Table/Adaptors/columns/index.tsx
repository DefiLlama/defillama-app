import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'react-feather'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, formattedPercent, slug, tokenIconUrl } from '~/utils'
import { AccordionButton, Name } from '../../shared'
import { formatColumnOrder } from '../../utils'
import type { IDexsRow } from '../types'
import {
	CategoryColumn,
	ChainsColumn,
	Change1dColumn,
	Change1mColumn,
	Change7dColumn,
	DominanceColumn,
	NameColumn,
	Total24hColumn,
	VolumeTVLColumn
} from './common'

export const getColumnsByType = (type: string) => {
	switch (type) {
		case 'volumes':
			return volumesColumns
		case 'fees':
			return feesColumns
		default:
	}
}

export const volumesColumns: ColumnDef<IDexsRow>[] = [
	NameColumn('volumes'),
	ChainsColumn,
	Change1dColumn,
	Change7dColumn,
	Change1mColumn,
	Total24hColumn('volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
	VolumeTVLColumn,
	DominanceColumn
]

export const feesColumns: ColumnDef<IDexsRow>[] = [
	NameColumn('fees'),
	ChainsColumn,
	CategoryColumn,
	Total24hColumn('fees', undefined, 'Fees paid by protocol users excluding gas fees'),
	Total24hColumn('revenue', 'revenue24h', 'Fees accrued to the protocol (going to either treasury or holders)')
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
		accessorKey: 'total24h',
		enableSorting: true,
		cell: (info) => (info.getValue() ? <>${formattedNum(info.getValue())}</> : <></>),
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: "This colum shows yesterday's volume and it's updated daily at 00:00UTC"
		}
	},
	{
		header: '24h dominance',
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
	0: ['name', 'total24h', 'change_7d', 'chains', 'change_1d', 'change_1m', 'volumetvl', 'dominance'],
	900: ['name', 'chains', 'change_1d', 'change_7d', 'change_1m', 'total24h', 'volumetvl', 'dominance']
})

export const columnSizes = {
	0: {
		name: 140,
		chains: 140,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		total24h: 140,
		volumetvl: 140,
		dominance: 140
	},
	600: {
		name: 200,
		chains: 120,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		total24h: 140,
		volumetvl: 140,
		dominance: 140
	},
	900: {
		name: 240,
		chains: 140,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		total24h: 140,
		volumetvl: 140,
		dominance: 140
	}
}
