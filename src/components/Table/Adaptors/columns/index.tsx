import { ColumnDef } from '@tanstack/react-table'
import { formatColumnOrder } from '../../utils'
import type { IDexsRow } from '../types'
import {
	CategoryColumn,
	ChainsColumn,
	Change1dColumn,
	Change1mColumn,
	Change7dColumn,
	ChangeColumn,
	DominanceColumn,
	NameColumn,
	Total24hColumn,
	TotalAllTimeColumn,
	TVLColumn,
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
		// Change1dColumn,
		// Change7dColumn,
		// Change1mColumn,
		ChangeColumn('Weekly change', 'change_7dover7d', 160, 'Change of last 7d volume over the previous 7d volume'),
		Total24hColumn('Volume', undefined, `Yesterday's volume, updated daily at 00:00UTC`),
		Total24hColumn('Volume', 'total7d', `Cumulative last 7d volume`, undefined, 'Volume (7d)'),
		TVLColumn,
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
		Total24hColumn('Fees', undefined, undefined, 140),
		Total24hColumn('Fees', 'total7d', `Cumulative last 7d fees`, undefined, 'Fees (7d)'),
		Total24hColumn('Fees', 'total30d', `Cumulative last 30d fees`, undefined, 'Fees (30d)'),
		allChains ? undefined : Total24hColumn('Revenue', 'revenue24h', undefined, 160),
		allChains ? undefined : Total24hColumn('Revenue', 'revenue7d', `Cumulative last 7d revenue`, 150, 'Revenue (7d)'),
		allChains ? undefined : Total24hColumn('Fees', 'revenue30d', `Cumulative last 30d revenue`, 160, 'Revenue (30d)'),
		// TotalAllTimeColumn('fees') tmp
		allChains ? undefined : Total24hColumn('User fees', 'dailyUserFees', undefined, 150),
		allChains ? undefined : Total24hColumn('Treasury revenue', 'dailyProtocolRevenue', undefined, 190),
		allChains ? undefined : Total24hColumn('Holders revenue', 'dailyHoldersRevenue', undefined, 190),
		// Total24hColumn('Creator revenue', 'dailyCreatorRevenue', undefined, 190),
		allChains ? undefined : Total24hColumn('Supply side revenue', 'dailySupplySideRevenue', undefined, 220),
		// Total24hColumn('Total fees', 'dailyTotalFees', undefined, 220),
		// Total24hColumn('Total revenue', 'dailyTotalRevenue', undefined, 220)
		// ChangeColumn('Weekly change', 'change_7dover7d', 160, 'Change of last 7d fees over the previous 7d fees'),
		// ChangeColumn('Monthly change', 'change_30dover30d', 160, 'Change of last 30d fees over the previous 30d fees'),
		TotalAllTimeColumn('fees')
	].filter((c) => c !== undefined)

// key: min width of window/screen
// values: table columns order
export const volumesTableColumnOrders = formatColumnOrder({
	0: [
		'displayName',
		'name',
		'chains',
		'change_7dover7d',
		'total24h',
		'total7d',
		'change_7d',
		'change_1d',
		'change_1m',
		'tvl',
		'volumetvl',
		'dominance',
		'totalAllTime'
	],
	900: [
		'displayName',
		'name',
		'chains',
		'change_7dover7d',
		'change_1d',
		'change_7d',
		'change_1m',
		'total24h',
		'total7d',
		'tvl',
		'volumetvl',
		'dominance',
		'totalAllTime'
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
		dominance: 100
	},
	600: {
		name: 200,
		chains: 120,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		total24h: 160,
		volumetvl: 140,
		dominance: 100
	},
	900: {
		name: 240,
		chains: 140,
		change_1d: 140,
		change_7d: 140,
		change_1m: 140,
		total24h: 160,
		volumetvl: 140,
		dominance: 100
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
		'dailyUserFees',
		'total24h',
		'total7d',
		'change_7dover7d',
		'total30d',
		'change_30dover30d',
		'revenue24h',
		'revenue7d',
		'revenue30d',
		'dailyRevenue',
		'dailyProtocolRevenue',
		'dailyHoldersRevenue',
		'dailySupplySideRevenue',
		'dailyCreatorRevenue',
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
		'dailyUserFees',
		'total24h',
		'total7d',
		'change_7dover7d',
		'total30d',
		'change_30dover30d',
		'revenue24h',
		'revenue7d',
		'revenue30d',
		'dailyRevenue',
		'dailyProtocolRevenue',
		'dailyHoldersRevenue',
		'dailySupplySideRevenue',
		'dailyCreatorRevenue',
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
