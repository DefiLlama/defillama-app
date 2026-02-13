export type TokenRightLabel = 'Governance' | 'Treasury' | 'Revenue'

export interface ITokenRight {
	label: TokenRightLabel | (string & {})
	hasRight: boolean
	details?: string
}

export type GovernanceRights = 'NONE' | 'LIMITED' | 'FULL'
export type FeeSwitchStatus = 'ON' | 'OFF' | 'PENDING' | 'UNKNOWN'

export interface IGovernanceLink {
	label: string
	url: string
}

export interface IGovernanceData {
	rights: GovernanceRights
	details?: string
	feeSwitchStatus?: FeeSwitchStatus
	feeSwitchDetails?: string
	links?: IGovernanceLink[]
}

export type BuybacksStatus = 'ACTIVE' | 'INACTIVE' | 'NONE' | 'UNKNOWN'
export type DividendsStatus = 'ACTIVE' | 'INACTIVE' | 'NONE' | 'UNKNOWN'
export type BurnsStatus = 'ACTIVE' | 'INACTIVE' | 'NONE' | 'UNKNOWN'

export interface IHoldersRevenueAndValueAccrual {
	buybacks?: BuybacksStatus
	dividends?: DividendsStatus
	burns?: BurnsStatus
	burnSources?: string[]
	primaryValueAccrual?: string
}

export type FundraisingType = 'EQUITY' | 'TOKEN' | 'NONE' | 'UNKNOWN'
export type EquityRevenueCaptureStatus = 'ACTIVE' | 'INACTIVE' | 'PARTIAL' | 'UNKNOWN'

export interface ITokenAlignmentLink {
	label: string
	url: string
}

export interface ITokenAlignment {
	fundraising?: FundraisingType
	raiseDetailsLink?: ITokenAlignmentLink
	associatedEntities?: string[]
	equityRevenueCapture?: EquityRevenueCaptureStatus
	equityStatement?: string
}

export interface IProtocolResource {
	label: string
	address?: string
	url?: string
	note?: string
}

export interface ITokenRights {
	rights?: ITokenRight[]
	governanceData?: IGovernanceData
	holdersRevenueAndValueAccrual?: IHoldersRevenueAndValueAccrual
	tokenAlignment?: ITokenAlignment
	resources?: IProtocolResource[]
}

export interface IRaise {
	round: string
	amount: number
	valuation: string
	source: string
	date: number
	defillamaId: string
	leadInvestors?: Array<string>
	otherInvestors?: Array<string>
	investors?: Array<string>
}

export interface IProtocolWarningBanner {
	message: string
	until?: number | string
	level: 'low' | 'alert' | 'rug'
}

export interface IProtocolChainTvlEntry {
	tvl?: Array<{ date: number; totalLiquidityUSD: number }> | null
	tokens?: Array<{ date: number; tokens: Record<string, number> }> | null
	tokensInUsd?: Array<{ date: number; tokens: Record<string, number> }> | null
}

export interface IProtocolMetricsV2 {
	id: string
	name: string
	address?: string | null
	symbol?: string | null
	url: string
	referralUrl?: string | null
	description: string
	chain: string
	logo: string
	audits: string | null
	audit_note: string | null
	gecko_id: string | null
	cmcId: string | null
	category: string
	tags?: Array<string> | null
	chains: Array<string>
	module?: string | null
	treasury?: string | null
	twitter: string
	audit_links: Array<string>
	openSource?: boolean
	forkedFrom: Array<string>
	oraclesByChain: Record<string, Array<string>>
	parentProtocol?: string
	governanceID?: Array<string>
	github?: Array<string>
	currentChainTvls?: Record<string, number>
	isParentProtocol?: boolean
	mcap: number | null
	methodology?: string
	raises?: Array<IRaise>
	otherProtocols?: Array<string>
	hallmarks?: Array<[number, string]> | Array<[[number, number], string]>
	stablecoins?: Array<string>
	misrepresentedTokens?: boolean
	deprecated?: boolean
	rugged?: boolean
	deadUrl?: boolean
	warningBanners?: Array<IProtocolWarningBanner>
	tokenRights?: ITokenRights
	wrongLiquidity?: boolean
}

export interface IProtocolOverviewMetricsV1 extends IProtocolMetricsV2 {
	chainTvls: Record<string, IProtocolChainTvlEntry>
}

export type ProtocolChartBreakdownType = 'chain-breakdown' | 'token-breakdown'

export type IProtocolChartTimestamp = string | number

export type IProtocolValueChartRawPoint = [IProtocolChartTimestamp, number]
export type IProtocolValueChartRaw = IProtocolValueChartRawPoint[]
export type IProtocolValueChartPoint = [number, number]
export type IProtocolValueChart = IProtocolValueChartPoint[]

export type IProtocolChainBreakdownValue = Record<string, number>
export type IProtocolChainBreakdownChartRawPoint = [IProtocolChartTimestamp, IProtocolChainBreakdownValue]
export type IProtocolChainBreakdownChartRaw = IProtocolChainBreakdownChartRawPoint[]
export type IProtocolChainBreakdownChartPoint = [number, IProtocolChainBreakdownValue]
export type IProtocolChainBreakdownChart = IProtocolChainBreakdownChartPoint[]

export type IProtocolTokenBreakdownValue = Record<string, number>
export type IProtocolTokenBreakdownChartRawPoint = [IProtocolChartTimestamp, IProtocolTokenBreakdownValue]
export type IProtocolTokenBreakdownChartRaw = IProtocolTokenBreakdownChartRawPoint[]
export type IProtocolTokenBreakdownChartPoint = [number, IProtocolTokenBreakdownValue]
export type IProtocolTokenBreakdownChart = IProtocolTokenBreakdownChartPoint[]

export type IProtocolTvlMetrics = IProtocolMetricsV2
export type IProtocolTreasuryMetrics = IProtocolMetricsV2

export interface IProtocolChartV2Params {
	protocol: string
	key?: string
	currency?: string
	breakdownType?: ProtocolChartBreakdownType
}

export interface IProtocolExpenses {
	protocolId: string
	headcount: number
	annualUsdCost: Record<string, number>
	sources?: Array<string> | null
	notes?: Array<string> | null
	lastUpdate?: string | null
}
