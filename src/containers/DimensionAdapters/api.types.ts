import { ADAPTER_TYPES } from './constants'

type AdapterType = `${ADAPTER_TYPES}`

// Full type for single protocol metrics response
export interface IAdapterProtocolMetrics {
	chain: string | null
	allChains: Array<string>
	total24h: number
	total48hto24h: number
	total7d: number
	total14dto7d: number
	total60dto30d: number
	total30d: number
	change_1d: number
	change_7d: number
	change_1m: number
	change_7dover7d: number
	change_30dover30d: number
	totalAllTime: number
	defillamaId: string
	name: string
	displayName: string
	module: string | null
	category: string | null
	logo: string
	chains: Array<string>
	protocolType: string
	methodologyURL: string | null
	methodology: Record<string, string> | null
	parentProtocol: string | null
	slug: string
	linkedProtocols: Array<string>
	id: string
	doublecounted?: boolean | null
	disabled?: boolean
	gecko_id: string | null
	description: string | null
	url: string
	github: Array<string>
	governanceID: Array<string> | null
	treasury: string | null
	cmcId: string | null
	defaultChartView?: 'daily' | 'weekly' | 'monthly' | null
	hasLabelBreakdown?: boolean
	twitter?: string
	stablecoins?: Array<string>
	symbol?: string
	address?: string
	hallmarks?: Array<unknown> | null
	wrongLiquidity?: boolean
	forkedFrom?: Array<string> | null
	audits?: string | null
	audit_links?: Array<string> | null
	tokenRights?: {
		rights: Array<{
			label: string
			hasRight: boolean
			details: string
		}>
		governanceData: {
			rights: string
			details: string
			feeSwitchStatus: string
			feeSwitchDetails: string
		}
		holdersRevenueAndValueAccrual: {
			buybacks: string
			dividends: string
			burns: string
			primaryValueAccrual: string
		}
		tokenAlignment: {
			fundraising: string
			raiseDetailsLink: {
				label: string
				url: string
			}
			associatedEntities: Array<string>
			equityRevenueCapture: string
			equityStatement: string
		}
	}
	childProtocols?: Array<{
		name: string
		defillamaId: string
		displayName: string
		methodologyURL: string
		methodology: Record<string, string>
		breakdownMethodology: Record<string, Record<string, string>>
		defaultChartView?: 'daily' | 'weekly' | 'monthly' | null
	}>
}

export interface IAdapterChainMetrics {
	breakdown24h: number | null
	breakdown30d: number | null
	chain: string | null
	allChains: Array<string>
	total24h: number
	total48hto24h: number
	total7d: number
	total14dto7d: number
	total60dto30d: number
	total30d: number
	total1y: number
	change_1d: number
	change_7d: number
	change_1m: number
	change_7dover7d: number
	change_30dover30d: number
	total7DaysAgo: number
	total30DaysAgo: number
	totalAllTime: number
	protocols: Array<{
		total24h: number
		total48hto24h: number
		total7d: number
		total14dto7d: number
		total60dto30d: number
		total30d: number
		total1y: number
		totalAllTime: number
		average1y: number
		monthlyAverage1y: number
		change_1d: number
		change_7d: number
		change_1m: number
		change_7dover7d: number
		change_30dover30d: number
		breakdown24h: Record<string, Record<string, number>>
		breakdown30d: Record<string, Record<string, number>>
		total7DaysAgo: number
		total30DaysAgo: number
		defillamaId: string
		name: string
		displayName: string
		module: string
		category: string
		logo: string
		chains: Array<string>
		protocolType: string
		methodologyURL: string
		methodology: Record<string, string>
		latestFetchIsOk: boolean
		parentProtocol: string
		slug: string
		linkedProtocols: Array<string>
		id: string
		doublecounted?: boolean
	}>
}

export type IAdapterChart = Array<[number, number]>

export type IAdapterBreakdownChartData = Array<[number, Record<string, number>]>
