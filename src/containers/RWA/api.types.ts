import type { MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import type { RWAParentPlatform } from './grouping'

type RWANumberMap = Record<string, number>
type RWAContractsByChain = Record<string, string[]>
type RWATvlByChain = Record<string, Record<string, number>>
type RWAHoldersByChain = Record<string, string[]>

// Raw API response types
export interface IFetchedRWAProject {
	id: string
	ticker: string
	assetName?: string | null
	assetGroup?: string | null
	website?: string[] | null
	twitter?: string[] | null
	primaryChain?: string | null
	chain?: string[] | null
	contracts?: RWAContractsByChain | null
	category?: string[] | null
	assetClass?: string[] | null
	type?: string | null
	rwaClassification?: string | null
	accessModel?: 'Permissioned' | 'Permissionless' | 'Non-transferable' | 'Custodial Only' | 'Unknown'
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
	parentPlatform?: RWAParentPlatform
	stablecoin?: boolean | null
	governance?: boolean | null
	defiActiveTvl?: RWATvlByChain | null
	onChainMcap?: RWANumberMap | null
	activeMcap?: RWANumberMap | null
	price?: number | null
	activeMcapData?: boolean
	projectId?: string | string[] | null
	coingeckoId?: string | null
	oracleProvider?: string | null
	oracleProofLink?: string | null
	logo?: string | string[] | null
	rwaGithub?: string | null
	dateOfLastAttestation?: string | null
	attestationFrequency?: string | string[] | null
	holdersToRemove?: RWAHoldersByChain | null
	discord?: boolean | string | null
	telegram?: boolean | string | null
}

/** One classification slice in segmented RWA stats (base, stablecoins-only, governance, both). */
export type RWAStatsSlice = {
	onChainMcap: number
	activeMcap: number
	defiActiveTvl: number
	assetCount: number
	assetIssuers: string[]
}

/** Four non-overlapping slices by asset classification (used by byChain, byCategory, byPlatform, byAssetGroup). */
export type RWAStatsSegmented = {
	base: RWAStatsSlice
	stablecoinsOnly: RWAStatsSlice
	governanceOnly: RWAStatsSlice
	stablecoinsAndGovernance: RWAStatsSlice
}

export interface IRWAStatsResponse {
	totalOnChainMcap: number
	totalActiveMcap: number
	totalDefiActiveTvl: number
	totalAssets: number
	totalIssuers: number
	byChain: Record<string, RWAStatsSegmented>
	byCategory: Record<string, RWAStatsSegmented>
	byPlatform?: Record<string, RWAStatsSegmented>
	byAssetGroup?: Record<string, RWAStatsSegmented>
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
	platforms: Array<string>
	assetGroups: Array<string>
	assetNames: Array<string>
	categoryValues: Array<{ name: string; value: number }>
	issuers: Array<string>
	platformLinks: Array<{ label: string; to: string }>
	selectedPlatform: string
	assetGroupLinks: Array<{ label: string; to: string }>
	selectedAssetGroup: string
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
	initialChartDataset: IRWAInitialChartDataset | null
	chainSlug: string | null
	categorySlug: string | null
	platformSlug: string | null
	assetGroupSlug: string | null
}

export type IRWAInitialChartDatasetRow = { timestamp: number } & Record<string, number>
export type RWAChartMetricKey = 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'
export type IRWAChartMetricRows = Array<{ timestamp: number } & Record<string, number>>
export type RWATickerChartTarget =
	| { kind: 'all' }
	| { kind: 'chain'; slug: string }
	| { kind: 'category'; slug: string }
	| { kind: 'platform'; slug: string }
	| { kind: 'assetGroup'; slug: string }

export type IRWAInitialChartDataset = Record<
	RWAChartMetricKey,
	{ source: IRWAInitialChartDatasetRow[]; dimensions: string[] }
>

export interface IRWAChartDataByTicker {
	onChainMcap: IRWAChartMetricRows
	activeMcap: IRWAChartMetricRows
	defiActiveTvl: IRWAChartMetricRows
}

export type IRWABreakdownChartRow = { timestamp: number } & Record<string, number>

export type IRWABreakdownChartResponse = IRWABreakdownChartRow[]

export type IRWABreakdownChartParams = {
	key?: RWAChartMetricKey
	includeStablecoin?: boolean
	includeGovernance?: boolean
}

export type RWAOverviewPage = { kind: 'chain' } | { kind: 'category' } | { kind: 'platform' } | { kind: 'assetGroup' }
export type RWAOverviewBreakdownRequest =
	| { breakdown: 'chain'; key: RWAChartMetricKey; includeStablecoin: boolean; includeGovernance: boolean }
	| { breakdown: 'category'; key: RWAChartMetricKey; includeStablecoin: true; includeGovernance: true }
	| { breakdown: 'platform'; key: RWAChartMetricKey; includeStablecoin: true; includeGovernance: true }
	| { breakdown: 'assetGroup'; key: RWAChartMetricKey; includeStablecoin: true; includeGovernance: true }

export type IRWAChainsOverviewRow = NonNullable<IRWAStatsResponse['byChain']>[string] & { chain: string }

/** Flat row shape for the Categories overview table (merged from segmented stats). */
export type IRWACategoriesOverviewRow = {
	category: string
	onChainMcap: number
	activeMcap: number
	defiActiveTvl: number
	assetCount: number
	assetIssuers: number
}

/** Flat row shape for the Platforms overview table (merged from segmented stats). */
export type IRWAPlatformsOverviewRow = {
	platform: string
	onChainMcap: number
	activeMcap: number
	defiActiveTvl: number
	assetCount: number
}

export type IRWAAssetGroupsOverviewRow = {
	assetGroup: string
	onChainMcap: number
	activeMcap: number
	defiActiveTvl: number
	assetCount: number
}

export type IRWAChainsOverview = {
	rows: IRWAChainsOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}

export type IRWACategoriesOverview = {
	rows: IRWACategoriesOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}

export type IRWAPlatformsOverview = {
	rows: IRWAPlatformsOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}

export type IRWAAssetGroupsOverview = {
	rows: IRWAAssetGroupsOverviewRow[]
	initialChartDataset: MultiSeriesChart2Dataset
}

export interface IRWAAssetData extends IRWAProject {
	slug: string
	rwaClassificationDescription: string | null
	accessModelDescription: string | null
	assetClassDescriptions: Record<string, string>
	contractUrls: Record<string, Record<string, string>> | null
	chartDataset: {
		source: RWAAssetChartRow[]
		dimensions: RWAAssetChartDimension[]
	} | null
}

const RWA_ASSET_CHART_DIMENSIONS = ['timestamp', 'DeFi Active TVL', 'Active Mcap', 'Onchain Mcap'] as const
export type RWAAssetChartDimension = (typeof RWA_ASSET_CHART_DIMENSIONS)[number]
type RWAAssetChartSeriesDimension = Exclude<RWAAssetChartDimension, 'timestamp'>
export type RWAAssetChartRow = { timestamp: number } & Partial<Record<RWAAssetChartSeriesDimension, number | null>>
