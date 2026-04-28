import { slug } from '~/utils'

type ProtocolWithFork = { forkedFrom?: string[] }

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

export function getAvailableForks(protocols: readonly ProtocolWithFork[]): string[] {
	const set = new Set<string>()
	for (const p of protocols) {
		const forks = p.forkedFrom
		if (!forks) continue
		for (const f of forks) set.add(f)
	}
	return Array.from(set).sort((a, b) => a.localeCompare(b))
}
