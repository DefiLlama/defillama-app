import {
	YIELD_CONFIG_API,
	YIELD_POOLS_API,
	YIELD_MEDIAN_API,
	YIELD_URL_API,
	YIELD_CHAIN_API,
	YIELD_LEND_BORROW_API,
	YIELD_PERPS_API,
	PROTOCOLS_API
} from '~/constants'
import { fetchApi } from '~/utils/async'
import { formatYieldsPageData } from './utils'

export async function getYieldPageData() {
	let poolsAndConfig = await fetchApi([
		YIELD_POOLS_API,
		YIELD_CONFIG_API,
		YIELD_URL_API,
		YIELD_CHAIN_API,
		PROTOCOLS_API
	])

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
		const rewardTokens = p.rewardTokens?.filter((t) => !!t)

		if (rewardTokens) {
			let priceChainName = p.chain.toLowerCase()
			priceChainName = Object.keys(priceChainMapping).includes(priceChainName)
				? priceChainMapping[priceChainName]
				: priceChainName

			// using coingecko ids for projects on Neo, otherwise empty object
			pricesList.push(
				p.chain === 'Neo' ? [`coingecko:${p.project}`] : rewardTokens.map((t) => `${priceChainName}:${t.toLowerCase()}`)
			)
		}
	}
	pricesList = [...new Set(pricesList.flat())]

	// price endpoint seems to break with too many tokens, splitting it to max 150 per request
	const maxSize = 50
	const pages = Math.ceil(pricesList.length / maxSize)
	let pricesA = []
	let x = ''
	for (const p of [...Array(pages).keys()]) {
		x = pricesList
			.slice(p * maxSize, maxSize * (p + 1))
			.join(',')
			.replaceAll('/', '')
		pricesA = [...pricesA, (await fetchApi([`https://coins.llama.fi/prices/current/${x}`]))[0].coins]
	}
	// flatten
	let prices = {}
	for (const p of pricesA.flat()) {
		prices = { ...prices, ...p }
	}

	for (let p of data.pools) {
		let priceChainName = p.chain.toLowerCase()
		const rewardTokens = p.rewardTokens?.filter((t) => !!t)

		priceChainName = Object.keys(priceChainMapping).includes(priceChainName)
			? priceChainMapping[priceChainName]
			: priceChainName

		p['rewardTokensSymbols'] =
			p.chain === 'Neo'
				? [
						...new Set(
							rewardTokens.map((t) =>
								t === '0xf0151f528127558851b39c2cd8aa47da7418ab28'
									? 'FLM'
									: t === '0x340720c7107ef5721e44ed2ea8e314cce5c130fa'
									? 'NUDES'
									: null
							)
						)
				  ]
				: [
						...new Set(
							rewardTokens.map((t) => prices[`${priceChainName}:${t.toLowerCase()}`]?.symbol.toUpperCase() ?? null)
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
				: t === 'WMATIC'
				? data.tokenNameMapping['MATIC']
				: t === 'WFTM'
				? data.tokenNameMapping['FTM']
				: t === 'WETH'
				? data.tokenNameMapping['ETH']
				: t === 'WBNB'
				? data.tokenNameMapping['BNB']
				: t === 'HOP' && p.project === 'hop-protocol'
				? p.projectName
				: t === 'WOO.E'
				? data.tokenNameMapping['WOO']
				: t === 'SOLID' && p.project === 'solidly-v3'
				? p.projectName
				: data.tokenNameMapping[t]
		})
		p['rewardTokensNames'] = xy.filter((t) => t)
	}

	return {
		props: data
	}
}

export async function getYieldMedianData() {
	let data = (await fetchApi([YIELD_MEDIAN_API]))[0]
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

export type YieldsData = Awaited<ReturnType<typeof getYieldPageData>>

export async function getLendBorrowData() {
	const props = (await getYieldPageData()).props
	// treating fraxlend as cdp category otherwise the output
	// from optimizer will be wrong (it would use the crossproduct
	// btw collaterals eg eth -> crv, wbtc -> crv etc. instead of collateral -> frax only)
	props.pools = props.pools.map((p) => ({
		...p,
		category: p.project === 'fraxlend' ? 'CDP' : p.category,
		// on fraxlend apyBase = 0 on collateral, apyBase = optional lending of borrowed frax
		apyBase: p.project === 'fraxlend' ? null : p.apyBase
	}))

	// restrict pool data to lending and cdp
	const categoriesToKeep = ['Lending', 'Undercollateralized Lending', 'CDP', 'NFT Lending']
	let pools = props.pools.filter((p) => categoriesToKeep.includes(p.category))

	// get new borrow fields
	let dataBorrow = (await fetchApi([YIELD_LEND_BORROW_API]))[0]
	dataBorrow = dataBorrow.filter((p) => p.ltv <= 1)

	// for morpho: if totalSupplyUsd < totalBorrowUsd on morpho
	const configIdsCompound = pools.filter((p) => p.project === 'compound').map((p) => p.pool)
	const configIdsAave = pools
		.filter((p) => p.project === 'aave-v2' && p.chain === 'Ethereum' && !p.symbol.toLowerCase().includes('amm'))
		.map((p) => p.pool)
	const compoundPools = dataBorrow.filter((p) => configIdsCompound.includes(p.pool))
	const aavev2Pools = dataBorrow.filter((p) => configIdsAave.includes(p.pool))

	const tokenSymbols = new Set<string>()
	const cdpPools = [...new Set(props.pools.filter((p) => p.category === 'CDP').map((p) => p.pool))]
	pools = pools
		.map((p) => {
			const x = dataBorrow.find((i) => i.pool === p.pool)
			// for some projects we haven't added the new fields yet, dataBorrow will thus be smoler;
			// hence the check for undefined
			if (x === undefined) return null

			tokenSymbols.add(p.symbol)

			// we display apyBaseBorrow as a negative value
			const apyBaseBorrow = x.apyBaseBorrow !== null ? -x.apyBaseBorrow : null
			const apyRewardBorrow = x.apyRewardBorrow
			const apyBorrow = apyBaseBorrow === null && apyRewardBorrow === null ? null : apyBaseBorrow + apyRewardBorrow

			// morpho
			// (using compound available liquidity if totalSupplyUsd < totalBorrowUsd on morhpo === p2p fully matched
			// otherwise its negative.
			// instead we display the compound available pool liq together with a tooltip to clarify this
			let totalAvailableUsd
			if (p.project === 'morpho-compound') {
				const compoundData = compoundPools.find(
					(a) => a.underlyingTokens[0].toLowerCase() === x.underlyingTokens[0].toLowerCase()
				)
				totalAvailableUsd = compoundData?.totalSupplyUsd - compoundData?.totalBorrowUsd
			} else if (p.project === 'morpho-aave') {
				const aaveData = aavev2Pools.find(
					(a) => a.underlyingTokens[0].toLowerCase() === x.underlyingTokens[0].toLowerCase()
				)
				totalAvailableUsd = aaveData?.totalSupplyUsd - aaveData?.totalBorrowUsd
			} else if (x.totalSupplyUsd === null && x.totalBorrowUsd === null) {
				totalAvailableUsd = null
				// GHO pool on aave-v3
			} else if (cdpPools.includes(x.pool) || x.pool === '1e00ac2b-0c3c-4b1f-95be-9378f98d2b40') {
				totalAvailableUsd = x.debtCeilingUsd ? x.debtCeilingUsd - x.totalBorrowUsd : null
			} else if (p.project === 'compound' && x.debtCeilingUsd > 0) {
				totalAvailableUsd =
					x.totalSupplyUsd - x.totalBorrowUsd > x.debtCeilingUsd
						? x.debtCeilingUsd
						: x.totalSupplyUsd - x.totalBorrowUsd
			} else {
				totalAvailableUsd = x.totalSupplyUsd - x.totalBorrowUsd
			}

			return {
				...p,
				apyBaseBorrow,
				apyRewardBorrow,
				totalSupplyUsd: x.totalSupplyUsd,
				totalBorrowUsd: x.totalBorrowUsd,
				ltv: x.ltv,
				borrowable: x.borrowable,
				mintedCoin: x.mintedCoin,
				borrowFactor: x.borrowFactor,
				// note re morpho: they build on top of compound. if the total supply is being used by borrowers
				// then any excess borrows will be routed via compound pools. so the available liquidity is actually
				// compounds liquidity. not 100% sure how to present this on the frontend, but for now going to supress
				// liq values (cause some of them are negative)
				totalAvailableUsd,
				apyBorrow,
				rewardTokens: p.apyRewards > 0 || x.apyRewardBorrow > 0 ? x.rewardTokens : p.rewardTokens
			}
		})
		.filter(Boolean)
		.sort((a, b) => b.totalSupplyUsd - a.totalSupplyUsd)

	const projectsList = new Set()
	const lendingProtocols = new Set()
	const farmProtocols = new Set()

	props.pools.forEach((pool) => {
		projectsList.add(pool.projectName)
		// remove undercollateralised cause we cannot borrow on those
		if (['Lending', 'CDP', 'NFT Lending'].includes(pool.category)) {
			lendingProtocols.add(pool.projectName)
		}
		farmProtocols.add(pool.projectName)

		pool.rewardTokensNames?.forEach((rewardName) => {
			projectsList.add(rewardName)
			farmProtocols.add(rewardName)
		})
	})

	return {
		props: {
			pools,
			chainList: [...new Set(pools.map((p) => p.chain))],
			projectList: Array.from(projectsList),
			lendingProtocols: Array.from(lendingProtocols),
			farmProtocols: Array.from(farmProtocols),
			categoryList: categoriesToKeep,
			tokenNameMapping: props.tokenNameMapping,
			allPools: props.pools,
			symbols: [...tokenSymbols]
		}
	}
}

export function calculateLoopAPY(lendBorrowPools, loops = 10, customLTV) {
	let pools = lendBorrowPools.filter((p) => p.ltv > 0 && p.totalBorrowUsd > 0 && p.project !== 'marginfi') // Can't loop same asset on marginfi
	pools = pools.map((p) => ({ ...p, ltv: p.project === 'euler' ? p.ltv * p.borrowFactor : p.ltv }))

	return pools
		.map((p) => {
			const deposit_apy = (p.apyBase + p.apyReward) / 100
			// apyBaseBorrow already set to - in getLendBorrowData
			const borrow_apy = (p.apyBaseBorrow + p.apyRewardBorrow) / 100

			let total_borrowed = 0
			const ltv = customLTV ? (customLTV / 100) * p.ltv : p.ltv
			for (const i of [...Array(loops).keys()]) {
				total_borrowed += ltv ** (i + 1)
			}

			const loopApy = ((total_borrowed + 1) * deposit_apy + total_borrowed * borrow_apy) * 100
			const boost = loopApy / (p.apyBase + p.apyReward)
			if (boost > 1 && Number.isFinite(boost)) {
				return { ...p, loopApy, boost }
			} else return null
		})
		.filter(Boolean)
		.sort((a, b) => b.loopApy - a.loopApy)
}

export async function getPerpData() {
	const perps = (await fetchApi([YIELD_PERPS_API]))[0]
	return perps.data.map((m) => ({ ...m, symbol: m.baseAsset }))
}
