type ChainMapping = {
	display: string
	dimensions: string
	internal: string
}

const CHAIN_MAPPINGS: Record<string, ChainMapping> = {
	'op mainnet': { display: 'OP Mainnet', dimensions: 'optimism', internal: 'op-mainnet' },
	'op-mainnet': { display: 'OP Mainnet', dimensions: 'optimism', internal: 'op-mainnet' },
	optimism: { display: 'OP Mainnet', dimensions: 'optimism', internal: 'op-mainnet' },

	gnosis: { display: 'Gnosis', dimensions: 'xdai', internal: 'gnosis' },
	xdai: { display: 'Gnosis', dimensions: 'xdai', internal: 'gnosis' },

	bsc: { display: 'BSC', dimensions: 'bsc', internal: 'bsc' },
	binance: { display: 'BSC', dimensions: 'bsc', internal: 'bsc' },
	'binance smart chain': { display: 'BSC', dimensions: 'bsc', internal: 'bsc' },

	'zksync era': { display: 'ZKsync Era', dimensions: 'era', internal: 'zksync-era' },
	'zksync-era': { display: 'ZKsync Era', dimensions: 'era', internal: 'zksync-era' },
	zksync_era: { display: 'ZKsync Era', dimensions: 'era', internal: 'zksync-era' },
	zksync: { display: 'ZKsync Era', dimensions: 'era', internal: 'zksync-era' },
	era: { display: 'ZKsync Era', dimensions: 'era', internal: 'zksync-era' },

	'hyperliquid l1': { display: 'Hyperliquid L1', dimensions: 'hyperliquid', internal: 'hyperliquid-l1' },
	'hyperliquid-l1': { display: 'Hyperliquid L1', dimensions: 'hyperliquid', internal: 'hyperliquid-l1' },
	hyperliquid_l1: { display: 'Hyperliquid L1', dimensions: 'hyperliquid', internal: 'hyperliquid-l1' },
	hyperliquid: { display: 'Hyperliquid L1', dimensions: 'hyperliquid', internal: 'hyperliquid-l1' },

	'immutable zkevm': { display: 'Immutable zkEVM', dimensions: 'imx', internal: 'immutable-zkevm' },
	'immutable-zkevm': { display: 'Immutable zkEVM', dimensions: 'imx', internal: 'immutable-zkevm' },
	immutable_zkevm: { display: 'Immutable zkEVM', dimensions: 'imx', internal: 'immutable-zkevm' },
	imx: { display: 'Immutable zkEVM', dimensions: 'imx', internal: 'immutable-zkevm' },

	'polygon zkevm': { display: 'Polygon zkEVM', dimensions: 'polygon_zkevm', internal: 'polygon-zkevm' },
	'polygon-zkevm': { display: 'Polygon zkEVM', dimensions: 'polygon_zkevm', internal: 'polygon-zkevm' },
	polygon_zkevm: { display: 'Polygon zkEVM', dimensions: 'polygon_zkevm', internal: 'polygon-zkevm' },

	'cronos zkevm': { display: 'Cronos zkEVM', dimensions: 'cronos_zkevm', internal: 'cronos-zkevm' },
	'cronos-zkevm': { display: 'Cronos zkEVM', dimensions: 'cronos_zkevm', internal: 'cronos-zkevm' },
	cronos_zkevm: { display: 'Cronos zkEVM', dimensions: 'cronos_zkevm', internal: 'cronos-zkevm' },

	'arbitrum nova': { display: 'Arbitrum Nova', dimensions: 'arbitrum_nova', internal: 'arbitrum-nova' },
	'arbitrum-nova': { display: 'Arbitrum Nova', dimensions: 'arbitrum_nova', internal: 'arbitrum-nova' },
	arbitrum_nova: { display: 'Arbitrum Nova', dimensions: 'arbitrum_nova', internal: 'arbitrum-nova' },

	avalanche: { display: 'Avalanche', dimensions: 'avax', internal: 'avalanche' },
	avax: { display: 'Avalanche', dimensions: 'avax', internal: 'avalanche' },

	cosmoshub: { display: 'CosmosHub', dimensions: 'cosmoshub', internal: 'cosmoshub' },
	cosmos: { display: 'CosmosHub', dimensions: 'cosmoshub', internal: 'cosmoshub' },

	pulsechain: { display: 'PulseChain', dimensions: 'pulse', internal: 'pulsechain' },
	pulse: { display: 'PulseChain', dimensions: 'pulse', internal: 'pulsechain' },

	'eos evm': { display: 'EOS EVM', dimensions: 'eos_evm', internal: 'eos-evm' },
	eos: { display: 'EOS EVM', dimensions: 'eos_evm', internal: 'eos-evm' },

	'zksync lite': { display: 'ZKsync Lite', dimensions: 'zksync_lite', internal: 'zksync-lite' },
	'zksync-lite': { display: 'ZKsync Lite', dimensions: 'zksync_lite', internal: 'zksync-lite' },

	apechain: { display: 'ApeChain', dimensions: 'apechain', internal: 'apechain' },
	bob: { display: 'BOB', dimensions: 'bob', internal: 'bob' },
	core: { display: 'CORE', dimensions: 'core', internal: 'core' },
	goat: { display: 'GOAT', dimensions: 'goat', internal: 'goat' },
	bevm: { display: 'BEVM', dimensions: 'bevm', internal: 'bevm' },
	bsquared: { display: 'BSquared', dimensions: 'bsquared', internal: 'bsquared' },
	tac: { display: 'TAC', dimensions: 'tac', internal: 'tac' },
	wemix: { display: 'WEMIX', dimensions: 'wemix', internal: 'wemix' },
	starknet: { display: 'Starknet', dimensions: 'starknet', internal: 'starknet' },
	hydradx: { display: 'HydraDX', dimensions: 'hydradx', internal: 'hydradx' },

	opbnb: { display: 'opBNB', dimensions: 'opbnb', internal: 'opbnb' },
	'op_bnb': { display: 'opBNB', dimensions: 'opbnb', internal: 'opbnb' }
}

const DISPLAY_TO_ALIASES: Record<string, string[]> = {
	'OP Mainnet': ['Optimism'],
	BSC: ['Binance'],
	'Hyperliquid L1': ['Hyperliquid'],
	Gnosis: ['xDai'],
	CosmosHub: ['Cosmos'],
	PulseChain: ['Pulse'],
	'EOS EVM': ['EOS'],
	'ZKsync Era': ['zkSync Era', 'zkSync'],
	'ZKsync Lite': ['zkSync Lite'],
	ApeChain: ['Apechain'],
	BOB: ['Bob'],
	CORE: ['Core'],
	GOAT: ['Goat'],
	BEVM: ['Bevm'],
	BSquared: ['Bsquared'],
	TAC: ['Tac'],
	WEMIX: ['Wemix'],
	Starknet: ['StarkNet'],
	HydraDX: ['Hydradx']
}

function normalizeKey(chain: string): string {
	return chain.toLowerCase().trim()
}

export function toDisplayName(chain: string): string {
	if (!chain) return chain
	const key = normalizeKey(chain)
	const mapping = CHAIN_MAPPINGS[key]
	if (mapping) return mapping.display
	return chain
}

export function toDimensionsSlug(chain: string): string {
	if (!chain) return chain
	const key = normalizeKey(chain)
	const mapping = CHAIN_MAPPINGS[key]
	if (mapping) return mapping.dimensions
	return key.replace(/\s+/g, '_')
}

export function toInternalSlug(chain: string): string {
	if (!chain) return chain
	const key = normalizeKey(chain)
	const mapping = CHAIN_MAPPINGS[key]
	if (mapping) return mapping.internal
	return key.replace(/\s+/g, '-')
}

export function getDisplayAliases(displayName: string): string[] {
	return DISPLAY_TO_ALIASES[displayName] || []
}

export function buildChainMatchSet(chains: string[]): Set<string> {
	const set = new Set<string>()
	for (const chain of chains) {
		if (!chain) continue
		set.add(chain)
		set.add(chain.toLowerCase())
		const display = toDisplayName(chain)
		set.add(display)
		set.add(display.toLowerCase())
		const dimensions = toDimensionsSlug(chain)
		set.add(dimensions)
		const internal = toInternalSlug(chain)
		set.add(internal)
	}
	return set
}

export function normalizeChainSlug(chain: string | null | undefined): string | null {
	if (!chain) return null
	return toInternalSlug(chain)
}

export const CHAIN_SLUG_ALIASES: Record<string, string> = {
	optimism: 'op-mainnet',
	'op mainnet': 'op-mainnet',
	binance: 'bsc',
	xdai: 'gnosis',
	cosmos: 'cosmoshub',
	pulse: 'pulsechain',
	hyperliquid: 'hyperliquid-l1',
	'hyperliquid l1': 'hyperliquid-l1',
	zksync: 'zksync-era',
	'zksync era': 'zksync-era'
}
