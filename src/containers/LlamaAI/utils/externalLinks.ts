import { EXTERNAL_LINK_ALLOWLIST, readAppStorage, writeAppStorage } from '~/contexts/LocalStorage'

const INTERNAL_HOSTS = new Set(['defillama.com', 'www.defillama.com'])
const TRUSTED_EXTERNAL_HOSTS = new Set(['x.com', 'github.com', 'twitter.com'])
const TRUSTED_EXTERNAL_HOST_SUFFIXES = ['.llama.fi']

function normalizeHostname(hostname: string): string {
	return hostname.trim().toLowerCase().replace(/\.$/, '')
}

function hostnameMatchesDomain(hostname: string, domain: string): boolean {
	return hostname === domain || hostname.endsWith(`.${domain}`)
}

function isTrustedExternalHostname(hostname: string): boolean {
	if (hostname === 'llama.fi') return true
	if (TRUSTED_EXTERNAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true
	for (const domain of TRUSTED_EXTERNAL_HOSTS) {
		if (hostnameMatchesDomain(hostname, domain)) return true
	}
	return false
}

function readUserAllowedExternalHosts(): Set<string> {
	const stored = readAppStorage()[EXTERNAL_LINK_ALLOWLIST]
	if (!Array.isArray(stored)) return new Set()
	return new Set(
		stored
			.filter((host): host is string => typeof host === 'string')
			.map(normalizeHostname)
			.filter(Boolean)
	)
}

export function isAllowedLlamaAIExternalHostname(hostname?: string | null): boolean {
	if (!hostname) return false
	const normalized = normalizeHostname(hostname)
	return isTrustedExternalHostname(normalized) || readUserAllowedExternalHosts().has(normalized)
}

export function allowLlamaAIExternalHostname(hostname?: string | null) {
	if (!hostname) return
	const normalized = normalizeHostname(hostname)
	if (!normalized || isAllowedLlamaAIExternalHostname(normalized)) return

	const current = readAppStorage()
	const existing = Array.isArray(current[EXTERNAL_LINK_ALLOWLIST])
		? current[EXTERNAL_LINK_ALLOWLIST].filter((host): host is string => typeof host === 'string')
		: []
	const next = Array.from(new Set([...existing.map(normalizeHostname), normalized])).sort()
	writeAppStorage({
		...current,
		[EXTERNAL_LINK_ALLOWLIST]: next
	})
}

export function isLlamaAIExternalLink(href?: string | null): boolean {
	if (!href || typeof href !== 'string') return false
	const trimmed = href.trim()
	if (!trimmed) return false
	if (trimmed.startsWith('#') || trimmed.startsWith('?')) return false
	if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return false
	try {
		const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
		const hostname = normalizeHostname(url.hostname)
		return !INTERNAL_HOSTS.has(hostname) && !isAllowedLlamaAIExternalHostname(hostname)
	} catch {
		return false
	}
}
