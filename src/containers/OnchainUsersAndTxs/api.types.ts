// Active addresses API response - maps protocol/chain IDs to active address metrics
export interface IActiveAddressesResponse {
	[protocolId: string]: IActiveAddressMetrics
}

// Active address metrics for a protocol or chain
export interface IActiveAddressMetrics {
	name?: string
	users?: {
		value: number
		end: number
	}
	newUsers?: {
		value: number
		end: number
	}
	txs?: {
		value: string
		end: number
	}
	gasUsd?: {
		value: number
		end: number
	}
}

// User data API response - array of [timestamp, value] tuples
export type IUserDataResponse = Array<[number, number]>

// Transaction data API response - array of [timestamp, value] tuples
export type ITxDataResponse = Array<[number, number]>

// Gas data API response - array of [timestamp, value] tuples
export type IGasDataResponse = Array<[number, number]>

// New addresses API response - array of [timestamp, value] tuples
export type INewAddressesResponse = Array<[number, number]>

// Protocol onchain metrics summary (derived from active addresses API)
export interface IProtocolOnchainMetrics {
	activeUsers: number | null
	newUsers: number | null
	transactions: number | null
	gasUsd: number | null
}
