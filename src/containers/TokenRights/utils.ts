import type {
	IRawTokenRightsEntry,
	ITokenRightsData,
	ITokenRightsParsedAddress,
	ITokenRightsParsedLink
} from './api.types'

/**
 * Trim whitespace / trailing newlines. Returns `null` when the result is empty.
 */
export function trimOrNull(val: string | undefined | null): string | null {
	if (val == null) return null
	const trimmed = val.trim()
	return trimmed === '' ? null : trimmed
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g
const ANGLE_BRACKET_URL_RE = /<(https?:\/\/[^>]+)>/g

/**
 * Extract structured links from a string containing markdown `[label](url)` and/or
 * angle-bracket `<url>` patterns.
 */
export function parseMarkdownLinks(raw: string | undefined | null): ITokenRightsParsedLink[] {
	if (!raw) return []

	const links: ITokenRightsParsedLink[] = []
	const seen = new Set<string>()

	for (const match of raw.matchAll(MARKDOWN_LINK_RE)) {
		const url = match[2].trim()
		if (!seen.has(url)) {
			seen.add(url)
			links.push({ label: match[1].trim(), url })
		}
	}

	for (const match of raw.matchAll(ANGLE_BRACKET_URL_RE)) {
		const url = match[1].trim()
		if (!seen.has(url)) {
			seen.add(url)
			try {
				links.push({ label: new URL(url).hostname, url })
			} catch {
				links.push({ label: url, url })
			}
		}
	}

	return links
}

const PIPE_PAIR_RE = /^(.+?)\s*\|\s*(.+)$/

/**
 * Parse the "Foundation Multisigs / Addresses" field which uses mixed formats:
 *   - "label | address"
 *   - "label | value | label | value" (multiple pairs on one line)
 *   - bare hex addresses
 *   - bare URLs / angle-bracket URLs
 */
export function parseAddresses(raw: string | undefined | null): ITokenRightsParsedAddress[] {
	if (!raw) return []

	const results: ITokenRightsParsedAddress[] = []
	const lines = raw
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean)

	for (const line of lines) {
		const parts = line
			.split('|')
			.map((p) => p.trim())
			.filter(Boolean)

		if (parts.length >= 2 && parts.length % 2 === 0) {
			for (let i = 0; i < parts.length; i += 2) {
				results.push({ label: parts[i], value: parts[i + 1] })
			}
		} else if (parts.length === 1) {
			const stripped = line.replace(/^<|>$/g, '')
			results.push({ label: null, value: stripped })
		} else {
			const pipeMatch = line.match(PIPE_PAIR_RE)
			if (pipeMatch) {
				results.push({ label: pipeMatch[1], value: pipeMatch[2] })
			} else {
				results.push({ label: null, value: line })
			}
		}
	}

	return results
}

/**
 * Find a protocol entry by its DefiLlama ID. The `defillamaId` parameter is the
 * metadata cache key (e.g. "182" or "parent#aave").
 */
export function findProtocolEntry(data: IRawTokenRightsEntry[], defillamaId: string): IRawTokenRightsEntry | null {
	return data.find((entry) => entry['DefiLlama ID'] === defillamaId) ?? null
}

/**
 * Transform a raw API entry into the fully predictable `ITokenRightsData` structure
 * consumed by the UI. Every section is always present; nullable fields use `null`.
 */
export function parseTokenRightsEntry(raw: IRawTokenRightsEntry): ITokenRightsData {
	return {
		overview: {
			protocolName: raw['Protocol Name'],
			tokens: raw.Token ?? [],
			tokenTypes: raw['Token Type'] ?? [],
			description: raw['Brief description'] ?? '',
			utility: trimOrNull(raw.Utility),
			lastUpdated: trimOrNull(raw['Last Updated'])
		},
		governance: {
			summary: raw['Governance Details (Summary)'] ?? '',
			decisionTokens: raw['Governance Decisions'] ?? [],
			details: trimOrNull(raw['Governance details']),
			links: parseMarkdownLinks(raw['Governance Links'])
		},
		decisions: {
			treasury: {
				tokens: raw['Treasury Decisions'] ?? [],
				details: trimOrNull(raw['Treasury Details'])
			},
			revenue: {
				tokens: raw['Revenue Decisions'] ?? [],
				details: trimOrNull(raw['Revenue Details'])
			}
		},
		economic: {
			summary: trimOrNull(raw['Economic Rights (Summary)']),
			feeSwitchStatus: raw['Fee Switch Status'] ?? 'OFF',
			feeSwitchDetails: trimOrNull(raw['Fee Switch Details']),
			links: parseMarkdownLinks(raw['Economic Links'])
		},
		valueAccrual: {
			primary: trimOrNull(raw['Value Accrual']),
			details: trimOrNull(raw['Value Accrual Details']),
			buybacks: {
				tokens: raw.Buybacks ?? [],
				details: trimOrNull(raw['Buyback Details'])
			},
			dividends: {
				tokens: raw.Dividends ?? [],
				details: trimOrNull(raw['Dividends Details'])
			},
			burns: {
				status: raw.Burns ?? 'N/A',
				details: trimOrNull(raw['Burn Details'])
			}
		},
		alignment: {
			fundraising: raw.Fundraising ?? [],
			raiseDetails: trimOrNull(raw['Raise Details']),
			associatedEntities: raw['Associated Entities'] ?? [],
			equityRevenueCapture: trimOrNull(raw['Equity Revenue Capture']),
			equityStatement: trimOrNull(raw['Equity Statement']),
			ipAndBrand: trimOrNull(raw['IP & Brand']),
			domain: trimOrNull(raw.Domain),
			links: parseMarkdownLinks(raw['Ownership Links'])
		},
		resources: {
			addresses: parseAddresses(raw['Foundation Multisigs / Addresses']),
			reports: parseMarkdownLinks(raw['Latest Treasury / Token Report'])
		}
	}
}
