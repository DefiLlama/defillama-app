export const formatChain = (chain: string) => {
	if (!chain) return chain
	const ch = chain.toLowerCase()
	let c = ch === 'avax' ? 'avalanche' : ch
	if (c === 'bsc') return c.toUpperCase()
	if (c === 'xdai') return 'xDai'
	if (c === 'terra' || c === 'terra classic') return 'Terra Classic'
	else return c[0].toUpperCase() + c.slice(1)
}

function pad(s: number) {
	return s < 10 ? '0' + s : s
}

export function formatTimestampAsDate(timestamp: number) {
	const date = new Date(timestamp * 1000)
	return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}
