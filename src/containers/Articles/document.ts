import { validateArticleChartConfig } from './chartAdapters'
import { extractArticleContent } from './extractors'
import type { ArticleImage, LocalArticleDocument, TiptapJson, ValidationResult } from './types'

export const ARTICLE_CONTENT_VERSION = 1
export const ARTICLE_RENDERER_VERSION = 1
export const ARTICLE_EDITOR_SCHEMA_VERSION = 1

const FORBIDDEN_NODE_TYPES = new Set(['dashboardEmbed', 'dashboard-embed'])

export const EMPTY_ARTICLE_CONTENT: TiptapJson = {
	type: 'doc',
	content: [
		{
			type: 'heading',
			attrs: { level: 2 },
			content: [{ type: 'text', text: 'Start with a research question' }]
		},
		{
			type: 'paragraph',
			content: [{ type: 'text', text: 'Write the first paragraph, then link entities or insert a DefiLlama chart.' }]
		}
	]
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function normalizeSlug(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 120)
}

function normalizeDate(value: unknown, fallback: string) {
	if (typeof value !== 'string') return fallback
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function normalizeTags(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	const seen = new Set<string>()
	const tags: string[] = []
	for (const item of value) {
		if (typeof item !== 'string') continue
		const normalized = normalizeSlug(item)
		if (!normalized || seen.has(normalized)) continue
		seen.add(normalized)
		tags.push(normalized)
		if (tags.length >= 12) break
	}
	return tags
}

function normalizeCoverImage(value: unknown): ArticleImage | null | undefined {
	if (value == null) return null
	if (!isRecord(value)) return undefined
	const url = optionalString(value.url)
	if (!url) return undefined
	return {
		url,
		...(optionalString(value.alt) ? { alt: optionalString(value.alt) } : {}),
		...(optionalString(value.caption) ? { caption: optionalString(value.caption) } : {}),
		...(optionalString(value.credit) ? { credit: optionalString(value.credit) } : {}),
		...(optionalString(value.copyright) ? { copyright: optionalString(value.copyright) } : {}),
		...(optionalString(value.headline) ? { headline: optionalString(value.headline) } : {}),
		...(typeof value.width === 'number' && Number.isFinite(value.width) ? { width: value.width } : {}),
		...(typeof value.height === 'number' && Number.isFinite(value.height) ? { height: value.height } : {})
	}
}

function hasForbiddenDashboardEmbed(node: unknown): boolean {
	if (!isRecord(node)) return false
	const type = typeof node.type === 'string' ? node.type : undefined
	if (type && FORBIDDEN_NODE_TYPES.has(type)) return true

	const attrs = isRecord(node.attrs) ? node.attrs : null
	const config = isRecord(attrs?.config) ? attrs.config : null
	if (config?.kind === 'dashboard-embed' || config?.kind === 'dashboardEmbed') return true
	if (Array.isArray(attrs?.items) || Array.isArray(attrs?.dashboardItems)) return true

	const chartConfig = type === 'defillamaChart' ? validateArticleChartConfig(attrs?.config) : null
	if (type === 'defillamaChart' && !chartConfig) return true

	if (Array.isArray(node.content)) {
		return node.content.some(hasForbiddenDashboardEmbed)
	}

	return false
}

function normalizeContentJson(value: unknown): TiptapJson {
	if (!isRecord(value) || value.type !== 'doc') return EMPTY_ARTICLE_CONTENT
	return value as TiptapJson
}

export function normalizeLocalArticleDocument(
	input: unknown,
	existing?: LocalArticleDocument | null,
	now = new Date().toISOString()
): ValidationResult<LocalArticleDocument> {
	if (!isRecord(input)) return { ok: false, error: 'Article payload must be an object' }

	const title = optionalString(input.title) || 'Untitled research'
	const slug = normalizeSlug(optionalString(input.slug) || title) || 'local-article'
	const status = input.status === 'published' ? 'published' : 'draft'
	const contentJson = normalizeContentJson(input.contentJson)

	if (hasForbiddenDashboardEmbed(contentJson)) {
		return { ok: false, error: 'Dashboard embeds are not supported in articles' }
	}

	const coverImage = normalizeCoverImage(input.coverImage)
	if (coverImage === undefined) {
		return { ok: false, error: 'coverImage must be null or an object with a url' }
	}

	const createdAt = normalizeDate(input.createdAt, existing?.createdAt ?? now)
	const updatedAt = now
	const previousPublishedAt = existing?.publishedAt ?? null
	const incomingPublishedAt = typeof input.publishedAt === 'string' ? input.publishedAt : null
	const publishedAt = status === 'published' ? normalizeDate(incomingPublishedAt, previousPublishedAt ?? now) : null
	const extracted = extractArticleContent(contentJson)
	const trimmedPlain = extracted.plainText.trim()
	const firstSentenceMatch = trimmedPlain.match(/^[\s\S]*?[.!?](?:\s|$)/)
	const derivedExcerpt = (firstSentenceMatch ? firstSentenceMatch[0] : trimmedPlain).trim().slice(0, 240)
	const derivedSeo = trimmedPlain.replace(/\s+/g, ' ').slice(0, 160)
	const excerpt = optionalString(input.excerpt) ?? (derivedExcerpt || undefined)
	const seoDescription = optionalString(input.seoDescription) ?? (derivedSeo || undefined)

	return {
		ok: true,
		value: {
			contentVersion: ARTICLE_CONTENT_VERSION,
			rendererVersion: ARTICLE_RENDERER_VERSION,
			editorSchemaVersion: ARTICLE_EDITOR_SCHEMA_VERSION,
			...(optionalString(input.id) ? { id: optionalString(input.id) } : {}),
			title,
			...(optionalString(input.subtitle) ? { subtitle: optionalString(input.subtitle) } : {}),
			slug,
			status,
			...(optionalString(input.author) ? { author: optionalString(input.author) } : {}),
			...(isRecord(input.authorProfile)
				? { authorProfile: input.authorProfile as LocalArticleDocument['authorProfile'] }
				: {}),
			...(optionalString(input.seoTitle) ? { seoTitle: optionalString(input.seoTitle) } : {}),
			...(seoDescription ? { seoDescription } : {}),
			...(excerpt ? { excerpt } : {}),
			coverImage,
			contentJson,
			plainText: extracted.plainText,
			entities: extracted.entities,
			charts: extracted.charts,
			citations: extracted.citations,
			embeds: extracted.embeds,
			tags: normalizeTags(input.tags),
			...(typeof input.featuredRank === 'number' && Number.isInteger(input.featuredRank)
				? { featuredRank: input.featuredRank }
				: {}),
			...(optionalString(input.featuredUntil) ? { featuredUntil: normalizeDate(input.featuredUntil, now) } : {}),
			createdAt,
			updatedAt,
			publishedAt
		}
	}
}

export function createEmptyLocalArticle(now = new Date().toISOString()): LocalArticleDocument {
	const normalized = normalizeLocalArticleDocument(
		{
			title: 'Untitled research',
			slug: 'local-article',
			status: 'draft',
			coverImage: null,
			tags: [],
			contentJson: EMPTY_ARTICLE_CONTENT,
			createdAt: now,
			updatedAt: now,
			publishedAt: null
		},
		null,
		now
	)

	if (normalized.ok === false) {
		throw new Error(normalized.error)
	}

	return normalized.value
}
