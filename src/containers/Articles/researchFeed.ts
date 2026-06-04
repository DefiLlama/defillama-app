import { escapeXml, SITEMAP_BASE_URL } from '~/utils/sitemapXml'
import { articleCanonicalUrl } from './ArticleSeo'
import { normalizeArticleContentJson } from './document'
import { getArticleBylineAuthorEntries, readingMinutes } from './landing/utils'
import { imageFigureHtml, tiptapJsonToHtml } from './renderer/tiptapToHtml'
import { ARTICLE_SECTION_LABELS, type ArticleDocument, type ArticleEntityType, type TiptapJson } from './types'

export const RESEARCH_FEED_ITEM_COUNT = 20

export const RESEARCH_FEED_URL = `${SITEMAP_BASE_URL}/research/feed.xml`
export const RESEARCH_FEED_TITLE = 'DefiLlama Research'
export const RESEARCH_FEED_DESCRIPTION =
	'Data-driven crypto and digital asset research, market analysis, and interviews from DefiLlama Research.'
const FEED_HUB_URL = `${SITEMAP_BASE_URL}/research`
const FEED_IMAGE_URL = `${SITEMAP_BASE_URL}/icons/favicon-96x96.png`
const FEED_IMAGE_DIMENSION = 96
const FEED_COPYRIGHT = '© DefiLlama Research'
const FEED_GENERATOR = 'DefiLlama Research CMS'
const FEED_TTL_MINUTES = 30
const FEED_NS = 'https://defillama.com/ns/research'

const ENTITY_TYPE_MAP: Partial<Record<ArticleEntityType, string>> = {
	cex: 'organization',
	bridge: 'protocol'
}

function toRfc822(value: string | null | undefined): string | null {
	if (!value) return null
	const timestamp = Date.parse(value)
	if (!Number.isFinite(timestamp)) return null
	return new Date(timestamp).toUTCString()
}

function toIso8601(value: string | null | undefined): string | null {
	if (!value) return null
	const timestamp = Date.parse(value)
	if (!Number.isFinite(timestamp)) return null
	return new Date(timestamp).toISOString()
}

function inferImageMimeType(url: string): string {
	const extension = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase()
	if (extension === 'png') return 'image/png'
	if (extension === 'webp') return 'image/webp'
	if (extension === 'gif') return 'image/gif'
	if (extension === 'svg') return 'image/svg+xml'
	return 'image/jpeg'
}

function articleEntities(article: ArticleDocument): { type: string; label: string }[] {
	const seen = new Set<string>()
	const result: { type: string; label: string }[] = []
	const push = (type: string, label: string) => {
		const name = label.trim()
		if (!name) return
		const key = `${type}:${name}`
		if (seen.has(key)) return
		seen.add(key)
		result.push({ type, label: name })
	}

	for (const interviewee of article.interviewees ?? []) {
		push('person', interviewee.name)
	}
	for (const entry of getArticleBylineAuthorEntries(article) ?? []) {
		if (entry.name === 'DefiLlama Research') continue
		push('person', entry.name)
	}
	for (const entity of article.entities ?? []) {
		push(ENTITY_TYPE_MAP[entity.entityType] ?? entity.entityType, entity.label)
	}

	return result
}

function articlePubDate(article: ArticleDocument): string | null {
	return toRfc822(article.firstPublishedAt ?? article.publishedAt)
}

function articleByline(article: ArticleDocument): string | null {
	const entries = getArticleBylineAuthorEntries(article)
	if (!entries || entries.length === 0) return null
	return entries.map((entry) => entry.name).join(', ')
}

function hasRenderableBody(json: TiptapJson | null | undefined): boolean {
	return (
		!!json && typeof json === 'object' && json.type === 'doc' && Array.isArray(json.content) && json.content.length > 0
	)
}

function articleContentHtml(article: ArticleDocument): string {
	const cover = article.coverImage?.url
		? imageFigureHtml({
				src: article.coverImage.url,
				alt: article.coverImage.alt,
				caption: article.coverImage.caption,
				credit: article.coverImage.credit,
				copyright: article.coverImage.copyright,
				headline: article.coverImage.headline
			})
		: ''

	let body = hasRenderableBody(article.contentJson)
		? tiptapJsonToHtml(normalizeArticleContentJson(article.contentJson))
		: ''
	if (!body.trim()) {
		const fallback = (article.excerpt || article.plainText || '').trim()
		body = fallback ? `<p>${escapeXml(fallback)}</p>` : ''
	}
	return `${cover}${body}`
}

function wrapCdata(html: string): string {
	return `<![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

function buildItem(article: ArticleDocument): string {
	const url = articleCanonicalUrl(article)
	const pubDate = articlePubDate(article)
	const updatedDate = toIso8601(article.lastPublishedAt ?? article.updatedAt)
	const byline = articleByline(article)
	const description = article.seoDescription || article.excerpt || ''
	const summary = (article.excerpt || '').trim()
	const tags = Array.isArray(article.tags) ? article.tags : []
	const sectionLabel = article.section ? ARTICLE_SECTION_LABELS[article.section] : ''
	const coverUrl = article.coverImage?.url

	const parts = [
		`<title>${escapeXml(article.title)}</title>`,
		`<link>${escapeXml(url)}</link>`,
		`<atom:link rel="alternate" href="${escapeXml(url)}" type="text/html" />`,
		`<guid isPermaLink="true">${escapeXml(url)}</guid>`,
		pubDate ? `<pubDate>${pubDate}</pubDate>` : '',
		updatedDate ? `<dc:date>${updatedDate}</dc:date>` : '',
		sectionLabel ? `<dc:type>${escapeXml(sectionLabel)}</dc:type>` : '',
		`<dl:readingTime>${readingMinutes(article)}</dl:readingTime>`,
		byline ? `<dc:creator>${escapeXml(byline)}</dc:creator>` : '',
		description ? `<description>${escapeXml(description)}</description>` : '',
		summary ? `<atom:summary>${escapeXml(summary)}</atom:summary>` : '',
		...tags.map((tag) => `<category>${escapeXml(tag)}</category>`),
		...articleEntities(article).map(
			(entity) => `<dl:entity type="${escapeXml(entity.type)}">${escapeXml(entity.label)}</dl:entity>`
		),
		coverUrl ? `<media:content url="${escapeXml(coverUrl)}" medium="image" />` : '',
		coverUrl ? `<enclosure url="${escapeXml(coverUrl)}" type="${inferImageMimeType(coverUrl)}" length="0" />` : '',
		`<content:encoded>${wrapCdata(articleContentHtml(article))}</content:encoded>`
	]

	return `<item>${parts.filter(Boolean).join('')}</item>`
}

export function buildResearchRssFeed(articles: ArticleDocument[]): string {
	const items = articles.filter((article) => Boolean(article.section))
	const lastBuildDate = items.map(articlePubDate).find((date): date is string => Boolean(date))

	const channelParts = [
		`<title>${escapeXml(RESEARCH_FEED_TITLE)}</title>`,
		`<link>${escapeXml(FEED_HUB_URL)}</link>`,
		`<description>${escapeXml(RESEARCH_FEED_DESCRIPTION)}</description>`,
		`<language>en</language>`,
		`<copyright>${escapeXml(FEED_COPYRIGHT)}</copyright>`,
		`<generator>${escapeXml(FEED_GENERATOR)}</generator>`,
		`<ttl>${FEED_TTL_MINUTES}</ttl>`,
		`<atom:link href="${escapeXml(RESEARCH_FEED_URL)}" rel="self" type="application/rss+xml" />`,
		`<image><url>${escapeXml(FEED_IMAGE_URL)}</url><title>${escapeXml(RESEARCH_FEED_TITLE)}</title><link>${escapeXml(FEED_HUB_URL)}</link><width>${FEED_IMAGE_DIMENSION}</width><height>${FEED_IMAGE_DIMENSION}</height></image>`,
		lastBuildDate ? `<lastBuildDate>${lastBuildDate}</lastBuildDate>` : '',
		...items.map(buildItem)
	]

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dl="${FEED_NS}">
<channel>
${channelParts.filter(Boolean).join('\n')}
</channel>
</rss>
`
}
