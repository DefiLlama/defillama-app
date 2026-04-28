import { slug } from '~/utils'
import type { IProtocol } from './types'

type WithForkedFrom = IProtocol & { forkedFrom?: Array<string> }

export function filterProtocolsByFork(protocols: WithForkedFrom[], fork: string | null | undefined): WithForkedFrom[] {
	if (!fork) return protocols
	const normalized = slug(fork)
	return protocols.filter((protocol) => {
		const forkedFrom = protocol.forkedFrom
		if (!forkedFrom || forkedFrom.length === 0) return false
		for (const forkName of forkedFrom) {
			if (slug(forkName) === normalized) return true
		}
		return false
	})
}

export function getAvailableForks(protocols: WithForkedFrom[]): string[] {
	const set = new Set<string>()
	for (const p of protocols) {
		const forks = p.forkedFrom
		if (!forks) continue
		for (const f of forks) set.add(f)
	}
	return Array.from(set).sort((a, b) => a.localeCompare(b))
}
