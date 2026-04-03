import { LLAMASWAP_CHAINS } from '~/constants/chains'
import type { IProtocolLlamaswapChain } from '~/utils/metadata/types'

type LlamaswapChainWithLiquidity = {
	chain: string
	address: string
	liquidity?: number
}

type LlamaswapChainsEntry = {
	chains?: Array<LlamaswapChainWithLiquidity>
}

const LLAMASWAP_DISPLAY_NAME_BY_CHAIN = new Map<string, string>()

for (const chain of LLAMASWAP_CHAINS) {
	LLAMASWAP_DISPLAY_NAME_BY_CHAIN.set(chain.llamaswap, chain.displayName)
}

function sortChainsByLiquidityDesc<T extends { liquidity?: number }>(a: T, b: T): number {
	return (b.liquidity ?? 0) - (a.liquidity ?? 0)
}

function toProtocolLlamaswapChain(
	chain: Pick<LlamaswapChainWithLiquidity, 'chain' | 'address'>,
	options?: { best?: boolean }
): IProtocolLlamaswapChain {
	return {
		chain: chain.chain,
		address: chain.address,
		displayName: LLAMASWAP_DISPLAY_NAME_BY_CHAIN.get(chain.chain) ?? chain.chain,
		...(options?.best ? { best: true } : {})
	}
}

export function normalizeProtocolLlamaswapChains(
	entry: LlamaswapChainsEntry | null | undefined,
	isLlamaswapList: boolean = false
): IProtocolLlamaswapChain[] | null {
	if (!Array.isArray(entry?.chains) || entry.chains.length === 0) return null

	const sortedChains = entry.chains.slice().sort(sortChainsByLiquidityDesc)
	const normalizedChains: IProtocolLlamaswapChain[] = []

	for (let index = 0; index < sortedChains.length; index += 1) {
		normalizedChains.push(toProtocolLlamaswapChain(sortedChains[index], { best: isLlamaswapList && index === 0 }))
	}

	return normalizedChains
}

export function mergeProtocolLlamaswapChains(
	primary: IProtocolLlamaswapChain[] | null | undefined,
	secondary: IProtocolLlamaswapChain[] | null | undefined
): IProtocolLlamaswapChain[] | null {
	if (!primary?.length && !secondary?.length) return null
	if (!primary?.length) return secondary ?? null
	if (!secondary?.length) return primary

	const mergedChains = primary.slice()
	const existingChains = new Set(primary.map((chain) => chain.chain))

	for (const chain of secondary) {
		if (existingChains.has(chain.chain)) continue
		existingChains.add(chain.chain)
		mergedChains.push(chain)
	}

	return mergedChains
}
