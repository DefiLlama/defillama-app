export const CANONICAL_TOKEN_ALIASES: Record<string, readonly string[]> = {
	btc: [
		'btc',
		'wbtc',
		'cbbtc',
		'tbtc',
		'fbtc',
		'lbtc',
		'btcb',
		'renbtc',
		'hbtc',
		'sbtc',
		'ibtc',
		'mbtc',
		'pumpbtc',
		'ubtc',
		'swbtc',
		'solvbtc',
		'kbtc',
		'enzobtc',
		'unibtc',
		'xsolvbtc'
	],
	eth: [
		'eth',
		'weth',
		'steth',
		'wsteth',
		'reth',
		'cbeth',
		'rseth',
		'weeth',
		'oseth',
		'ezeth',
		'pufeth',
		'meth',
		'frxeth',
		'sfrxeth',
		'lseth',
		'ankreth',
		'oeth',
		'rsweth',
		'sweth',
		'wbeth',
		'aweth'
	],
	sol: ['sol', 'wsol', 'jitosol', 'msol', 'bsol', 'jupsol', 'jsol', 'edgesol', 'inf', 'bnsol'],
	bnb: ['bnb', 'wbnb', 'asbnb', 'slisbnb', 'bnbx'],
	usdt: ['usdt', 'usdt0'],
	usdc: ['usdc', 'usdce', 'usdbc']
} as const

const ALIAS_TO_CANONICAL = (() => {
	const map = new Map<string, string>()
	for (const canonical in CANONICAL_TOKEN_ALIASES) {
		for (const alias of CANONICAL_TOKEN_ALIASES[canonical]) {
			const existing = map.get(alias)
			if (existing && existing !== canonical) {
				throw new Error(`Token alias "${alias}" maps to both "${existing}" and "${canonical}"`)
			}
			map.set(alias, canonical)
		}
	}
	return map
})()

export function getAliasGroup(symbol: string): string[] {
	const lower = symbol.trim().toLowerCase()
	const canonical = ALIAS_TO_CANONICAL.get(lower) ?? lower
	const group = CANONICAL_TOKEN_ALIASES[canonical]
	return group ? [...group] : [canonical]
}
