/**
 * Utility functions for markdown processing in LlamaAI.
 */

/**
 * Allowed URL protocols for citation links.
 * Prevents dangerous schemes like javascript:, data:, etc.
 */
const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:']

/**
 * Validate and sanitize a URL for safe use in href attributes.
 * Returns null if the URL is unsafe or malformed.
 */
function sanitizeUrl(url: string): string | null {
	if (!url || typeof url !== 'string') return null

	// Trim whitespace
	const trimmed = url.trim()
	if (!trimmed) return null

	try {
		// Try to parse as absolute URL
		const parsed = new URL(trimmed)

		// Check if protocol is whitelisted
		if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
			return null
		}

		// Return the href (properly encoded by URL constructor)
		return parsed.href
	} catch {
		// If parsing fails, try prepending https:// for URLs that look like domains
		if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes(' ')) {
			try {
				const withProtocol = new URL(`https://${trimmed}`)
				return withProtocol.href
			} catch {
				return null
			}
		}
		return null
	}
}

interface ArtifactMatch {
	index: number
	length: number
	type: 'chart' | 'csv'
	id: string
}

interface ContentPart {
	type: 'text' | 'chart' | 'csv'
	content: string
	chartId?: string
	csvId?: string
}

interface ParsedContent {
	parts: ContentPart[]
	chartIds: Set<string>
	csvIds: Set<string>
}

/**
 * Parse markdown content to extract chart and CSV artifact placeholders.
 * Placeholders follow the format [CHART:id] and [CSV:id].
 */
export function parseArtifactPlaceholders(content: string): ParsedContent {
	const chartPlaceholderPattern = /\[CHART:([^\]]+)\]/g
	const csvPlaceholderPattern = /\[CSV:([^\]]+)\]/g
	const parts: ContentPart[] = []
	const chartIds = new Set<string>()
	const csvIds = new Set<string>()

	const allMatches: ArtifactMatch[] = []

	let match: RegExpExecArray | null
	while ((match = chartPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'chart', id: match[1] })
		chartIds.add(match[1])
	}
	while ((match = csvPlaceholderPattern.exec(content)) !== null) {
		allMatches.push({ index: match.index, length: match[0].length, type: 'csv', id: match[1] })
		csvIds.add(match[1])
	}

	allMatches.sort((a, b) => a.index - b.index)

	let lastIndex = 0
	for (const m of allMatches) {
		if (m.index > lastIndex) {
			parts.push({ type: 'text', content: content.slice(lastIndex, m.index) })
		}
		if (m.type === 'chart') {
			parts.push({ type: 'chart', content: '', chartId: m.id })
		} else {
			parts.push({ type: 'csv', content: '', csvId: m.id })
		}
		lastIndex = m.index + m.length
	}

	if (lastIndex < content.length) {
		parts.push({ type: 'text', content: content.slice(lastIndex) })
	}

	if (parts.length === 0) {
		parts.push({ type: 'text', content })
	}

	return { parts, chartIds, csvIds }
}

/**
 * Process citation markers in text and convert to HTML anchor tags.
 * Supports ranges like [1-3] and comma-separated values like [1, 3, 5].
 */
export function processCitationMarkers(text: string, citations?: string[]): string {
	if (!citations || citations.length === 0) {
		// Remove citation markers if no citations available
		return text.replace(/\[(\d+(?:(?:-\d+)|(?:,\s*\d+))*)\]/g, '')
	}

	return text.replace(/\[(\d+(?:(?:-\d+)|(?:,\s*\d+))*)\]/g, (_, nums) => {
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
					return `<span class="citation-badge">${num}</span>`
				}

				// Validate and sanitize the URL to prevent XSS
				const safeUrl = sanitizeUrl(rawUrl)
				if (safeUrl) {
					return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="citation-badge">${num}</a>`
				}

				// URL is unsafe or malformed - render as non-clickable span
				return `<span class="citation-badge">${num}</span>`
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
