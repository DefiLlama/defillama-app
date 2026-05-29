import { EXTERNAL_LINK_ALLOWLIST, readAppStorage, writeAppStorage } from '~/contexts/LocalStorage'

const INTERNAL_HOSTS = new Set(['defillama.com', 'www.defillama.com'])
const TRUSTED_EXTERNAL_HOSTS = new Set(['x.com', 'github.com', 'twitter.com'])
const TRUSTED_EXTERNAL_HOST_SUFFIXES = ['.llama.fi']
const MAX_USER_ALLOWED_EXTERNAL_HOSTS = 200

export function normalizeLlamaAIExternalHostname(hostname: string): string {
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

export function getLlamaAIExternalAllowlistHosts(stored: unknown): string[] {
	if (!Array.isArray(stored)) return []
	const hosts: string[] = []
	const seen = new Set<string>()
	for (const host of stored) {
		if (typeof host !== 'string') continue
		const normalized = normalizeLlamaAIExternalHostname(host)
		if (!normalized || seen.has(normalized)) continue
		seen.add(normalized)
		hosts.push(normalized)
	}
	return hosts.slice(-MAX_USER_ALLOWED_EXTERNAL_HOSTS)
}

function readUserAllowedExternalHosts(): Set<string> {
	return new Set(getLlamaAIExternalAllowlistHosts(readAppStorage()[EXTERNAL_LINK_ALLOWLIST]))
}

export function getLlamaAIExternalAllowlistSnapshot() {
	return JSON.stringify(getLlamaAIExternalAllowlistHosts(readAppStorage()[EXTERNAL_LINK_ALLOWLIST]))
}

export function parseLlamaAIExternalAllowlistSnapshot(snapshot: string): Set<string> {
	try {
		return new Set(getLlamaAIExternalAllowlistHosts(JSON.parse(snapshot)))
	} catch {
		return new Set()
	}
}

export function isAllowedLlamaAIExternalHostname(hostname?: string | null): boolean {
	if (!hostname) return false
	const normalized = normalizeLlamaAIExternalHostname(hostname)
	return isTrustedExternalHostname(normalized) || readUserAllowedExternalHosts().has(normalized)
}

export function allowLlamaAIExternalHostname(hostname?: string | null) {
	if (!hostname) return
	const normalized = normalizeLlamaAIExternalHostname(hostname)
	if (!normalized || isAllowedLlamaAIExternalHostname(normalized)) return

	const current = readAppStorage()
	const existing = getLlamaAIExternalAllowlistHosts(current[EXTERNAL_LINK_ALLOWLIST]).filter(
		(host) => host !== normalized
	)
	const next = [...existing, normalized].slice(-MAX_USER_ALLOWED_EXTERNAL_HOSTS)
	writeAppStorage({
		...current,
		[EXTERNAL_LINK_ALLOWLIST]: next
	})
}

export function isLlamaAIExternalLink(href?: string | null, allowedHosts?: ReadonlySet<string>): boolean {
	if (!href || typeof href !== 'string') return false
	const trimmed = href.trim()
	if (!trimmed) return false
	if (trimmed.startsWith('#') || trimmed.startsWith('?')) return false
	if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return false
	try {
		const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
		const hostname = normalizeLlamaAIExternalHostname(url.hostname)
		const userAllowed = allowedHosts ? allowedHosts.has(hostname) : readUserAllowedExternalHosts().has(hostname)
		return !INTERNAL_HOSTS.has(hostname) && !isTrustedExternalHostname(hostname) && !userAllowed
	} catch {
		return false
	}
}
