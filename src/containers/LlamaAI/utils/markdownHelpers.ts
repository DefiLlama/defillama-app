/**
 * Utility functions for markdown processing in LlamaAI.
 */

import DOMPurify from 'dompurify'
import type { UnifiedCitationReference } from '~/containers/LlamaAI/types'
import { stripBeforeReportStart } from '~/containers/LlamaAI/utils/reportMarkers'

/**
 * Only allow secure external links in user-generated citations and artifacts.
 */
const ALLOWED_PROTOCOLS = ['https:']

/**
 * Validate and sanitize a URL for safe use in href attributes.
 * Returns null if the URL is unsafe or malformed.
 */
export function sanitizeUrl(url: string): string | null {
	if (!url || typeof url !== 'string') return null

	const trimmed = url.trim()
	if (!trimmed) return null

	try {
		const parsed = new URL(trimmed)

		if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
			return null
		}

		if (parsed.username || parsed.password) {
			return null
		}

		return parsed.href
	} catch {
		if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(' ')) {
			try {
				const withProtocol = new URL(`https://${trimmed}`)
				if (withProtocol.username || withProtocol.password) {
					return null
				}
				return withProtocol.href
			} catch {
				return null
			}
		}
		return null
	}
}

const SOURCE_URL_PREFIXES_TO_REPLACE = ['https://preview.dl.llama.fi', 'https://defillama2.llamao.fi'] as const

/**
 * Normalize a citation source URL (rewriting internal preview hosts to defillama.com)
 * and sanitize it. Returns null when the URL is unsafe (e.g. a `javascript:` href).
 */
export function normalizeSourceUrl(url: string): string | null {
	for (const prefix of SOURCE_URL_PREFIXES_TO_REPLACE) {
		if (url.startsWith(prefix)) {
			return sanitizeUrl(`https://defillama.com${url.slice(prefix.length)}`)
		}
	}
	return sanitizeUrl(url)
}

interface ActionPlaceholderData {
	label: string
	message: string
}

type ArtifactMatch =
	| { index: number; length: number; type: 'chart' | 'csv' | 'md' | 'alert' | 'dashboard' | 'image'; id: string }
	| { index: number; length: number; type: 'action'; id: ActionPlaceholderData }

export type ContentPart =
	| { type: 'text'; content: string }
	| { type: 'chart'; chartId: string }
	| { type: 'csv'; csvId: string }
	| { type: 'md'; mdId: string }
	| { type: 'alert'; alertId: string }
	| { type: 'dashboard'; dashboardId: string }
	| { type: 'image'; imageId: string }
	| { type: 'action'; actionLabel: string; actionMessage: string }

interface ParsedContent {
	parts: ContentPart[]
}

/**
 * Parse markdown content to extract chart, CSV, and alert artifact placeholders.
 * Placeholders follow the format [CHART:id], [CSV:id], and [ALERT:id].
 */
export function parseArtifactPlaceholders(content: string): ParsedContent {
	content = stripBeforeReportStart(content)
	const chartPlaceholderPattern = /\[CHART:([^\]]+)\]/g
	const csvPlaceholderPattern = /\[CSV:([^\]]+)\]/g
	const mdPlaceholderPattern = /\[MD:([^\]]+)\]/g
	const alertPlaceholderPattern = /\[ALERT:([^\]]+)\]/g
	const dashboardPlaceholderPattern = /\[DASHBOARD:([^\]]+)\]/g
	const imagePlaceholderPattern = /\[IMAGE:([^\]]+)\]/g
	const actionPlaceholderPattern = /\[ACTION:([^|\]]+)(?:\|([^\]]*))?\]/g
	const parts: ContentPart[] = []

	const allMatches: ArtifactMatch[] = []

	let match: RegExpExecArray | null
	while ((match = chartPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'chart', id: match[1] })
	}
	while ((match = csvPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'csv', id: match[1] })
	}
	while ((match = mdPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'md', id: match[1] })
	}
	while ((match = alertPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'alert', id: match[1] })
	}
	while ((match = dashboardPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'dashboard', id: match[1] })
	}
	while ((match = imagePlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'image', id: match[1] })
	}
	while ((match = actionPlaceholderPattern.exec(content)) !== null) {
		const actionLabel = match[1].trim()
		const actionMessage = match[2]?.trim() || actionLabel
		allMatches.push({
			index: match.index,
			length: match[0].length,
			type: 'action',
			id: { label: actionLabel, message: actionMessage }
		})
	}

	// Each placeholder type is scanned independently, then sorted back into source
	// order so mixed artifacts keep their authored placement.
	allMatches.sort((a, b) => a.index - b.index)

	let lastIndex = 0
	for (const m of allMatches) {
		if (m.index > lastIndex) {
			parts.push({ type: 'text', content: content.slice(lastIndex, m.index) })
		}
		if (m.type === 'action') {
			parts.push({ type: 'action', actionLabel: m.id.label, actionMessage: m.id.message })
		} else if (m.type === 'chart') {
			parts.push({ type: 'chart', chartId: m.id })
		} else if (m.type === 'csv') {
			parts.push({ type: 'csv', csvId: m.id })
		} else if (m.type === 'md') {
			parts.push({ type: 'md', mdId: m.id })
		} else if (m.type === 'dashboard') {
			parts.push({ type: 'dashboard', dashboardId: m.id })
		} else if (m.type === 'image') {
			parts.push({ type: 'image', imageId: m.id })
		} else {
			parts.push({ type: 'alert', alertId: m.id })
		}
		lastIndex = m.index + m.length
	}

	if (lastIndex < content.length) {
		parts.push({ type: 'text', content: content.slice(lastIndex) })
	}

	if (parts.length === 0) {
		parts.push({ type: 'text', content })
	}

	return { parts }
}

export function wrapLegacyUrlCitations(citations: string[]): UnifiedCitationReference[] {
	return citations.map((url, i) => {
		const safe = sanitizeUrl(url)
		let hostname = ''
		if (safe) {
			try {
				hostname = new URL(safe).hostname
			} catch {
				hostname = ''
			}
		}
		const isX = /(^|\.)(x|twitter)\.com$/i.test(hostname)
		return {
			id: i + 1,
			sourceType: isX ? 'x' : 'web',
			label: hostname ? hostname.replace(/^www\./, '') : 'Web',
			url: safe ?? undefined
		}
	})
}

function normalizeCitationMarkerWhitespace(text: string): string {
	return text.replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ')
}

export function processUnifiedCitations(text: string, refsOrUrls?: UnifiedCitationReference[] | string[]): string {
	const citationSequencePattern = String.raw`\d+(?:(?:\s*-\s*\d+)|(?:\s*,\s*\d+))*`
	const markerRegex = new RegExp(
		String.raw`(?:\[(?:\^\s*)?(${citationSequencePattern})\s*\]|【\s*(${citationSequencePattern})(?:\s*†[^】]*)?\s*】)`,
		'g'
	)

	if (refsOrUrls === undefined || refsOrUrls.length === 0) {
		return normalizeCitationMarkerWhitespace(text.replace(markerRegex, ''))
	}

	const refs: UnifiedCitationReference[] =
		typeof refsOrUrls[0] === 'string'
			? wrapLegacyUrlCitations(refsOrUrls as string[])
			: (refsOrUrls as UnifiedCitationReference[])

	const idsAvailable = new Set<number>()
	for (const r of refs) if (typeof r.id === 'number') idsAvailable.add(r.id)

	return normalizeCitationMarkerWhitespace(
		text.replace(markerRegex, (full: string, bracketNums?: string, modelNums?: string) => {
			const nums = bracketNums ?? modelNums ?? ''
			const expanded: number[] = []
			for (const part of nums.split(',').map((p) => p.trim())) {
				if (part.includes('-')) {
					const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10))
					if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
						for (let i = start; i <= end; i++) expanded.push(i)
					}
				} else {
					const n = parseInt(part.trim(), 10)
					if (!Number.isNaN(n)) expanded.push(n)
				}
			}
			const valid = expanded.filter((id) => idsAvailable.has(id))
			if (valid.length === 0) return ''
			return valid.map((id) => `<fact-check-pill data-ref="${id}"></fact-check-pill>`).join('')
		})
	)
}

/**
 * Escape lone "<digits>." lines so the markdown parser doesn't treat them as
 * an ordered-list start (which renders the marker but no content, then gets
 * visually clipped). A line that is just "15." with nothing after the period
 * was meant as plain text — preserve it as such.
 */
export function escapeBareOrderedListMarkers(text: string): string {
	return text.replace(/^(\d+)\.[ \t]*(?=\n|$)/gm, '$1\\.')
}

/**
 * Extract llama:// links from markdown content and build a map of text to URL.
 * Used for resolving entity links in markdown rendering.
 */
export function extractLlamaLinks(content: string): Map<string, string> {
	const linkMap = new Map<string, string>()
	const llamaLinkPattern = /\[([^\]]+)\]\((llama:\/\/[^)]*)\)/g

	let match: RegExpExecArray | null
	while ((match = llamaLinkPattern.exec(content)) !== null) {
		linkMap.set(match[1], match[2])
	}

	return linkMap
}

const SANITIZE_ALLOWED_TAGS = [
	'p',
	'br',
	'b',
	'i',
	'em',
	'strong',
	'a',
	'ul',
	'ol',
	'li',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'img',
	'span',
	'div',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td',
	'blockquote',
	'code',
	'pre',
	'hr',
	'sup',
	'sub'
]

const SANITIZE_ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class']

const CHART_PLACEHOLDER_REGEX = /\[CHART:([^\]]+)\]/g

interface ChartRef {
	id: string
	url: string
	title: string
}

export function sanitizeAlertSummary(html: string, charts: ChartRef[]): string {
	const expanded = html.replace(CHART_PLACEHOLDER_REGEX, (_, chartId: string) => {
		const chart = charts.find((c) => c.id === chartId)
		if (!chart?.url) return ''
		const safeUrl = sanitizeUrl(chart.url)
		if (!safeUrl) return ''
		const alt = (chart.title || 'Chart').replace(/"/g, '&quot;')
		return `<img src="${safeUrl}" alt="${alt}" />`
	})
	return DOMPurify.sanitize(expanded, {
		ALLOWED_TAGS: SANITIZE_ALLOWED_TAGS,
		ALLOWED_ATTR: SANITIZE_ALLOWED_ATTR
	})
}
