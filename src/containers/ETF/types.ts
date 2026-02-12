export interface AssetTotals {
	[key: string]: {
		aum: number
		flows: number
	}
}

/** A processed snapshot row with the `chain` field added for display */
export interface IETFSnapshotRow {
	ticker: string
	issuer: string
	etf_name: string
	custodian: string
	pct_fee: number
	url: string
	price: number
	volume: number
	aum: number
	shares: number
	btc: number
	flows: number
	asset: string
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
