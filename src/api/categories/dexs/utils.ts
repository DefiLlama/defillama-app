export const formatChain = (chain: string) => {
	if (!chain) return chain
	const ch = chain.toLowerCase()
	let c = ch === 'avax' ? "avalanche" : ch
	if (c === 'bsc') return c.toUpperCase()
	else
		return c[0].toUpperCase() + c.slice(1)
}