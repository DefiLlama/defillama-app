// Raw API response types
export interface IFetchedRWAProject {
	id: string
	ticker: string
	assetName: string | null
	website?: string[] | null
	twitter?: string[] | null
	primaryChain?: string | null
	chain: string[] | null
	contracts: Record<string, Array<string>> | null
	category?: string[] | null
	assetClass?: string[] | null
	type?: string | null
	rwaClassification: string | null
	accessModel: 'Permissioned' | 'Permissionless' | 'Non-transferable' | 'Custodial Only' | 'Unknown'
	issuer?: string | null
	issuerSourceLink?: string[] | null
	issuerRegistryInfo?: string[] | null
	isin?: string | null
	attestationLinks?: string[] | null
	attestations?: boolean | null
	redeemable?: boolean | null
	cexListed?: boolean | null
	kycForMintRedeem?: boolean | null
	kycAllowlistedWhitelistedToTransferHold?: boolean | null
	transferable?: boolean | null
	selfCustody?: boolean | null
	descriptionNotes?: string[] | null
	parentPlatform?: string | null
	stablecoin?: boolean | null
	governance?: boolean | null
	defiActiveTvl?: Record<string, Record<string, string>> | null
	onChainMcap?: Record<string, string> | null
	activeMcap?: Record<string, string> | null
	price?: number | null
	activeMcapData?: boolean
}

export interface IRWAStatsResponse {
	totalOnChainMcap: number
	totalActiveMcap: number
	totalDefiActiveTvl: number
	totalAssets: number
	totalIssuers: number
	byChain: Record<
		string,
		{
			base: {
				onChainMcap: number
				activeMcap: number
				defiActiveTvl: number
				assetCount: number
				assetIssuers: Array<string>
			}
			stablecoinsOnly: {
				onChainMcap: number
				activeMcap: number
				defiActiveTvl: number
				assetCount: number
				assetIssuers: Array<string>
			}
			governanceOnly: {
				onChainMcap: number
				activeMcap: number
				defiActiveTvl: number
				assetCount: number
				assetIssuers: Array<string>
			}
			stablecoinsAndGovernance: {
				onChainMcap: number
				activeMcap: number
				defiActiveTvl: number
				assetCount: number
				assetIssuers: Array<string>
			}
		}
	>
	byCategory: Record<
		string,
		{
			onChainMcap: number
			activeMcap: number
			defiActiveTvl: number
			assetCount: number
			assetIssuers: number
		}
	>
	byPlatform?: Record<
		string,
		{
			onChainMcap: number
			activeMcap: number
			defiActiveTvl: number
			assetCount: number
			assetIssuers: number
		}
	>
}

export interface IRWAProject extends Omit<IFetchedRWAProject, 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'> {
	trueRWA: boolean
	onChainMcap: {
		total: number
		breakdown: Array<[string, number]>
	} | null
	activeMcap: {
		total: number
		breakdown: Array<[string, number]>
	} | null
	defiActiveTvl: {
		total: number
		breakdown: Array<[string, number]>
	} | null
	defiActiveTvlByChain?: {
		total: number
		breakdown: Array<[string, number]>
	} | null
}

export interface IRWAAssetsOverview {
	assets: Array<IRWAProject>
	types: Array<string>
	typeOptions: Array<{ key: string; name: string; help?: string }>
	assetClasses: Array<string>
	assetClassOptions: Array<{ key: string; name: string; help?: string }>
	rwaClassifications: Array<string>
	rwaClassificationOptions: Array<{ key: string; name: string; help?: string }>
	accessModels: Array<string>
	accessModelOptions: Array<{ key: string; name: string; help?: string }>
	categories: Array<string>
	categoriesOptions: Array<{ key: string; name: string; help?: string }>
	assetNames: Array<string>
	categoryValues: Array<{ name: string; value: number }>
	issuers: Array<string>
	platformLinks: Array<{ label: string; to: string }>
	selectedPlatform: string
	chainLinks: Array<{ label: string; to: string }>
	selectedChain: string
	categoryLinks: Array<{ label: string; to: string }>
	selectedCategory: string
	totals: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
		issuers: string[]
		stablecoins: {
			onChainMcap: number
			activeMcap: number
			defiActiveTvl: number
			issuers: string[]
		}
		governance: {
			onChainMcap: number
			activeMcap: number
			defiActiveTvl: number
			issuers: string[]
		}
		stablecoinsAndGovernance: {
			onChainMcap: number
			activeMcap: number
			defiActiveTvl: number
			issuers: string[]
		}
	}
	chartData: IRWAChartDataByTicker | null
}

export interface IRWAChartDataByTicker {
	onChainMcap: Array<{ timestamp: number } & Record<string, number>>
	activeMcap: Array<{ timestamp: number } & Record<string, number>>
	defiActiveTvl: Array<{ timestamp: number } & Record<string, number>>
}

export type IRWAChainsOverviewRow = NonNullable<IRWAStatsResponse['byChain']>[string] & { chain: string }
export type IRWACategoriesOverviewRow = NonNullable<IRWAStatsResponse['byCategory']>[string] & { category: string }
export type IRWAPlatformsOverviewRow = NonNullable<IRWAStatsResponse['byPlatform']>[string] & { platform: string }

export interface IRWAAssetData extends IRWAProject {
	slug: string
	rwaClassificationDescription: string | null
	accessModelDescription: string | null
	assetClassDescriptions: Record<string, string>
	chartDataset: {
		source: RWAAssetChartRow[]
		dimensions: RWAAssetChartDimension[]
	} | null
}

export const RWA_ASSET_CHART_DIMENSIONS = ['timestamp', 'DeFi Active TVL', 'Active Mcap', 'Onchain Mcap'] as const
export type RWAAssetChartDimension = (typeof RWA_ASSET_CHART_DIMENSIONS)[number]
export type RWAAssetChartSeriesDimension = Exclude<RWAAssetChartDimension, 'timestamp'>
export type RWAAssetChartRow = { timestamp: number } & Partial<Record<RWAAssetChartSeriesDimension, number | null>>
