// Raw API response types for the DAT (Digital Asset Treasury) endpoints

/** Shape of a single institution's holdings for one asset within the /institutions response */
export interface IDATInstitutionHolding {
	amount: number
	avgPrice: number
	usdValue: number
	cost: number
	transactionCount: number
	firstAnnouncementDate: string
	lastAnnouncementDate: string
	supplyPercentage: number
}

/** Metadata for a single institution in the /institutions list response */
export interface IDATInstitutionMetadata {
	institutionId: number
	ticker: string
	name: string
	type: string
	price: number
	priceChange24h: number | null
	volume24h: number
	mcapRealized: number | null
	mcapRealistic: number | null
	mcapMax: number | null
	realized_mNAV: number | null
	realistic_mNAV: number | null
	max_mNAV: number | null
	totalUsdValue: number
	totalCost: number
	holdings: Record<string, IDATInstitutionHolding>
}

/** Asset metadata within the /institutions response */
export interface IDATAssetMetadata {
	name: string
	ticker: string
	geckoId: string
	companies: number
	totalAmount: number
	totalUsdValue: number
	circSupplyPerc: number
}

/** Flow tuple: [timestamp, net, inflow, outflow, purchasePrice, usdValueOfPurchase] */
export type IDATFlowTuple = [number, number, number, number, number, number]

/** mNAV tuple: [timestamp, mNAV_realized, mNAV_realistic, mNAV_max] */
export type IDATMNAVTuple = [number, number, number, number]

/** Full response from GET /institutions */
export interface IDATInstitutionsResponse {
	institutionMetadata: Record<number, IDATInstitutionMetadata>
	assetMetadata: Record<string, IDATAssetMetadata>
	institutions: Array<{ institutionId: number; totalUsdValue: number; totalCost: number }>
	assets: Record<string, Array<{ institutionId: number; usdValue: number; amount: number }>>
	totalCompanies: number
	flows: Record<string, IDATFlowTuple[]>
	mNAV: Record<string, Record<string, IDATMNAVTuple[]>>
}

/** Single institution asset entry in the institution detail response */
export interface IDATInstitutionAsset {
	amount: number
	avgPrice: number
	usdValue: number
	cost: number
}

/** Asset meta in the institution detail response */
export interface IDATInstitutionAssetMeta {
	name: string
	ticker: string
}

/** Transaction record within the institution detail response */
export interface IDATTransaction {
	id: number
	asset: string
	amount: string
	avg_price: string
	usd_value: string
	start_date: string
	end_date: string
	report_date: string
	type: string
	source_type: string
	source_url: string
	source_note: string
	is_approved: boolean
	reject_reason: string | null
	last_updated: string
	ticker: string
	assetName: string
	assetTicker: string
}

/** Stats tuple: [timestamp, fd_realized, fd_realistic, fd_maximum, mcap_realized, mcap_realistic, mcap_max, mNAV_realized, mNAV_realistic, mNAV_max] */
export type IDATStatsTuple = [number, number, number, number, number, number, number, number, number, number]

/** OHLCV tuple: [timestamp, open, high, low, close, volume] */
export type IDATOHLCVTuple = [number, number, number, number, number, number]

/** Full response from GET /institutions/:company */
export interface IDATInstitutionDetailResponse {
	institutionId: number
	ticker: string
	name: string
	type: string
	rank: number
	price: number
	priceChange24h: number | null
	volume24h: number
	totalCost: number
	totalUsdValue: number
	assets: Record<string, IDATInstitutionAsset>
	assetsMeta: Record<string, IDATInstitutionAssetMeta>
	ohlcv: IDATOHLCVTuple[]
	assetValue: Array<[number, number]>
	stats: IDATStatsTuple[]
	transactions: IDATTransaction[]
	lastUpdated: string
}
