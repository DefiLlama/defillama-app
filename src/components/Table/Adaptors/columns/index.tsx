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
	TotalAllTimeColumn,
	VolumeTVLColumn
} from './common'

export const getColumnsByType = (type: string, allChains?: boolean) => {
	switch (type) {
		case 'volumes':
			return volumesColumns(allChains)
		case 'fees':
			return feesColumns(allChains)
		case 'incentives':
			return incentivesColumns(allChains)
		case 'options':
			return optionsColumns(allChains)
		case 'aggregators':
			return aggregatorsColumns(allChains)
		default:
			return volumesColumns(allChains)
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
			return {
				order: volumesTableColumnOrders,
				size: volumesColumnSizes
			}
	}
}

export const volumesColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('volumes'),
		ChainsColumn('volumes'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
		TotalAllTimeColumn('volume'),
		allChains ? undefined : VolumeTVLColumn,
		DominanceColumn
	].filter((c) => c !== undefined)

export const optionsColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('options'),
		ChainsColumn('options'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
		TotalAllTimeColumn('volume'),
		allChains ? undefined : VolumeTVLColumn,
		DominanceColumn
	].filter((c) => c !== undefined)

export const aggregatorsColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('aggregators'),
		ChainsColumn('aggregators'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
		TotalAllTimeColumn('volume'),
		allChains ? undefined : VolumeTVLColumn,
		DominanceColumn
	].filter((c) => c !== undefined)

export const incentivesColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('incentives'),
		ChainsColumn('incentives'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('incentives', undefined, `Yesterday's volume, updated daily at 00:00UTC`)
	].filter((c) => c !== undefined)

export const feesColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('fees'),
		ChainsColumn('fees'),
		CategoryColumn,
		Total24hColumn('fees', undefined, 'Fees paid by protocol users excluding gas fees'),
		Total24hColumn('revenue', 'revenue24h', 'Fees accrued to the protocol (going to either treasury or holders)'),
		TotalAllTimeColumn('fees')
	].filter((c) => c !== undefined)

// key: min width of window/screen
// values: table columns order
export const volumesTableColumnOrders = formatColumnOrder({
	0: [
		'displayName',
		'name',
		'total24h',
		'change_7d',
		'chains',
		'change_1d',
		'change_1m',
		'totalAllTime',
		'volumetvl',
		'dominance'
	],
	900: [
		'displayName',
		'name',
		'chains',
		'change_1d',
		'change_7d',
		'change_1m',
		'total24h',
		'totalAllTime',
		'volumetvl',
		'dominance'
	]
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
		'totalAllTime',
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
		'totalAllTime',
		'mcaptvl'
	]
})
