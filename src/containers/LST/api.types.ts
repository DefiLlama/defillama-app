/** Full protocol data from PROTOCOL_API/:slug */
export interface IProtocolDetailApiItem {
	name: string
	logo: string
	mcap: number | null
	chainTvls: Record<
		string,
		{
			tokens?: Array<{ date: number; tokens: Record<string, number> }>
			tokensInUsd?: Array<{ date: number; tokens: Record<string, number> }>
		}
	>
}

/** Yield pool from YIELD_POOLS_API */
export interface IYieldPoolApiItem {
	project: string
	chain: string
	symbol: string
	apy: number | null
	[key: string]: unknown
}

/** LSD rate entry from LSD_RATES_API */
export interface ILsdRateApiItem {
	name: string
	symbol: string | null
	type: 'rebase' | 'accruing' | null
	ethPeg: number | null
	marketRate: number | null
	expectedRate: number | null
	fee: number | null
}
