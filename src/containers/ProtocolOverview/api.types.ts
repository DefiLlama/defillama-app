type TokenRightLabel = 'Governance' | 'Treasury' | 'Revenue'

interface ITokenRight {
	label: TokenRightLabel | (string & {})
	hasRight: boolean
	details?: string
}

type GovernanceRights = 'NONE' | 'LIMITED' | 'FULL'
type FeeSwitchStatus = 'ON' | 'OFF' | 'PENDING' | 'UNKNOWN'

interface IGovernanceLink {
	label: string
	url: string
}

interface IGovernanceData {
	rights: GovernanceRights
	details?: string
	feeSwitchStatus?: FeeSwitchStatus
	feeSwitchDetails?: string
	links?: IGovernanceLink[]
}

type BuybacksStatus = 'ACTIVE' | 'INACTIVE' | 'NONE' | 'UNKNOWN'
type DividendsStatus = 'ACTIVE' | 'INACTIVE' | 'NONE' | 'UNKNOWN'
type BurnsStatus = 'ACTIVE' | 'INACTIVE' | 'NONE' | 'UNKNOWN'

interface IHoldersRevenueAndValueAccrual {
	buybacks?: BuybacksStatus
	dividends?: DividendsStatus
	burns?: BurnsStatus
	burnSources?: string[]
	primaryValueAccrual?: string
}

type FundraisingType = 'EQUITY' | 'TOKEN' | 'NONE' | 'UNKNOWN'
type EquityRevenueCaptureStatus = 'ACTIVE' | 'INACTIVE' | 'PARTIAL' | 'UNKNOWN'

interface ITokenAlignmentLink {
	label: string
	url: string
}

interface ITokenAlignment {
	fundraising?: FundraisingType
	raiseDetailsLink?: ITokenAlignmentLink
	associatedEntities?: string[]
	equityRevenueCapture?: EquityRevenueCaptureStatus
	equityStatement?: string
}

interface IProtocolResource {
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

type ProtocolChartBreakdownType = 'chain-breakdown' | 'token-breakdown'

type IProtocolChartTimestamp = string | number

type IProtocolValueChartRawPoint = [IProtocolChartTimestamp, number]
// oxlint-disable-next-line no-unused-vars
type IProtocolValueChartRaw = IProtocolValueChartRawPoint[]
type IProtocolValueChartPoint = [number, number]
export type IProtocolValueChart = IProtocolValueChartPoint[]

export type IProtocolChainBreakdownValue = Record<string, number>
type IProtocolChainBreakdownChartRawPoint = [IProtocolChartTimestamp, IProtocolChainBreakdownValue]
// oxlint-disable-next-line no-unused-vars
type IProtocolChainBreakdownChartRaw = IProtocolChainBreakdownChartRawPoint[]
type IProtocolChainBreakdownChartPoint = [number, IProtocolChainBreakdownValue]
export type IProtocolChainBreakdownChart = IProtocolChainBreakdownChartPoint[]

export type IProtocolTokenBreakdownValue = Record<string, number>
type IProtocolTokenBreakdownChartRawPoint = [IProtocolChartTimestamp, IProtocolTokenBreakdownValue]
// oxlint-disable-next-line no-unused-vars
type IProtocolTokenBreakdownChartRaw = IProtocolTokenBreakdownChartRawPoint[]
type IProtocolTokenBreakdownChartPoint = [number, IProtocolTokenBreakdownValue]
export type IProtocolTokenBreakdownChart = IProtocolTokenBreakdownChartPoint[]

export type IProtocolTvlMetrics = IProtocolMetricsV2
// oxlint-disable-next-line no-unused-vars
type IProtocolTreasuryMetrics = IProtocolMetricsV2

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
