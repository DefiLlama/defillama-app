export type Protocol = {
	category?: string
	chains?: string[]
}

type LlamaChain = { name: string }
type ChainlistItem = { name?: string; chain?: string; shortName?: string }

let _cache: {
	evmSet: Set<string>
	nonEvmSet: Set<string>
	fetchedAt: number
} | null = null

const ALIASES: Record<string, string> = {
	xDai: 'Gnosis',
	'Avalanche C-Chain': 'Avalanche',
	RSK: 'Rootstock',
	'Fantom Opera': 'Fantom',
	BSC: 'Binance Smart Chain',
	OKExChain: 'OKC'
}

function normLabel(s: string): string {
	const base = (s || '').trim()
	const aliased = ALIASES[base] ?? base
	return aliased
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.replace(/[^\w\s-]/g, '')
}

async function fetchLlamaChains(): Promise<string[]> {
	const res = await fetch('https://api.llama.fi/chains', { next: { revalidate: 60 * 60 } })
	if (!res.ok) throw new Error('Failed to fetch DefiLlama chains')
	const data: LlamaChain[] = await res.json()
	return Array.from(new Set(data.map((c) => c?.name).filter(Boolean) as string[]))
}

async function fetchChainlistEvm(): Promise<string[]> {
	const res = await fetch('https://chainlist.org/rpcs.json', { next: { revalidate: 60 * 60 * 6 } })
	if (!res.ok) throw new Error('Failed to fetch Chainlist RPCs')
	const data: ChainlistItem[] = await res.json()
	const names = new Set<string>()
	for (const c of data) {
		if (c.name) names.add(c.name)
		if (c.chain) names.add(c.chain)
		if (c.shortName) names.add(c.shortName)
	}
	return Array.from(names).filter(Boolean)
}
export async function fetchEvmAndNonEvmSets() {
	if (_cache && Date.now() - _cache.fetchedAt < 6 * 60 * 60 * 1000) {
		return _cache
	}

	const [llamaChains, chainlistEvm] = await Promise.all([fetchLlamaChains(), fetchChainlistEvm()])

	const evmSet = new Set<string>()
	const evmNorm = new Set(chainlistEvm.map(normLabel))

	for (const name of chainlistEvm) {
		evmSet.add(name)
		const alias = ALIASES[name]
		if (alias) evmSet.add(alias)
	}

	const nonEvmSet = new Set<string>()
	for (const name of llamaChains) {
		const isEvm =
			evmSet.has(name) ||
			evmSet.has(ALIASES[name] ?? '') ||
			evmNorm.has(normLabel(name)) ||
			(ALIASES[name] ? evmNorm.has(normLabel(ALIASES[name])) : false)
		if (!isEvm) nonEvmSet.add(name)
	}

	_cache = { evmSet, nonEvmSet, fetchedAt: Date.now() }
	return _cache
}

export function computeCategoryIsEvm(
	protocols: Protocol[],
	evmSet: Set<string>,
	nonEvmSet: Set<string>
): Record<string, boolean> {
	const categoryChains = new Map<string, Set<string>>()

	for (const p of protocols) {
		if (!p?.category || !Array.isArray(p.chains)) continue
		const set = categoryChains.get(p.category) ?? new Set<string>()
		for (const ch of p.chains) set.add(ch)
		categoryChains.set(p.category, set)
	}

	const out: Record<string, boolean> = {}
	for (const [cat, chains] of categoryChains.entries()) {
		const hasNon = [...chains].some((c) => nonEvmSet.has(c) || nonEvmSet.has(ALIASES[c] ?? c))
		const hasEvm =
			!hasNon && [...chains].some((c) => evmSet.has(c) || evmSet.has(ALIASES[c] ?? c) || evmSet.has(c.trim()))
		out[cat] = hasNon ? false : hasEvm ? true : false
	}
	return out
}
