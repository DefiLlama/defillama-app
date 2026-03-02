/** Raw snapshot item from the ETF snapshot API */
export interface IETFSnapshotApiItem {
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
}

/** Raw flow item from the ETF flows API */
export interface IETFFlowApiItem {
	gecko_id: string
	day: string
	total_flow_usd: number
}
