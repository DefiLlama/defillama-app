import type { CoinGeckoCoinTickerWithDepth } from '~/api/coingecko.types'
import { getLlamaswapChainByGeckoPlatform } from '~/constants/chains'
import type { IProtocolLlamaswapChain } from '~/utils/metadata/types'

const EVM_HEX_ADDRESS_RE = /^0x[a-f0-9]+$/i

export function normalizeEvmContractAddress(value: string | null | undefined): string | null {
	const tokenRef = value?.trim()
	if (!tokenRef || !EVM_HEX_ADDRESS_RE.test(tokenRef)) return null
	return tokenRef.toLowerCase()
}

export function getSupportedCoinGeckoPlatformsForLlamaswap(platforms?: Record<string, string>): Record<string, string> {
	const supportedPlatforms: Record<string, string> = {}
	if (!platforms) return supportedPlatforms

	for (const chain in platforms) {
		const address = normalizeEvmContractAddress(platforms[chain])
		if (!address || !getLlamaswapChainByGeckoPlatform(chain)) continue
		supportedPlatforms[chain] = address
	}

	return supportedPlatforms
}

export function mapSupportedCoinGeckoPlatformsToLlamaswapChains(
	platforms?: Record<string, string>
): IProtocolLlamaswapChain[] {
	const supportedPlatforms = getSupportedCoinGeckoPlatformsForLlamaswap(platforms)
	const normalizedChains: IProtocolLlamaswapChain[] = []

	for (const [chain, address] of Object.entries(supportedPlatforms)) {
		const llamaswapChain = getLlamaswapChainByGeckoPlatform(chain)
		if (!llamaswapChain) continue

		normalizedChains.push({
			chain: llamaswapChain.llamaswap,
			address,
			displayName: llamaswapChain.displayName
		})
	}

	return normalizedChains
}

export function parseCoinGeckoLlamaswapChainsByTickerVolume(coin: {
	platforms?: Record<string, string>
	tickers?: CoinGeckoCoinTickerWithDepth[]
}): IProtocolLlamaswapChain[] {
	const platforms = getSupportedCoinGeckoPlatformsForLlamaswap(coin.platforms)
	const platformEntries = Object.entries(platforms)
	if (platformEntries.length === 0) return []

	const tickers = coin.tickers
	if (!tickers?.length) return mapSupportedCoinGeckoPlatformsToLlamaswapChains(platforms)

	const rows = platformEntries.map(([chain, address]) => ({
		chain,
		address,
		volumeUsd: 0
	}))

	for (const ticker of tickers) {
		const volumeUsd = Number(ticker.converted_volume?.usd) || 0
		const base = normalizeEvmContractAddress(ticker.base)
		const target = normalizeEvmContractAddress(ticker.target)
		if (!base && !target) continue

		for (const row of rows) {
			if (base === row.address || target === row.address) row.volumeUsd += volumeUsd
		}
	}

	rows.sort((a, b) => b.volumeUsd - a.volumeUsd)

	const normalizedChains: IProtocolLlamaswapChain[] = []
	for (const row of rows) {
		const llamaswapChain = getLlamaswapChainByGeckoPlatform(row.chain)
		if (!llamaswapChain || row.volumeUsd <= 0) continue

		normalizedChains.push({
			chain: llamaswapChain.llamaswap,
			address: row.address,
			displayName: llamaswapChain.displayName
		})
	}

	return normalizedChains.length > 0 ? normalizedChains : mapSupportedCoinGeckoPlatformsToLlamaswapChains(platforms)
}
