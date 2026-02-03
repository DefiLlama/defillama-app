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

