import { FEATURES_SERVER } from '~/constants'
import { SITEMAP_BASE_URL } from '~/utils/sitemapXml'
import { validateArticleChartConfig } from '../chartAdapters'
import { validateArticlePeoplePanel } from '../editor/peoplePanel'
import { getEmbedProviderLabel, validateEmbedConfig } from '../embedProviders'
import { getArticleEntityRoute, isValidArticleEntityType } from '../entityLinks'
import { getTiptapNodeText } from '../extractors'
import type { ArticleCalloutTone, ArticleEntityType, TiptapJson, TiptapMark } from '../types'

const SITE_ORIGIN = SITEMAP_BASE_URL
const MEDIA_ORIGIN = FEATURES_SERVER.replace(/\/$/, '')

export type FeedImageInput = {
	src?: string | null
	alt?: string | null
	caption?: string | null
	credit?: string | null
	copyright?: string | null
	headline?: string | null
	href?: string | null
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
	return escapeHtml(value).replace(/"/g, '&quot;')
}

function stringAttr(attrs: Record<string, unknown> | null | undefined, key: string): string | undefined {
	const value = attrs?.[key]
	return typeof value === 'string' ? value : undefined
}

function absolutize(url: string | null | undefined, base: string): string | null {
	if (!url) return null
	const trimmed = url.trim()
	if (!trimmed) return null
	if (/^https?:\/\//i.test(trimmed)) return trimmed
	if (trimmed.startsWith('//')) return `https:${trimmed}`
	if (trimmed.startsWith('mailto:')) return trimmed
	return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
}

function renderChildren(node: TiptapJson): string {
	return (node.content ?? []).map(renderNode).join('')
}

function applyMark(children: string, mark: TiptapMark): string {
	if (mark.type === 'bold') return `<strong>${children}</strong>`
	if (mark.type === 'italic') return `<em>${children}</em>`
	if (mark.type === 'strike') return `<s>${children}</s>`
	if (mark.type === 'underline') return `<u>${children}</u>`
	if (mark.type === 'highlight') return `<mark>${children}</mark>`
	if (mark.type === 'code') return `<code>${children}</code>`
	if (mark.type === 'link') {
		const href = stringAttr(mark.attrs, 'href')
		if (!href) return children
		const target = /^(\/|#)/.test(href) ? absolutize(href, SITE_ORIGIN) : href
		if (!target) return children
		return `<a href="${escapeAttr(target)}">${children}</a>`
	}
	if (mark.type === 'entityLink') {
		const entityType = stringAttr(mark.attrs, 'entityType')
		const slug = stringAttr(mark.attrs, 'slug')
		if (!entityType || !slug || !isValidArticleEntityType(entityType)) return children
		const route = stringAttr(mark.attrs, 'route') || getArticleEntityRoute(entityType as ArticleEntityType, slug)
		return `<a href="${escapeAttr(`${SITE_ORIGIN}${route}`)}">${children}</a>`
	}
	return children
}

function renderInlineText(node: TiptapJson): string {
	let html = escapeHtml(node.text ?? '')
	for (const mark of node.marks ?? []) {
		html = applyMark(html, mark)
	}
	return html
}

export function imageFigureHtml(image: FeedImageInput): string {
	const src = absolutize(image.src, MEDIA_ORIGIN)
	if (!src) return ''
	const alt = escapeAttr((image.alt ?? '').trim())
	const imgTag = `<img src="${escapeAttr(src)}" alt="${alt}" />`
	const linkHref = absolutize(image.href, SITE_ORIGIN)
	const media = linkHref ? `<a href="${escapeAttr(linkHref)}">${imgTag}</a>` : imgTag

	const captionLines: string[] = []
	if (image.headline?.trim()) captionLines.push(image.headline.trim())
	if (image.caption?.trim()) captionLines.push(image.caption.trim())
	const creditBits: string[] = []
	if (image.credit?.trim()) creditBits.push(`Credit: ${image.credit.trim()}`)
	if (image.copyright?.trim()) creditBits.push(`© ${image.copyright.trim()}`)
	if (creditBits.length) captionLines.push(creditBits.join(' · '))

	const figcaption = captionLines.length
		? `<figcaption>${captionLines.map(escapeHtml).join('<br />')}</figcaption>`
		: ''
	return `<figure>${media}${figcaption}</figure>`
}

function renderCodeBlock(node: TiptapJson): string {
	const language = stringAttr(node.attrs, 'language') || 'plaintext'
	return `<pre><code class="language-${escapeAttr(language)}">${escapeHtml(getTiptapNodeText(node))}</code></pre>`
}

function renderCallout(node: TiptapJson): string {
	const tone = (stringAttr(node.attrs, 'tone') as ArticleCalloutTone | undefined) || 'note'
	if (tone === 'pullquote') return `<blockquote>${renderChildren(node)}</blockquote>`
	const label = tone.charAt(0).toUpperCase() + tone.slice(1)
	return `<aside><strong>${escapeHtml(label)}</strong>${renderChildren(node)}</aside>`
}

function renderCitation(node: TiptapJson): string {
	const label = stringAttr(node.attrs, 'label') || stringAttr(node.attrs, 'id') || ''
	const title = stringAttr(node.attrs, 'title')
	const url = absolutize(stringAttr(node.attrs, 'url'), SITE_ORIGIN)
	const text = `[${escapeHtml(label)}]`
	if (url) {
		const titleAttr = title ? ` title="${escapeAttr(title)}"` : ''
		return `<a href="${escapeAttr(url)}"${titleAttr}>${text}</a>`
	}
	return text
}

function renderChart(node: TiptapJson): string {
	const config = validateArticleChartConfig(node.attrs?.config)
	if (!config) return ''
	const label = config.caption || config.series.map((series) => series.name).join(' vs ')
	const primary = config.series[0]
	const href = `${SITE_ORIGIN}${getArticleEntityRoute(primary.entityType, primary.slug)}`
	return `<p><em>[Chart: ${escapeHtml(label)}]</em> — <a href="${escapeAttr(href)}">View on DefiLlama</a></p>`
}

function renderEmbed(node: TiptapJson): string {
	const config = validateEmbedConfig(node.attrs?.config)
	if (!config) return ''
	const label = getEmbedProviderLabel(config.provider)
	const text = config.title || config.caption || config.sourceUrl
	return `<p>[${escapeHtml(label)}] <a href="${escapeAttr(config.sourceUrl)}">${escapeHtml(text)}</a></p>`
}

function renderPeoplePanel(node: TiptapJson): string {
	const config = validateArticlePeoplePanel(node.attrs?.config)
	if (!config) return ''
	const heading = config.label ? `<h4>${escapeHtml(config.label)}</h4>` : ''
	const people = config.items
		.map((item) => {
			const src = absolutize(item.src, MEDIA_ORIGIN)
			const avatar = src ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(item.name)}" /> ` : ''
			const name = item.href
				? `<a href="${escapeAttr(item.href)}"><strong>${escapeHtml(item.name)}</strong></a>`
				: `<strong>${escapeHtml(item.name)}</strong>`
			const bio = item.bio ? `: ${escapeHtml(item.bio)}` : ''
			return `<p>${avatar}${name}${bio}</p>`
		})
		.join('')
	return `<section>${heading}${people}</section>`
}

function cellAttrs(node: TiptapJson): string {
	const colspan = Number(node.attrs?.colspan)
	const rowspan = Number(node.attrs?.rowspan)
	let attrs = ''
	if (Number.isFinite(colspan) && colspan > 1) attrs += ` colspan="${colspan}"`
	if (Number.isFinite(rowspan) && rowspan > 1) attrs += ` rowspan="${rowspan}"`
	return attrs
}

function renderTable(node: TiptapJson): string {
	const rows = node.content ?? []
	const headerRows: TiptapJson[] = []
	const bodyRows: TiptapJson[] = []
	let inHeader = true
	for (const row of rows) {
		if (row.type !== 'tableRow') continue
		const cells = row.content ?? []
		const allHeader = cells.length > 0 && cells.every((cell) => cell.type === 'tableHeader')
		if (inHeader && allHeader) headerRows.push(row)
		else {
			inHeader = false
			bodyRows.push(row)
		}
	}
	const thead = headerRows.length ? `<thead>${headerRows.map(renderNode).join('')}</thead>` : ''
	const tbody = `<tbody>${bodyRows.map(renderNode).join('')}</tbody>`
	return `<table>${thead}${tbody}</table>`
}

function renderNode(node: TiptapJson): string {
	if (node.type === 'text') return renderInlineText(node)
	if (node.type === 'hardBreak') return '<br />'
	if (node.type === 'doc') return renderChildren(node)
	if (node.type === 'paragraph') return `<p>${renderChildren(node)}</p>`
	if (node.type === 'heading') {
		const rawLevel = Number(node.attrs?.level) || 2
		const level = rawLevel >= 3 && rawLevel <= 6 ? rawLevel : 2
		return `<h${level}>${renderChildren(node)}</h${level}>`
	}
	if (node.type === 'bulletList') return `<ul>${renderChildren(node)}</ul>`
	if (node.type === 'orderedList') return `<ol>${renderChildren(node)}</ol>`
	if (node.type === 'taskList') return `<ul>${renderChildren(node)}</ul>`
	if (node.type === 'taskItem') {
		const box = node.attrs?.checked ? '[x] ' : '[ ] '
		return `<li>${box}${renderChildren(node)}</li>`
	}
	if (node.type === 'listItem') return `<li>${renderChildren(node)}</li>`
	if (node.type === 'blockquote') return `<blockquote>${renderChildren(node)}</blockquote>`
	if (node.type === 'horizontalRule') return '<hr />'
	if (node.type === 'codeBlock') return renderCodeBlock(node)
	if (node.type === 'callout') return renderCallout(node)
	if (node.type === 'citation') return renderCitation(node)
	if (node.type === 'defillamaChart') return renderChart(node)
	if (node.type === 'articleEmbed') return renderEmbed(node)
	if (node.type === 'articleImage') {
		return imageFigureHtml({
			src: stringAttr(node.attrs, 'src'),
			alt: stringAttr(node.attrs, 'alt'),
			caption: stringAttr(node.attrs, 'caption'),
			credit: stringAttr(node.attrs, 'credit'),
			copyright: stringAttr(node.attrs, 'copyright'),
			headline: stringAttr(node.attrs, 'headline'),
			href: stringAttr(node.attrs, 'href')
		})
	}
	if (node.type === 'articlePeoplePanel') return renderPeoplePanel(node)
	if (node.type === 'qa') return `<dl>${renderChildren(node)}</dl>`
	if (node.type === 'qaQuestion') return `<dt>${renderChildren(node)}</dt>`
	if (node.type === 'qaAnswer') return `<dd>${renderChildren(node)}</dd>`
	if (node.type === 'table') return renderTable(node)
	if (node.type === 'tableRow') return `<tr>${renderChildren(node)}</tr>`
	if (node.type === 'tableHeader') return `<th${cellAttrs(node)}>${renderChildren(node)}</th>`
	if (node.type === 'tableCell') return `<td${cellAttrs(node)}>${renderChildren(node)}</td>`
	return renderChildren(node)
}

export function tiptapJsonToHtml(json: TiptapJson | null | undefined): string {
	if (!json || typeof json !== 'object') return ''
	if (json.type === 'doc') return renderChildren(json)
	return renderNode(json)
}
