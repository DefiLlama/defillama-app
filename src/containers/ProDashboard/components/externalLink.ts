const INTERNAL_HOSTS = new Set(['defillama.com', 'www.defillama.com'])

export function isExternalLink(href?: string | null): boolean {
	if (!href || typeof href !== 'string') return false
	const trimmed = href.trim()
	if (!trimmed) return false
	if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('?')) return false
	try {
		const url = new URL(trimmed)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
		return !INTERNAL_HOSTS.has(url.hostname.toLowerCase())
	} catch {
		return false
	}
}

export function externalLinkHostname(href?: string | null): string | null {
	if (!href) return null
	try {
		return new URL(href).hostname
	} catch {
		return null
	}
}
