import { fetchCoinPrices } from '~/api'
import type { YieldPageProps } from '../types'

export const yieldPriceChainMapping: Record<string, string> = {
	binance: 'bsc',
	avalanche: 'avax',
	gnosis: 'xdai'
}

function getRewardTokenPriceKey(chain: string, token: string) {
	return `${chain}:${token.replaceAll('/', ':').toLowerCase()}`
}

export async function enrichRewardTokenNames(data: YieldPageProps): Promise<YieldPageProps> {
	const priceChainMappingKeys = new Set<string>()
	for (const chainName in yieldPriceChainMapping) {
		priceChainMappingKeys.add(chainName)
	}

	const pricesSet = new Set<string>()

	for (const pool of data.pools) {
		if (!pool.rewardTokens?.length) continue

		let hasRewardToken = false
		for (const token of pool.rewardTokens) {
			if (token) {
				hasRewardToken = true
				break
			}
		}
		if (!hasRewardToken) continue

		let priceChainName = pool.chain.toLowerCase()
		priceChainName = priceChainMappingKeys.has(priceChainName) ? yieldPriceChainMapping[priceChainName] : priceChainName

		if (pool.chain === 'Neo') {
			pricesSet.add(`coingecko:${pool.project}`)
		} else {
			for (const token of pool.rewardTokens) {
				if (token) pricesSet.add(getRewardTokenPriceKey(priceChainName, token))
			}
		}
	}

	const coinsPrices = await fetchCoinPrices(Array.from(pricesSet))

	for (const pool of data.pools) {
		let priceChainName = pool.chain.toLowerCase()
		const rewardTokens: string[] = []
		for (const token of pool.rewardTokens ?? []) {
			if (token) rewardTokens.push(token)
		}

		priceChainName = priceChainMappingKeys.has(priceChainName) ? yieldPriceChainMapping[priceChainName] : priceChainName

		const rewardTokenSymbols = new Set<string | null>()
		if (pool.chain === 'Neo') {
			for (const token of rewardTokens) {
				rewardTokenSymbols.add(
					token === '0xf0151f528127558851b39c2cd8aa47da7418ab28'
						? 'FLM'
						: token === '0x340720c7107ef5721e44ed2ea8e314cce5c130fa'
							? 'NUDES'
							: null
				)
			}
		} else {
			for (const token of rewardTokens) {
				rewardTokenSymbols.add(coinsPrices[getRewardTokenPriceKey(priceChainName, token)]?.symbol.toUpperCase() ?? null)
			}
		}
		pool.rewardTokensSymbols = Array.from(rewardTokenSymbols)
	}

	for (const pool of data.pools) {
		const rewardNames: string[] = []
		for (const token of pool.rewardTokensSymbols) {
			const rewardName =
				token === 'WAVAX'
					? data.tokenNameMapping['AVAX']
					: token === 'WFTM'
						? data.tokenNameMapping['FTM']
						: token === 'WMATIC'
							? data.tokenNameMapping['MATIC']
							: token === 'WETH'
								? data.tokenNameMapping['ETH']
								: token === 'WBNB'
									? data.tokenNameMapping['BNB']
									: token === 'HOP' && pool.project === 'hop-protocol'
										? pool.projectName
										: token === 'WOO.E'
											? data.tokenNameMapping['WOO']
											: token === 'SOLID' && pool.project === 'solidly-v3'
												? pool.projectName
												: data.tokenNameMapping[token]
			if (rewardName) rewardNames.push(rewardName)
		}
		pool.rewardTokensNames = rewardNames
	}

	return data
}
