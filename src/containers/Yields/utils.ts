import { calculateLoopAPY, YieldsData } from '~/containers/Yields/queries/index'
import { attributeOptions, attributeOptionsMap } from './Filters/Attributes'

interface IToFilterPool {
	curr: YieldsData['props']['pools'][number]
	selectedProjectsSet: Set<string>
	selectedChainsSet: Set<string>
	selectedAttributes: string[]
	includeTokens: string[]
	exactTokens: string[]
	selectedCategoriesSet: Set<string>
	excludeTokensSet: Set<string>
	pathname: string
	minTvl: number | null
	maxTvl: number | null
	minApy: number | null
	maxApy: number | null
	pairTokens: string[]
	usdPeggedSymbols: string[]
}

export function toFilterPool({
	curr,
	selectedProjectsSet,
	selectedChainsSet,
	selectedAttributes,
	includeTokens,
	excludeTokensSet,
	exactTokens,
	selectedCategoriesSet,
	pathname,
	minTvl,
	maxTvl,
	minApy,
	maxApy,
	pairTokens,
	usdPeggedSymbols
}: IToFilterPool) {
	const tokensInPoolArray = curr.symbol
		.split('(')[0]
		.split('-')
		.map((x) => x.toLowerCase().trim().replace('₮0', 't').replace('₮', 't'))
	const tokensInPoolSet = new Set<string>(tokensInPoolArray)

	let toFilter = true

	// used in pages like /yields/stablecoins to filter some pools by default
	attributeOptions.forEach((option) => {
		// check if this page has default attribute filter function
		if (option.defaultFilterFnOnPage[pathname]) {
			// apply default attribute filter function
			toFilter = toFilter && option.defaultFilterFnOnPage[pathname](curr)
		}

		if (pathname === '/yields' && option.key === 'apy_zero' && !selectedAttributes.includes(option.key)) {
			toFilter = toFilter && curr.apy > 0
		}
	})

	selectedAttributes.forEach((attribute) => {
		const attributeOption = attributeOptionsMap.get(attribute)

		if (attributeOption) {
			toFilter = toFilter && attributeOption.filterFn(curr)
		}
	})

	toFilter = toFilter && selectedProjectsSet.has(curr.projectName)

	toFilter = toFilter && selectedCategoriesSet.has(curr.category)

	const tokensInPool: string[] = tokensInPoolArray

	if (pairTokens.length > 0) {
		let atLeastOnePairToken = false
		for (const pairToken of pairTokens) {
			const pt = pairToken.split('-')
			if (tokensInPool.length === pt.length && pt.every((token) => tokensInPoolSet.has(token))) {
				atLeastOnePairToken = true
				break
			}
		}

		toFilter = toFilter && atLeastOnePairToken
	} else if (exactTokens.length === 0) {
		const includeToken =
			includeTokens.length > 0 && includeTokens[0] !== 'All'
				? includeTokens.find((token) => {
						if (token === 'all_bitcoins') {
							return tokensInPool.some((x) => x.includes('btc'))
						} else if (token === 'all_usd_stables') {
							// only include pools that are marked as stablecoin &
							// every token in the pool symbol contains usd-pegged stable symbol (substring match)
							if (!curr.stablecoin) return false
							if (!Array.isArray(usdPeggedSymbols) || usdPeggedSymbols.length === 0) return false
							return (
								tokensInPool.length > 0 &&
								tokensInPool.every((sym) => usdPeggedSymbols.some((usd) => sym.includes(usd)))
							)
						} else if (tokensInPool.some((x) => x.includes(token))) {
							return true
						} else if (token === 'eth') {
							return tokensInPool.find((x) => x.includes('weth') && x.includes(token))
						} else return false
					})
				: true

		// Check if any excludeToken exists in tokensInPoolSet using Set intersection
		const excludeToken = !Array.from(excludeTokensSet).some((token: string) => tokensInPoolSet.has(token))

		toFilter = toFilter && selectedChainsSet.has(curr.chain) && includeToken && excludeToken
	} else {
		const exactToken = exactTokens.find((token) => {
			if (tokensInPoolSet.has(token)) {
				return true
			} else if (token === 'eth') {
				return tokensInPool.find((x) => x.includes('weth') && x === token)
			} else return false
		})

		toFilter = toFilter && (selectedChainsSet.has(curr.chain) && exactToken ? true : false)
	}

	const isValidTvlRange = minTvl != null || maxTvl != null

	const isValidApyRange = minApy != null || maxApy != null

	if (isValidTvlRange) {
		toFilter = toFilter && (minTvl != null ? curr.tvlUsd >= minTvl : true) && (maxTvl != null ? curr.tvlUsd <= maxTvl : true)
	}

	if (isValidApyRange) {
		toFilter = toFilter && (minApy != null ? curr.apy > minApy : true) && (maxApy != null ? curr.apy < maxApy : true)
	}

	return toFilter
}

const isStable = (token) => token?.toUpperCase() === 'USD_STABLES'

const matchesToken = (symbol, tokenToMatch) => {
	if (!tokenToMatch) return false

	const cleanSymbol = removeMetaTag(symbol).toUpperCase()
	const cleanToken = removeMetaTag(tokenToMatch).toUpperCase()

	if (cleanSymbol.includes(cleanToken)) return true

	return false
}

export const findOptimizerPools = ({ pools, tokenToLend, tokenToBorrow, cdpRoutes }) => {
	if (!tokenToLend && !tokenToBorrow) return []
	const availableToLend = pools.filter(({ symbol, ltv }) => {
		if (!tokenToLend || isStable(tokenToLend)) return true

		return matchesToken(symbol, tokenToLend) && ltv > 0 && !matchesToken(symbol, 'AMM')
	})

	const availableProjectsSet = new Set(availableToLend.map(({ project }) => project))
	const availableChainsSet = new Set(availableToLend.map(({ chain }) => chain))

	const lendBorrowPairs = pools.reduce((acc, pool) => {
		if (
			!availableProjectsSet.has(pool.project) ||
			!availableChainsSet.has(pool.chain) ||
			(tokenToBorrow && (isStable(tokenToBorrow) ? false : !matchesToken(pool.symbol, tokenToBorrow))) ||
			matchesToken(pool.symbol, 'AMM') ||
			pool.borrowable === false ||
			(pool.project === 'liqee' && (tokenToLend === 'RETH' || tokenToBorrow === 'RETH'))
		) {
			return acc
		}

		if (isStable(tokenToBorrow) && !pool.stablecoin) {
			return acc
		}

		const collatteralPools = availableToLend.filter((collateralPool) => {
			if (!tokenToBorrow) return true

			return (
				collateralPool.chain === pool.chain &&
				collateralPool.project === pool.project &&
				((tokenToLend === 'STETH' && tokenToBorrow === 'ETH') || !matchesToken(collateralPool.symbol, tokenToBorrow)) &&
				collateralPool.pool !== pool.pool &&
				(pool.project === 'solend' ? collateralPool.poolMeta === pool.poolMeta : true) &&
				(isStable(tokenToLend) ? collateralPool.stablecoin : true) &&
				(pool.project === 'compound-v3' ? pool.borrowable && collateralPool.poolMeta === pool.poolMeta : true)
			)
		})

		const poolsPairs = collatteralPools.map((collatteralPool) => ({
			...collatteralPool,
			chains: [collatteralPool.chain],
			borrow: pool,
			ltv: collatteralPool.project === 'euler' ? collatteralPool.ltv * pool.borrowFactor : collatteralPool.ltv
		}))

		return acc.concat(poolsPairs)
	}, [])

	// add cdp pairs
	const cdpPairs =
		tokenToLend && tokenToBorrow
			? cdpRoutes.filter(
					(p) =>
						(isStable(tokenToLend) ? p.stablecoin : matchesToken(p.symbol, tokenToLend)) &&
						// tokenToBorrow in the context of cdps -> minted stablecoin -> always true
						(isStable(tokenToBorrow) ? true : matchesToken(p.borrow.symbol, tokenToBorrow))
				)
			: []

	return lendBorrowPairs.concat(cdpPairs)
}

export const removeMetaTag = (symbol) => symbol.replace(/ *\([^)]*\) */g, '')

export const findStrategyPools = ({ pools, tokenToLend, tokenToBorrow, allPools, cdpRoutes, customLTV }) => {
	// prepare leveraged lending (loop) pools
	const loopPools = calculateLoopAPY(pools, 10, customLTV)

	const availableToLend = pools.filter(
		({ symbol, ltv }) =>
			(isStable(tokenToLend) ? true : matchesToken(symbol, tokenToLend)) && ltv > 0 && !matchesToken(symbol, 'AMM')
	)
	const availableProjectsSet = new Set(availableToLend.map(({ project }) => project))
	const availableChainsSet = new Set(availableToLend.map(({ chain }) => chain))

	// lendBorrowPairs is the same as in the optimizer, only difference is the optional filter on tokenToBorrow
	let lendBorrowPairs = pools.reduce((acc, pool) => {
		if (
			!availableProjectsSet.has(pool.project) ||
			!availableChainsSet.has(pool.chain) ||
			(isStable(tokenToBorrow) ? false : !matchesToken(pool.symbol, tokenToBorrow)) ||
			matchesToken(pool.symbol, 'AMM') ||
			pool.apyBorrow === null ||
			// remove any pools where token is not borrowable
			pool.borrowable === false
		)
			return acc
		if (isStable(tokenToBorrow) && !pool.stablecoin) return acc

		const collatteralPools = availableToLend.filter(
			(collateralPool) =>
				collateralPool.chain === pool.chain &&
				collateralPool.project === pool.project &&
				(tokenToBorrow ? !matchesToken(collateralPool.symbol, tokenToBorrow) : true) &&
				collateralPool.pool !== pool.pool &&
				(pool.project === 'solend' ? collateralPool.poolMeta === pool.poolMeta : true) &&
				(isStable(tokenToLend) ? collateralPool.stablecoin : true) &&
				(pool.project === 'compound-v3' ? matchesToken(pool.symbol, 'USDC') : true)
		)

		const poolsPairs = collatteralPools.map((collatteralPool) => ({
			...collatteralPool,
			chains: [collatteralPool.chain],
			borrow: pool,
			ltv: collatteralPool.project === 'euler' ? collatteralPool.ltv * pool.borrowFactor : collatteralPool.ltv
		}))

		return acc.concat(poolsPairs)
	}, [])

	// add cdp pairs
	let cdpPairs = []
	if (tokenToLend) {
		cdpPairs = cdpRoutes.filter((p) => matchesToken(p.symbol, tokenToLend))
	}
	if (tokenToBorrow) {
		cdpPairs = cdpPairs.filter((p) => matchesToken(p.borrow.symbol, tokenToBorrow))
	}
	lendBorrowPairs = lendBorrowPairs.concat(cdpPairs)

	let finalPools = []
	// if borrow token is specified
	if (tokenToBorrow) {
		// filter to suitable farm strategies
		const farmPools = allPools.filter((i) =>
			isStable(tokenToBorrow) ? i.stablecoin : matchesToken(i.symbol, tokenToBorrow)
		)
		for (const p of lendBorrowPairs) {
			for (const i of farmPools) {
				// we ignore strategies not on the same chain
				if (p.chain !== i.chain) continue
				// we ignore strategies where the farm symbol doesn't include tokenToBorrow
				// (special case of USD_Stables selector for which we need to check if the pool is a stablecoin
				// and also if the subset matches (eg if debt token = DAI -> should not be matched against a USDC farm)
				if (
					isStable(tokenToBorrow)
						? !i.stablecoin || !matchesToken(i.symbol, p.borrow.symbol)
						: !matchesToken(i.symbol, tokenToBorrow)
				)
					continue

				finalPools.push({
					...p,
					farmPool: i.pool,
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
				// we ignore strategies not on the same chain
				if (p.chain !== i.chain) continue
				// ignore pools where farm symbol doesn't include the borrow symbol and vice versa
				// eg borrow symbol => WAVAX, farm symbol => AVAX (or borrow = AVAX and farm = WAVAX)
				// (if we'd just look in one way we'd miss some strategies)
				if (!matchesToken(i.symbol, p.borrow.symbol) && !matchesToken(p.borrow.symbol, i.symbol)) continue

				finalPools.push({
					...p,
					farmPool: i.pool,
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
	// keep looping strategies only if no tokenToBorrow is given or if they both match
	const loopPoolsFiltered =
		tokenToBorrow !== tokenToLend && tokenToBorrow.length > 0
			? []
			: loopPools
					.filter((p) => matchesToken(p.symbol, tokenToLend))
					.map((p) => ({
						...p,
						farmPool: p.pool,
						borrow: p,
						chains: [p.chain],
						farmSymbol: p.symbol,
						farmChain: [p.chain],
						farmProjectName: p.projectName,
						farmProject: p.project,
						farmTvlUsd: p.tvlUsd,
						farmApy: p.apy,
						farmApyBase: p.apyBase,
						farmApyReward: p.apyReward,
						strategy: 'loop'
					}))

	finalPools = finalPools.concat(loopPoolsFiltered)

	// calc the total strategy apy
	finalPools = finalPools.map((p) => {
		// apy = apyBase + apyReward on the collateral side
		// apyBorrow = apyBaseBorrow + apyRewardBorrow on the borrow side
		// farmApy = apyBase + apyReward on the farm side

		// either use default LTV or the one given via input field
		const ltv = customLTV ? (customLTV / 100) * p.ltv : p.ltv
		const totalApy = p.strategy === 'loop' ? p.loopApy : p.apy + p.borrow.apyBorrow * ltv + p.farmApy * ltv

		return {
			...p,
			totalApy,
			delta: totalApy - p.apy
		}
	})

	// keep pools with :
	// - profitable strategy only (delta > 0)
	// - require at least 1% delta compared to baseline (we could even increase this, otherwise we show lots of
	// strategies which have higher yield compared to just depositing on lending protocol but by
	// a smol amount only, so not really worth the effort)
	// - if deposit token and borrow token are the same, then the farm can't have higher apy then just depositing on the lending protocol
	// (cause in this case the strategy makes no sense, would be better to just got to the farm directly)
	finalPools = finalPools
		.filter(
			(p) => Number.isFinite(p.delta) && p.delta > 1 && !(p.farmSymbol.includes(tokenToLend) && p.totalApy < p.farmApy)
		)
		.sort((a, b) => b.totalApy - a.totalApy)

	return finalPools
}

export const formatOptimizerPool = ({ pool, customLTV }) => {
	const ltv = customLTV ? customLTV / 100 : pool.ltv

	const lendingReward = (pool.apyBase || 0) + (pool.apyReward || 0)
	const borrowReward = (pool.borrow.apyBaseBorrow || 0) + (pool.borrow.apyRewardBorrow || 0)
	const totalReward = lendingReward + borrowReward * ltv
	const borrowAvailableUsd = pool.borrow.totalAvailableUsd

	return {
		...pool,
		lendingReward,
		borrowReward,
		totalReward,
		borrowAvailableUsd,
		totalBase: (pool.apyBase || 0) + (pool.borrow.apyBaseBorrow || 0) * ltv,
		lendingBase: pool.apyBase || 0,
		borrowBase: pool.borrow.apyBaseBorrow || 0
	}
}

export const findStrategyPoolsFR = ({ token, filteredPools, perps }) => {
	let tokensToInclude = token?.token
	tokensToInclude = typeof tokensToInclude === 'string' ? [tokensToInclude] : tokensToInclude
	let tokensToExclude = token?.excludeToken
	tokensToExclude = typeof tokensToExclude === 'string' ? [tokensToExclude] : tokensToExclude

	// filter pools to selected token
	const pools = filteredPools.filter((p) => {
		// remove poolMeta from symbol string
		const farmSymbol = p.symbol.replace(/ *\([^)]*\) */g, '')
		return (
			tokensToInclude?.some((t) =>
				t === 'ALL_USD_STABLES'
					? p.stablecoin
					: t === 'ALL_BITCOINS'
						? farmSymbol.includes('BTC')
						: farmSymbol.includes(t)
			) &&
			!tokensToExclude?.some((t) =>
				t === 'ALL_USD_STABLES'
					? p.stablecoin
					: t === 'ALL_BITCOINS'
						? farmSymbol.includes('BTC')
						: farmSymbol.includes(t)
			) &&
			p.apy > 0
		)
	})

	// filter FR data to positive funding rates only (longs pay shorts -> open short position and earn FR)
	const perpsData = perps.filter(
		(p) => tokensToInclude?.some((t) => t.includes(p.symbol)) && p.fundingRate > 0 && p.baseAsset !== 'T'
	)

	const finalPools = []
	for (const pool of pools) {
		for (const perp of perpsData) {
			const fr8hPrevious = Number(perp.fundingRatePrevious) * 100
			const frCurrent = Number(perp.fundingRate) * 100
			const afr = fr8hPrevious * 3 * 365

			const afr7d = Number(perp.fundingRate7dSum) * 100 * 52
			const afr30d = Number(perp.fundingRate30dSum) * 100 * 12

			finalPools.push({
				...pool,
				symbolPerp: perp.market,
				fr8hCurrent: frCurrent.toFixed(3),
				fr8hPrevious: fr8hPrevious.toFixed(3),
				frDay: frCurrent * 3,
				frWeek: frCurrent * 3 * 7,
				frMonth: frCurrent * 3 * 30,
				frYear: frCurrent * 3 * 365,
				poolReturn8h: pool.apy / 365 / 3,
				poolReturnDay: pool.apy / 365,
				poolReturnWeek: pool.apy / 52,
				poolReturnMonth: pool.apy / 12,
				strategyReturn: pool.apy / 365 + frCurrent * 3,
				afr,
				afr7d,
				afr30d,
				strategyAPY: pool.apy + afr,
				openInterest: Number(perp.openInterest),
				indexPrice: perp.indexPrice,
				chains: [pool.chain],
				farmTvlUsd: pool.tvlUsd,
				marketplace: perp.marketplace,
				fundingRate7dAverage: (perp.fundingRate7dAverage * 100).toFixed(3),
				fundingRate7dSum: (perp.fundingRate7dSum * 100).toFixed(3),
				fundingRate30dAverage: (perp.fundingRate30dAverage * 100).toFixed(3),
				fundingRate30dSum: (perp.fundingRate30dSum * 100).toFixed(3)
			})
		}
	}

	return finalPools
}

interface FilterPools {
	selectedChainsSet: Set<string>
	selectedAttributes?: Array<string>
	selectedLendingProtocolsSet?: Set<string> | null
	selectedFarmProtocolsSet?: Set<string> | null
	pool: YieldsData['props']['pools'][number]
	minTvl?: number | null
	maxTvl?: number | null
	minAvailable?: number | null
	maxAvailable?: number | null
	customLTV?: number | null
	strategyPage?: boolean
}

export const filterPool = ({
	pool,
	selectedChainsSet,
	selectedAttributes,
	selectedLendingProtocolsSet,
	selectedFarmProtocolsSet,
	minTvl,
	maxTvl,
	minAvailable,
	maxAvailable,
	customLTV,
	strategyPage
}: FilterPools) => {
	let toFilter = true

	toFilter = toFilter && selectedChainsSet.has(pool.chain)
	// stratey page filters
	if (selectedLendingProtocolsSet) {
		toFilter = toFilter && selectedLendingProtocolsSet.has(pool.projectName)
	}
	if (selectedFarmProtocolsSet) {
		toFilter = toFilter && selectedFarmProtocolsSet.has(pool.farmProjectName)
	}
	if (selectedAttributes) {
		selectedAttributes.forEach((attribute) => {
			const attributeOption = attributeOptionsMap.get(attribute)

			if (attributeOption) {
				toFilter = toFilter && attributeOption.filterFn(pool)
			}
		})
	}

	const isValidTvlRange = minTvl != null || maxTvl != null

	if (isValidTvlRange) {
		toFilter = toFilter && (minTvl != null ? pool.farmTvlUsd >= minTvl : true) && (maxTvl != null ? pool.tvlUsd <= maxTvl : true)
	}

	const isValidAvailableRange = minAvailable != null || maxAvailable != null

	if (isValidAvailableRange) {
		toFilter =
			toFilter &&
			(minAvailable != null ? +(pool.borrow.totalAvailableUsd || 0) >= +minAvailable : true) &&
			(maxAvailable != null ? +(pool.borrow.totalAvailableUsd || 0) <= +maxAvailable : true)
	}

	const isValidLtvValue = customLTV != null

	if (isValidLtvValue && strategyPage) {
		toFilter = toFilter && (customLTV ? customLTV > 0 && customLTV <= 100 : true)
	}

	// on optimizer the filter includes a check against customLTV
	if (isValidLtvValue && !strategyPage) {
		toFilter = toFilter && (customLTV ? customLTV > 0 && customLTV < 100 && customLTV / 100 <= pool.ltv : true)
	}

	return toFilter
}

export const lockupsRewards = ['Geist Finance', 'Radiant', 'Valas Finance', 'UwU Lend']
export const lockupsCollateral = [
	'Ribbon',
	'TrueFi',
	'Maple',
	'Clearpool',
	'Centrifuge',
	'UniCrypt',
	'Osmosis',
	'HedgeFarm',
	'BarnBridge',
	'WOOFi',
	'Kokoa Finance',
	'Lyra',
	'Arbor Finance',
	'Sommelier'
]
export const badDebt = ['moonwell-apollo', 'inverse-finance', 'venus', 'iron-bank']

export const disclaimer =
	"DefiLlama doesn't audit nor endorse any of the protocols listed, we just focus on providing accurate data. Ape at your own risk."

export const earlyExit =
	'Rewards are calculated assuming an early exit penalty applies. So this is the minimum APY you can expect when claiming your rewards early.'
