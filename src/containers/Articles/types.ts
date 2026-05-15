export type ArticleVersion = 1

export type ArticleStatus = 'draft' | 'published'
export type ArticleSection = 'interview' | 'report' | 'spotlight' | 'opinion' | 'roundtables' | 'press_release'

export const ARTICLE_SECTIONS: ArticleSection[] = [
	'interview',
	'report',
	'spotlight',
	'opinion',
	'roundtables',
	'press_release'
]

export const ARTICLE_SECTION_LABELS: Record<ArticleSection, string> = {
	interview: 'Interview',
	report: 'Report',
	spotlight: 'Spotlight',
	opinion: 'Opinion',
	roundtables: 'Roundtables',
	press_release: 'Press Release'
}

export const ARTICLE_SECTION_SLUGS: Record<ArticleSection, string> = {
	interview: 'interview',
	report: 'report',
	spotlight: 'spotlight',
	opinion: 'opinion',
	roundtables: 'roundtables',
	press_release: 'press-release'
}

export const ARTICLE_SECTION_FROM_SLUG: Record<string, ArticleSection> = {
	interview: 'interview',
	report: 'report',
	spotlight: 'spotlight',
	opinion: 'opinion',
	roundtables: 'roundtables',
	'press-release': 'press_release',
	press_release: 'press_release'
}

export type ArticleEntityType = 'protocol' | 'chain' | 'stablecoin' | 'metric' | 'hack' | 'category' | 'cex' | 'bridge'
export type ArticleChartEntityType = 'protocol' | 'chain'
export type ArticleCalloutTone = 'note' | 'warning' | 'data' | 'pullquote'
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
	credit?: string
	copyright?: string
	headline?: string
	width?: number
	height?: number
}

export type ArticlePdf = {
	id: string
	url: string
	sizeBytes: number
	originalName?: string
	pageCount?: number
}

export type ArticleEditorialTagMetadata = {
	highlightText?: string | null
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

export type ArticleChartSeries = {
	entityType: ArticleChartEntityType
	slug: string
	name: string
	geckoId?: string | null
	chartType: string
}

export type ArticleChartAnnotation = {
	date: string
	label: string
}

export type ArticleChartConfig = {
	series: ArticleChartSeries[]
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

export type ArticleInterviewee = {
	name: string
	avatarUrl?: string | null
	bio?: string | null
	role?: string | null
	authorSlug?: string | null
	externalUrl?: string | null
}

export type ArticleViewerRole = 'owner' | 'collaborator' | 'researcher'

export type ArticleCollaborator = {
	pbUserId: string
	profile: ArticleAuthorProfile
	role: ArticleViewerRole
	addedAt: string
	addedByPbUserId: string | null
	hidden: boolean
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
	coAuthors?: ArticleAuthorProfile[]
	viewerRole?: ArticleViewerRole

	seoTitle?: string
	seoDescription?: string
	excerpt?: string
	coverImage?: ArticleImage | null
	carouselImage?: ArticleImage | null
	sponsorLogo?: ArticleImage | null
	reportDescription?: string | null
	reportPdf?: ArticlePdf | null

	contentJson: TiptapJson
	plainText: string
	entities: ArticleEntityRef[]
	charts: ArticleChartConfig[]
	citations: ArticleCitation[]
	embeds: ArticleEmbedConfig[]
	tags: string[]
	editorialTags?: string[]
	editorialTagMetadata?: ArticleEditorialTagMetadata | null
	interviewees?: ArticleInterviewee[]
	section?: ArticleSection | null
	displayDate?: string | null
	brandByline?: boolean
	featuredRank?: number | null
	featuredUntil?: string | null

	createdAt: string
	updatedAt: string
	publishedAt: string | null
	firstPublishedAt?: string | null
	lastPublishedAt?: string | null

	pending?: ArticleSnapshotPayload | null
	pendingUpdatedAt?: string | null
	pendingActorPbUserId?: string | null
}

export type ArticleDocument = LocalArticleDocument & {
	id: string
	authorProfile: ArticleAuthorProfile
}

export type ArticleSnapshotPayload = Omit<
	LocalArticleDocument,
	| 'id'
	| 'authorProfile'
	| 'coAuthors'
	| 'viewerRole'
	| 'editorialTagMetadata'
	| 'pending'
	| 'pendingUpdatedAt'
	| 'pendingActorPbUserId'
> & {
	id?: string
}

export type ArticleRevisionEventType =
	| 'create'
	| 'save'
	| 'publish'
	| 'unpublish'
	| 'delete'
	| 'pending_save'
	| 'discard_pending'
	| 'restore_pending'

export type ArticleRevisionSummary = {
	id: string
	articleId: string
	eventType: ArticleRevisionEventType
	actorPbUserId: string | null
	actor: ArticleAuthorProfile | null
	createdAt: string
}

export type ArticleRevision = ArticleRevisionSummary & {
	snapshot: ArticleSnapshotPayload
}

export type ArticleRevisionListResponse = {
	items: ArticleRevisionSummary[]
	nextCursor: string | null
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

export type BannerScope = 'landing' | 'section' | 'article' | 'all_articles'

export const BANNER_SCOPES: BannerScope[] = ['landing', 'section', 'article', 'all_articles']

export const BANNER_SCOPE_LABELS: Record<BannerScope, string> = {
	landing: 'Research landing page',
	section: 'Section',
	article: 'Specific article',
	all_articles: 'All articles'
}

export type BannerKind = 'text' | 'image' | 'image-horizontal'

export const BANNER_KINDS: BannerKind[] = ['text', 'image', 'image-horizontal']

export const BANNER_KIND_LABELS: Record<BannerKind, string> = {
	text: 'Text strip',
	image: 'Desktop image',
	'image-horizontal': 'Wide/mobile image'
}

export const BANNER_KIND_DESCRIPTIONS: Record<BannerKind, string> = {
	text: 'Full-width dismissible strip at the top of the page',
	image: 'Desktop image used by landing placements or the article right rail',
	'image-horizontal': 'Wide image used by landing placements or the mobile article body'
}

export type Banner = {
	id: string
	type: BannerKind
	scope: BannerScope
	section: ArticleSection | null
	articleId: string | null
	text: string | null
	linkUrl: string | null
	linkLabel: string | null
	imageUrl: string | null
	imageAlt: string | null
	enabled: boolean
	createdByPbUserId: string
	createdAt: string
	updatedAt: string
}

export type BannerPayload = {
	type?: BannerKind
	scope: BannerScope
	section?: ArticleSection | null
	articleId?: string | null
	text?: string | null
	linkUrl?: string | null
	linkLabel?: string | null
	imageUrl?: string | null
	imageAlt?: string | null
	enabled?: boolean
}

export type BannerLookupResult = {
	text: Banner | null
	image: Banner | null
	imageHorizontal: Banner | null
}
