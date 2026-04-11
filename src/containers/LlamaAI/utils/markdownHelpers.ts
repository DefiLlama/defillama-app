/**
 * Utility functions for markdown processing in LlamaAI.
 */

import DOMPurify from 'dompurify'

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

interface ActionPlaceholderData {
	label: string
	message: string
}

type ArtifactMatch =
	| { index: number; length: number; type: 'chart' | 'csv' | 'alert' | 'dashboard'; id: string }
	| { index: number; length: number; type: 'action'; id: ActionPlaceholderData }

export type ContentPart =
	| { type: 'text'; content: string }
	| { type: 'chart'; chartId: string }
	| { type: 'csv'; csvId: string }
	| { type: 'alert'; alertId: string }
	| { type: 'dashboard'; dashboardId: string }
	| { type: 'action'; actionLabel: string; actionMessage: string }

interface ParsedContent {
	parts: ContentPart[]
}

/**
 * Parse markdown content to extract chart, CSV, and alert artifact placeholders.
 * Placeholders follow the format [CHART:id], [CSV:id], and [ALERT:id].
 */
export function parseArtifactPlaceholders(content: string): ParsedContent {
	const reportStartIdx = content.indexOf('[REPORT_START]')
	if (reportStartIdx !== -1) {
		content = content.slice(reportStartIdx + '[REPORT_START]'.length).trimStart()
	}
	const chartPlaceholderPattern = /\[CHART:([^\]]+)\]/g
	const csvPlaceholderPattern = /\[CSV:([^\]]+)\]/g
	const alertPlaceholderPattern = /\[ALERT:([^\]]+)\]/g
	const dashboardPlaceholderPattern = /\[DASHBOARD:([^\]]+)\]/g
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
	while ((match = alertPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'alert', id: match[1] })
	}
	while ((match = dashboardPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'dashboard', id: match[1] })
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
		} else if (m.type === 'dashboard') {
			parts.push({ type: 'dashboard', dashboardId: m.id })
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

/**
 * Process citation markers in text and convert to citation-badge tags.
 * Supports ranges like [1-3], footnotes like [^1], and model-style markers like \u30101\u2020source\u3011.
 */
export function processCitationMarkers(text: string, citations?: string[]): string {
	const citationSequencePattern = String.raw`\d+(?:(?:\s*-\s*\d+)|(?:\s*,\s*\d+))*`
	const citationMarkerRegex = new RegExp(
		String.raw`(?:\[(?:\^\s*)?(${citationSequencePattern})\s*\]|【\s*(${citationSequencePattern})(?:\s*†[^】]*)?\s*】)`,
		'g'
	)

	if (!citations || citations.length === 0) {
		// Remove citation markers if no citations available
		return text.replace(citationMarkerRegex, '')
	}

	return text.replace(citationMarkerRegex, (_match, bracketNums?: string, modelNums?: string) => {
		const nums = bracketNums ?? modelNums ?? ''
		const parts = nums.split(',').map((p: string) => p.trim())
		const expandedNums: number[] = []

		for (const part of parts) {
			if (part.includes('-')) {
				const [start, end] = part.split('-').map((n: string) => parseInt(n.trim()))
				if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
					for (let i = start; i <= end; i++) expandedNums.push(i)
				}
			} else {
				const num = parseInt(part.trim())
				if (!Number.isNaN(num)) expandedNums.push(num)
			}
		}

		return expandedNums
			.map((num) => {
				const idx = num - 1
				const rawUrl = citations[idx]

				if (!rawUrl) {
					return `<citation-badge>${num}</citation-badge>`
				}

				// Validate and sanitize the URL to prevent XSS
				const safeUrl = sanitizeUrl(rawUrl)
				if (safeUrl) {
					return `<citation-badge href="${safeUrl}">${num}</citation-badge>`
				}

				// URL is unsafe or malformed - render as non-clickable span
				return `<citation-badge>${num}</citation-badge>`
			})
			.join('')
	})
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
