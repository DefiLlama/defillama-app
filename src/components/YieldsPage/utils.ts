import { YieldsData } from '~/api/categories/yield'
import { attributeOptions } from '~/components/Filters'

export function toFilterPool({
	curr,
	selectedProjects,
	selectedChains,
	selectedAttributes,
	includeTokens,
	excludeTokens,
	selectedCategories,
	pathname,
	minTvl,
	maxTvl,
	minApy,
	maxApy
}) {
	let toFilter = true

	// used in pages like /yields/stablecoins to filter some pools by default
	attributeOptions.forEach((option) => {
		// check if this page has default attribute filter function
		if (option.defaultFilterFnOnPage[pathname]) {
			// apply default attribute filter function
			toFilter = toFilter && option.defaultFilterFnOnPage[pathname](curr)
		}
	})

	selectedAttributes.forEach((attribute) => {
		const attributeOption = attributeOptions.find((o) => o.key === attribute)

		if (attributeOption) {
			toFilter = toFilter && attributeOption.filterFn(curr)
		}
	})

	toFilter = toFilter && selectedProjects?.map((p) => p.toLowerCase()).includes(curr.project.toLowerCase())

	toFilter = toFilter && selectedCategories?.map((p) => p.toLowerCase()).includes(curr.category.toLowerCase())

	const tokensInPool: string[] = curr.symbol.split('-').map((x) => x.toLowerCase())

	const includeToken =
		includeTokens.length > 0
			? includeTokens
					.map((t) => t.toLowerCase())
					.find((token) => {
						if (tokensInPool.some((x) => x.includes(token.toLowerCase()))) {
							return true
						} else if (token === 'eth') {
							return tokensInPool.find((x) => x.includes('weth') && x.includes(token))
						} else return false
					})
			: true

	const excludeToken = !excludeTokens
		.map((t) => t.toLowerCase())
		.find((token) => tokensInPool.includes(token.toLowerCase()))

	toFilter =
		toFilter &&
		selectedChains.map((t) => t.toLowerCase()).includes(curr.chain.toLowerCase()) &&
		includeToken &&
		excludeToken

	const isValidTvlRange =
		(minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

	const isValidApyRange =
		(minApy !== undefined && !Number.isNaN(Number(minApy))) || (maxApy !== undefined && !Number.isNaN(Number(maxApy)))

	if (isValidTvlRange) {
		toFilter = toFilter && (minTvl ? curr.tvlUsd > minTvl : true) && (maxTvl ? curr.tvlUsd < maxTvl : true)
	}

	if (isValidApyRange) {
		toFilter = toFilter && (minApy ? curr.apy > minApy : true) && (maxApy ? curr.apy < maxApy : true)
	}

	return toFilter
}

export const findOptimizerPools = (pools, tokenToLend, tokenToBorrow) => {
	const availableToLend = pools.filter(
		({ symbol, ltv }) =>
			(tokenToLend === 'USD_Stables' ? true : symbol.includes(tokenToLend)) && ltv > 0 && !symbol.includes('AMM')
	)
	const availableProjects = availableToLend.map(({ project }) => project)
	const availableChains = availableToLend.map(({ chain }) => chain)

	const lendBorrowPairs = pools.reduce((acc, pool) => {
		if (
			!availableProjects.includes(pool.project) ||
			!availableChains.includes(pool.chain) ||
			(tokenToBorrow === 'USD_Stables' ? false : !pool.symbol.includes(tokenToBorrow)) ||
			pool.symbol.includes('AMM')
		)
			return acc
		if (tokenToBorrow === 'USD_Stables' && !pool.stablecoin) return acc

		const collatteralPools = availableToLend.filter(
			(collateralPool) =>
				collateralPool.chain === pool.chain &&
				collateralPool.project === pool.project &&
				!collateralPool.symbol.includes(tokenToBorrow) &&
				collateralPool.pool !== pool.pool &&
				(pool.project === 'solend' ? collateralPool.poolMeta === pool.poolMeta : true) &&
				(tokenToLend === 'USD_Stables' ? collateralPool.stablecoin : true) &&
				(pool.project === 'compound-v3' ? pool.symbol === 'USDC' : true)
		)

		const poolsPairs = collatteralPools.map((collatteralPool) => ({
			...collatteralPool,
			chains: [collatteralPool.chain],
			borrow: pool
		}))

		return acc.concat(poolsPairs)
	}, [])

	return lendBorrowPairs
}

const removeMetaTag = (symbol) => symbol.replace(/ *\([^)]*\) */g, '')

export const findStrategyPools = (pools, tokenToLend, tokenToBorrow, allPools) => {
	const availableToLend = pools.filter(
		({ symbol, ltv }) =>
			(tokenToLend === 'USD_Stables' ? true : removeMetaTag(symbol).includes(tokenToLend)) &&
			ltv > 0 &&
			!removeMetaTag(symbol).includes('AMM')
	)
	const availableProjects = availableToLend.map(({ project }) => project)
	const availableChains = availableToLend.map(({ chain }) => chain)

	// lendBorrowPairs is the same as in the optimizer, only difference is the optional filter on tokenToBorrow
	const lendBorrowPairs = pools.reduce((acc, pool) => {
		if (
			!availableProjects.includes(pool.project) ||
			!availableChains.includes(pool.chain) ||
			(tokenToBorrow === 'USD_Stables' ? false : !removeMetaTag(pool.symbol).includes(tokenToBorrow)) ||
			removeMetaTag(pool.symbol).includes('AMM')
		)
			return acc
		if (tokenToBorrow === 'USD_Stables' && !pool.stablecoin) return acc

		const collatteralPools = availableToLend.filter(
			(collateralPool) =>
				collateralPool.chain === pool.chain &&
				collateralPool.project === pool.project &&
				(tokenToBorrow ? !removeMetaTag(collateralPool.symbol).includes(tokenToBorrow) : true) &&
				collateralPool.pool !== pool.pool &&
				(pool.project === 'solend' ? collateralPool.poolMeta === pool.poolMeta : true) &&
				(tokenToLend === 'USD_Stables' ? collateralPool.stablecoin : true) &&
				(pool.project === 'compound-v3' ? removeMetaTag(pool.symbol) === 'USDC' : true)
		)

		const poolsPairs = collatteralPools.map((collatteralPool) => ({
			...collatteralPool,
			chains: [collatteralPool.chain],
			borrow: pool
		}))

		return acc.concat(poolsPairs)
	}, [])

	let finalPools = []
	// if borrow token is specified
	if (tokenToBorrow) {
		// filter to suitable farm strategies
		const farmPools = allPools.filter((i) =>
			tokenToBorrow === 'USD_Stables' ? i.stablecoin : removeMetaTag(i.symbol).includes(tokenToBorrow)
		)
		for (const p of lendBorrowPairs) {
			for (const i of farmPools) {
				// only same chain strategies for now
				if (
					p.chain !== i.chain ||
					!removeMetaTag(i.symbol).includes(removeMetaTag(p.borrow.symbol).toUpperCase()) ||
					p.borrow.apyBorrow === null
				)
					continue

				finalPools.push({
					...p,
					farmSymbol: i.symbol,
					farmChain: [i.chain],
					farmProjectName: i.projectName,
					farmProject: i.project,
					farmTvlUsd: i.tvlUsd,
					farmApy: i.apy,
					farmApyBase: i.apyBase,
					farmApyReward: i.apyReward
				})
			}
		}
	} else {
		for (const p of lendBorrowPairs) {
			for (const i of allPools) {
				if (
					p.chain !== i.chain ||
					!removeMetaTag(i.symbol).includes(removeMetaTag(p.borrow.symbol).toUpperCase()) ||
					p.borrow.apyBorrow === null
				)
					continue

				finalPools.push({
					...p,
					farmSymbol: i.symbol,
					farmChain: [i.chain],
					farmProjectName: i.projectName,
					farmProject: i.project,
					farmTvlUsd: i.tvlUsd,
					farmApy: i.apy,
					farmApyBase: i.apyBase,
					farmApyReward: i.apyReward
				})
			}
		}
	}
	// calc the total strategy apy
	finalPools = finalPools.map((p) => {
		// apy = apyBase + apyReward on the collateral side
		// apyBorrow = apyBaseBorrow + apyRewardBorrow on the borrow side
		// farmApy = apyBase + apyReward on the farm side
		const totalApy = p.apy + p.borrow.apyBorrow * p.ltv + p.farmApy * p.ltv

		return {
			...p,
			totalApy,
			delta: totalApy - p.apy
		}
	})

	// keep pools with :
	// - profitable strategy only,
	// - require at least 1% delta compared to baseline (we could even increase this, otherwise we show lots of
	// strategies which are not really worth the effort)
	finalPools = finalPools.filter((p) => Number.isFinite(p.delta) && p.delta > 1).sort((a, b) => b.totalApy - a.totalApy)

	return finalPools
}

export const formatOptimizerPool = (pool) => {
	const lendingReward = (pool.apyBase || 0) + (pool.apyReward || 0)
	const borrowReward = (pool.borrow.apyBaseBorrow || 0) + (pool.borrow.apyRewardBorrow || 0)
	const totalReward = lendingReward + borrowReward * pool.ltv
	const borrowAvailableUsd = pool.borrow.totalAvailableUsd

	return { ...pool, lendingReward, borrowReward, totalReward, borrowAvailableUsd }
}

interface FilterPools {
	selectedChains: string[]
	pool: YieldsData['props']['pools'][number]
}

export const filterPool = ({ pool, selectedChains }: FilterPools) => {
	const isChainValid = selectedChains.map((chain) => chain.toLowerCase()).includes(pool.chain.toLowerCase())

	return isChainValid
}
