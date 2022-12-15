import { ColumnDef } from '@tanstack/react-table'
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
		case 'dexs':
			return volumesColumns(allChains)
		case 'fees':
			return feesColumns(allChains)
		case 'incentives':
			return incentivesColumns(allChains)
		case 'options':
			return optionsColumns(allChains)
		case 'aggregators':
			return aggregatorsColumns(allChains)
		case 'derivatives':
			return derivativesColumns(allChains)
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
				size: feesColumnSizes
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
		NameColumn('dexs', allChains),
		allChains ? undefined : ChainsColumn('dexs'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('Volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
		TotalAllTimeColumn('volume'),
		allChains ? undefined : VolumeTVLColumn,
		DominanceColumn
	].filter((c) => c !== undefined)

export const derivativesColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('derivatives', allChains),
		allChains ? undefined : ChainsColumn('derivatives'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('Volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
		TotalAllTimeColumn('volume'),
		allChains ? undefined : VolumeTVLColumn,
		DominanceColumn
	].filter((c) => c !== undefined)

export const optionsColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('options', allChains),
		allChains ? undefined : ChainsColumn('options'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('Volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
		TotalAllTimeColumn('volume'),
		allChains ? undefined : VolumeTVLColumn,
		DominanceColumn
	].filter((c) => c !== undefined)

export const aggregatorsColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('aggregators', allChains),
		allChains ? undefined : ChainsColumn('aggregators'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('Volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
		TotalAllTimeColumn('volume'),
		DominanceColumn
	].filter((c) => c !== undefined)

export const incentivesColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('incentives', allChains),
		allChains ? undefined : ChainsColumn('incentives'),
		Change1dColumn,
		Change7dColumn,
		Change1mColumn,
		Total24hColumn('Incentives', undefined, `Yesterday's volume, updated daily at 00:00UTC`)
	].filter((c) => c !== undefined)

export const feesColumns = (allChains?: boolean): ColumnDef<IDexsRow>[] =>
	[
		NameColumn('fees', allChains),
		allChains ? undefined : ChainsColumn('fees'),
		allChains ? undefined : CategoryColumn,
		Total24hColumn('Fees', undefined, 'Fees paid by protocol users excluding gas fees', 140),
		allChains ? undefined : Total24hColumn('Earnings', 'revenue24h', 'Fees accrued to the protocol', 140),
		// TotalAllTimeColumn('fees') tmp
		// Total24hColumn('User fees', 'dailyUserFees', undefined, 150),
		// Total24hColumn('Holders revenue', 'dailyHoldersRevenue', undefined, 190),
		// Total24hColumn('Creator revenue', 'dailyCreatorRevenue', undefined, 190),
		// Total24hColumn('Supply side revenue', 'dailySupplySideRevenue', undefined, 220),
		// Total24hColumn('Protocol revenue', 'dailyProtocolRevenue', undefined, 190)
		// Total24hColumn('Total fees', 'dailyTotalFees', undefined, 220),
		// Total24hColumn('Total revenue', 'dailyTotalRevenue', undefined, 220)
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
		total24h: 160,
		volumetvl: 140,
		dominance: 140
	},
	600: {
		name: 200,
		chains: 120,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		total24h: 160,
		volumetvl: 140,
		dominance: 140
	},
	900: {
		name: 240,
		chains: 140,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		total24h: 160,
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
		'total24h',
		'revenue24h',
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
		'total24h',
		'revenue24h',
		'totalAllTime',
		'mcaptvl'
	]
})

export const feesColumnSizes = {
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
