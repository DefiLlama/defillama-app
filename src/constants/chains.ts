import { toDisplayName } from '~/utils/chainNormalizer'

// EVM-compatible chains that have null chainId in the API but are actually EVM
// Also includes chain name variants that appear in yields data but not in chains API
export const EVM_CHAINS_WITH_NULL_CHAINID = [
	'Kava',
	'Canto',
	'Sei',
	'Flare',
	'Conflux',
	'Rollux',
	'Merlin',
	'Morph',
	'Dogechain',
	'Shibarium',
	'Pulse',
	'PulseChain',
	'EOS EVM',
	'WEMIX',
	'Oasys',
	'zkSync',
	// Hyperliquid variants - yields data uses different names
	'Hyperliquid',
	'Hyperliquid L1',
	'HyperEVM',
	'Hyperevm',
	'hyperevm'
]

// Set for O(1) lookup of supplementary EVM chains
export const EVM_CHAINS_WITH_NULL_CHAINID_SET = new Set(EVM_CHAINS_WITH_NULL_CHAINID)

// Helper function to build EVM chains set from API data
// chainData is the response from api.llama.fi/chains
export function buildEvmChainsSet(chainData: Array<{ name: string; chainId: number | null }>): Set<string> {
	const evmChains = new Set<string>()

	for (const chain of chainData) {
		if (chain.chainId !== null) {
			evmChains.add(chain.name)
			// Add the normalized display name (handles xDai -> Gnosis, Binance -> BSC, etc.)
			const displayName = toDisplayName(chain.name)
			if (displayName !== chain.name) {
				evmChains.add(displayName)
			}
			evmChains.add(chain.name.toLowerCase())
			evmChains.add(displayName.toLowerCase())
		}
	}

	// Always add the supplementary EVM chains (they may not exist in API or have null chainId)
	for (const chain of EVM_CHAINS_WITH_NULL_CHAINID) {
		evmChains.add(chain)
		evmChains.add(chain.toLowerCase())
		const displayName = toDisplayName(chain)
		if (displayName !== chain) {
			evmChains.add(displayName)
			evmChains.add(displayName.toLowerCase())
		}
	}

	return evmChains
}

// Fallback static list in case API data isn't available
export const EVM_CHAINS_FALLBACK = [
	'Ethereum',
	'BSC',
	'Binance', // API name for BSC
	'Polygon',
	'Arbitrum',
	'Optimism',
	'Avalanche',
	'Fantom',
	'Gnosis',
	'xDai', // API name for Gnosis
	'Base',
	'ZKsync Era',
	'Polygon zkEVM',
	'Linea',
	'Scroll',
	'Mantle',
	'Cronos',
	'Celo',
	'Moonbeam',
	'Moonriver',
	'Aurora',
	'Metis',
	'Boba',
	'Harmony',
	'Kava',
	'Canto',
	'Core',
	'Blast',
	'Mode',
	'Manta',
	'Fraxtal',
	'Merlin',
	'opBNB',
	'Taiko',
	'ZetaChain',
	'Zora',
	'Berachain',
	'Monad',
	'Sei',
	'Neon',
	'Flare',
	'Klaytn',
	'Evmos',
	'Telos',
	'Astar',
	'Rootstock',
	'Thundercore',
	'OKXChain',
	'Heco',
	'IoTeX',
	'Velas',
	'Fuse',
	'Arbitrum Nova',
	'Oasis',
	'Palm',
	'Syscoin',
	'Wanchain',
	'Conflux',
	'Rollux',
	'Redstone',
	'Ink',
	'Sonic',
	'Abstract',
	'Swellchain',
	'Morph',
	'Corn',
	'World Chain',
	'Unichain',
	'Hyperliquid',
	'Hyperliquid L1', // API name
	'Plasma',
	'Etherlink',
	'X Layer',
	'Plume Mainnet',
	'Katana'
]

export const EVM_CHAINS_FALLBACK_SET = new Set(EVM_CHAINS_FALLBACK)
