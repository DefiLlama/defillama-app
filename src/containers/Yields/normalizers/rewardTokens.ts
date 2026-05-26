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

	let pricesList = []

	for (const pool of data.pools) {
		const rewardTokens = pool.rewardTokens?.filter(Boolean) ?? []

		if (rewardTokens.length) {
			let priceChainName = pool.chain.toLowerCase()
			priceChainName = priceChainMappingKeys.has(priceChainName)
				? yieldPriceChainMapping[priceChainName]
				: priceChainName

			pricesList.push(
				pool.chain === 'Neo'
					? [`coingecko:${pool.project}`]
					: rewardTokens.map((token) => getRewardTokenPriceKey(priceChainName, token))
			)
		}
	}
	pricesList = [...new Set(pricesList.flat())]

	const coinsPrices = await fetchCoinPrices(pricesList)

	for (const pool of data.pools) {
		let priceChainName = pool.chain.toLowerCase()
		const rewardTokens = pool.rewardTokens?.filter(Boolean) ?? []

		priceChainName = priceChainMappingKeys.has(priceChainName) ? yieldPriceChainMapping[priceChainName] : priceChainName

		pool.rewardTokensSymbols =
			pool.chain === 'Neo'
				? [
						...new Set(
							rewardTokens.map((token) =>
								token === '0xf0151f528127558851b39c2cd8aa47da7418ab28'
									? 'FLM'
									: token === '0x340720c7107ef5721e44ed2ea8e314cce5c130fa'
										? 'NUDES'
										: null
							)
						)
					]
				: [
						...new Set(
							rewardTokens.map(
								(token) => coinsPrices[getRewardTokenPriceKey(priceChainName, token)]?.symbol.toUpperCase() ?? null
							)
						)
					]
	}

	for (const pool of data.pools) {
		const rewardNames = pool.rewardTokensSymbols.map((token) => {
			return token === 'WAVAX'
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
		})
		pool.rewardTokensNames = rewardNames.filter((token) => token)
	}

	return data
}
