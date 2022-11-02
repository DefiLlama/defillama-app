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

export const getColumnsOrdernSizeByType = (type: string) => {
	switch (type) {
		case 'volumes':
			return {
				order: volumesTableColumnOrders,
				size: volumesColumnSizes
			}
		case 'fees':
			return {
				order: feesTableColumnOrders,
				size: volumesColumnSizes
			}
		default:
	}
}

export const volumesColumns: ColumnDef<IDexsRow>[] = [
	NameColumn('volumes'),
	ChainsColumn('volumes'),
	Change1dColumn,
	Change7dColumn,
	Change1mColumn,
	Total24hColumn('volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
	VolumeTVLColumn,
	DominanceColumn
]

export const feesColumns: ColumnDef<IDexsRow>[] = [
	NameColumn('fees'),
	ChainsColumn('fees'),
	CategoryColumn,
	Total24hColumn('fees', undefined, 'Fees paid by protocol users excluding gas fees'),
	Total24hColumn('revenue', 'revenue24h', 'Fees accrued to the protocol (going to either treasury or holders)')
]

// key: min width of window/screen
// values: table columns order
export const volumesTableColumnOrders = formatColumnOrder({
	0: ['displayName', 'name', 'total24h', 'change_7d', 'chains', 'change_1d', 'change_1m', 'volumetvl', 'dominance'],
	900: ['displayName', 'name', 'chains', 'change_1d', 'change_7d', 'change_1m', 'total24h', 'volumetvl', 'dominance']
})

export const volumesColumnSizes = {
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

// key: min width of window/screen
// values: table columns order
export const feesTableColumnOrders = formatColumnOrder({
	0: [
		'displayName',
		'name',
		'chains',
		'total1dFees',
		'category',
		'total1dRevenue',
		'change_1d',
		'change_1m',
		'mcaptvl'
	],
	400: [
		'displayName',
		'name',
		'chains',
		'category',
		'total1dFees',
		'total1dRevenue',
		'change_1d',
		'change_1m',
		'mcaptvl'
	]
})
