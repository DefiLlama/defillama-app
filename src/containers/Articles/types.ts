export type ArticleVersion = 1

export type ArticleStatus = 'draft' | 'published'
export type ArticleEntityType = 'protocol' | 'chain' | 'stablecoin' | 'metric' | 'hack' | 'category' | 'cex' | 'bridge'
export type ArticleChartEntityType = 'protocol' | 'chain'
export type ArticleCalloutTone = 'note' | 'warning' | 'data'
export type ArticleEmbedProvider = 'twitter' | 'youtube' | 'medium' | 'mirror' | 'substack' | 'github' | 'iframe'
export type ArticleEmbedAspectRatio = '16/9' | '4/3' | '1/1' | 'auto'

export type ArticleEmbedConfig = {
	provider: ArticleEmbedProvider
	url: string
	sourceUrl: string
	title?: string
	caption?: string
	aspectRatio?: ArticleEmbedAspectRatio
}

export type TiptapMark = {
	type: string
	attrs?: Record<string, unknown> | null
}

export type TiptapJson = {
	type?: string
	attrs?: Record<string, unknown> | null
	content?: TiptapJson[]
	text?: string
	marks?: TiptapMark[]
}

export type ArticleImage = {
	url: string
	alt?: string
	caption?: string
	width?: number
	height?: number
}

export type ArticleEntityRef = {
	entityType: ArticleEntityType
	slug: string
	label: string
	route: string
}

export type ArticleChartRange = '30d' | '90d' | '365d' | 'all'

export type ArticleChartEntity = {
	entityType: ArticleChartEntityType
	slug: string
	name: string
	geckoId?: string | null
}

export type ArticleChartAnnotation = {
	date: string
	label: string
}

export type ArticleChartConfig = {
	entities: ArticleChartEntity[]
	chartType: string
	range?: ArticleChartRange
	logScale?: boolean
	annotations?: ArticleChartAnnotation[]
	caption?: string
}

export type ArticleCitation = {
	id: string
	label: string
	url?: string
	title?: string
}

export type ArticleExtractionResult = {
	plainText: string
	entities: ArticleEntityRef[]
	charts: ArticleChartConfig[]
	citations: ArticleCitation[]
	embeds: ArticleEmbedConfig[]
}

export type ArticleAuthorProfile = {
	id: string
	pbUserId: string
	slug: string
	displayName: string
	bio?: string | null
	avatarUrl?: string | null
	socials: Record<string, string>
	createdAt: string
	updatedAt: string
}

export type LocalArticleDocument = {
	id?: string
	contentVersion: ArticleVersion
	rendererVersion: ArticleVersion
	editorSchemaVersion: ArticleVersion

	title: string
	subtitle?: string
	slug: string
	status: ArticleStatus
	author?: string
	authorProfile?: ArticleAuthorProfile

	seoTitle?: string
	seoDescription?: string
	excerpt?: string
	coverImage?: ArticleImage | null

	contentJson: TiptapJson
	plainText: string
	entities: ArticleEntityRef[]
	charts: ArticleChartConfig[]
	citations: ArticleCitation[]
	embeds: ArticleEmbedConfig[]
	tags: string[]
	featuredRank?: number | null
	featuredUntil?: string | null

	createdAt: string
	updatedAt: string
	publishedAt: string | null
}

export type ArticleDocument = LocalArticleDocument & {
	id: string
	authorProfile: ArticleAuthorProfile
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }
