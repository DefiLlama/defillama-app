import { toDisplayName } from '~/utils/chainNormalizer'

// EVM-compatible chains that have null chainId in the API but are actually EVM
// Also includes chain name variants that appear in yields data but not in chains API
const EVM_CHAINS_WITH_NULL_CHAINID = [
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
// oxlint-disable-next-line no-unused-vars
const EVM_CHAINS_WITH_NULL_CHAINID_SET = new Set(EVM_CHAINS_WITH_NULL_CHAINID)

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

/** CoinGecko `asset_platform_id` / swap.defillama.com `chain` param. Must stay in sync with enabled adapters in llamaswap-interface `list.ts` (union of `chainToId` on 1inch, CowSwap, KyberSwap, ParaSwap, Odos, 0x Gasless, 0x v2). */
export const LLAMASWAP_CHAINS = [
	{ llamaswap: 'ethereum', gecko: 'ethereum', displayName: 'Ethereum' },
	{ llamaswap: 'arbitrum', gecko: 'arbitrum-one', displayName: 'Arbitrum' },
	{ llamaswap: 'polygon', gecko: 'polygon-pos', displayName: 'Polygon POS' },
	{ llamaswap: 'bsc', gecko: 'binance-smart-chain', displayName: 'BNB Chain' },
	{ llamaswap: 'optimism', gecko: 'optimistic-ethereum', displayName: 'Optimism' },
	{ llamaswap: 'base', gecko: 'base', displayName: 'Base' },
	{ llamaswap: 'avax', gecko: 'avalanche', displayName: 'Avalanche' },
	{ llamaswap: 'gnosis', gecko: 'xdai', displayName: 'Gnosis XDAI' },
	{ llamaswap: 'zksync', gecko: 'zksync', displayName: 'ZkSync' },
	{ llamaswap: 'linea', gecko: 'linea', displayName: 'Linea' },
	{ llamaswap: 'scroll', gecko: 'scroll', displayName: 'Scroll' },
	{ llamaswap: 'mantle', gecko: 'mantle', displayName: 'Mantle' },
	{ llamaswap: 'mode', gecko: 'mode', displayName: 'Mode' },
	{ llamaswap: 'sonic', gecko: 'sonic', displayName: 'Sonic' },
	{ llamaswap: 'unichain', gecko: 'unichain', displayName: 'Unichain' },
	{ llamaswap: 'monad', gecko: 'monad', displayName: 'Monad' },
	{ llamaswap: 'berachain', gecko: 'berachain', displayName: 'Berachain' },
	{ llamaswap: 'hyperevm', gecko: 'hyperevm', displayName: 'Hyperliquid' },
	{ llamaswap: 'plasma', gecko: 'plasma', displayName: 'Plasma' },
	{ llamaswap: 'ink', gecko: 'ink', displayName: 'Ink' },
	{ llamaswap: 'worldchain', gecko: 'world-chain', displayName: 'World Chain' },
	{ llamaswap: 'megaeth', gecko: 'megaeth', displayName: 'MegaETH' },
	{ llamaswap: 'tempo', gecko: 'tempo', displayName: 'Tempo' }
]
