import { validateArticleChartConfig } from './chartAdapters'
import { validateArticlePeoplePanel } from './editor/peoplePanel'
import { validateEmbedConfig } from './embedProviders'
import { createArticleEntityRef, isValidArticleEntityType } from './entityLinks'
import type {
	ArticleCitation,
	ArticleEmbedConfig,
	ArticleEntityRef,
	ArticleEntityType,
	ArticleExtractionResult,
	TiptapJson,
	TiptapMark
} from './types'

const BLOCK_TEXT_NODES = new Set([
	'paragraph',
	'heading',
	'blockquote',
	'listItem',
	'callout',
	'defillamaChart',
	'articleEmbed',
	'articleImage',
	'articlePeoplePanel',
	'qa',
	'qaQuestion',
	'qaAnswer',
	'tableCell',
	'tableHeader'
])

function stringAttr(attrs: Record<string, unknown> | null | undefined, key: string) {
	const value = attrs?.[key]
	return typeof value === 'string' ? value : undefined
}

function addUnique<T>(map: Map<string, T>, key: string, value: T) {
	if (!map.has(key)) map.set(key, value)
}

function extractEntityFromMark(mark: TiptapMark, fallbackLabel: string): ArticleEntityRef | null {
	if (mark.type !== 'entityLink') return null
	const entityType = stringAttr(mark.attrs, 'entityType')
	const slug = stringAttr(mark.attrs, 'slug')
	if (!entityType || !slug || !isValidArticleEntityType(entityType)) return null
	return createArticleEntityRef({
		entityType: entityType as ArticleEntityType,
		slug,
		label: stringAttr(mark.attrs, 'label') || fallbackLabel,
		route: stringAttr(mark.attrs, 'route')
	})
}

function extractCitation(attrs: Record<string, unknown> | null | undefined): ArticleCitation | null {
	const id = stringAttr(attrs, 'id')
	if (!id) return null
	return {
		id,
		label: stringAttr(attrs, 'label') || id,
		...(stringAttr(attrs, 'url') ? { url: stringAttr(attrs, 'url') } : {}),
		...(stringAttr(attrs, 'title') ? { title: stringAttr(attrs, 'title') } : {})
	}
}

export function extractArticleContent(contentJson: TiptapJson): ArticleExtractionResult {
	const textParts: string[] = []
	const entities = new Map<string, ArticleEntityRef>()
	const charts = new Map<string, NonNullable<ArticleExtractionResult['charts'][number]>>()
	const citations = new Map<string, ArticleCitation>()
	const embeds = new Map<string, ArticleEmbedConfig>()

	const visit = (node: TiptapJson | null | undefined) => {
		if (!node) return

		if (node.type === 'text') {
			const text = node.text ?? ''
			textParts.push(text)
			for (const mark of node.marks ?? []) {
				const entity = extractEntityFromMark(mark, text)
				if (entity) addUnique(entities, `${entity.entityType}:${entity.slug}`, entity)
			}
			return
		}

		if (node.type === 'hardBreak') {
			textParts.push('\n')
			return
		}

		if (node.type === 'defillamaChart') {
			const config = validateArticleChartConfig(node.attrs?.config)
			if (config) {
				const seriesKey = config.series.map((s) => `${s.entityType}:${s.slug}:${s.chartType}`).join('+')
				const key = `${seriesKey}:${config.range ?? 'all'}`
				addUnique(charts, key, config)
				const label = config.series.map((s) => s.name).join(' vs ')
				textParts.push(`[Chart: ${label}]`)
			}
		}

		if (node.type === 'citation') {
			const citation = extractCitation(node.attrs)
			if (citation) {
				addUnique(citations, citation.id, citation)
				textParts.push(`[${citation.label}]`)
			}
		}

		if (node.type === 'articleEmbed') {
			const embed = validateEmbedConfig(node.attrs?.config)
			if (embed) {
				addUnique(embeds, `${embed.provider}:${embed.url}`, embed)
				textParts.push(`[Embed: ${embed.title || embed.caption || embed.sourceUrl}]`)
			}
		}

		if (node.type === 'articleImage') {
			const alt = stringAttr(node.attrs, 'alt')?.trim() ?? ''
			const caption = stringAttr(node.attrs, 'caption')?.trim() ?? ''
			const label = caption ? (alt ? `${alt} — ${caption}` : caption) : alt || 'image'
			textParts.push(`[Image: ${label}]`)
		}

		if (node.type === 'articlePeoplePanel') {
			const config = validateArticlePeoplePanel(node.attrs?.config)
			if (config) {
				if (config.label) textParts.push(`[Section: ${config.label}]\n`)
				for (const item of config.items) {
					if (item.name) textParts.push(`${item.name}\n`)
					if (item.bio) textParts.push(`${item.bio}\n`)
				}
			}
		}

		const shouldPad = node.type && BLOCK_TEXT_NODES.has(node.type)
		if (shouldPad && textParts.length > 0 && !textParts[textParts.length - 1].endsWith('\n')) {
			textParts.push('\n')
		}

		for (const child of node.content ?? []) {
			visit(child)
		}

		if (shouldPad && textParts.length > 0 && !textParts[textParts.length - 1].endsWith('\n')) {
			textParts.push('\n')
		}
	}

	visit(contentJson)

	return {
		plainText: textParts
			.join('')
			.replace(/\n{3,}/g, '\n\n')
			.trim(),
		entities: Array.from(entities.values()),
		charts: Array.from(charts.values()),
		citations: Array.from(citations.values()),
		embeds: Array.from(embeds.values())
	}
}

export function getTiptapNodeText(node: TiptapJson | null | undefined): string {
	if (!node) return ''
	if (node.type === 'text') return node.text ?? ''
	if (node.type === 'hardBreak') return '\n'
	return (node.content ?? []).map(getTiptapNodeText).join('')
}

export type ArticleQAPair = { question: string; answer: string }

function getQAAnswerText(answerNode: TiptapJson | null | undefined): string {
	if (!answerNode) return ''
	const paragraphs = (answerNode.content ?? []).map((child) => getTiptapNodeText(child).trim()).filter(Boolean)
	return paragraphs.join(' ').replace(/\s+/g, ' ').trim()
}

export function extractQAPairs(contentJson: TiptapJson | null | undefined): ArticleQAPair[] {
	const pairs: ArticleQAPair[] = []
	const visit = (node: TiptapJson | null | undefined) => {
		if (!node) return
		if (node.type === 'qa') {
			const children = node.content ?? []
			const questionNode = children.find((child) => child?.type === 'qaQuestion')
			const answerNode = children.find((child) => child?.type === 'qaAnswer')
			const question = questionNode ? getTiptapNodeText(questionNode).trim() : ''
			const answer = getQAAnswerText(answerNode)
			if (question && answer) pairs.push({ question, answer })
			return
		}
		for (const child of node.content ?? []) visit(child)
	}
	visit(contentJson)
	return pairs
}
