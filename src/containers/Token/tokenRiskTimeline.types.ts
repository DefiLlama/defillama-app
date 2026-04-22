export type RiskTimelineTag = 'risk-manager' | 'contributor' | 'community'

export type RiskTimelineDirection = 'increase' | 'decrease' | 'neutral' | 'mixed'

export type RiskTimelineAssetDirection = 'increase' | 'decrease' | 'neutral'

export interface RiskTimelineAsset {
	symbol: string
	direction: RiskTimelineAssetDirection
	reasoning: string
}

export interface RiskTimelineEntry {
	tag: RiskTimelineTag
	firm: string
	author: string | null
	source: string
	publishedAt: string
	title: string
	direction: RiskTimelineDirection
	assets: RiskTimelineAsset[]
	url: string
}

export interface RiskTimelineResponse {
	token: string
	count: number
	entries: RiskTimelineEntry[]
}
