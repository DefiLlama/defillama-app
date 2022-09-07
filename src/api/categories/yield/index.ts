import { YIELD_CONFIG_API, YIELD_POOLS_API, YIELD_MEDIAN_API, YIELD_URL_API, YIELD_CHAIN_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'
import { formatYieldsPageData } from './utils'

export async function getYieldPageData() {
	let poolsAndConfig = await arrayFetcher([YIELD_POOLS_API, YIELD_CONFIG_API, YIELD_URL_API, YIELD_CHAIN_API])

	let data = formatYieldsPageData(poolsAndConfig)
	data.pools = data.pools.map((p) => ({
		...p,
		underlyingTokens: p.underlyingTokens ?? [],
		rewardTokens: p.rewardTokens ?? []
	}))

	const priceChainMapping = {
		binance: 'bsc',
		avalanche: 'avax',
		gnosis: 'xdai'
	}

	// get Price data
	let pricesList = []
	for (let p of data.pools) {
		if (p.rewardTokens) {
			let priceChainName = p.chain.toLowerCase()
			priceChainName = Object.keys(priceChainMapping).includes(priceChainName)
				? priceChainMapping[priceChainName]
				: priceChainName

			pricesList.push(p.rewardTokens.map((t) => `${priceChainName}:${t.toLowerCase()}`))
		}
	}
	pricesList = [...new Set(pricesList.flat())]

	const prices = (
		await Promise.all([
			fetch('https://coins.llama.fi/prices', {
				method: 'POST',
				body: JSON.stringify({ coins: pricesList })
			}).then((res) => res.json())
		])
	)[0].coins

	for (let p of data.pools) {
		let priceChainName = p.chain.toLowerCase()
		priceChainName = Object.keys(priceChainMapping).includes(priceChainName)
			? priceChainMapping[priceChainName]
			: priceChainName

		p['rewardTokensSymbols'] = [
			...new Set(
				p.rewardTokens.map((t) => prices[`${priceChainName}:${t.toLowerCase()}`]?.symbol.toUpperCase() ?? null)
			)
		]
	}

	for (let p of data.pools) {
		// need to map wrapped chain tokens
		// eg WAVAX -> AVAX
		// eg WFTM -> FTM
		const xy = p.rewardTokensSymbols.map((t) => {
			return t === 'WAVAX'
				? data.tokenNameMapping['AVAX']
				: t === 'WFTM'
				? data.tokenNameMapping['FTM']
				: data.tokenNameMapping[t]
		})
		p['rewardTokensNames'] = xy.filter((t) => t)
	}

	return {
		props: data
	}
}

export async function getYieldMedianData() {
	let data = (await arrayFetcher([YIELD_MEDIAN_API]))[0]
	// for the 4th of june we have low nb of datapoints which is skewing the median/
	// hence why we remove it from the plot
	data = data.filter((p) => p.timestamp !== '2022-06-04T00:00:00.000Z')

	// add 7day average field
	data = data
		.map((e) => ({ ...e, timestamp: e.timestamp.split('T')[0] }))
		.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
	// add rolling 7d avg of median values (first 6days == null)
	const windowSize = 7
	const apyMedianValues = data.map((m) => m.medianAPY)
	const avg = []
	for (let i = 0; i < apyMedianValues.length; i++) {
		if (i + 1 < windowSize) {
			avg[i] = null
		} else {
			avg[i] = apyMedianValues.slice(i + 1 - windowSize, i + 1).reduce((a, b) => a + b, 0) / windowSize
		}
	}
	data = data.map((m, i) => ({ ...m, avg7day: avg[i] }))

	return {
		props: data
	}
}
