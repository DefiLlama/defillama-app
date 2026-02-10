import { ADAPTER_TYPES } from './constants'

export interface IAdapterOverview {
	totalDataChart: Array<[number, number]> // date, value
	breakdown24h: number | null
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

export interface IAdapterSummary {
	name: string
	defillamaId: string
	disabled: boolean
	displayName: string
	module: string
	category?: string | null
	logo: string | null
	chains: Array<string>
	methodologyURL: string
	methodology: Record<string, string>
	gecko_id: string | null
	forkedFrom?: Array<string> | null
	twitter?: string | null
	audits?: string | null
	description: string | null
	address?: string | null
	url: string
	audit_links?: Array<string> | null
	versionKey: string | null
	cmcId: string | null
	id: string
	github: Array<string>
	governanceID: null
	treasury: null
	parentProtocol?: string | null
	previousNames?: string | null
	latestFetchIsOk: boolean
	slug: string
	protocolType?: string | null
	total24h?: number | null
	total48hto24h?: number | null
	total7d?: number | null
	total30d?: number | null
	totalAllTime?: number | null
	totalDataChart: Array<[number, number]>
	linkedProtocols?: string[]
	defaultChartView?: 'daily' | 'weekly' | 'monthly'
	doublecounted?: boolean
	hasLabelBreakdown?: boolean
	breakdownMethodology?: Record<string, Record<string, string>>
	childProtocols?: Array<{
		name: string
		defillamaId: string
		displayName: string
		methodologyURL: string
		methodology: Record<string, string>
		breakdownMethodology: Record<string, Record<string, string>>
	}>
}

export type AdapterType = `${ADAPTER_TYPES}`
