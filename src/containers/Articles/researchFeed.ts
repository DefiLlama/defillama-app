import { escapeXml, SITEMAP_BASE_URL } from '~/utils/sitemapXml'
import { articleCanonicalUrl } from './ArticleSeo'
import { normalizeArticleContentJson } from './document'
import { getArticleBylineAuthorEntries } from './landing/utils'
import { imageFigureHtml, tiptapJsonToHtml } from './renderer/tiptapToHtml'
import type { ArticleDocument, TiptapJson } from './types'

export const RESEARCH_FEED_ITEM_COUNT = 20

export const RESEARCH_FEED_URL = `${SITEMAP_BASE_URL}/research/feed.xml`
export const RESEARCH_FEED_TITLE = 'DefiLlama Research'
export const RESEARCH_FEED_DESCRIPTION =
	'Data-driven crypto and digital asset research, market analysis, and interviews from DefiLlama Research.'
const FEED_HUB_URL = `${SITEMAP_BASE_URL}/research`
const FEED_IMAGE_URL = `${SITEMAP_BASE_URL}/icons/favicon-96x96.png`
const FEED_IMAGE_DIMENSION = 96

function toRfc822(value: string | null | undefined): string | null {
	if (!value) return null
	const timestamp = Date.parse(value)
	if (!Number.isFinite(timestamp)) return null
	return new Date(timestamp).toUTCString()
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
	const byline = articleByline(article)
	const description = article.seoDescription || article.excerpt || ''
	const tags = Array.isArray(article.tags) ? article.tags : []

	const parts = [
		`<title>${escapeXml(article.title)}</title>`,
		`<link>${escapeXml(url)}</link>`,
		`<guid isPermaLink="true">${escapeXml(url)}</guid>`,
		pubDate ? `<pubDate>${pubDate}</pubDate>` : '',
		byline ? `<dc:creator>${escapeXml(byline)}</dc:creator>` : '',
		description ? `<description>${escapeXml(description)}</description>` : '',
		...tags.map((tag) => `<category>${escapeXml(tag)}</category>`),
		article.coverImage?.url ? `<media:content url="${escapeXml(article.coverImage.url)}" medium="image" />` : '',
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
		`<atom:link href="${escapeXml(RESEARCH_FEED_URL)}" rel="self" type="application/rss+xml" />`,
		`<image><url>${escapeXml(FEED_IMAGE_URL)}</url><title>${escapeXml(RESEARCH_FEED_TITLE)}</title><link>${escapeXml(FEED_HUB_URL)}</link><width>${FEED_IMAGE_DIMENSION}</width><height>${FEED_IMAGE_DIMENSION}</height></image>`,
		lastBuildDate ? `<lastBuildDate>${lastBuildDate}</lastBuildDate>` : '',
		...items.map(buildItem)
	]

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
${channelParts.filter(Boolean).join('\n')}
</channel>
</rss>
`
}
