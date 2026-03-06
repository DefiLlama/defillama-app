import type { IETFSnapshotApiItem } from './api.types'

export interface AssetTotals {
	[key: string]: {
		aum: number
		flows: number
	}
}

/** A processed snapshot row with the `chain` field added for display */
export interface IETFSnapshotRow extends IETFSnapshotApiItem {
	chain: string[]
}

/** Processed flows keyed by unix timestamp (seconds) as string keys */
export type IProcessedFlows = Record<
	string,
	{
		date: number
		[geckoId: string]: number
	}
>

export interface ETFOverviewProps {
	snapshot: IETFSnapshotRow[]
	flows: IProcessedFlows
	lastUpdated: string
	totalsByAsset: AssetTotals
}
