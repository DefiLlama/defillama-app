// Raw shape returned by https://api.llama.fi/token-rights (one entry per protocol)
export interface IRawTokenRightsEntry {
	'Protocol Name': string
	Token: string[]
	'Token Type': string[]
	'Brief description': string
	Utility?: string
	'Governance Details (Summary)': string
	'Governance Decisions': string[]
	'Governance details'?: string
	'Governance Links'?: string
	'Treasury Decisions': string[]
	'Treasury Details'?: string
	'Revenue Decisions': string[]
	'Revenue Details'?: string
	'Fee Switch Status': string
	'Fee Switch Details'?: string
	'Economic Rights (Summary)'?: string
	Buybacks: string[]
	'Buyback Details'?: string
	Dividends: string[]
	'Dividends Details'?: string
	Burns: string
	'Burn Details'?: string
	'Economic Links'?: string
	'Value Accrual'?: string
	'Value Accrual Details'?: string
	Fundraising?: string[]
	'Raise Details'?: string
	'Associated Entities': string[]
	'Equity Revenue Capture'?: string
	'Equity Statement'?: string
	'Ownership Links'?: string
	'IP & Brand'?: string
	Domain?: string
	'Foundation Multisigs / Addresses'?: string
	'Latest Treasury / Token Report'?: string
	'Last Updated'?: string
	'DefiLlama ID': string
}

// ---------------------------------------------------------------------------
// Parsed types -- fully predictable, no `undefined`. Use `null` for absent values.
// ---------------------------------------------------------------------------

export interface ITokenRightsParsedLink {
	label: string
	url: string
}

export interface ITokenRightsParsedAddress {
	label: string | null
	value: string
}

export interface ITokenRightsOverview {
	protocolName: string
	tokens: string[]
	tokenTypes: string[]
	description: string
	utility: string | null
	lastUpdated: string | null
}

export interface ITokenRightsGovernance {
	summary: string
	decisionTokens: string[]
	details: string | null
	links: ITokenRightsParsedLink[]
}

export interface ITokenRightsDecisions {
	treasury: { tokens: string[]; details: string | null }
	revenue: { tokens: string[]; details: string | null }
}

export interface ITokenRightsEconomic {
	summary: string | null
	feeSwitchStatus: string
	feeSwitchDetails: string | null
	links: ITokenRightsParsedLink[]
}

export interface ITokenRightsValueAccrual {
	primary: string | null
	details: string | null
	buybacks: { tokens: string[]; details: string | null }
	dividends: { tokens: string[]; details: string | null }
	burns: { status: string; details: string | null }
}

export interface ITokenRightsAlignment {
	fundraising: string[]
	raiseDetails: string | null
	associatedEntities: string[]
	equityRevenueCapture: string | null
	equityStatement: string | null
	ipAndBrand: string | null
	domain: string | null
	links: ITokenRightsParsedLink[]
}

export interface ITokenRightsResources {
	addresses: ITokenRightsParsedAddress[]
	reports: ITokenRightsParsedLink[]
}

export interface ITokenRightsData {
	overview: ITokenRightsOverview
	governance: ITokenRightsGovernance
	decisions: ITokenRightsDecisions
	economic: ITokenRightsEconomic
	valueAccrual: ITokenRightsValueAccrual
	alignment: ITokenRightsAlignment
	resources: ITokenRightsResources
}
