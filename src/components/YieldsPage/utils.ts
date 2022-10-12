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
			(tokenToLend === 'USD_Stables' ? true : symbol.includes(tokenToLend)) && ltv > 0 && !symbol.includes('Amm')
	)
	const availableProjects = availableToLend.map(({ project }) => project)
	const availableChains = availableToLend.map(({ chain }) => chain)

	const lendBorrowPairs = pools.reduce((acc, pool) => {
		if (
			!availableProjects.includes(pool.project) ||
			!availableChains.includes(pool.chain) ||
			(tokenToBorrow === 'USD_Stables' ? false : !pool.symbol.includes(tokenToBorrow)) ||
			pool.symbol.includes('Amm')
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

export const formatOptimizerPool = (pool) => {
	const lendingReward = (pool.apyBase || 0) + (pool.apyReward || 0)
	const borrowReward = (pool.borrow.apyBaseBorrow || 0) + (pool.borrow.apyRewardBorrow || 0)
	const totalReward = lendingReward + borrowReward
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
