import { slug } from '~/utils'

type ProtocolWithFork = { forkedFrom?: string[] }

/**
 * Returns the subset of protocols whose `forkedFrom` field contains a name
 * that slug-matches the given fork. Matching uses the same `slug()` helper
 * the server-side `protocolMatchesForkFilter` uses, so client-side and
 * server-side fork filtering behave identically.
 *
 * Pass `null`, `undefined`, or an empty string for `fork` to disable
 * filtering (the input array is returned unchanged).
 */
export function filterProtocolsByFork<T extends ProtocolWithFork>(
	protocols: T[],
	fork: string | null | undefined
): T[] {
	if (!fork) return protocols
	const normalized = slug(fork)
	return protocols.filter((protocol) => {
		const forkedFrom = protocol.forkedFrom
		if (!forkedFrom) return false
		for (const forkName of forkedFrom) {
			if (slug(forkName) === normalized) return true
		}
		return false
	})
}

/**
 * Returns a sorted, slug-deduplicated list of every fork name that appears
 * in any protocol's `forkedFrom` array. Used to populate the "Forked from"
 * dropdown in the chain dashboard.
 *
 * - Entries that slug to the empty string (whitespace-only labels) are skipped.
 * - When two labels slug to the same value (e.g. "Uniswap V2" vs "uniswap v2"),
 *   the first-seen label is kept as the canonical display name.
 */
export function getAvailableForks(protocols: readonly ProtocolWithFork[]): string[] {
	const bySlug = new Map<string, string>()
	for (const p of protocols) {
		const forks = p.forkedFrom
		if (!forks) continue
		for (const f of forks) {
			const trimmed = f.trim()
			const key = slug(trimmed)
			if (!key) continue
			if (!bySlug.has(key)) bySlug.set(key, trimmed)
		}
	}
	return Array.from(bySlug.values()).sort((a, b) => a.localeCompare(b))
}
