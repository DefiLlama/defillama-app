import type { ArticleEntityType } from './types'

export type EntityPreviewProtocol = {
	kind: 'protocol'
	tvl?: number | null
	change1d?: number | null
	change7d?: number | null
	change30d?: number | null
	category?: string | null
	chains?: string[]
	mcap?: number | null
	logo?: string | null
}

export type EntityPreviewChain = {
	kind: 'chain'
	tvl?: number | null
	change1d?: number | null
	change7d?: number | null
	protocolCount?: number | null
	logo?: string | null
}

export type EntityPreviewStablecoin = {
	kind: 'stablecoin'
	circulating?: number | null
	change7d?: number | null
	pegType?: string | null
	pegMechanism?: string | null
	price?: number | null
	topChains?: Array<{ name: string; circulating: number }>
}

export type EntityPreviewCategory = {
	kind: 'category'
	tvl?: number | null
	protocolCount?: number | null
	topProtocols?: Array<{ name: string; slug: string; tvl: number; logo?: string | null }>
}

export type EntityPreviewCex = {
	kind: 'cex'
	tvl?: number | null
	cleanAssetsTvl?: number | null
	spotVolume?: number | null
	inflows1w?: number | null
}

export type EntityPreviewBridge = {
	kind: 'bridge'
	volume24h?: number | null
	volume7d?: number | null
	chains?: string[]
	destinationChain?: string | null
}

export type EntityPreviewHack = {
	kind: 'hack'
	date?: string | null
	amount?: number | null
	returnedFunds?: number | null
	classification?: string | null
	technique?: string | null
	chains?: string[]
	targetType?: string | null
	bridgeHack?: boolean
}

export type EntityPreviewMetric = {
	kind: 'metric'
	label: string
	description?: string | null
}

export type EntityPreview =
	| EntityPreviewProtocol
	| EntityPreviewChain
	| EntityPreviewStablecoin
	| EntityPreviewCategory
	| EntityPreviewCex
	| EntityPreviewBridge
	| EntityPreviewHack
	| EntityPreviewMetric

export type EntityPreviewKind = EntityPreview['kind']

export const PREVIEWABLE_TYPES: ReadonlySet<ArticleEntityType> = new Set<ArticleEntityType>([
	'protocol',
	'chain',
	'stablecoin',
	'category',
	'cex',
	'bridge',
	'hack'
])

export function isPreviewableEntityType(type: ArticleEntityType): boolean {
	return PREVIEWABLE_TYPES.has(type)
}
