export interface RawBridgeInfo {
	id: number
	defillamaId?: string
	name: string
	displayName: string
	icon: string
	volumePrevDay: number
	volumePrev2Day: number
	lastHourlyVolume: number
	last24hVolume: number
	lastDailyVolume: number
	dayBeforeLastVolume: number
	weeklyVolume: number
	monthlyVolume: number
	chains: string[]
	destinationChain: string
	url?: string
	slug?: string
	txsPrevDay?: number | null
}

export interface RawBridgeChainInfo {
	gecko_id?: string | null
	volumePrevDay: number
	tokenSymbol?: string | null
	name: string
	lastDailyVolume?: number
}

export interface RawBridgesResponse {
	bridges: RawBridgeInfo[]
	chains: RawBridgeChainInfo[]
}

export interface RawBridgeVolumePoint {
	date: string
	depositUSD: number
	withdrawUSD: number
	depositTxs: number
	withdrawTxs: number
}

export type RawBridgeVolumeResponse = RawBridgeVolumePoint[]

export interface RawBridgeVolumeBySlugBridge {
	id: number
	displayName: string
	slug: string
	bridgeDbName: string
}

export interface RawBridgeVolumeBySlugResponse {
	bridge: RawBridgeVolumeBySlugBridge
	dailyVolumes: RawBridgeVolumePoint[]
}

export interface RawBridgeTokenStats {
	usdValue: number
	amount: string
	symbol: string
	decimals: number
}

export interface RawBridgeAddressStats {
	usdValue: number
	txs: number
}

export interface RawBridgeDayStats {
	date: number
	totalTokensDeposited: Record<string, RawBridgeTokenStats>
	totalTokensWithdrawn: Record<string, RawBridgeTokenStats>
	totalAddressDeposited: Record<string, RawBridgeAddressStats>
	totalAddressWithdrawn: Record<string, RawBridgeAddressStats>
}

export type RawBridgeDayStatsResponse = RawBridgeDayStats | Record<string, never>

export interface RawBridgeLargeTransaction {
	date: number
	txHash: string
	from: string
	to: string
	token: string
	symbol: string
	amount: string
	isDeposit: boolean
	bridge: string
	chain: string
	usdValue: string
}

export type RawBridgeLargeTransactionsResponse = RawBridgeLargeTransaction[]

export interface RawBridgeTransaction {
	tx_hash: string
	ts: string
	tx_block: number
	tx_from: string
	tx_to: string
	token: string
	amount: string
	is_deposit: boolean
	chain: string
	bridge_name: string
	usd_value: string | null
}

export type RawBridgeTransactionsResponse = RawBridgeTransaction[]

export interface RawBridgeNetflowEntry {
	chain: string
	net_flow: string
	deposited_usd: string
	withdrawn_usd: string
}

export type RawBridgeNetflowsResponse = RawBridgeNetflowEntry[]
export type BridgeNetflowPeriod = 'day' | 'week' | 'month'

export interface RawBridgeTxCountInfo {
	id: number
	displayName: string
	slug?: string
	txsPrevDay: number
	depositTxs24h: number
	withdrawTxs24h: number
}

export interface RawBridgeTxCountsResponse {
	bridges: RawBridgeTxCountInfo[]
}
